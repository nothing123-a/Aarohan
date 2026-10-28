"""
Bank Verification Service
=========================
Orchestrates bank FDR verification requests:
  1. Loads the instrument and validates the caller's authorisation.
  2. Prevents duplicate verifications (returns cached result when a recent
     bank verification already exists and is not stale).
  3. Selects the appropriate adapter (live or demo) for the instrument's bank.
  4. Calls the adapter with a read-only instrument snapshot.
  5. Persists the result as an InstrumentVerification record.
  6. Persists individual field mismatches as VerificationDiscrepancy records.
  7. Records an AuditEvent for every verification attempt.
  8. Returns a serialisable BankVerificationServiceResult to the caller.

Authorization rules:
  - Only scrutiny_officer and admin may initiate bank verification.
  - Institution representatives are rejected with HTTP 403.
"""
from __future__ import annotations

import uuid
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.core.models import (
    FinancialInstrument,
    InstrumentVerification as InstrumentVerificationModel,
    VerificationDiscrepancy as VerificationDiscrepancyModel,
    AuditEvent as AuditEventModel,
    User,
)
from app.modules.bank_verification.base import BankVerificationResult, InstrumentSnapshot
from app.modules.bank_verification.adapters import get_adapter_for_bank

logger = logging.getLogger(__name__)

# How long a previous bank verification result is considered fresh (avoid duplicate calls)
_CACHE_FRESHNESS_MINUTES: int = 60

# Roles authorised to initiate bank verification
_AUTHORISED_ROLES = {"scrutiny_officer", "admin"}


class BankVerificationServiceError(Exception):
    """Raised for authorisation or business-rule violations (not technical failures)."""
    def __init__(self, message: str, http_status: int = 400):
        super().__init__(message)
        self.http_status = http_status


class BankVerificationServiceResult:
    """Serialisable result returned from verify_fdr to the API layer."""
    def __init__(
        self,
        verification_result: BankVerificationResult,
        verification_id: str,
        instrument_id: str,
        is_live: bool,
        cached: bool = False,
    ):
        self.verification_result = verification_result
        self.verification_id = verification_id
        self.instrument_id = instrument_id
        self.is_live = is_live
        self.cached = cached

    def to_dict(self) -> dict:
        vr = self.verification_result
        bank_details = None
        if vr.bank_details:
            bd = vr.bank_details
            bank_details = {
                "reference_number": bd.reference_number,
                "bank_name": bd.bank_name,
                "branch_name": bd.branch_name,
                "depositor_name": bd.depositor_name,
                "principal_amount": float(bd.principal_amount) if bd.principal_amount else None,
                "currency": bd.currency,
                "interest_rate": float(bd.interest_rate) if bd.interest_rate else None,
                "maturity_amount": float(bd.maturity_amount) if bd.maturity_amount else None,
                "issue_date": bd.issue_date.isoformat() if bd.issue_date else None,
                "maturity_date": bd.maturity_date.isoformat() if bd.maturity_date else None,
                "lien_holder": bd.lien_holder,
                "lien_type": bd.lien_type,
                "lien_confirmed": bd.lien_confirmed,
                "deposit_status": bd.deposit_status,
                "gateway_reference": bd.gateway_reference,
            }

        mismatches = [
            {
                "field_name": m.field_name,
                "submitted_value": m.submitted_value,
                "bank_value": m.bank_value,
                "severity": m.severity,
            }
            for m in vr.mismatches
        ]

        return {
            "verification_id": self.verification_id,
            "instrument_id": self.instrument_id,
            "status": vr.status,
            "data_source": vr.data_source,
            "is_live_bank": self.is_live,
            "is_demo": not self.is_live,
            "cached": self.cached,
            "bank_name": vr.bank_name,
            "adapter_name": vr.adapter_name,
            "summary": vr.summary,
            "gateway_reference": vr.gateway_reference,
            "verified_at": vr.verified_at.isoformat(),
            "bank_details": bank_details,
            "mismatches": mismatches,
            "mismatch_count": len(mismatches),
            "error_code": vr.error_code,
            "demo_notice": (
                "⚠️  DEMONSTRATION DATA: This result was produced by a mock adapter "
                "and does NOT represent real bank verification."
            ) if not self.is_live else None,
        }


async def verify_fdr(
    instrument_id: str,
    caller: User,
    db: Session,
    force_refresh: bool = False,
) -> BankVerificationServiceResult:
    """
    Main entry point for bank FDR verification.

    Parameters
    ----------
    instrument_id:  Primary key of the FinancialInstrument to verify.
    caller:         Authenticated user initiating the request.
    db:             SQLAlchemy database session.
    force_refresh:  If True, skip the freshness cache and call the bank again.

    Raises
    ------
    BankVerificationServiceError on authorisation or not-found conditions.
    """
    # ── 1. Authorisation ─────────────────────────────────────────────────
    if caller.role not in _AUTHORISED_ROLES:
        raise BankVerificationServiceError(
            f"Permission Denied: Role '{caller.role}' is not authorised to initiate "
            "bank verification. Scrutiny Officer clearance required.",
            http_status=403,
        )

    # ── 2. Load instrument ────────────────────────────────────────────────
    inst = db.query(FinancialInstrument).filter(
        FinancialInstrument.id == instrument_id
    ).first()
    if not inst:
        raise BankVerificationServiceError(
            f"Financial instrument '{instrument_id}' not found.",
            http_status=404,
        )

    # ── 3. Cache check — avoid duplicate calls within the freshness window ─
    if not force_refresh:
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=_CACHE_FRESHNESS_MINUTES)
        recent = (
            db.query(InstrumentVerificationModel)
            .filter(
                InstrumentVerificationModel.instrument_id == instrument_id,
                InstrumentVerificationModel.verification_method == "bank_api",
                InstrumentVerificationModel.reviewed_at >= cutoff,
            )
            .order_by(InstrumentVerificationModel.reviewed_at.desc())
            .first()
        )
        if recent:
            logger.info(
                "Returning cached bank verification %s for instrument %s",
                recent.id, instrument_id,
            )
            # Reconstruct a minimal result from the stored record
            cached_result = BankVerificationResult(
                status=recent.outcome,
                data_source=recent.source_of_evidence or "live_bank",
                bank_name=inst.bank_name,
                adapter_name="cached",
                summary=recent.findings or "Cached result from previous bank verification.",
                verified_at=recent.reviewed_at,
            )
            return BankVerificationServiceResult(
                verification_result=cached_result,
                verification_id=recent.id,
                instrument_id=instrument_id,
                is_live=(recent.source_of_evidence == "live_bank"),
                cached=True,
            )

    # ── 4. Build instrument snapshot for adapter ──────────────────────────
    snapshot = InstrumentSnapshot(
        instrument_id=inst.id,
        reference_number=inst.reference_number,
        bank_name=inst.bank_name,
        branch_name=inst.branch_name,
        account_number=inst.account_number,
        ifsc_code=inst.ifsc_code,
        depositor_name=(inst.institution.name if inst.institution else None),
        amount=Decimal(str(inst.amount)),
        currency=inst.currency or "INR",
        issue_date=inst.issue_date,
        maturity_date=inst.maturity_date,
    )

    # ── 5. Select adapter ─────────────────────────────────────────────────
    adapter, is_live = get_adapter_for_bank(inst.bank_name)
    logger.info(
        "Bank verification for instrument %s: adapter=%s is_live=%s",
        instrument_id, adapter.adapter_name, is_live,
    )

    # ── 6. Call adapter ───────────────────────────────────────────────────
    try:
        result: BankVerificationResult = await adapter.verify(snapshot)
    except Exception as exc:
        # Adapter raised an unexpected exception — treat as service_unavailable
        logger.error(
            "Unexpected error in adapter %s for instrument %s: %s",
            adapter.adapter_name, instrument_id, type(exc).__name__,
        )
        result = BankVerificationResult(
            status="service_unavailable",
            data_source="live_bank" if is_live else "demonstration",
            bank_name=inst.bank_name,
            adapter_name=adapter.adapter_name,
            summary=(
                "An unexpected error occurred while contacting the bank. "
                "This is a technical failure, not a failed FDR verification."
            ),
            error_code="UNEXPECTED_ERROR",
            error_detail=type(exc).__name__,   # safe; not exception message
            verified_at=datetime.now(timezone.utc),
        )

    # ── 7. Persist verification record ────────────────────────────────────
    now = datetime.now(timezone.utc)
    verif_id = f"bv-{uuid.uuid4().hex[:10]}"

    verif = InstrumentVerificationModel(
        id=verif_id,
        instrument_id=inst.id,
        reviewed_by_user_id=caller.id,
        outcome=result.status,
        stage="technical_scrutiny",
        verification_method="bank_api",
        source_of_evidence="live_bank" if is_live else "demonstration",
        evidence_date=now,
        findings=result.summary,
        outstanding_issues=(
            f"{len(result.mismatches)} mismatch(es) detected."
            if result.mismatches else None
        ),
        review_notes=(
            f"Adapter: {adapter.adapter_name}. "
            f"Gateway ref: {result.gateway_reference or 'N/A'}. "
            f"Error: {result.error_code}" if result.error_code else
            f"Adapter: {adapter.adapter_name}. Gateway ref: {result.gateway_reference or 'N/A'}."
        ),
        reviewed_at=now,
        created_at=now,
    )
    db.add(verif)

    # ── 8. Persist field mismatches as discrepancy records ────────────────
    for mismatch in result.mismatches:
        disc = VerificationDiscrepancyModel(
            id=f"disc-bv-{uuid.uuid4().hex[:8]}",
            verification_id=verif_id,
            field_name=mismatch.field_name,
            source_type="bank_api",
            expected_value=mismatch.submitted_value,
            observed_value=mismatch.bank_value,
            resolution_status="open",
            created_at=now,
        )
        db.add(disc)

    # ── 9. Audit event ────────────────────────────────────────────────────
    audit = AuditEventModel(
        id=f"audit-{uuid.uuid4().hex[:8]}",
        actor_user_id=caller.id,
        institution_id=inst.institution_id,
        instrument_id=inst.id,
        action="BANK_VERIFICATION_INITIATED",
        entity_type="instrument_verifications",
        entity_id=verif_id,
        outcome="success",
        details={
            "adapter": adapter.adapter_name,
            "is_live": is_live,
            "status": result.status,
            "mismatch_count": len(result.mismatches),
            "error_code": result.error_code,
            # SECURITY: Do not include gateway reference or bank details in audit log
        },
        occurred_at=now,
    )
    db.add(audit)
    db.commit()

    return BankVerificationServiceResult(
        verification_result=result,
        verification_id=verif_id,
        instrument_id=instrument_id,
        is_live=is_live,
        cached=False,
    )

