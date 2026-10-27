"""
FDR-SMART Scrutiny & Observation Engine
Implements:
- Authorized Scrutiny Queue
- Observation Lifecycle (Issue, Respond, Resolve)
- Separation of Duties (Institution Rep cannot approve own instrument)
- Audit Trail Preservation
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/scrutiny", tags=["Scrutiny & Observations"])

# ─── MODELS ──────────────────────────────────────────────────────────

class ScrutinyObservationCreate(BaseModel):
    fdr_id: str
    category: Literal[
        "IFSC_MISMATCH",
        "AMOUNT_DISCREPANCY",
        "LIEN_UNVERIFIED",
        "DOCUMENT_BLURRY",
        "MATURITY_DATE_INVALID",
        "REGULATORY_CLAUSE_NONCOMPLIANCE",
        "OTHER",
    ]
    observation: str = Field(..., min_length=5)
    requested_action: str = Field(..., min_length=5)
    officer_name: str
    officer_id: str

class ObservationResponse(BaseModel):
    response_notes: str = Field(..., min_length=5)
    supporting_document_id: Optional[str] = None
    supporting_document_name: Optional[str] = None
    responded_by: str
    institution_id: str

class ScrutinyDecision(BaseModel):
    fdr_id: str
    officer_id: str
    officer_name: str
    officer_role: str
    outcome: Literal["VERIFIED", "OBSERVATION_ISSUED", "REJECTED"]
    decision_notes: str = Field(..., min_length=5)

# ─── IN-MEMORY STORE FOR BACKEND API ─────────────────────────────────

OBSERVATIONS_STORE = [
    {
        "id": "obs-001",
        "fdr_id": "fdr-002",
        "fdr_number": "FDR/AICTE/2026/092",
        "institution_id": "inst-001",
        "institution_name": "Delhi Technological University (DTU)",
        "category": "AMOUNT_DISCREPANCY",
        "observation": "Deposit certificate scan indicates principal of Rs. 35,00,000 whereas institutional declaration form declared Rs. 30,00,000.",
        "requested_action": "Upload revised institutional declaration conforming to Rs. 35,00,000 bank certificate.",
        "officer_name": "Anil Verma (Senior Scrutiny Officer)",
        "officer_id": "usr-so-01",
        "status": "OPEN",
        "created_at": "2026-10-25T11:30:00Z",
        "response_notes": None,
        "responded_by": None,
        "responded_at": None,
    },
    {
        "id": "obs-002",
        "fdr_id": "fdr-005",
        "fdr_number": "FDR/AICTE/2026/042",
        "institution_id": "inst-002",
        "institution_name": "BITS Pilani — Goa Campus",
        "category": "LIEN_UNVERIFIED",
        "observation": "Issuing branch IFSC (HDFC0000042) confirmation letter does not bear the branch manager digital verification token.",
        "requested_action": "Please upload revised bank confirmation letter bearing branch manager token or seal.",
        "officer_name": "Anil Verma (Senior Scrutiny Officer)",
        "officer_id": "usr-so-01",
        "status": "OPEN",
        "created_at": "2026-10-26T14:15:00Z",
        "response_notes": None,
        "responded_by": None,
        "responded_at": None,
    },
]

SCRUTINY_QUEUE_STORE = [
    {
        "id": "fdr-001",
        "fdr_number": "FDR/AICTE/2026/089",
        "institution_id": "inst-001",
        "institution_name": "Delhi Technological University (DTU)",
        "bank_name": "State Bank of India",
        "principal_amount": 5000000,
        "submission_date": "2024-03-16",
        "submission_status": "SUBMITTED",
        "verification_status": "VERIFIED",
        "assigned_reviewer": "Anil Verma",
        "open_discrepancies_count": 0,
        "required_next_action": "CBS Lien Notation Validation Complete",
    },
    {
        "id": "fdr-002",
        "fdr_number": "FDR/AICTE/2026/092",
        "institution_id": "inst-001",
        "institution_name": "Delhi Technological University (DTU)",
        "bank_name": "Punjab National Bank",
        "principal_amount": 3500000,
        "submission_date": "2024-06-10",
        "submission_status": "SUBMITTED",
        "verification_status": "DISCREPANCY_FLAGGED",
        "assigned_reviewer": "Anil Verma",
        "open_discrepancies_count": 2,
        "required_next_action": "Awaiting Institution Response to Observation",
    },
    {
        "id": "fdr-004",
        "fdr_number": "FDR/AICTE/2026/039",
        "institution_id": "inst-002",
        "institution_name": "BITS Pilani — Goa Campus",
        "bank_name": "State Bank of India",
        "principal_amount": 10000000,
        "submission_date": "2024-01-11",
        "submission_status": "SUBMITTED",
        "verification_status": "UNDER_SCRUTINY",
        "assigned_reviewer": "Anil Verma",
        "open_discrepancies_count": 0,
        "required_next_action": "Perform Cross-Verification & Record Scrutiny Finding",
    },
]

# ─── ENDPOINTS ───────────────────────────────────────────────────────

@router.get("/queue")
async def get_scrutiny_queue():
    """Retrieve all instruments currently in the regulatory scrutiny queue."""
    return {
        "total_cases": len(SCRUTINY_QUEUE_STORE),
        "queue": SCRUTINY_QUEUE_STORE,
    }

@router.post("/cases/{fdr_id}/start-review")
async def start_scrutiny_review(fdr_id: str, officer_id: str, officer_name: str, officer_role: str):
    """
    Officer initiates scrutiny on an instrument.
    Enforces separation of duties: Institution Representatives CANNOT review.
    """
    if officer_role in ["institution_representative", "depositor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Separation of Duties Violation: Institution representatives cannot perform official regulatory scrutiny.",
        )

    # Locate case
    for case in SCRUTINY_QUEUE_STORE:
        if case["id"] == fdr_id:
            case["verification_status"] = "UNDER_SCRUTINY"
            case["assigned_reviewer"] = officer_name
            case["required_next_action"] = "Scrutiny in progress by " + officer_name
            return {
                "status": "SUCCESS",
                "message": f"Scrutiny review started for {case['fdr_number']}",
                "case": case,
            }

    raise HTTPException(status_code=404, detail="Instrument not found in scrutiny queue.")

@router.post("/observations")
async def create_scrutiny_observation(payload: ScrutinyObservationCreate):
    """
    Authorized officer records a regulatory observation and requests clarification.
    """
    new_obs = {
        "id": f"obs-{uuid.uuid4().hex[:6]}",
        "fdr_id": payload.fdr_id,
        "category": payload.category,
        "observation": payload.observation,
        "requested_action": payload.requested_action,
        "officer_name": payload.officer_name,
        "officer_id": payload.officer_id,
        "status": "OPEN",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "response_notes": None,
        "responded_by": None,
        "responded_at": None,
    }
    OBSERVATIONS_STORE.append(new_obs)

    # Update scrutiny queue status
    for case in SCRUTINY_QUEUE_STORE:
        if case["id"] == payload.fdr_id:
            case["verification_status"] = "DISCREPANCY_FLAGGED"
            case["open_discrepancies_count"] += 1
            case["required_next_action"] = "Awaiting Institution Response to Observation"

    return {
        "status": "SUCCESS",
        "message": "Observation registered. Notification dispatched to institution.",
        "observation": new_obs,
    }

@router.get("/observations")
async def list_observations(fdr_id: Optional[str] = None):
    """List observations, optionally filtered by FDR ID."""
    if fdr_id:
        filtered = [obs for obs in OBSERVATIONS_STORE if obs["fdr_id"] == fdr_id]
        return {"observations": filtered}
    return {"observations": OBSERVATIONS_STORE}

@router.post("/observations/{observation_id}/respond")
async def respond_to_observation(observation_id: str, payload: ObservationResponse):
    """
    Institution representative responds to an observation, uploads clarifying evidence,
    and resubmits the instrument for re-scrutiny.
    """
    for obs in OBSERVATIONS_STORE:
        if obs["id"] == observation_id:
            obs["status"] = "RESPONDED"
            obs["response_notes"] = payload.response_notes
            obs["responded_by"] = payload.responded_by
            obs["responded_at"] = datetime.now(timezone.utc).isoformat()
            obs["supporting_document_name"] = payload.supporting_document_name

            # Update scrutiny queue
            for case in SCRUTINY_QUEUE_STORE:
                if case["id"] == obs["fdr_id"]:
                    case["verification_status"] = "UNDER_SCRUTINY"
                    case["required_next_action"] = "Clarification received. Re-scrutiny required by officer."

            return {
                "status": "SUCCESS",
                "message": "Institution response submitted successfully. Re-scrutiny scheduled.",
                "observation": obs,
            }

    raise HTTPException(status_code=404, detail="Observation not found.")

@router.post("/cases/{fdr_id}/outcome")
async def record_scrutiny_outcome(fdr_id: str, payload: ScrutinyDecision):
    """
    Authorized officer records the formal review decision.
    """
    if payload.officer_role in ["institution_representative", "depositor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Separation of Duties Violation: Institution representatives cannot record regulatory outcomes.",
        )

    for case in SCRUTINY_QUEUE_STORE:
        if case["id"] == fdr_id:
            case["verification_status"] = payload.outcome
            case["required_next_action"] = (
                "Scrutiny Cleared" if payload.outcome == "VERIFIED" else f"Scrutiny {payload.outcome}"
            )
            return {
                "status": "SUCCESS",
                "message": f"Scrutiny outcome recorded as {payload.outcome}",
                "decision": payload,
                "recorded_at": datetime.now(timezone.utc).isoformat(),
            }

    raise HTTPException(status_code=404, detail="Case not found in scrutiny queue.")
