"""
Weekly Bank Statement Analyzer API Router
Provides REST endpoints for statement ingestion, extraction verification,
arithmetic reconciliation, trend analysis, review sanction, and alerts.
"""
from __future__ import annotations

import io
from datetime import date, datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.models import User, BankStatement, FinancialAlert, StatementAnalysis
from app.core.security import get_current_user_optional, get_current_user
from app.modules.documents.storage import get_document_binary
from app.modules.statement_analysis.service import (
    create_statement_upload,
    list_statements_scoped,
    get_statement_details,
    record_statement_review,
    get_institution_trend,
    StatementServiceError,
    _get_caller_institution_id,
)
from app.modules.statement_analysis.analyzer import perform_statement_analysis
from app.modules.statement_analysis.email_ingestion import (
    ingest_statement_from_email,
    EmailIngestionPayload,
    EmailIngestionError,
)

router = APIRouter(prefix="/statements", tags=["Weekly Bank Statements"])


class StatementReviewRequest(BaseModel):
    decision: str  # "APPROVED", "QUERY_RAISED", "REJECTED", "EXCEPTION_NOTED"
    notes: str = Field(..., min_length=3)


class AlertResolutionRequest(BaseModel):
    status: str = "RESOLVED"  # "RESOLVED", "ACKNOWLEDGED", "DISMISSED"
    resolution_notes: str = Field(..., min_length=3)


class EmailIngestRequest(BaseModel):
    sender_email: str
    subject: str
    institution_code: str
    bank_name: str
    account_number: str
    period_start: date
    period_end: date
    attachment_filename: str
    attachment_base64: str  # Base64 encoded file binary


@router.post("/upload")
async def upload_bank_statement(
    institution_id: str = Form(...),
    bank_name: str = Form(...),
    account_number: str = Form(...),
    period_start: str = Form(...),
    period_end: str = Form(...),
    statement_source: str = Form("direct_upload"),
    reference_number: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Uploads a bank statement (PDF or CSV).
    Extracts financial fields, runs arithmetic reconciliation, and executes allocation rules.
    """
    if not current_user:
        # Fallback user for dev / demo if unauthenticated
        uploader = db.query(User).filter(User.status == "active").first()
        if not uploader:
            raise HTTPException(status_code=401, detail="Authentication required.")
    else:
        uploader = current_user

    try:
        p_start = date.fromisoformat(period_start.strip())
        p_end = date.fromisoformat(period_end.strip())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format for period_start or period_end. Expected YYYY-MM-DD.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")

    try:
        result = create_statement_upload(
            institution_id=institution_id.strip(),
            bank_name=bank_name.strip(),
            account_number=account_number.strip(),
            period_start=p_start,
            period_end=p_end,
            statement_source=statement_source.strip(),
            file_bytes=file_bytes,
            filename=file.filename or "statement.csv",
            uploader=uploader,
            reference_number=reference_number,
            notes=notes,
            db=db,
        )
        return {
            "success": True,
            "message": "Bank statement successfully uploaded, parsed, and analyzed.",
            "data": result,
        }
    except StatementServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Statement processing error: {str(exc)}")


@router.get("")
async def list_statements(
    institution_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Lists bank statements with role-based scoping.
    Institution Representatives only see statements for their own institution.
    """
    caller = current_user or db.query(User).filter(User.role == "approving_authority").first()
    if not caller:
        raise HTTPException(status_code=401, detail="Authentication required.")

    result = list_statements_scoped(
        institution_id=institution_id,
        status=status,
        page=page,
        page_size=page_size,
        caller=caller,
        db=db,
    )
    return {
        "success": True,
        "data": result["items"],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
    }


@router.get("/alerts/all")
@router.get("/alerts")
async def list_financial_alerts(
    institution_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Lists outstanding financial alerts generated from statement analysis.
    """
    caller = current_user or db.query(User).filter(User.role == "approving_authority").first()

    query = db.query(FinancialAlert)

    if caller and caller.role in ["institution_representative", "depositor"]:
        caller_inst = _get_caller_institution_id(caller, db)
        if caller_inst:
            query = query.filter(FinancialAlert.institution_id == caller_inst)
    elif institution_id:
        query = query.filter(FinancialAlert.institution_id == institution_id)

    if status:
        query = query.filter(FinancialAlert.status == status.upper())
    if severity:
        query = query.filter(FinancialAlert.severity == severity.upper())

    alerts = query.order_by(desc(FinancialAlert.created_at)).all()

    return {
        "success": True,
        "total": len(alerts),
        "data": [
            {
                "id": a.id,
                "institution_id": a.institution_id,
                "institution_name": a.institution.name if a.institution else "Institution",
                "statement_id": a.statement_id,
                "alert_type": a.alert_type,
                "severity": a.severity,
                "title": a.title,
                "description": a.description,
                "status": a.status,
                "resolution_notes": a.resolution_notes,
                "created_at": a.created_at.isoformat(),
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            }
            for a in alerts
        ],
    }


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_financial_alert(
    alert_id: str,
    payload: AlertResolutionRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Resolves or acknowledges an open financial alert.
    """
    caller = current_user or db.query(User).filter(User.role == "scrutiny_officer").first()
    if not caller:
        raise HTTPException(status_code=401, detail="Authentication required.")

    alert = db.query(FinancialAlert).filter(FinancialAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    alert.status = payload.status.upper()
    alert.resolution_notes = payload.resolution_notes
    alert.resolved_by_user_id = caller.id
    alert.resolved_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "success": True,
        "message": f"Alert {alert_id} status updated to {alert.status}.",
        "data": {
            "id": alert.id,
            "status": alert.status,
            "resolved_at": alert.resolved_at.isoformat(),
        },
    }


@router.get("/institution/{institution_id}/trend")
async def get_institution_weekly_trend(
    institution_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Retrieves chronological weekly balances and net change trend for an institution.
    """
    caller = current_user or db.query(User).filter(User.role == "approving_authority").first()
    if not caller:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        trend = get_institution_trend(institution_id=institution_id, caller=caller, db=db)
        return {
            "success": True,
            "data": trend,
        }
    except StatementServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))


@router.get("/{statement_id}")
async def get_statement(
    statement_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Retrieves full statement dossier: metadata, extraction, reconciliation, and transactions.
    """
    caller = current_user or db.query(User).filter(User.role == "approving_authority").first()
    if not caller:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        data = get_statement_details(statement_id=statement_id, caller=caller, db=db)
        return {
            "success": True,
            "data": data,
        }
    except StatementServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))


@router.get("/{statement_id}/download")
async def download_statement(
    statement_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Secure binary download of the original uploaded statement.
    """
    stmt = db.query(BankStatement).filter(BankStatement.id == statement_id).first()
    if not stmt:
        raise HTTPException(status_code=404, detail="Statement not found.")

    caller = current_user or db.query(User).filter(User.role == "approving_authority").first()
    if caller and caller.role in ["institution_representative", "depositor"]:
        caller_inst = _get_caller_institution_id(caller, db)
        if caller_inst and caller_inst != stmt.institution_id:
            raise HTTPException(status_code=403, detail="Permission Denied.")

    content = get_document_binary(stmt.storage_key)
    return StreamingResponse(
        io.BytesIO(content),
        media_type=stmt.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{stmt.original_filename}"'},
    )


@router.post("/{statement_id}/analyze")
async def trigger_statement_analysis(
    statement_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Re-executes weekly statement analysis, allocation checks, and alert updates.
    """
    caller = current_user or db.query(User).filter(User.role == "scrutiny_officer").first()
    if not caller:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        analysis = perform_statement_analysis(
            statement_id=statement_id,
            db=db,
            reviewed_by_user=caller,
        )
        return {
            "success": True,
            "message": f"Weekly statement analysis completed with status '{analysis.status}'.",
            "data": {
                "analysis_id": analysis.id,
                "status": analysis.status,
                "reconciliation_passed": analysis.reconciliation_passed,
                "closing_balance": float(analysis.closing_balance),
                "required_minimum_balance": float(analysis.required_minimum_balance),
                "balance_meets_requirement": analysis.balance_meets_requirement,
                "discrepancies_count": len(analysis.discrepancies or []),
            },
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/{statement_id}/review")
async def review_statement(
    statement_id: str,
    payload: StatementReviewRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Scrutiny Officer or Approving Authority records formal review outcome for statement.
    """
    caller = current_user or db.query(User).filter(User.role == "approving_authority").first()
    if not caller:
        raise HTTPException(status_code=401, detail="Authentication required.")

    try:
        result = record_statement_review(
            statement_id=statement_id,
            decision=payload.decision,
            notes=payload.notes,
            reviewer=caller,
            db=db,
        )
        return {
            "success": True,
            "message": f"Statement review recorded as '{result['decision']}'.",
            "data": result,
        }
    except StatementServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))


@router.post("/email-ingest")
async def ingest_via_email(
    payload: EmailIngestRequest,
    db: Session = Depends(get_db),
):
    """
    Authorized email ingestion endpoint for statement feeds.
    Validates sender permissions and processes attachment.
    """
    import base64
    try:
        raw_bytes = base64.b64decode(payload.attachment_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 payload for attachment_base64.")

    p = EmailIngestionPayload(
        sender_email=payload.sender_email,
        subject=payload.subject,
        institution_code=payload.institution_code,
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        period_start=payload.period_start,
        period_end=payload.period_end,
        attachment_filename=payload.attachment_filename,
        attachment_bytes=raw_bytes,
    )

    try:
        res = ingest_statement_from_email(payload=p, db=db)
        return res
    except EmailIngestionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc))
