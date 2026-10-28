"""
Bank Verification Adapter Interface
Defines the abstract contract that every bank-specific adapter must implement.

A bank adapter:
- Verifies FDR information against the bank's own records via its authorized API.
- Reports only fields that the specific bank integration actually supports.
- NEVER treats a failed API call as a failed FDR verification.
- Returns a BankVerificationResult with a clear data_source label so callers
  can distinguish live bank data from demonstration/manual evidence.

IMPORTANT: OCR field-matching is NOT bank verification.
Only responses from an authorized bank integration count as bank verification.
"""
from __future__ import annotations

import abc
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared data transfer objects
# ---------------------------------------------------------------------------

class BankFDRDetails(BaseModel):
    """
    Fields that a bank may return when confirming an FDR.
    All fields are Optional because no single bank integration guarantees
    every field.  Adapters must populate only what the bank actually returns.
    """
    # Identification
    reference_number: Optional[str] = None
    account_number: Optional[str] = None

    # Parties
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    depositor_name: Optional[str] = None

    # Financial terms
    principal_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    maturity_amount: Optional[Decimal] = None

    # Dates
    issue_date: Optional[date] = None
    maturity_date: Optional[date] = None

    # Lien / encumbrance
    lien_holder: Optional[str] = None
    lien_type: Optional[str] = None          # e.g. "JOINT_LIEN", "PLEDGE"
    lien_confirmed: Optional[bool] = None

    # Deposit state
    deposit_status: Optional[str] = None     # e.g. "ACTIVE", "MATURED", "CLOSED"

    # Raw gateway reference for audit
    gateway_reference: Optional[str] = None


class FieldMismatch(BaseModel):
    """A single field comparison result where submitted and bank values differ."""
    field_name: str
    submitted_value: Optional[str]
    bank_value: Optional[str]
    severity: str = "WARNING"   # "CRITICAL" | "WARNING" | "INFO"


class BankVerificationResult(BaseModel):
    """
    Standardised result returned by every adapter.

    status values:
      verified            – bank confirmed the FDR and all checked fields match.
      discrepancy_found   – bank returned data that conflicts with submitted fields.
      invalid_reference   – bank does not recognise the FDR reference number.
      unable_to_verify    – bank returned an incomplete response; manual check needed.
      service_unavailable – adapter could not reach the bank (timeout / error).
                             MUST NOT be treated as a failed FDR verification.
      auth_failure        – adapter credentials rejected by the bank gateway.

    data_source values:
      live_bank           – real response from an authorized bank integration.
      demonstration       – mock / sample data for development/demonstration only.
      manual              – manually entered by an officer, not a live API response.
      unavailable         – no bank integration is available for this bank.
    """
    status: str                        # see docstring above
    data_source: str                   # "live_bank" | "demonstration" | "manual" | "unavailable"
    bank_name: str
    adapter_name: str

    # Populated when the bank returned usable data
    bank_details: Optional[BankFDRDetails] = None
    mismatches: list[FieldMismatch] = Field(default_factory=list)

    # Human-readable summary and diagnostic information
    summary: str = ""
    gateway_reference: Optional[str] = None
    verified_at: datetime = Field(default_factory=lambda: datetime.utcnow())

    # Populated on error / partial failure
    error_code: Optional[str] = None    # e.g. "TIMEOUT", "RATE_LIMITED", "AUTH_FAILURE"
    error_detail: Optional[str] = None  # safe diagnostic text; MUST NOT contain credentials


class InstrumentSnapshot(BaseModel):
    """
    Minimal read-only view of a FinancialInstrument passed to adapters.
    Adapters must not receive a database Session or the full ORM object
    to prevent accidental writes.
    """
    instrument_id: str
    reference_number: str
    bank_name: str
    branch_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    depositor_name: Optional[str] = None  # institution name used as depositor
    amount: Decimal
    currency: str = "INR"
    issue_date: Optional[date] = None
    maturity_date: Optional[date] = None


# ---------------------------------------------------------------------------
# Abstract adapter base
# ---------------------------------------------------------------------------

class AbstractBankAdapter(abc.ABC):
    """
    Base class for all bank-specific verification adapters.

    Subclasses must implement `verify` and should declare:
      - `adapter_name`  – unique slug, e.g. "sbi_sfms", "mock_demo"
      - `bank_label`    – display name, e.g. "State Bank of India"
      - `is_demo`       – True for demonstration adapters; shown in UI
    """

    adapter_name: str = "abstract"
    bank_label: str = "Unknown Bank"
    is_demo: bool = False

    @abc.abstractmethod
    async def verify(self, instrument: InstrumentSnapshot) -> BankVerificationResult:
        """
        Contact the bank API (or return demonstration data) and return a result.

        Implementations must:
        - Apply a request timeout (suggested: 15 seconds).
        - Catch all network/HTTP exceptions and return status="service_unavailable".
        - Map authentication failures to status="auth_failure".
        - Never log or expose credentials in the returned result.
        - Mark is_demo adapters with data_source="demonstration".
        """
        ...

    def _compare_fields(
        self,
        instrument: InstrumentSnapshot,
        bank: BankFDRDetails,
    ) -> list[FieldMismatch]:
        """
        Compares submitted instrument fields against bank-returned fields.
        Only compares fields that the bank actually returned (non-None).
        Returns a list of mismatches.
        """
        mismatches: list[FieldMismatch] = []

        def _check(field: str, submitted, bank_val, severity: str = "WARNING"):
            if bank_val is None:
                return  # bank didn't return this field — skip comparison
            s = str(submitted).strip().lower() if submitted is not None else ""
            b = str(bank_val).strip().lower()
            if s != b:
                mismatches.append(FieldMismatch(
                    field_name=field,
                    submitted_value=str(submitted) if submitted is not None else None,
                    bank_value=str(bank_val),
                    severity=severity,
                ))

        _check("reference_number", instrument.reference_number, bank.reference_number, "CRITICAL")
        _check("bank_name", instrument.bank_name, bank.bank_name, "CRITICAL")
        _check("depositor_name", instrument.depositor_name, bank.depositor_name, "WARNING")
        _check("account_number", instrument.account_number, bank.account_number, "WARNING")

        # Amount comparison: allow ±₹1 rounding
        if bank.principal_amount is not None and instrument.amount is not None:
            diff = abs(float(instrument.amount) - float(bank.principal_amount))
            if diff > 1.0:
                mismatches.append(FieldMismatch(
                    field_name="principal_amount",
                    submitted_value=str(instrument.amount),
                    bank_value=str(bank.principal_amount),
                    severity="CRITICAL",
                ))

        _check("issue_date", instrument.issue_date, bank.issue_date, "CRITICAL")
        _check("maturity_date", instrument.maturity_date, bank.maturity_date, "CRITICAL")

        return mismatches

