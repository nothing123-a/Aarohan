"""
Mock Bank Verification Adapter — DEMONSTRATION USE ONLY
=======================================================
Provides deterministic sample responses for development, testing, and
demonstration without requiring any real bank credentials or API access.

Behaviour is driven by the FDR reference_number suffix:
  …OK     → verified (all fields match)
  …MIS    → discrepancy_found (amount mismatch)
  …UNAV   → service_unavailable (simulates bank outage)
  …INVREF → invalid_reference (FDR not found at bank)
  anything else → verified (default happy-path)

NEVER present these responses as live bank verification.
Every result sets data_source="demonstration" and is_demo=True.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from app.modules.bank_verification.base import (
    AbstractBankAdapter,
    BankFDRDetails,
    BankVerificationResult,
    FieldMismatch,
    InstrumentSnapshot,
)

_DEMO_LIEN_HOLDER = "Member Secretary, AICTE"
_DEMO_GATEWAY_PREFIX = "MOCK-GW"


class MockBankAdapter(AbstractBankAdapter):
    """
    Demonstration adapter — returns deterministic sample data.
    Suitable for dev/test environments only.
    Note: No artificial latency is added so this adapter is test-friendly.
    """

    adapter_name: str = "mock_demo"
    bank_label: str = "Demonstration Bank (Mock)"
    is_demo: bool = True

    async def verify(self, instrument: InstrumentSnapshot) -> BankVerificationResult:
        """Return sample data based on reference_number suffix."""
        ref = instrument.reference_number.upper().strip()
        now = datetime.now(timezone.utc)
        gateway_ref = f"{_DEMO_GATEWAY_PREFIX}/{instrument.instrument_id[:8].upper()}"

        # ── UNAVAILABLE scenario ──────────────────────────────────────────
        if ref.endswith("UNAV"):
            return BankVerificationResult(
                status="service_unavailable",
                data_source="demonstration",
                bank_name=self.bank_label,
                adapter_name=self.adapter_name,
                summary=(
                    "[DEMO] Simulated bank gateway timeout. "
                    "This is NOT a failed FDR verification — it is a technical failure. "
                    "The Scrutiny Officer should retry or escalate to manual verification."
                ),
                error_code="TIMEOUT",
                error_detail="Simulated: bank CBS gateway did not respond within 15 seconds.",
                verified_at=now,
            )

        # ── INVALID REFERENCE scenario ────────────────────────────────────
        if ref.endswith("INVREF"):
            return BankVerificationResult(
                status="invalid_reference",
                data_source="demonstration",
                bank_name=self.bank_label,
                adapter_name=self.adapter_name,
                summary=(
                    "[DEMO] Bank does not recognise this FDR reference number. "
                    "Possible causes: incorrect reference, un-issued FDR, or branch mismatch."
                ),
                error_code="REF_NOT_FOUND",
                verified_at=now,
            )

        # ── Build sample bank FDR details ─────────────────────────────────
        bank_details = BankFDRDetails(
            reference_number=instrument.reference_number,
            bank_name="State Bank of India",  # canonical bank name from CBS
            branch_name=instrument.branch_name or "Main Branch",
            depositor_name=instrument.depositor_name,
            principal_amount=instrument.amount,
            currency="INR",
            issue_date=instrument.issue_date,
            maturity_date=instrument.maturity_date,
            lien_holder=_DEMO_LIEN_HOLDER,
            lien_type="JOINT_LIEN",
            lien_confirmed=True,
            deposit_status="ACTIVE",
            gateway_reference=gateway_ref,
        )

        # ── MISMATCH scenario: corrupt the amount ─────────────────────────
        if ref.endswith("MIS"):
            corrupted_amount = instrument.amount + Decimal("50000.00")
            bank_details.principal_amount = corrupted_amount

            mismatches = self._compare_fields(instrument, bank_details)
            return BankVerificationResult(
                status="discrepancy_found",
                data_source="demonstration",
                bank_name=self.bank_label,
                adapter_name=self.adapter_name,
                bank_details=bank_details,
                mismatches=mismatches,
                gateway_reference=gateway_ref,
                summary=(
                    f"[DEMO] Bank records show principal amount ₹{float(corrupted_amount):,.2f}, "
                    f"which differs from the submitted amount ₹{float(instrument.amount):,.2f}. "
                    f"{len(mismatches)} discrepancy(ies) detected."
                ),
                verified_at=now,
            )

        # ── VERIFIED scenario (default and …OK suffix) ────────────────────
        mismatches = self._compare_fields(instrument, bank_details)
        status = "verified" if not mismatches else "discrepancy_found"

        return BankVerificationResult(
            status=status,
            data_source="demonstration",
            bank_name=self.bank_label,
            adapter_name=self.adapter_name,
            bank_details=bank_details,
            mismatches=mismatches,
            gateway_reference=gateway_ref,
            summary=(
                "[DEMO] All submitted FDR fields match bank records. "
                "Joint lien in favour of Member Secretary, AICTE confirmed. "
                "Deposit status: ACTIVE."
            ) if status == "verified" else (
                f"[DEMO] {len(mismatches)} field mismatch(es) detected between submitted data and bank records."
            ),
            verified_at=now,
        )

