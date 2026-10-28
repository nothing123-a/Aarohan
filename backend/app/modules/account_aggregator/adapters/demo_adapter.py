"""
Demonstration Account Aggregator Adapter
Simulates RBI-regulated Account Aggregator (AA) and Financial Information Provider (FIP)
interactions for local development and SIH prototype evaluation.

Every response is explicitly marked with:
data_source = "demonstration"
demo_notice = "Demonstration Mode: Simulated AA response for SIH prototype. Live production requires certified FIU license and corporate signatory consent."
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, Dict

from app.modules.account_aggregator.base import (
    BaseAccountAggregatorAdapter,
    AAConsentRequest,
    AAConsentStatusResponse,
    AATermDepositRecord,
    AARetrievalResult,
    AAFieldMismatch,
)


class DemonstrationAccountAggregatorAdapter(BaseAccountAggregatorAdapter):
    """
    In-memory simulated Account Aggregator adapter implementing the
    ReBIT / Sahamati FIU-AA specifications.
    """

    def __init__(self):
        # Seeded consent records
        self._consents: Dict[str, AAConsentStatusResponse] = {
            "handle-sbi-dtu-001": AAConsentStatusResponse(
                consent_handle="handle-sbi-dtu-001",
                consent_id="consent-aa-sbi-99812",
                status="ACTIVE",
                customer_aa_handle="dtu.reg@sahamati-aa",
                fip_id="fip@sbi.aa",
                fip_name="State Bank of India",
                redirect_url="https://sahamati.demo.aa.gov.in/consent/auth?handle=handle-sbi-dtu-001",
                consent_start_date=datetime.now(timezone.utc) - timedelta(days=60),
                consent_expiry_date=datetime.now(timezone.utc) + timedelta(days=305),
                demo_notice="Demonstration Mode: Simulated active consent for Delhi Technological University.",
            ),
            "handle-canara-bits-002": AAConsentStatusResponse(
                consent_handle="handle-canara-bits-002",
                consent_id="consent-aa-cnrb-44120",
                status="ACTIVE",
                customer_aa_handle="bits.goa@sahamati-aa",
                fip_id="fip@canarabank.aa",
                fip_name="Canara Bank",
                redirect_url="https://sahamati.demo.aa.gov.in/consent/auth?handle=handle-canara-bits-002",
                consent_start_date=datetime.now(timezone.utc) - timedelta(days=90),
                consent_expiry_date=datetime.now(timezone.utc) + timedelta(days=275),
                demo_notice="Demonstration Mode: Simulated active consent for BITS Pilani Goa.",
            ),
            "handle-pnb-iitd-003": AAConsentStatusResponse(
                consent_handle="handle-pnb-iitd-003",
                consent_id="consent-aa-pnb-11029",
                status="ACTIVE",
                customer_aa_handle="iitd.fin@sahamati-aa",
                fip_id="fip@pnb.aa",
                fip_name="Punjab National Bank",
                redirect_url="https://sahamati.demo.aa.gov.in/consent/auth?handle=handle-pnb-iitd-003",
                consent_start_date=datetime.now(timezone.utc) - timedelta(days=120),
                consent_expiry_date=datetime.now(timezone.utc) + timedelta(days=245),
                demo_notice="Demonstration Mode: Simulated active consent for IIT Delhi.",
            ),
            "handle-hdfc-psg-004": AAConsentStatusResponse(
                consent_handle="handle-hdfc-psg-004",
                consent_id=None,
                status="PENDING",
                customer_aa_handle="psg.treasury@sahamati-aa",
                fip_id="fip@hdfcbank.aa",
                fip_name="HDFC Bank",
                redirect_url="https://sahamati.demo.aa.gov.in/consent/auth?handle=handle-hdfc-psg-004",
                consent_start_date=datetime.now(timezone.utc),
                consent_expiry_date=datetime.now(timezone.utc) + timedelta(days=365),
                demo_notice="Demonstration Mode: Pending authorization awaiting institution signatory OTP.",
            ),
            "handle-expired-005": AAConsentStatusResponse(
                consent_handle="handle-expired-005",
                consent_id="consent-expired-005",
                status="EXPIRED",
                customer_aa_handle="expired.inst@sahamati-aa",
                fip_id="fip@sbi.aa",
                fip_name="State Bank of India",
                redirect_url=None,
                consent_start_date=datetime.now(timezone.utc) - timedelta(days=400),
                consent_expiry_date=datetime.now(timezone.utc) - timedelta(days=35),
                demo_notice="Demonstration Mode: Expired consent requiring renewal.",
            ),
        }
        for item in list(self._consents.values()):
            if item.consent_id:
                self._consents[item.consent_id] = item

    def initiate_consent(self, request: AAConsentRequest) -> AAConsentStatusResponse:
        """Initiate simulated consent."""
        handle = f"handle-{uuid.uuid4().hex[:12]}"
        consent_id = f"consent-aa-{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc)
        
        resp = AAConsentStatusResponse(
            consent_handle=handle,
            consent_id=consent_id,
            status="ACTIVE" if "pending" not in request.customer_aa_handle.lower() else "PENDING",
            customer_aa_handle=request.customer_aa_handle,
            fip_id=request.fip_id,
            fip_name=request.fip_name,
            redirect_url=f"https://sahamati.demo.aa.gov.in/consent/auth?handle={handle}",
            consent_start_date=now,
            consent_expiry_date=now + timedelta(days=request.consent_validity_months * 30),
            demo_notice="Demonstration Mode: Consent handle generated in SIH demonstration sandbox.",
        )
        self._consents[handle] = resp
        self._consents[consent_id] = resp
        return resp

    def get_consent_status(self, consent_handle: str) -> AAConsentStatusResponse:
        """Retrieve consent status."""
        if consent_handle in self._consents:
            return self._consents[consent_handle]
            
        # Return fallback pending for unknown
        now = datetime.now(timezone.utc)
        return AAConsentStatusResponse(
            consent_handle=consent_handle,
            consent_id=None,
            status="PENDING",
            customer_aa_handle="unknown@sahamati-aa",
            fip_id="fip@unknown.aa",
            fip_name="Scheduled Bank FIP",
            redirect_url=f"https://sahamati.demo.aa.gov.in/consent/auth?handle={consent_handle}",
            consent_start_date=now,
            consent_expiry_date=now + timedelta(days=365),
            demo_notice="Demonstration Mode: Fallback consent handle.",
        )

    def fetch_term_deposit_data(
        self,
        consent_id: str,
        fip_id: str,
        fdr_reference: str,
        expected_amount: Decimal,
        expected_maturity_date: Optional[date] = None,
    ) -> AARetrievalResult:
        """Fetch and evaluate Term Deposit data against FDR under demonstration mode."""
        consent = self._consents.get(consent_id)
        
        # Check expired or revoked
        if consent and consent.status == "EXPIRED":
            return AARetrievalResult(
                status="consent_expired",
                data_source="demonstration",
                fip_id=fip_id,
                fip_name=consent.fip_name if consent else "Financial Information Provider",
                concordance_matched=False,
                error_message="AA Consent artifact has expired. Institution must execute consent renewal.",
                demo_notice="Demonstration Mode: Expired consent scenario simulated.",
            )

        if consent and consent.status == "PENDING":
            return AARetrievalResult(
                status="pending_consent",
                data_source="demonstration",
                fip_id=fip_id,
                fip_name=consent.fip_name,
                concordance_matched=False,
                error_message="Consent authorization pending. Institutional signatory must approve via AA app.",
                demo_notice="Demonstration Mode: Pending consent scenario simulated.",
            )

        # Check unsupported bank
        unsupported_keywords = ["cooperative", "rural", "grameen", "unsupported"]
        if any(k in fip_id.lower() for k in unsupported_keywords):
            return AARetrievalResult(
                status="fip_unsupported",
                data_source="unavailable",
                fip_id=fip_id,
                fip_name="Cooperative / Unregistered Bank",
                concordance_matched=False,
                unsupported_fields=["TERM_DEPOSIT", "LIEN_REGISTRY"],
                error_message="Bank FIP is not enabled on the RBI Account Aggregator network.",
                demo_notice="Demonstration Mode: Bank FIP unsupported on AA network.",
            )

        # Scenarios based on institution / fdr_reference
        mismatches = []
        is_mismatch_scenario = "bits" in fdr_reference.lower() or "004" in fdr_reference.lower()
        
        observed_amount = expected_amount
        if is_mismatch_scenario:
            # Simulate a principal amount mismatch for testing
            observed_amount = expected_amount - Decimal("500000")
            mismatches.append(
                AAFieldMismatch(
                    field_name="principal_amount",
                    submitted_value=str(expected_amount),
                    fip_value=str(observed_amount),
                    severity="CRITICAL",
                    explanation=f"AA FIP reports term deposit principal of ₹{observed_amount:,.2f} vs application claim of ₹{expected_amount:,.2f}.",
                )
            )

        term_deposit = AATermDepositRecord(
            reference_number=fdr_reference,
            account_number_masked=f"••••••••{abs(hash(fdr_reference)) % 10000:04d}",
            fip_id=fip_id,
            fip_name=consent.fip_name if consent else "State Bank of India",
            account_holder_name="Institutional Security Deposit Account",
            principal_amount=observed_amount,
            currency="INR",
            interest_rate=Decimal("7.25"),
            maturity_amount=observed_amount * Decimal("1.21"),
            open_date=date(2024, 1, 15),
            maturity_date=expected_maturity_date or date(2027, 1, 14),
            tenure_days=1095,
            deposit_status="ACTIVE",
            lien_marked=True,
            lien_type="STATUTORY_REGULATORY",
            lien_beneficiary="Member Secretary, AICTE New Delhi",
            encumbrance_status="CONFIRMED_JOINT_LIEN",
        )

        # Generate deterministic mock signature
        raw_payload = f"{fdr_reference}:{observed_amount}:{term_deposit.maturity_date}"
        digest = hashlib.sha256(raw_payload.encode()).hexdigest()

        return AARetrievalResult(
            status="field_mismatch" if mismatches else "verified",
            data_source="demonstration",
            fip_id=fip_id,
            fip_name=term_deposit.fip_name,
            concordance_matched=len(mismatches) == 0,
            term_deposit=term_deposit,
            mismatches=mismatches,
            unsupported_fields=[],
            signature_algorithm="SHA256withRSA",
            signature_verified=True,
            certificate_serial="5039281928492019482",
            payload_digest=digest,
            retrieval_timestamp=datetime.now(timezone.utc),
            demo_notice="Demonstration Mode: Simulated AA FIP Term Deposit retrieval for SIH prototype.",
        )

    def revoke_consent(self, consent_id: str) -> bool:
        """Revoke consent."""
        if consent_id in self._consents:
            self._consents[consent_id].status = "REVOKED"
            return True
        return False
