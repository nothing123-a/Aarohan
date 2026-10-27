"""
Verification & Technical Scrutiny API Endpoints
Provides endpoints for human review workspaces, rule-based discrepancy checking,
and discrepancy resolution according to PRD.md Section 4 and DATABASE.md Section 5.8.
"""
from fastapi import APIRouter, HTTPException, Body, status
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.modules.verification.discrepancy_detector import (
    detect_discrepancies,
    resolve_discrepancy,
    list_discrepancies_for_instrument,
    VerificationDiscrepancy,
    DISCREPANCIES_DB,
)
from app.modules.document_processing.ocr_service import (
    get_latest_extraction_run,
    extract_fields_from_text,
    ExtractedField,
)
from app.modules.documents.storage import list_documents_for_instrument

router = APIRouter(prefix="/verification", tags=["verification"])

class DiscrepancyResolutionRequest(BaseModel):
    status: str  # "open", "resolved", "accepted_with_explanation", "not_applicable"
    resolution_notes: str
    resolver_user_id: Optional[str] = "anil.verma@aicte.gov.in"

class RunDiscrepancyCheckRequest(BaseModel):
    instrument_id: str
    verification_id: str
    submitted_data: Dict[str, Any]
    ocr_raw_text: Optional[str] = None
    extracted_fields: Optional[Dict[str, Any]] = None

@router.post("/run-discrepancy-check", response_model=List[VerificationDiscrepancy])
async def run_discrepancy_check(payload: RunDiscrepancyCheckRequest):
    """
    Executes rule-based discrepancy detection comparing submitted instrument details
    against automated OCR extraction.
    """
    parsed_fields: Dict[str, ExtractedField] = {}
    
    if payload.extracted_fields:
        for k, v in payload.extracted_fields.items():
            if isinstance(v, dict):
                parsed_fields[k] = ExtractedField(
                    value=v.get("value"),
                    confidence=v.get("confidence", 0.95),
                    page=v.get("page", 1),
                )
            else:
                parsed_fields[k] = ExtractedField(value=v, confidence=0.95, page=1)
    elif payload.ocr_raw_text:
        parsed_fields = extract_fields_from_text(payload.ocr_raw_text)
        
    discrepancies = detect_discrepancies(
        instrument_id=payload.instrument_id,
        verification_id=payload.verification_id,
        submitted_data=payload.submitted_data,
        extracted_fields=parsed_fields,
    )
    
    return discrepancies

@router.patch("/discrepancies/{discrepancy_id}/resolve", response_model=VerificationDiscrepancy)
async def update_discrepancy_resolution(
    discrepancy_id: str,
    payload: DiscrepancyResolutionRequest,
):
    """
    Updates the resolution status of an open discrepancy.
    Allowed statuses: "open", "resolved", "accepted_with_explanation", "not_applicable".
    Preserves audit history and resolver identity.
    """
    valid_states = {"open", "resolved", "accepted_with_explanation", "not_applicable"}
    if payload.status.lower() not in valid_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resolution status '{payload.status}'. Must be one of: {list(valid_states)}"
        )
        
    updated = resolve_discrepancy(
        discrepancy_id=discrepancy_id,
        status=payload.status.lower(),
        notes=payload.resolution_notes,
        resolver_user_id=payload.resolver_user_id or "anil.verma@aicte.gov.in",
    )
    
    if not updated:
        raise HTTPException(status_code=404, detail="Discrepancy record not found.")
        
    return updated

@router.get("/discrepancies/instrument/{instrument_id}", response_model=List[VerificationDiscrepancy])
async def get_instrument_discrepancies(instrument_id: str):
    """Retrieves all discrepancy records recorded for an instrument."""
    return list_discrepancies_for_instrument(instrument_id)

@router.get("/dossier/{instrument_id}")
async def get_verification_dossier(instrument_id: str):
    """
    Retrieves full verification workspace dossier:
    documents, latest extraction run, and active discrepancies.
    """
    docs = list_documents_for_instrument(instrument_id)
    latest_run = None
    if docs:
        latest_run = get_latest_extraction_run(docs[0].id)
        
    discrepancies = list_discrepancies_for_instrument(instrument_id)
    
    return {
        "instrument_id": instrument_id,
        "documents": [d.model_dump() for d in docs],
        "latest_extraction_run": latest_run.model_dump() if latest_run else None,
        "discrepancies": [disc.model_dump() for disc in discrepancies],
        "safeguard_notice": (
            "REGULATORY NOTICE: OCR extraction is not bank verification. "
            "A matching FDR number, amount, or date does not prove authenticity. "
            "Official verification remains subject to authorized reviewer clearance "
            "and Core Banking System (CBS) confirmation."
        ),
    }
