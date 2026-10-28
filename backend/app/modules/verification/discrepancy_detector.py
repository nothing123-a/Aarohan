"""
Rule-Based Discrepancy Detection & Regulatory Validation Engine
Compares automated OCR extracted values against submitted instrument records according
to PRD.md Section 4, DATABASE.md Section 5.8, and regulatory scrutiny rules.
Normalizes amounts, dates, and bank names before comparison.
"""
import uuid
from datetime import datetime, timezone, date
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.modules.document_processing.ocr_service import ExtractedField
from app.core.database import SessionLocal
from app.core.models import (
    VerificationDiscrepancy as VerificationDiscrepancyModel,
    InstrumentVerification as InstrumentVerificationModel,
    AuditEvent as AuditEventModel,
)

class RegulatoryPolicyConfig(BaseModel):
    """
    Configurable, versioned regulatory scrutiny policy parameters.
    Does not assume every FDR has identical lock-in periods or terms.
    """
    version: str = "2026.1"
    require_scheduled_bank: bool = True
    require_aicte_lien: bool = True
    min_confidence_threshold: float = 70.0
    amount_tolerance_inr: float = 1.0  # 1 rupee rounding tolerance
    require_supporting_bank_letter: bool = False
    flag_missing_policy_for_human_review: bool = True

DEFAULT_POLICY = RegulatoryPolicyConfig()

class VerificationDiscrepancy(BaseModel):
    id: str = Field(default_factory=lambda: f"disc-{uuid.uuid4()}")
    verification_id: str
    instrument_id: str
    category: str = "GENERAL"  # "AMOUNT_MISMATCH", "IDENTIFIER_MISMATCH", "IFSC_MISMATCH", "PARTY_MISMATCH", "CALENDAR_MISMATCH", "LIEN_MISSING", "SEQUENCE_ERROR", "LOW_CONFIDENCE", "POLICY_REVIEW"
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
    category: Optional[str] = None
    confidence: float = 100.0

# In-memory discrepancy storage (DATABASE.md verification_discrepancies table)
DISCREPANCIES_DB: Dict[str, VerificationDiscrepancy] = {}

def format_indian_currency(amt: float) -> str:
    """Formats a float amount into Indian currency format (e.g. ₹ 50,00,000.00)."""
    s = f"{amt:.2f}"
    parts = s.split(".")
    integer_part = parts[0]
    decimal_part = parts[1]
    if len(integer_part) <= 3:
        return f"₹ {integer_part}.{decimal_part}"
    last_three = integer_part[-3:]
    other_digits = integer_part[:-3]
    res = ""
    while len(other_digits) > 2:
        res = "," + other_digits[-2:] + res
        other_digits = other_digits[:-2]
    res = other_digits + res + "," + last_three + "." + decimal_part
    return f"₹ {res}"

def normalize_text(val: Optional[str]) -> str:
    """Standardizes string values: lowercase, stripped, removes non-alphanumeric separators."""
    if not val:
        return ""
    return "".join(c for c in val.lower() if c.isalnum())

def parse_iso_date(val: Optional[str]) -> Optional[date]:
    """Parses date string into datetime.date object for semantic comparison."""
    if not val:
        return None
    val_clean = val.split("T")[0].strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(val_clean, fmt).date()
        except ValueError:
            pass
    return None

def detect_discrepancies(
    instrument_id: str,
    verification_id: str,
    submitted_data: Dict[str, Any],
    extracted_fields: Dict[str, ExtractedField],
    policy: RegulatoryPolicyConfig = DEFAULT_POLICY,
    db: Optional[Session] = None,
) -> List[VerificationDiscrepancy]:
    """
    Compares submitted data with extracted OCR fields across 10 verification rules.
    Persists discrepancies into the database and audit trail.
    """
    discrepancies: List[VerificationDiscrepancy] = []
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()

    # 1. FDR Reference Number comparison
    sub_ref = str(submitted_data.get("fdrNumber") or submitted_data.get("referenceNumber") or "").strip()
    ext_ref_field = extracted_fields.get("reference_number")
    ext_ref = str(ext_ref_field.value).strip() if ext_ref_field else ""
    if ext_ref and sub_ref:
        if normalize_text(sub_ref) != normalize_text(ext_ref):
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                category="IDENTIFIER_MISMATCH",
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
    sub_bank = str(submitted_data.get("bankName") or "").strip()
    ext_bank_field = extracted_fields.get("bank_name")
    ext_bank = str(ext_bank_field.value).strip() if ext_bank_field else ""
    if ext_bank and sub_bank:
        if normalize_text(sub_bank) != normalize_text(ext_bank):
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                category="INSTITUTION_MISMATCH",
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
    sub_ifsc = str(submitted_data.get("ifscCode") or "").strip().upper()
    ext_ifsc_field = extracted_fields.get("ifsc_code")
    ext_ifsc = str(ext_ifsc_field.value).strip().upper() if ext_ifsc_field else ""
    if ext_ifsc and sub_ifsc:
        if sub_ifsc != ext_ifsc:
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                category="IFSC_MISMATCH",
                field_name="ifsc_code",
                source_type="extracted",
                expected_value=sub_ifsc,
                observed_value=ext_ifsc,
                severity="WARNING",
                resolution_status="open",
                resolution_notes="Discrepancy detected: Branch IFSC code mismatch between bank document and application record.",
                created_at=now_iso,
            )
            discrepancies.append(disc)

    # 4. Depositor Name comparison
    sub_depositor = str(submitted_data.get("institutionName") or submitted_data.get("depositorName") or "").strip()
    ext_depositor_field = extracted_fields.get("depositor_name")
    if ext_depositor_field and ext_depositor_field.value and sub_depositor:
        ext_depositor = str(ext_depositor_field.value).strip()
        # Normalized substring match check
        norm_sub = normalize_text(sub_depositor)
        norm_ext = normalize_text(ext_depositor)
        if norm_sub and norm_ext and (norm_sub not in norm_ext and norm_ext not in norm_sub):
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                category="PARTY_MISMATCH",
                field_name="depositor_name",
                source_type="extracted",
                expected_value=sub_depositor,
                observed_value=ext_depositor,
                severity="CRITICAL",
                resolution_status="open",
                resolution_notes=f"Discrepancy detected: Depositor name on receipt ('{ext_depositor}') does not match institution name ('{sub_depositor}').",
                created_at=now_iso,
            )
            discrepancies.append(disc)

    # 5. Principal Amount comparison (semantic numerical comparison)
    try:
        sub_amt = float(submitted_data.get("principalAmount") or submitted_data.get("amount") or 0)
    except (ValueError, TypeError):
        sub_amt = 0.0
        
    ext_amt_field = extracted_fields.get("amount")
    if ext_amt_field and ext_amt_field.value is not None:
        try:
            ext_amt = float(ext_amt_field.value)
            if abs(sub_amt - ext_amt) > policy.amount_tolerance_inr:
                disc = VerificationDiscrepancy(
                    verification_id=verification_id,
                    instrument_id=instrument_id,
                    category="AMOUNT_MISMATCH",
                    field_name="principal_amount",
                    source_type="extracted",
                    expected_value=format_indian_currency(sub_amt),
                    observed_value=format_indian_currency(ext_amt),
                    severity="CRITICAL",
                    resolution_status="open",
                    resolution_notes=f"Discrepancy detected: Deposit value on physical receipt ({format_indian_currency(ext_amt)}) does not match submitted value ({format_indian_currency(sub_amt)}).",
                    created_at=now_iso,
                )
                discrepancies.append(disc)
        except (ValueError, TypeError):
            pass

    # 6. Issue / Deposit Date comparison (semantic calendar comparison)
    sub_issue = parse_iso_date(submitted_data.get("issueDate") or submitted_data.get("depositDate"))
    ext_issue_field = extracted_fields.get("issue_date")
    ext_issue = parse_iso_date(str(ext_issue_field.value)) if ext_issue_field and ext_issue_field.value else None
    if sub_issue and ext_issue and sub_issue != ext_issue:
        disc = VerificationDiscrepancy(
            verification_id=verification_id,
            instrument_id=instrument_id,
            category="CALENDAR_MISMATCH",
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

    # 7. Maturity Date comparison (semantic calendar comparison)
    sub_mat = parse_iso_date(submitted_data.get("maturityDate"))
    ext_mat_field = extracted_fields.get("maturity_date")
    ext_mat = parse_iso_date(str(ext_mat_field.value)) if ext_mat_field and ext_mat_field.value else None
    if sub_mat and ext_mat and sub_mat != ext_mat:
        disc = VerificationDiscrepancy(
            verification_id=verification_id,
            instrument_id=instrument_id,
            category="CALENDAR_MISMATCH",
            field_name="maturity_date",
            source_type="extracted",
            expected_value=sub_mat.isoformat(),
            observed_value=ext_mat.isoformat(),
            severity="CRITICAL",
            resolution_status="open",
            resolution_notes="Discrepancy detected: Contractual maturity date on physical FDR differs from application record.",
            created_at=now_iso,
        )
        discrepancies.append(disc)

    # 8. Date Sequence Validation: Issue Date must be strictly before Maturity Date
    active_issue = ext_issue or sub_issue
    active_mat = ext_mat or sub_mat
    if active_issue and active_mat and active_issue >= active_mat:
        disc = VerificationDiscrepancy(
            verification_id=verification_id,
            instrument_id=instrument_id,
            category="SEQUENCE_ERROR",
            field_name="date_sequence",
            source_type="extracted",
            expected_value="Deposit Date < Maturity Date",
            observed_value=f"Deposit {active_issue.isoformat()} >= Maturity {active_mat.isoformat()}",
            severity="CRITICAL",
            resolution_status="open",
            resolution_notes="Invalid date sequence detected: Certificate issue date is on or after the contractual maturity date.",
            created_at=now_iso,
        )
        discrepancies.append(disc)

    # 9. Lien Beneficiary & Endorsement Clause Validation
    if policy.require_aicte_lien:
        lien_field = extracted_fields.get("lien_endorsement") or extracted_fields.get("lien_beneficiary")
        if not lien_field or not lien_field.value:
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                category="LIEN_MISSING",
                field_name="lien_endorsement",
                source_type="extracted",
                expected_value="Lien marked in favour of Member Secretary, AICTE, New Delhi",
                observed_value="No valid lien endorsement clause detected on document",
                severity="CRITICAL",
                resolution_status="open",
                resolution_notes="Regulatory discrepancy: Mandatory AICTE lien endorsement text was not detected on the fixed deposit certificate.",
                created_at=now_iso,
            )
            discrepancies.append(disc)
        elif "missing" in str(lien_field.value).lower() or "token missing" in str(lien_field.value).lower():
            disc = VerificationDiscrepancy(
                verification_id=verification_id,
                instrument_id=instrument_id,
                category="LIEN_MISSING",
                field_name="lien_endorsement",
                source_type="extracted",
                expected_value="Valid branch manager endorsement signature token",
                observed_value=str(lien_field.value),
                severity="CRITICAL",
                resolution_status="open",
                resolution_notes="Regulatory discrepancy: Bank branch lien endorsement signature token is missing or incomplete.",
                created_at=now_iso,
            )
            discrepancies.append(disc)

    # 10. Low Confidence OCR Result Check
    confidence_scores = [f.confidence for f in extracted_fields.values()]
    avg_confidence = (sum(confidence_scores) / len(confidence_scores) * 100) if confidence_scores else 0.0
    if avg_confidence < policy.min_confidence_threshold and len(extracted_fields) > 0:
        disc = VerificationDiscrepancy(
            verification_id=verification_id,
            instrument_id=instrument_id,
            category="LOW_CONFIDENCE",
            field_name="ocr_confidence",
            source_type="extracted",
            expected_value=f"Confidence >= {policy.min_confidence_threshold:.1f}%",
            observed_value=f"{avg_confidence:.1f}%",
            severity="WARNING",
            resolution_status="open",
            resolution_notes=f"Low OCR confidence ({avg_confidence:.1f}%): Document image has poor legibility or artifacts; requires careful manual officer scrutiny.",
            created_at=now_iso,
        )
        discrepancies.append(disc)

    # Persist all detected discrepancies in database and memory
    close_db = False
    if db is None:
        try:
            db = SessionLocal()
            close_db = True
        except Exception:
            db = None

    if db is not None:
        try:
            # Ensure parent verification record exists in DB
            parent_verif = db.query(InstrumentVerificationModel).filter(InstrumentVerificationModel.id == verification_id).first()
            if not parent_verif:
                parent_verif = InstrumentVerificationModel(
                    id=verification_id,
                    instrument_id=instrument_id,
                    reviewed_by_user_id="user-scrutiny-officer",
                    outcome="discrepancy_found" if discrepancies else "verified",
                    review_notes=f"Automated rule-based verification: {len(discrepancies)} discrepancies flagged.",
                    reviewed_at=now_dt,
                    created_at=now_dt,
                )
                db.add(parent_verif)
                db.commit()

            for d in discrepancies:
                db_disc = VerificationDiscrepancyModel(
                    id=d.id,
                    verification_id=verification_id,
                    field_name=d.field_name,
                    source_type=d.source_type,
                    expected_value=d.expected_value,
                    observed_value=d.observed_value,
                    resolution_status=d.resolution_status,
                    resolution_notes=f"[{d.severity}] [{d.category}] {d.resolution_notes}",
                    resolved_by_user_id=d.resolved_by_user_id,
                    resolved_at=None,
                    created_at=now_dt,
                )
                db.add(db_disc)
            db.commit()
        except Exception:
            if db:
                db.rollback()
        finally:
            if close_db and db:
                db.close()

    for d in discrepancies:
        DISCREPANCIES_DB[d.id] = d

    return discrepancies

def resolve_discrepancy(
    discrepancy_id: str,
    status: str,
    notes: str,
    resolver_user_id: str = "anil.verma@aicte.gov.in",
    db: Optional[Session] = None,
) -> Optional[VerificationDiscrepancy]:
    """
    Updates discrepancy resolution without deleting historical records.
    Permitted states: open, resolved, accepted_with_explanation, not_applicable.
    Records audit event.
    """
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    disc = DISCREPANCIES_DB.get(discrepancy_id)
    
    close_db = False
    if db is None:
        try:
            db = SessionLocal()
            close_db = True
        except Exception:
            db = None

    if db is not None:
        try:
            row = db.query(VerificationDiscrepancyModel).filter(VerificationDiscrepancyModel.id == discrepancy_id).first()
            if row:
                row.resolution_status = status
                row.resolution_notes = notes
                row.resolved_by_user_id = resolver_user_id
                row.resolved_at = now_dt

                # Record Audit Event
                audit = AuditEventModel(
                    id=f"audit-{uuid.uuid4()}",
                    actor_user_id=resolver_user_id,
                    instrument_id=disc.instrument_id if disc else None,
                    action="DISCREPANCY_RESOLVED",
                    entity_type="verification_discrepancies",
                    entity_id=discrepancy_id,
                    outcome="success",
                    details={
                        "new_status": status,
                        "resolution_notes": notes,
                        "resolved_by": resolver_user_id,
                    },
                    occurred_at=now_dt,
                )
                db.add(audit)
                db.commit()
                db.refresh(row)
        except Exception:
            if db:
                db.rollback()
        finally:
            if close_db and db:
                db.close()

    if disc:
        disc.resolution_status = status
        disc.resolution_notes = notes
        disc.resolved_by_user_id = resolver_user_id
        disc.resolved_at = now_iso
        return disc

    return None

def list_discrepancies_for_instrument(instrument_id: str, db: Optional[Session] = None) -> List[VerificationDiscrepancy]:
    """Lists all discrepancy records for a given instrument from DB and memory."""
    results: List[VerificationDiscrepancy] = []
    close_db = False
    if db is None:
        try:
            db = SessionLocal()
            close_db = True
        except Exception:
            db = None
            
    if db is not None:
        try:
            rows = (
                db.query(VerificationDiscrepancyModel)
                .join(InstrumentVerificationModel, VerificationDiscrepancyModel.verification_id == InstrumentVerificationModel.id)
                .filter(InstrumentVerificationModel.instrument_id == instrument_id)
                .all()
            )
            for r in rows:
                notes = r.resolution_notes or ""
                # Parse category and severity from resolution_notes tag if present
                sev = "CRITICAL"
                cat = "GENERAL"
                if notes.startswith("["):
                    parts = notes.split("] ")
                    if len(parts) >= 2:
                        tags = parts[0].strip("[").split("] [")
                        if len(tags) >= 1:
                            sev = tags[0]
                        if len(tags) >= 2:
                            cat = tags[1]
                disc = VerificationDiscrepancy(
                    id=r.id,
                    verification_id=r.verification_id,
                    instrument_id=instrument_id,
                    category=cat,
                    field_name=r.field_name,
                    source_type=r.source_type,
                    expected_value=r.expected_value,
                    observed_value=r.observed_value,
                    severity=sev,
                    resolution_status=r.resolution_status,
                    resolution_notes=r.resolution_notes,
                    resolved_by_user_id=r.resolved_by_user_id,
                    resolved_at=r.resolved_at.isoformat() if r.resolved_at else None,
                    created_at=r.created_at.isoformat() if r.created_at else "",
                )
                results.append(disc)
                DISCREPANCIES_DB[disc.id] = disc
        except Exception:
            pass
        finally:
            if close_db and db:
                db.close()

    for d in DISCREPANCIES_DB.values():
        if d.instrument_id == instrument_id and not any(r.id == d.id for r in results):
            results.append(d)

    return results
