"""
FDR-SMART Maturity Monitoring API Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.models import User, FinancialInstrument, Notification
from app.core.security import get_current_user_optional, get_current_user
from app.modules.monitoring.service import (
    run_deadline_checks,
    get_maturity_register,
)

router = APIRouter(prefix="/monitoring", tags=["Maturity Monitoring & Deadlines"])

@router.get("/maturity-register")
async def fetch_maturity_register(
    institution_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Returns full maturity register categorized into approaching maturity, past maturity,
    and compliant custody with remaining days and reminder status.
    Enforces institution-level data isolation for institution users.
    """
    effective_inst_id = institution_id
    if current_user and current_user.role in ["institution_representative", "depositor"]:
        # Resolve user's authorized institution
        from app.core.models import InstitutionMembership
        mem = db.query(InstitutionMembership).filter(
            InstitutionMembership.user_id == current_user.id,
            InstitutionMembership.status == "active"
        ).first()
        if mem:
            effective_inst_id = mem.institution_id

    register = get_maturity_register(db=db, institution_id=effective_inst_id)
    return {
        "success": True,
        "data": register,
    }

@router.post("/run-deadline-checks")
async def trigger_deadline_checks(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Executes deadline checks across all active deposit instruments.
    Idempotent: Duplicate notifications for the same deadline threshold are prevented.
    """
    result = run_deadline_checks(db=db)
    return {
        "success": True,
        "data": result,
        "message": f"Deadline check completed. Created {result['new_notifications_created']} reminders, skipped {result['skipped_duplicates']} duplicates.",
    }

@router.post("/send-reminder/{instrument_id}")
async def send_manual_reminder(
    instrument_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Dispatches a manual formal reminder notification for an instrument approaching maturity.
    """
    inst = db.query(FinancialInstrument).filter(FinancialInstrument.id == instrument_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Instrument not found.")

    notif = Notification(
        recipient_user_id=inst.submitted_by_user_id,
        institution_id=inst.institution_id,
        instrument_id=inst.id,
        notification_type="manual_maturity_notice",
        title=f"Regulatory Maturity Reminder: {inst.reference_number}",
        message=(
            f"Official notice from AICTE Regulation Bureau: Security deposit {inst.reference_number} "
            f"with {inst.bank_name} matures on {inst.maturity_date}. Please review required rollover or discharge options."
        ),
        created_at=datetime.now(timezone.utc),
    )
    db.add(notif)
    db.commit()

    return {
        "success": True,
        "message": f"Maturity reminder dispatched for {inst.reference_number}.",
    }
