"""
Rule-Based Discrepancy Detection Engine
Compares automated OCR extracted values against submitted instrument records according
to PRD.md Section 4 and DATABASE.md Section 5.8.
Normalizes amounts, dates, and bank names before comparison.
"""
import uuid
from datetime import datetime, timezone, date
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from app.modules.document_processing.ocr_service import ExtractedField

class VerificationDiscrepancy(BaseModel):
    id: str = Field(default_factory=lambda: f"disc-{uuid.uuid4()}")
    verification_id: str
    instrument_id: str
    field_name: str
    source_type: str = "extracted"
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    severity: str = "CRITICAL"  # "CRITICAL", "WARNING", "INFO"
    resolution_status: str = "open"  # "open", "resolved", "accepted_with_explanation", "not_applicable"
    resolution_notes: Optional[str] = None
    resolved_by_user_id: Optional[str] = None
    resolved_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class FieldComparisonResult(BaseModel):
    field_name: str
    display_name: str
    submitted_value: Any
    extracted_value: Any
    is_match: bool
    discrepancy_id: Optional[str] = None
    severity: str = "NONE"
    explanation: Optional[str] = None

# In-memory discrepancy storage (DATABASE.md verification_discrepancies table)
DISCREPANCIES_DB: Dict[str, VerificationDiscrepancy] = {}

def normalize_text(val: Optional[str]) -> str:
    """Standardizes string values: lowercase, stripped, removes non-alphanumeric separators."""
    if not val:
        return ""
    return "".join(c for c in val.lower() if c.isalnum())

def parse_iso_date(val: Optional[str]) -> Optional[date]:
    """Parses date string into datetime.date object for semantic comparison."""
    if not val:
        return None
    # Strip any ISO T timestamp
    val_clean = val.split("T")[0].strip()
    try:
        return datetime.strptime(val_clean, "%Y-%m-%d").date()
    except ValueError:
        return None

def detect_discrepancies(
    instrument_id: str,
    verification_id: str,
    submitted_data: Dict[str, Any],
    extracted_fields: Dict[str, ExtractedField],
) -> List[VerificationDiscrepancy]:
    """
    Compares submitted data with extracted OCR fields and generates
    persisted discrepancy records where mismatches exist.
    """
    discrepancies: List[VerificationDiscrepancy] = []
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. FDR Reference Number comparison
    sub_ref = str(submitted_data.get("fdrNumber", "")).strip()
    ext_ref = str(extracted_fields.get("reference_number", ExtractedField(value="", confidence=0)).value).strip()
    if ext_ref:
        if normalize_text(sub_ref) != normalize_text(ext_ref):
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                field_name="fdr_number",
                source_type="extracted",
                expected_value=sub_ref,
                observed_value=ext_ref,
                severity="CRITICAL",
                resolution_status="open",
                resolution_notes="Discrepancy detected: FDR reference number on scanned document differs from submitted value.",
                created_at=now_iso,
            )
            discrepancies.append(disc)

    # 2. Bank Name comparison
    sub_bank = str(submitted_data.get("bankName", "")).strip()
    ext_bank = str(extracted_fields.get("bank_name", ExtractedField(value="", confidence=0)).value).strip()
    if ext_bank:
        if normalize_text(sub_bank) != normalize_text(ext_bank):
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                field_name="bank_name",
                source_type="extracted",
                expected_value=sub_bank,
                observed_value=ext_bank,
                severity="CRITICAL",
                resolution_status="open",
                resolution_notes="Discrepancy detected: Issuing bank name on certificate differs from submitted record.",
                created_at=now_iso,
            )
            discrepancies.append(disc)

    # 3. Branch IFSC Code comparison
    sub_ifsc = str(submitted_data.get("ifscCode", "")).strip().upper()
    ext_ifsc = str(extracted_fields.get("ifsc_code", ExtractedField(value="", confidence=0)).value).strip().upper()
    if ext_ifsc:
        if sub_ifsc != ext_ifsc:
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                field_name="ifsc_code",
                source_type="extracted",
                expected_value=sub_ifsc,
                observed_value=ext_ifsc,
                severity="WARNING",
                resolution_status="open",
                resolution_notes="Discrepancy detected: Branch IFSC code mismatch between bank letter and application.",
                created_at=now_iso,
            )
            discrepancies.append(disc)

    # 4. Principal Amount comparison (semantic numerical comparison)
    try:
        sub_amt = float(submitted_data.get("principalAmount", 0))
    except (ValueError, TypeError):
        sub_amt = 0.0
        
    ext_amt_field = extracted_fields.get("amount")
    if ext_amt_field and ext_amt_field.value:
        try:
            ext_amt = float(ext_amt_field.value)
            if abs(sub_amt - ext_amt) > 1.0:  # Allow 1 rupee rounding tolerance
                disc = VerificationDiscrepancy(
                    verification_id=verification_id,
                    instrument_id=instrument_id,
                    field_name="principal_amount",
                    source_type="extracted",
                    expected_value=f"₹ {sub_amt:,.2f}",
                    observed_value=f"₹ {ext_amt:,.2f}",
                    severity="CRITICAL",
                    resolution_status="open",
                    resolution_notes=f"Discrepancy detected: Deposit value on physical receipt (₹ {ext_amt:,.2f}) does not match submitted value (₹ {sub_amt:,.2f}).",
                    created_at=now_iso,
                )
                discrepancies.append(disc)
        except (ValueError, TypeError):
            pass

    # 5. Issue Date comparison (semantic calendar comparison)
    sub_issue = parse_iso_date(submitted_data.get("issueDate") or submitted_data.get("depositDate"))
    ext_issue_field = extracted_fields.get("issue_date")
    if ext_issue_field and ext_issue_field.value:
        ext_issue = parse_iso_date(str(ext_issue_field.value))
        if sub_issue and ext_issue and sub_issue != ext_issue:
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                field_name="issue_date",
                source_type="extracted",
                expected_value=sub_issue.isoformat(),
                observed_value=ext_issue.isoformat(),
                severity="WARNING",
                resolution_status="open",
                resolution_notes="Discrepancy detected: Certificate issue date differs from submitted date.",
                created_at=now_iso,
            )
            discrepancies.append(disc)

    # 6. Maturity Date comparison (semantic calendar comparison)
    sub_mat = parse_iso_date(submitted_data.get("maturityDate"))
    ext_mat_field = extracted_fields.get("maturity_date")
    if ext_mat_field and ext_mat_field.value:
        ext_mat = parse_iso_date(str(ext_mat_field.value))
        if sub_mat and ext_mat and sub_mat != ext_mat:
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                field_name="maturity_date",
                source_type="extracted",
                expected_value=sub_mat.isoformat(),
                observed_value=ext_mat.isoformat(),
                severity="CRITICAL",
                resolution_status="open",
                resolution_notes="Discrepancy detected: Contractual maturity date on physical FDR differs from application.",
                created_at=now_iso,
            )
            discrepancies.append(disc)

    # Persist all detected discrepancies
    for d in discrepancies:
        DISCREPANCIES_DB[d.id] = d

    return discrepancies

def resolve_discrepancy(
    discrepancy_id: str,
    status: str,
    notes: str,
    resolver_user_id: str = "anil.verma@aicte.gov.in",
) -> Optional[VerificationDiscrepancy]:
    """
    Updates discrepancy resolution without deleting historical records.
    Permitted states: open, resolved, accepted_with_explanation, not_applicable.
    """
    disc = DISCREPANCIES_DB.get(discrepancy_id)
    if not disc:
        return None
    
    disc.resolution_status = status
    disc.resolution_notes = notes
    disc.resolved_by_user_id = resolver_user_id
    disc.resolved_at = datetime.now(timezone.utc).isoformat()
    return disc

def list_discrepancies_for_instrument(instrument_id: str) -> List[VerificationDiscrepancy]:
    """Lists all discrepancy records for a given instrument."""
    return [d for d in DISCREPANCIES_DB.values() if d.instrument_id == instrument_id]
