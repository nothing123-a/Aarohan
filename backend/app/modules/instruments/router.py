"""
FDR-SMART Financial Instruments Module
Handles complete lifecycle of FDRs and Security Deposit instruments.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.models import (
    FinancialInstrument,
    Institution,
    User,
    InstrumentDocument,
    InstrumentVerification,
    InstrumentLifecycleEvent,
    ReleaseRefundRequest,
    AuditEvent,
)
from app.core.security import get_current_user_optional, get_current_user, get_user_institution_id
from app.modules.documents.storage import store_document

router = APIRouter(prefix="/fdrs", tags=["Financial Instruments (FDRs)"])

class CreateFDRPayload(BaseModel):
    depositorName: Optional[str] = None
    institutionId: Optional[str] = None
    bankName: str
    bankBranch: Optional[str] = "Main Branch"
    accountNumber: Optional[str] = "AC-88990011"
    ifscCode: Optional[str] = "SBIN0000001"
    principalAmount: float = Field(..., gt=0)
    interestRate: Optional[float] = 7.25
    depositDate: Optional[str] = None
    maturityDate: str
    purpose: Optional[str] = "security_deposit"
    contractNumber: Optional[str] = None
    projectName: Optional[str] = None
    department: Optional[str] = "Regulation Bureau"
    fdrNumber: Optional[str] = None
    remarks: Optional[str] = None

class RemarksPayload(BaseModel):
    remarks: Optional[str] = None

class RejectPayload(BaseModel):
    remarks: str

class RenewalRequestPayload(BaseModel):
    reason: str

class RenewalApprovePayload(BaseModel):
    newMaturityDate: str
    remarks: Optional[str] = None

class ReleaseRequestPayload(BaseModel):
    reason: str

def serialize_fdr(inst: FinancialInstrument, db: Session) -> dict:
    """Transforms SQLAlchemy FinancialInstrument model into frontend FDR interface contract."""
    institution = db.query(Institution).filter(Institution.id == inst.institution_id).first()
    inst_name = institution.name if institution else "Registered Institution"

    # Get documents
    docs = db.query(InstrumentDocument).filter(InstrumentDocument.instrument_id == inst.id).all()
    documents_list = [
        {
            "id": d.id,
            "fdrId": inst.id,
            "fileName": d.original_filename,
            "fileType": d.mime_type,
            "fileSize": d.file_size_bytes,
            "fileUrl": f"/api/v1/documents/{d.id}/download",
            "documentType": d.document_type,
            "uploadedBy": "Authorized Representative",
            "uploadedAt": d.uploaded_at.isoformat() if d.uploaded_at else inst.created_at.isoformat(),
        }
        for d in docs
    ]

    # Get lifecycle / verification history
    lifecycle_events = db.query(InstrumentLifecycleEvent).filter(
        InstrumentLifecycleEvent.instrument_id == inst.id
    ).order_by(desc(InstrumentLifecycleEvent.occurred_at)).all()

    history_list = [
        {
            "id": e.id,
            "fdrId": inst.id,
            "action": e.event_type.replace("_", " ").title(),
            "fromStatus": e.previous_status or "draft",
            "toStatus": e.new_status or inst.lifecycle_status,
            "performedBy": "System/Reviewer",
            "performedByName": "AICTE Officer" if "verified" in e.event_type else "Institution Representative",
            "remarks": e.event_notes,
            "timestamp": e.occurred_at.isoformat() if e.occurred_at else inst.created_at.isoformat(),
        }
        for e in lifecycle_events
    ]

    # Map database statuses to frontend status union
    frontend_status = inst.lifecycle_status
    if inst.submission_status == "draft":
        frontend_status = "draft"
    elif inst.submission_status == "submitted" and inst.verification_status in ["not_started", "pending", "in_review"]:
        frontend_status = "under_review"
    elif inst.verification_status == "verified" and inst.lifecycle_status == "active":
        frontend_status = "verified"
    elif inst.verification_status == "rejected":
        frontend_status = "rejected"
    elif inst.lifecycle_status == "matured":
        frontend_status = "matured"
    elif inst.lifecycle_status == "renewal_pending":
        frontend_status = "renewal_pending"
    elif inst.lifecycle_status == "released":
        frontend_status = "released"

    return {
        "id": inst.id,
        "fdrNumber": inst.reference_number,
        "depositorName": inst_name,
        "depositorId": inst.institution_id,
        "bankName": inst.bank_name,
        "bankBranch": inst.branch_name or "",
        "accountNumber": inst.account_number or "",
        "ifscCode": inst.ifsc_code or "",
        "principalAmount": float(inst.amount),
        "interestRate": float(inst.interest_rate or 7.0),
        "maturityAmount": float(inst.maturity_amount or (float(inst.amount) * 1.25)),
        "depositDate": inst.issue_date.isoformat() if inst.issue_date else "2024-01-01",
        "maturityDate": inst.maturity_date.isoformat() if inst.maturity_date else "2027-01-01",
        "tenureMonths": inst.tenure_months or 36,
        "purpose": inst.purpose or "security_deposit",
        "contractNumber": inst.contract_number or "",
        "projectName": inst.project_name or "",
        "department": inst.department or "Regulation Bureau",
        "status": frontend_status,
        "submittedBy": "Institution Representative",
        "verifiedBy": "Scrutiny Officer" if inst.verification_status == "verified" else None,
        "approvedBy": "Member Secretary" if inst.lifecycle_status == "released" else None,
        "remarks": inst.remarks,
        "documents": documents_list,
        "history": history_list,
        "createdAt": inst.created_at.isoformat() if inst.created_at else datetime.now(timezone.utc).isoformat(),
        "updatedAt": inst.updated_at.isoformat() if inst.updated_at else datetime.now(timezone.utc).isoformat(),
    }

@router.get("")
async def get_all_fdrs(
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    bankName: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Retrieves paginated list of financial instruments, scoped to institution for institution reps."""
    query = db.query(FinancialInstrument)

    # Institutional data isolation — institution reps only see their own institution's records
    if current_user and current_user.role in ["institution_representative", "depositor"]:
        user_inst_id = get_user_institution_id(current_user, db)
        if user_inst_id:
            query = query.filter(FinancialInstrument.institution_id == user_inst_id)

    if status and status != "all":
        if status == "draft":
            query = query.filter(FinancialInstrument.submission_status == "draft")
        elif status in ["submitted", "under_review"]:
            query = query.filter(FinancialInstrument.submission_status == "submitted")
        elif status == "verified":
            query = query.filter(FinancialInstrument.verification_status == "verified")
        elif status == "active":
            query = query.filter(FinancialInstrument.lifecycle_status == "active")
        elif status == "matured":
            query = query.filter(FinancialInstrument.lifecycle_status == "matured")
        elif status in ["renewal_pending", "release_pending", "released", "rejected"]:
            query = query.filter(
                (FinancialInstrument.lifecycle_status == status) |
                (FinancialInstrument.verification_status == status)
            )

    if bankName:
        query = query.filter(FinancialInstrument.bank_name.ilike(f"%{bankName}%"))

    if search:
        search_f = f"%{search}%"
        query = query.filter(
            (FinancialInstrument.reference_number.ilike(search_f)) |
            (FinancialInstrument.bank_name.ilike(search_f))
        )

    total = query.count()
    instruments = query.order_by(desc(FinancialInstrument.created_at)).offset((page - 1) * limit).limit(limit).all()

    serialized = [serialize_fdr(i, db) for i in instruments]

    return {
        "success": True,
        "data": {
            "data": serialized,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit if limit else 1,
        }
    }

@router.get("/alerts/maturity")
async def get_maturity_alerts(db: Session = Depends(get_db)):
    """Instruments maturing within next 60 days."""
    today = date.today()
    future_limit = today + timedelta(days=60)
    
    maturing = db.query(FinancialInstrument).filter(
        FinancialInstrument.maturity_date <= future_limit,
        FinancialInstrument.lifecycle_status.in_(["active", "matured"])
    ).order_by(FinancialInstrument.maturity_date.asc()).all()

    return {
        "success": True,
        "data": [serialize_fdr(i, db) for i in maturing]
    }

@router.get("/{id}")
async def get_fdr_by_id(
    id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Retrieve details for a single financial instrument, with institution isolation."""
    inst = db.query(FinancialInstrument).filter(
        (FinancialInstrument.id == id) | (FinancialInstrument.reference_number == id)
    ).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Financial instrument not found.")

    # Institution representatives may only view their own institution's records
    if current_user and current_user.role in ["institution_representative", "depositor"]:
        user_inst_id = get_user_institution_id(current_user, db)
        if user_inst_id and inst.institution_id != user_inst_id:
            raise HTTPException(
                status_code=403,
                detail="Access Denied: This FDR record belongs to a different institution.",
            )

    return {
        "success": True,
        "data": serialize_fdr(inst, db)
    }

@router.post("")
async def create_fdr(
    payload: CreateFDRPayload,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Creates a new financial instrument record."""
    # Find or default institution
    inst = None
    if payload.institutionId:
        inst = db.query(Institution).filter(Institution.id == payload.institutionId).first()
    if not inst and payload.depositorName:
        inst = db.query(Institution).filter(Institution.name.ilike(f"%{payload.depositorName}%")).first()
    if not inst:
        inst = db.query(Institution).first()
        if not inst:
            inst = Institution(
                name="Delhi Technological University (DTU)",
                institution_code="AICTE-NZ-00142",
            )
            db.add(inst)
            db.commit()

    # Determine submitted_by user
    user_id = current_user.id if current_user else None
    if not user_id:
        u = db.query(User).first()
        user_id = u.id if u else "user-default-id"

    # Reference number
    ref_num = payload.fdrNumber
    if not ref_num:
        import uuid
        ref_num = f"FDR/AICTE/2026/{uuid.uuid4().hex[:5].upper()}"

    # Parse dates
    dep_date = date.today()
    if payload.depositDate:
        try:
            dep_date = datetime.strptime(payload.depositDate[:10], "%Y-%m-%d").date()
        except ValueError:
            pass

    mat_date = dep_date + timedelta(days=365 * 3)
    if payload.maturityDate:
        try:
            mat_date = datetime.strptime(payload.maturityDate[:10], "%Y-%m-%d").date()
        except ValueError:
            pass

    new_inst = FinancialInstrument(
        institution_id=inst.id,
        reference_number=ref_num,
        bank_name=payload.bankName,
        branch_name=payload.bankBranch or "Main Branch",
        account_number=payload.accountNumber or "AC-88990011",
        ifsc_code=payload.ifscCode or "SBIN0000001",
        amount=payload.principalAmount,
        currency="INR",
        interest_rate=payload.interestRate or 7.25,
        maturity_amount=payload.principalAmount * (1 + (payload.interestRate or 7.25) * 3 / 100),
        issue_date=dep_date,
        maturity_date=mat_date,
        tenure_months=36,
        purpose=payload.purpose or "security_deposit",
        contract_number=payload.contractNumber,
        project_name=payload.projectName,
        department=payload.department or "Regulation Bureau",
        submission_status="submitted",
        verification_status="pending",
        lifecycle_status="active",
        submitted_by_user_id=user_id,
        submitted_at=datetime.now(timezone.utc),
        remarks=payload.remarks,
    )
    db.add(new_inst)
    db.commit()
    db.refresh(new_inst)

    # Record initial lifecycle event
    event = InstrumentLifecycleEvent(
        instrument_id=new_inst.id,
        event_type="submitted",
        previous_status=None,
        new_status="submitted",
        event_notes=f"Instrument {ref_num} created and submitted for regulatory verification.",
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(event)

    # Record audit event
    audit = AuditEvent(
        actor_user_id=user_id,
        institution_id=inst.id,
        instrument_id=new_inst.id,
        action="INSTRUMENT_CREATED",
        entity_type="financial_instrument",
        entity_id=new_inst.id,
        outcome="success",
        details={"reference_number": ref_num, "amount": payload.principalAmount},
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "data": serialize_fdr(new_inst, db),
        "message": "Financial Instrument registered successfully.",
    }

@router.put("/{id}")
async def update_fdr(id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    """Update instrument fields before final scrutiny clearance."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")

    if "bankName" in payload:
        inst.bank_name = payload["bankName"]
    if "principalAmount" in payload:
        inst.amount = payload["principalAmount"]
    if "remarks" in payload:
        inst.remarks = payload["remarks"]

    db.commit()
    return {"success": True, "data": serialize_fdr(inst, db)}

@router.post("/{id}/submit")
async def submit_fdr(id: str, db: Session = Depends(get_db)):
    """Transitions instrument to submitted state."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")
    inst.submission_status = "submitted"
    inst.verification_status = "pending"
    db.commit()
    return {"success": True, "data": serialize_fdr(inst, db), "message": "FDR submitted for regulatory scrutiny."}

@router.post("/{id}/verify")
async def verify_fdr(id: str, payload: RemarksPayload, db: Session = Depends(get_db)):
    """Verifies instrument under technical scrutiny."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")
    inst.verification_status = "verified"
    inst.lifecycle_status = "active"
    
    # Log verification record
    u = db.query(User).filter(User.role.ilike("%officer%")).first()
    user_id = u.id if u else inst.submitted_by_user_id
    ver = InstrumentVerification(
        instrument_id=inst.id,
        reviewed_by_user_id=user_id,
        outcome="verified",
        review_notes=payload.remarks or "CBS Lien notation confirmed.",
    )
    db.add(ver)
    db.commit()
    return {"success": True, "data": serialize_fdr(inst, db), "message": "Instrument verified."}

@router.post("/{id}/reject")
async def reject_fdr(id: str, payload: RejectPayload, db: Session = Depends(get_db)):
    """Rejects instrument with documented reason."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")
    inst.verification_status = "rejected"
    inst.remarks = payload.remarks
    db.commit()
    return {"success": True, "data": serialize_fdr(inst, db), "message": "Instrument rejected."}

@router.post("/{id}/renewal/request")
async def request_renewal(id: str, payload: RenewalRequestPayload, db: Session = Depends(get_db)):
    """Requests rollover/renewal of maturing instrument."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")
    inst.lifecycle_status = "renewal_pending"
    db.commit()
    return {"success": True, "data": serialize_fdr(inst, db), "message": "Renewal requested."}

@router.post("/{id}/renewal/approve")
async def approve_renewal(id: str, payload: RenewalApprovePayload, db: Session = Depends(get_db)):
    """Approves renewal with new maturity date."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")
    try:
        inst.maturity_date = datetime.strptime(payload.newMaturityDate[:10], "%Y-%m-%d").date()
    except ValueError:
        pass
    inst.lifecycle_status = "active"
    db.commit()
    return {"success": True, "data": serialize_fdr(inst, db), "message": "Renewal approved."}

@router.post("/{id}/release/request")
async def request_release(id: str, payload: ReleaseRequestPayload, db: Session = Depends(get_db)):
    """Requests release of security deposit."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")
    inst.lifecycle_status = "release_pending"
    
    req = ReleaseRefundRequest(
        instrument_id=inst.id,
        requested_by_user_id=inst.submitted_by_user_id,
        request_type="release",
        status="submitted",
        reason=payload.reason,
    )
    db.add(req)
    db.commit()
    return {"success": True, "data": serialize_fdr(inst, db), "message": "Release requested."}

@router.post("/{id}/release/approve")
async def approve_release(id: str, payload: RemarksPayload, db: Session = Depends(get_db)):
    """Approves release of security deposit."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")
    inst.lifecycle_status = "released"
    db.commit()
    return {"success": True, "data": serialize_fdr(inst, db), "message": "Release approved."}

@router.post("/{id}/documents")
async def upload_fdr_document(
    id: str,
    file: UploadFile = File(...),
    document_type: str = Form("fdr_copy"),
    db: Session = Depends(get_db),
):
    """Uploads supporting document and links it to instrument."""
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")

    content = await file.read()
    filename = file.filename or "uploaded_fdr.pdf"
    content_type = file.content_type or "application/pdf"

    doc = store_document(
        content=content,
        original_filename=filename,
        mime_type=content_type,
        instrument_id=inst.id,
        uploaded_by_user_id=inst.submitted_by_user_id,
        document_type=document_type,
    )

    db_doc = InstrumentDocument(
        id=doc.id,
        instrument_id=inst.id,
        uploaded_by_user_id=inst.submitted_by_user_id,
        document_type=document_type,
        original_filename=filename,
        storage_key=doc.storage_key,
        mime_type=content_type,
        file_size_bytes=len(content),
        sha256_checksum=doc.sha256_checksum,
        scan_status="clean",
        document_status="active",
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(db_doc)
    db.commit()

    return {"success": True, "data": serialize_fdr(inst, db), "message": "Document uploaded successfully."}
