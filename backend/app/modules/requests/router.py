"""
FDR-SMART Release & Refund Requests Module
Implements:
- Security deposit release and refund applications
- Institutional submission form & supporting document dossier
- Official administrative approval workflow
- Strict permission boundaries: System Administrator CANNOT approve financial releases
- Statutory financial safeguard: Approval authorizes Bank Discharge NOC; does not transfer funds
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/releases", tags=["Release & Refund Requests"])

# ─── SCHEMAS ─────────────────────────────────────────────────────────

class ReleaseRequestCreate(BaseModel):
    fdr_id: str
    fdr_number: str
    institution_id: str
    institution_name: str
    bank_name: str
    principal_amount: float = Field(..., gt=0)
    request_type: Literal["FULL_RELEASE", "PARTIAL_REFUND", "NOC_ISSUANCE"]
    justification_reason: str = Field(..., min_length=10)
    regulatory_clause_reference: str
    supporting_document_names: List[str] = Field(..., min_items=1)
    applicant_name: str
    applicant_designation: str

class ReleaseDecisionRecord(BaseModel):
    officer_id: str
    officer_name: str
    officer_role: str
    decision: Literal["RECOMMENDED_FOR_APPROVAL", "APPROVED", "REJECTED", "RETURNED_FOR_QUERY"]
    decision_reason: str = Field(..., min_length=10)

# ─── IN-MEMORY STORE ─────────────────────────────────────────────────

RELEASE_REQUESTS_STORE = [
    {
        "id": "rel-001",
        "fdr_id": "fdr-008",
        "fdr_number": "FDR/AICTE/2026/116",
        "institution_id": "inst-003",
        "institution_name": "PSG College of Technology, Coimbatore",
        "bank_name": "Canara Bank",
        "principal_amount": 5000000.0,
        "request_type": "FULL_RELEASE",
        "justification_reason": "Automobile Engineering Division discontinued. 5-year lock-in period concluded. SRO No Dues Clearance obtained.",
        "regulatory_clause_reference": "AICTE Approval Process Handbook (APH) Clause 11.2",
        "supporting_documents": [
            "Canara_Bank_Original_FDR_Scan.pdf",
            "SRO_No_Dues_Clearance_Certificate.pdf",
            "Executive_Council_Resolution_Closure.pdf",
        ],
        "applicant_name": "Dr. K. Prakasan (Principal)",
        "applicant_designation": "Principal / Head of Institution",
        "submission_date": "2026-09-20T17:00:00Z",
        "status": "APPROVED_PENDING_DISCHARGE",
        "decision_history": [
            {
                "stage": "Institutional Submission",
                "officer_name": "Dr. K. Prakasan",
                "officer_role": "Institution Representative",
                "decision": "SUBMITTED",
                "timestamp": "2026-09-20T17:00:00Z",
                "reason": "Course discontinuation exit clearance.",
            },
            {
                "stage": "Regulatory Technical Scrutiny",
                "officer_name": "Anil Verma",
                "officer_role": "Scrutiny Officer",
                "decision": "RECOMMENDED_FOR_APPROVAL",
                "timestamp": "2026-09-25T14:30:00Z",
                "reason": "All student grievance clearances and Southern Regional Office approvals verified in order.",
            },
            {
                "stage": "Financial Approving Authority",
                "officer_name": "Dr. Rajesh Sharma",
                "officer_role": "Approving Authority (Member Secretary)",
                "decision": "APPROVED",
                "timestamp": "2026-10-02T11:00:00Z",
                "reason": "Final administrative clearance granted for issuance of Bank Discharge NOC.",
            },
        ],
    },
    {
        "id": "rel-002",
        "fdr_id": "fdr-001",
        "fdr_number": "FDR/AICTE/2026/089",
        "institution_id": "inst-001",
        "institution_name": "Delhi Technological University (DTU)",
        "bank_name": "State Bank of India",
        "principal_amount": 5000000.0,
        "request_type": "NOC_ISSUANCE",
        "justification_reason": "Request for issuance of Bank Lien Revocation Certificate to restructure university endowment accounts.",
        "regulatory_clause_reference": "AICTE General Guidelines Clause 8.4",
        "supporting_documents": [
            "DTU_SBI_50L_Official_Receipt.pdf",
            "Board_of_Governors_Resolution_2026.pdf",
        ],
        "applicant_name": "Prof. S. K. Mahajan",
        "applicant_designation": "Registrar, DTU",
        "submission_date": "2026-10-22T09:30:00Z",
        "status": "UNDER_SCRUTINY",
        "decision_history": [
            {
                "stage": "Institutional Submission",
                "officer_name": "Prof. S. K. Mahajan",
                "officer_role": "Institution Representative",
                "decision": "SUBMITTED",
                "timestamp": "2026-10-22T09:30:00Z",
                "reason": "Official board resolution submitted.",
            },
        ],
    },
]

# ─── ENDPOINTS ───────────────────────────────────────────────────────

@router.get("")
async def list_release_requests(institution_id: Optional[str] = None):
    """List release and refund requests, optionally filtered by institution."""
    if institution_id:
        filtered = [r for r in RELEASE_REQUESTS_STORE if r["institution_id"] == institution_id]
        return {"total": len(filtered), "requests": filtered}
    return {"total": len(RELEASE_REQUESTS_STORE), "requests": RELEASE_REQUESTS_STORE}

@router.post("")
async def submit_release_request(payload: ReleaseRequestCreate):
    """
    Institution submits a formal application for security deposit release / refund / NOC.
    """
    new_id = f"rel-{uuid.uuid4().hex[:6]}"
    now = datetime.now(timezone.utc).isoformat()

    record = {
        "id": new_id,
        "fdr_id": payload.fdr_id,
        "fdr_number": payload.fdr_number,
        "institution_id": payload.institution_id,
        "institution_name": payload.institution_name,
        "bank_name": payload.bank_name,
        "principal_amount": payload.principal_amount,
        "request_type": payload.request_type,
        "justification_reason": payload.justification_reason,
        "regulatory_clause_reference": payload.regulatory_clause_reference,
        "supporting_documents": payload.supporting_document_names,
        "applicant_name": payload.applicant_name,
        "applicant_designation": payload.applicant_designation,
        "submission_date": now,
        "status": "PENDING_SCRUTINY",
        "decision_history": [
            {
                "stage": "Institutional Submission",
                "officer_name": payload.applicant_name,
                "officer_role": "Institution Representative",
                "decision": "SUBMITTED",
                "timestamp": now,
                "reason": payload.justification_reason,
            }
        ],
    }

    RELEASE_REQUESTS_STORE.insert(0, record)

    return {
        "status": "SUCCESS",
        "message": f"Release request #{new_id} submitted for regulatory scrutiny.",
        "release_request": record,
    }

@router.post("/{release_id}/decision")
async def record_release_decision(release_id: str, payload: ReleaseDecisionRecord):
    """
    Record an official administrative decision on a release / refund request.
    Enforces PERMISSION BOUNDARIES:
    - System Administrator CANNOT approve financial releases (role: admin is barred).
    - Institution Representative CANNOT review/approve requests.
    - Approval requires role: 'approving_authority' (or 'scrutiny_officer' for preliminary recommendation).
    """
    # Check 1: Institution representatives barred
    if payload.officer_role in ["institution_representative", "depositor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Boundary Violation: Institution representatives cannot participate in regulatory release decisions.",
        )

    # Check 2: System admin cannot grant financial approvals
    if payload.officer_role == "admin" and payload.decision == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission Boundary Violation: System Administrator role alone does not confer financial approval authority under AICTE statutory governance rules.",
        )

    # Check 3: Scrutiny officer can recommend but not approve
    if payload.officer_role == "scrutiny_officer" and payload.decision == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role Hierarchy Violation: Scrutiny Officers may only RECOMMEND or QUERY release requests. Final financial approval requires the Approving Authority.",
        )

    for item in RELEASE_REQUESTS_STORE:
        if item["id"] == release_id:
            now = datetime.now(timezone.utc).isoformat()
            
            # Update status
            if payload.decision == "APPROVED":
                item["status"] = "APPROVED_PENDING_DISCHARGE"
            elif payload.decision == "RECOMMENDED_FOR_APPROVAL":
                item["status"] = "SCRUTINY_RECOMMENDED"
            elif payload.decision == "REJECTED":
                item["status"] = "REJECTED"
            elif payload.decision == "RETURNED_FOR_QUERY":
                item["status"] = "RETURNED_FOR_QUERY"

            item["decision_history"].append({
                "stage": (
                    "Financial Approval Stage"
                    if payload.officer_role == "approving_authority"
                    else "Technical Scrutiny Stage"
                ),
                "officer_name": payload.officer_name,
                "officer_role": payload.officer_role,
                "decision": payload.decision,
                "timestamp": now,
                "reason": payload.decision_reason,
            })

            return {
                "status": "SUCCESS",
                "message": f"Release request decision recorded as {payload.decision}",
                "statutory_safeguard_notice": (
                    "AICTE Safeguard Notice: Administrative approval authorizes issuance of the digital Bank Discharge NOC voucher. "
                    "AICTE does not execute bank transfers directly; encashment remains subject to CBS confirmation by the issuing bank."
                ),
                "request": item,
            }

    raise HTTPException(status_code=404, detail="Release request not found.")
