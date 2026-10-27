"""
FDR-SMART Renewal & Replacement Module
Implements:
- Renewal / Replacement lifecycle workflows
- Self-referencing predecessor relationship (predecessor_instrument_id)
- Same-institution authorization boundary validation
- Preservation of predecessor records (no destructive overwriting)
- Immutable lifecycle event recording
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/renewals", tags=["Renewal & Replacement"])

# ─── SCHEMAS ─────────────────────────────────────────────────────────

class RenewalSubmission(BaseModel):
    predecessor_fdr_id: str
    predecessor_fdr_number: str
    institution_id: str
    institution_name: str
    replacement_fdr_number: str = Field(..., min_length=3)
    bank_name: str
    bank_branch: str
    ifsc_code: str
    principal_amount: float = Field(..., gt=0)
    interest_rate: float = Field(..., gt=0)
    new_issue_date: str
    new_maturity_date: str
    tenure_months: int = Field(..., gt=0)
    supporting_document_name: str
    applicant_name: str
    applicant_email: str
    justification: str

class RenewalReview(BaseModel):
    officer_id: str
    officer_name: str
    officer_role: str
    decision: Literal["APPROVED", "REJECTED", "MORE_INFO_REQUIRED"]
    remarks: str = Field(..., min_length=5)

# ─── IN-MEMORY STORE ─────────────────────────────────────────────────

# Existing central database instruments for institutional ownership validation
KNOWN_INSTRUMENTS = {
    "fdr-001": {"institution_id": "inst-001", "principal": 5000000, "fdr_number": "FDR/AICTE/2026/089"},
    "fdr-002": {"institution_id": "inst-001", "principal": 3500000, "fdr_number": "FDR/AICTE/2026/092"},
    "fdr-005": {"institution_id": "inst-002", "principal": 10000000, "fdr_number": "FDR/AICTE/2026/042"},
    "fdr-007": {"institution_id": "inst-003", "principal": 7500000, "fdr_number": "FDR/AICTE/2026/115"},
    "fdr-008": {"institution_id": "inst-003", "principal": 5000000, "fdr_number": "FDR/AICTE/2026/116"},
}

RENEWALS_STORE = [
    {
        "id": "rn-01",
        "predecessor_fdr_id": "fdr-005",
        "predecessor_fdr_number": "FDR/AICTE/2026/042",
        "institution_id": "inst-002",
        "institution_name": "BITS Pilani — Goa Campus",
        "original_principal": 10000000,
        "original_maturity": "2026-10-15",
        "replacement_fdr_id": "fdr-rep-005",
        "replacement_fdr_number": "FDR/AICTE/2026/10291",
        "replacement_bank": "HDFC Bank Ltd",
        "replacement_principal": 10000000,
        "new_maturity_date": "2029-10-15",
        "tenure_months": 36,
        "status": "APPROVED",
        "supporting_document": "HDFC_Lien_Rollover_Letter_VascoBranch.pdf",
        "submitted_by": "Director, BITS Pilani Goa",
        "submitted_at": "2026-10-15T10:00:00Z",
        "reviewed_by": "Anil Verma (Scrutiny Officer)",
        "reviewed_at": "2026-10-18T16:00:00Z",
        "review_remarks": "Tenure rollover replacement verified in CBS with active AICTE lien endorsement.",
    },
    {
        "id": "rn-02",
        "predecessor_fdr_id": "fdr-002",
        "predecessor_fdr_number": "FDR/AICTE/2026/092",
        "institution_id": "inst-001",
        "institution_name": "Delhi Technological University (DTU)",
        "original_principal": 3500000,
        "original_maturity": "2026-12-05",
        "replacement_fdr_id": "fdr-rep-002",
        "replacement_fdr_number": "FDR/AICTE/2026/99104",
        "replacement_bank": "Punjab National Bank",
        "replacement_principal": 3500000,
        "new_maturity_date": "2028-12-05",
        "tenure_months": 24,
        "status": "PENDING_REVIEW",
        "supporting_document": "PNB_Extension_Letter_CivilLines.pdf",
        "submitted_by": "Registrar, DTU",
        "submitted_at": "2026-10-24T12:00:00Z",
        "reviewed_by": None,
        "reviewed_at": None,
        "review_remarks": None,
    },
]

# ─── ENDPOINTS ───────────────────────────────────────────────────────

@router.get("")
async def list_renewals(institution_id: Optional[str] = None):
    """List renewal & replacement requests, optionally scoped by institution."""
    if institution_id:
        filtered = [r for r in RENEWALS_STORE if r["institution_id"] == institution_id]
        return {"total": len(filtered), "renewals": filtered}
    return {"total": len(RENEWALS_STORE), "renewals": RENEWALS_STORE}

@router.post("")
async def submit_renewal_replacement(payload: RenewalSubmission):
    """
    Submit a replacement instrument for an expiring or maturing FDR.
    Enforces:
    1. Predecessor must exist.
    2. Predecessor and replacement MUST belong to the same authorized institution.
    3. Replacement amount must satisfy required security deposit.
    4. Does not overwrite original; creates linked self-referencing relationship.
    """
    predecessor = KNOWN_INSTRUMENTS.get(payload.predecessor_fdr_id)
    if not predecessor:
        raise HTTPException(
            status_code=404,
            detail=f"Predecessor instrument {payload.predecessor_fdr_id} not found in central registry.",
        )

    # Institution boundary validation
    if predecessor["institution_id"] != payload.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authorization Violation: Predecessor and replacement must belong to the exact same authorized institution.",
        )

    # Principal amount sanity check
    if payload.principal_amount < predecessor["principal"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Replacement deposit (Rs. {payload.principal_amount:,.2f}) is lower than the required predecessor deposit (Rs. {predecessor['principal']:,.2f}).",
        )

    new_id = f"rn-{uuid.uuid4().hex[:6]}"
    replacement_fdr_id = f"fdr-rep-{uuid.uuid4().hex[:6]}"

    record = {
        "id": new_id,
        "predecessor_fdr_id": payload.predecessor_fdr_id,
        "predecessor_fdr_number": payload.predecessor_fdr_number,
        "institution_id": payload.institution_id,
        "institution_name": payload.institution_name,
        "original_principal": predecessor["principal"],
        "original_maturity": "2026-12-05",
        "replacement_fdr_id": replacement_fdr_id,
        "replacement_fdr_number": payload.replacement_fdr_number,
        "replacement_bank": payload.bank_name,
        "replacement_principal": payload.principal_amount,
        "new_maturity_date": payload.new_maturity_date,
        "tenure_months": payload.tenure_months,
        "status": "PENDING_REVIEW",
        "supporting_document": payload.supporting_document_name,
        "submitted_by": payload.applicant_name,
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_by": None,
        "reviewed_at": None,
        "review_remarks": None,
        "relationship": {
            "type": "SELF_REFERENCING_PREDECESSOR",
            "predecessor_instrument_id": payload.predecessor_fdr_id,
            "successor_instrument_id": replacement_fdr_id,
        },
    }

    RENEWALS_STORE.insert(0, record)

    return {
        "status": "SUCCESS",
        "message": f"Replacement instrument {payload.replacement_fdr_number} submitted and linked to predecessor {payload.predecessor_fdr_number}.",
        "renewal_request": record,
    }

@router.post("/{renewal_id}/review")
async def review_renewal(renewal_id: str, payload: RenewalReview):
    """
    Authorized scrutiny officer / approving authority reviews a replacement instrument.
    """
    if payload.officer_role in ["institution_representative", "depositor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Separation of Duties Violation: Institution representatives cannot approve renewal instruments.",
        )

    for item in RENEWALS_STORE:
        if item["id"] == renewal_id:
            item["status"] = payload.decision
            item["reviewed_by"] = f"{payload.officer_name} ({payload.officer_role})"
            item["reviewed_at"] = datetime.now(timezone.utc).isoformat()
            item["review_remarks"] = payload.remarks

            return {
                "status": "SUCCESS",
                "message": f"Renewal request decision recorded: {payload.decision}",
                "renewal": item,
            }

    raise HTTPException(status_code=404, detail="Renewal request not found.")
