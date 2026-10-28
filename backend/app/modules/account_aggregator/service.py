"""
Account Aggregator Service
Orchestrates institutional consent initiation, telemetry retrieval,
field concordance verification, and statutory audit logging.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.models import (
    AccountAggregatorConsent,
    AccountAggregatorRetrieval,
    FinancialInstrument,
    Institution,
    AuditEvent as AuditEventModel,
)
from app.modules.account_aggregator.base import (
    BaseAccountAggregatorAdapter,
    AAConsentRequest,
    AAConsentStatusResponse,
    AARetrievalResult,
    AAFieldMismatch,
)
from app.modules.account_aggregator.adapters.demo_adapter import DemonstrationAccountAggregatorAdapter
from app.modules.account_aggregator.adapters.live_adapter import LiveAccountAggregatorAdapter

logger = logging.getLogger("fdr_smart.account_aggregator.service")

# 60-minute freshness cache to avoid duplicate AA telemetry queries
FRESHNESS_CACHE_MINUTES = 60


class AccountAggregatorService:
    """
    Core service coordinating consent requests and financial data retrieval.
    """

    def __init__(self, adapter: Optional[BaseAccountAggregatorAdapter] = None):
        if adapter is not None:
            self.adapter = adapter
        elif settings.AA_ENABLED and settings.AA_CLIENT_ID and settings.AA_CLIENT_SECRET:
            logger.info("Initializing Live Account Aggregator Adapter.")
            self.adapter = LiveAccountAggregatorAdapter()
        else:
            logger.info("Initializing Demonstration Account Aggregator Adapter for SIH prototype.")
            self.adapter = DemonstrationAccountAggregatorAdapter()

    def initiate_consent(
        self,
        db: Session,
        request: AAConsentRequest,
        initiator_user_id: Optional[str] = None,
    ) -> AccountAggregatorConsent:
        """
        Initiates a consent request with the Account Aggregator and persists
        the consent metadata. Never stores bank usernames, passwords, or OTPs.
        """
        # Call adapter
        adapter_res = self.adapter.initiate_consent(request)

        now_dt = datetime.now(timezone.utc)
        consent = AccountAggregatorConsent(
            id=f"aac-{uuid.uuid4()}",
            institution_id=request.institution_id,
            fip_id=request.fip_id,
            fip_name=request.fip_name,
            customer_aa_handle=request.customer_aa_handle,
            consent_handle=adapter_res.consent_handle,
            consent_id=adapter_res.consent_id,
            status=adapter_res.status,
            consent_mode=request.consent_mode,
            fetch_type=request.fetch_type,
            data_categories=request.data_categories,
            purpose_code=request.purpose_code,
            purpose_description=request.purpose_description,
            consent_start_date=adapter_res.consent_start_date or now_dt,
            consent_expiry_date=adapter_res.consent_expiry_date or (now_dt + timedelta(days=365)),
            redirect_url=adapter_res.redirect_url,
            created_by_user_id=initiator_user_id,
            authorized_at=now_dt if adapter_res.status == "ACTIVE" else None,
            created_at=now_dt,
            updated_at=now_dt,
        )

        db.add(consent)

        # Audit event
        audit = AuditEventModel(
            id=f"audit-{uuid.uuid4()}",
            actor_user_id=initiator_user_id,
            action="AA_CONSENT_INITIATED",
            entity_type="account_aggregator_consents",
            entity_id=consent.id,
            outcome="success",
            details={
                "institution_id": request.institution_id,
                "fip_name": request.fip_name,
                "customer_aa_handle": request.customer_aa_handle,
                "consent_handle": consent.consent_handle,
                "status": consent.status,
            },
            occurred_at=now_dt,
        )
        db.add(audit)
        db.commit()
        db.refresh(consent)
        return consent

    def get_consent_status(self, db: Session, consent_id: str) -> AccountAggregatorConsent:
        """
        Polls or retrieves current consent status and updates DB if status changed.
        """
        consent = db.query(AccountAggregatorConsent).filter(
            (AccountAggregatorConsent.id == consent_id) | (AccountAggregatorConsent.consent_handle == consent_id)
        ).first()

        if not consent:
            raise ValueError(f"Consent record '{consent_id}' not found.")

        # If already terminal, return
        if consent.status in ("REVOKED", "EXPIRED"):
            return consent

        # Poll adapter
        adapter_res = self.adapter.get_consent_status(consent.consent_handle)
        if adapter_res.status != consent.status:
            consent.status = adapter_res.status
            if adapter_res.consent_id and not consent.consent_id:
                consent.consent_id = adapter_res.consent_id
            if adapter_res.status == "ACTIVE" and not consent.authorized_at:
                consent.authorized_at = datetime.now(timezone.utc)
            consent.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(consent)

        return consent

    def fetch_fdr_telemetry(
        self,
        db: Session,
        instrument_id: str,
        caller_user_id: Optional[str] = None,
        force_refresh: bool = False,
    ) -> AccountAggregatorRetrieval:
        """
        Fetches term deposit telemetry from the FIP via Account Aggregator.
        Evaluates concordance against the registered FinancialInstrument.
        """
        instrument = db.query(FinancialInstrument).filter(FinancialInstrument.id == instrument_id).first()
        if not instrument:
            raise ValueError(f"Financial instrument '{instrument_id}' not found.")

        now_dt = datetime.now(timezone.utc)

        # Check freshness cache unless force_refresh is requested
        if not force_refresh:
            cached = (
                db.query(AccountAggregatorRetrieval)
                .filter(AccountAggregatorRetrieval.instrument_id == instrument_id)
                .order_by(AccountAggregatorRetrieval.retrieved_at.desc())
                .first()
            )
            if cached:
                age = (now_dt - cached.retrieved_at).total_seconds() / 60
                if age < FRESHNESS_CACHE_MINUTES:
                    logger.debug("Returning cached AA telemetry for instrument %s (age %.1f min)", instrument_id, age)
                    return cached

        # Look up active consent for institution
        consent = (
            db.query(AccountAggregatorConsent)
            .filter(
                AccountAggregatorConsent.institution_id == instrument.institution_id,
                AccountAggregatorConsent.status == "ACTIVE",
            )
            .order_by(AccountAggregatorConsent.created_at.desc())
            .first()
        )

        fip_id = consent.fip_id if consent else f"fip@{instrument.bank_name.lower().replace(' ', '')}.aa"

        # If no active consent found, check pending or expired
        if not consent:
            any_consent = (
                db.query(AccountAggregatorConsent)
                .filter(AccountAggregatorConsent.institution_id == instrument.institution_id)
                .order_by(AccountAggregatorConsent.created_at.desc())
                .first()
            )
            if any_consent and any_consent.status == "PENDING":
                retrieval = AccountAggregatorRetrieval(
                    id=f"aar-{uuid.uuid4()}",
                    consent_id=any_consent.id,
                    instrument_id=instrument.id,
                    institution_id=instrument.institution_id,
                    fip_name=instrument.bank_name,
                    data_source="demonstration",
                    status="pending_consent",
                    concordance_matched=False,
                    retrieved_data=None,
                    mismatches=[],
                    unsupported_fields=[],
                    demo_notice="Demonstration Mode: Institutional consent is pending authorization.",
                    retrieved_at=now_dt,
                )
                db.add(retrieval)
                db.commit()
                db.refresh(retrieval)
                return retrieval

            # Create default simulated consent on the fly for demo DTU/BITS cases if none exists
            temp_req = AAConsentRequest(
                institution_id=instrument.institution_id,
                institution_name=instrument.institution.name if instrument.institution else "Pledging Institution",
                customer_aa_handle=f"{instrument.institution_id}@sahamati-aa",
                fip_id=fip_id,
                fip_name=instrument.bank_name,
            )
            consent = self.initiate_consent(db, temp_req, initiator_user_id=caller_user_id)

        # Call adapter to fetch FI data
        adapter_res = self.adapter.fetch_term_deposit_data(
            consent_id=consent.consent_id or consent.consent_handle,
            fip_id=consent.fip_id,
            fdr_reference=instrument.reference_number,
            expected_amount=Decimal(str(instrument.amount)),
            expected_maturity_date=instrument.maturity_date,
        )

        # Build retrieval record
        retrieval = AccountAggregatorRetrieval(
            id=f"aar-{uuid.uuid4()}",
            consent_id=consent.id,
            instrument_id=instrument.id,
            institution_id=instrument.institution_id,
            fip_name=adapter_res.fip_name,
            data_source=adapter_res.data_source,
            status=adapter_res.status,
            concordance_matched=adapter_res.concordance_matched,
            retrieved_data=adapter_res.term_deposit.model_dump(mode="json") if adapter_res.term_deposit else None,
            mismatches=[m.model_dump(mode="json") for m in adapter_res.mismatches],
            unsupported_fields=adapter_res.unsupported_fields,
            raw_signature_info={
                "algorithm": adapter_res.signature_algorithm,
                "verified": adapter_res.signature_verified,
                "certSerial": adapter_res.certificate_serial,
                "payloadDigest": adapter_res.payload_digest,
            } if adapter_res.signature_verified else None,
            demo_notice=adapter_res.demo_notice,
            retrieved_at=now_dt,
        )

        db.add(retrieval)

        # Audit Event
        audit = AuditEventModel(
            id=f"audit-{uuid.uuid4()}",
            actor_user_id=caller_user_id,
            instrument_id=instrument.id,
            action="AA_TELEMETRY_FETCHED",
            entity_type="account_aggregator_retrievals",
            entity_id=retrieval.id,
            outcome="success" if adapter_res.status in ("verified", "field_mismatch") else "warning",
            details={
                "status": adapter_res.status,
                "data_source": adapter_res.data_source,
                "concordance_matched": adapter_res.concordance_matched,
                "fip_name": adapter_res.fip_name,
                "mismatch_count": len(adapter_res.mismatches),
            },
            occurred_at=now_dt,
        )
        db.add(audit)
        db.commit()
        db.refresh(retrieval)
        return retrieval

    def list_consents(
        self,
        db: Session,
        institution_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[AccountAggregatorConsent]:
        """Lists institutional consents with optional filters."""
        q = db.query(AccountAggregatorConsent)
        if institution_id:
            q = q.filter(AccountAggregatorConsent.institution_id == institution_id)
        if status:
            q = q.filter(AccountAggregatorConsent.status == status.upper())
        return q.order_by(AccountAggregatorConsent.created_at.desc()).all()

    def revoke_consent(self, db: Session, consent_id: str, user_id: Optional[str] = None) -> bool:
        """Revokes an active consent artifact."""
        consent = db.query(AccountAggregatorConsent).filter(AccountAggregatorConsent.id == consent_id).first()
        if not consent:
            return False

        self.adapter.revoke_consent(consent.consent_id or consent.consent_handle)
        consent.status = "REVOKED"
        consent.revoked_at = datetime.now(timezone.utc)
        consent.updated_at = datetime.now(timezone.utc)

        audit = AuditEventModel(
            id=f"audit-{uuid.uuid4()}",
            actor_user_id=user_id,
            action="AA_CONSENT_REVOKED",
            entity_type="account_aggregator_consents",
            entity_id=consent.id,
            outcome="success",
            details={"consent_handle": consent.consent_handle},
            occurred_at=datetime.now(timezone.utc),
        )
        db.add(audit)
        db.commit()
        return True


# Singleton factory
_service_instance: Optional[AccountAggregatorService] = None

def get_account_aggregator_service() -> AccountAggregatorService:
    global _service_instance
    if _service_instance is None:
        _service_instance = AccountAggregatorService()
    return _service_instance
