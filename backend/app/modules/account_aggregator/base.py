"""
Account Aggregator (AA) Integration Interface & DTOs
Compliant with Reserve Bank of India (RBI) NBFC-AA Master Directions
and Sahamati / ReBIT Financial Information User (FIU) specifications.

IMPORTANT MANDATORY CONSTRAINTS:
1. Never collect, store, or process bank usernames, passwords, PINs, or OTPs.
   Authorization is handled strictly on the RBI-regulated AA provider's hosted interface.
2. Never scrape personal email accounts to imitate an Account Aggregator.
3. Every response must clearly label its data_source:
   - "live_aa": Cryptographically signed payload from an authorized FIP host.
   - "demonstration": Simulated SIH prototype response with prominent demo_notice.
   - "unavailable": Scheduled bank FIP not integrated or service unreachable.
4. Distinguish between individual consumer consent and institutional/corporate mandates.
"""
from __future__ import annotations

import abc
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Data Transfer Objects (ReBIT Term Deposit Schema)
# ---------------------------------------------------------------------------

class AATermDepositRecord(BaseModel):
    """
    Term Deposit details returned by a Financial Information Provider (FIP)
    under the ReBIT TERM_DEPOSIT specification.
    """
    reference_number: Optional[str] = None          # Certificate / FDR reference
    account_number_masked: Optional[str] = None     # e.g. "••••••••8291"
    fip_id: str                                     # e.g. "fip@sbi.aa"
    fip_name: str                                   # e.g. "State Bank of India"
    account_holder_name: Optional[str] = None       # Institution / depositor name
    
    principal_amount: Optional[Decimal] = None
    currency: str = "INR"
    interest_rate: Optional[Decimal] = None
    maturity_amount: Optional[Decimal] = None
    
    open_date: Optional[date] = None
    maturity_date: Optional[date] = None
    tenure_days: Optional[int] = None
    deposit_status: str = "ACTIVE"                  # ACTIVE, MATURED, PRE_CLOSED
    
    # Lien and encumbrance details (as supported by participating FIP)
    lien_marked: Optional[bool] = None
    lien_type: Optional[str] = None                 # e.g. "STATUTORY_REGULATORY"
    lien_beneficiary: Optional[str] = None          # e.g. "Member Secretary, AICTE New Delhi"
    encumbrance_status: Optional[str] = None        # "CONFIRMED_JOINT_LIEN", "NO_LIEN", "NOT_SUPPORTED_BY_FIP"


class AAFieldMismatch(BaseModel):
    """Represents a discrepancy between submitted FDR values and AA FIP telemetry."""
    field_name: str
    submitted_value: Optional[str]
    fip_value: Optional[str]
    severity: str = "WARNING"   # CRITICAL, WARNING, INFO
    explanation: str


class AAConsentRequest(BaseModel):
    """Request to initiate an institutional consent flow with an Account Aggregator."""
    institution_id: str
    institution_name: str
    customer_aa_handle: str                         # e.g. "dtu.reg@sahamati-aa"
    fip_id: str                                     # e.g. "fip@sbi.aa"
    fip_name: str
    data_categories: List[str] = Field(default_factory=lambda: ["DEPOSIT", "TERM_DEPOSIT"])
    consent_mode: str = "QUERY"                     # VIEW, QUERY, STORE
    fetch_type: str = "ONETIME"                     # ONETIME, PERIODIC
    purpose_code: str = "101"                       # 101: Regulatory Compliance Audit
    purpose_description: str = "AICTE APH Security Deposit & Irrevocable Lien Verification"
    consent_validity_months: int = 12


class AAConsentStatusResponse(BaseModel):
    """Status of an AA consent handle/request."""
    consent_handle: str
    consent_id: Optional[str] = None
    status: str                                     # PENDING, ACTIVE, REJECTED, REVOKED, EXPIRED
    customer_aa_handle: str
    fip_id: str
    fip_name: str
    redirect_url: Optional[str] = None              # AA provider hosted authorization URL
    consent_start_date: Optional[datetime] = None
    consent_expiry_date: Optional[datetime] = None
    demo_notice: Optional[str] = None


class AARetrievalResult(BaseModel):
    """
    Consolidated result of a financial data retrieval via the AA network.
    """
    status: str                                     # verified, field_mismatch, pending_consent, consent_expired, fip_unsupported, service_unavailable
    data_source: str                                # live_aa, demonstration, unavailable
    fip_id: str
    fip_name: str
    concordance_matched: bool = False
    
    # Populated when FIP successfully returns Term Deposit data
    term_deposit: Optional[AATermDepositRecord] = None
    mismatches: List[AAFieldMismatch] = Field(default_factory=list)
    unsupported_fields: List[str] = Field(default_factory=list)
    
    # Cryptographic proof
    signature_algorithm: Optional[str] = None
    signature_verified: bool = False
    certificate_serial: Optional[str] = None
    payload_digest: Optional[str] = None
    retrieval_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    demo_notice: Optional[str] = None
    error_message: Optional[str] = None


# ---------------------------------------------------------------------------
# Abstract Adapter Interface
# ---------------------------------------------------------------------------

class BaseAccountAggregatorAdapter(abc.ABC):
    """
    Abstract contract for Account Aggregator integration adapters.
    Can support live aggregators (Setu, Anumati, OneMoney, Finvu) or
    clearly-labeled demonstration adapters for testing.
    """

    @abc.abstractmethod
    def initiate_consent(self, request: AAConsentRequest) -> AAConsentStatusResponse:
        """
        Initiates a consent request via the Account Aggregator network.
        Returns a consent handle and redirect URL for institutional signatory authorization.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_consent_status(self, consent_handle: str) -> AAConsentStatusResponse:
        """
        Polls or retrieves the current authorization status of a consent handle.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def fetch_term_deposit_data(
        self,
        consent_id: str,
        fip_id: str,
        fdr_reference: str,
        expected_amount: Decimal,
        expected_maturity_date: Optional[date] = None,
    ) -> AARetrievalResult:
        """
        Fetches encrypted financial information (FI) from the FIP,
        decrypts with FIU private key, and evaluates concordance against the FDR.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def revoke_consent(self, consent_id: str) -> bool:
        """
        Revokes an active consent artifact under institutional request.
        """
        raise NotImplementedError
