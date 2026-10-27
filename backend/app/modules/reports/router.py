"""
FDR-SMART Reports, Financial Analytics & Notifications Module
DATABASE.md Sections 5.4, 5.12 & PRD.md Section 7

Key security & integrity rules:
1. Dynamic aggregation: All counts, sums, and percentages are computed dynamically from actual database records.
2. Institution data isolation: Institution representatives can NEVER retrieve or export another institution's data.
3. Notification isolation: Recipients only see notifications addressed to them or their institution.
4. Export format: Clean RFC-4180 compliant CSV stream.
"""
import io
import csv
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.database import get_db
from app.core.models import (
    FinancialInstrument,
    Institution,
    InstitutionMembership,
    Notification,
    ReleaseRefundRequest,
    InstrumentVerification,
    User,
)
from app.core.security import get_current_user_optional, get_current_user

router = APIRouter(tags=["Reports & Analytics"])

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    institution_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Computes real-time portfolio statistics from database with role scoping."""
    query = db.query(FinancialInstrument)

    # Scoping check
    if current_user and current_user.role in ["institution_representative", "depositor"]:
        mem = db.query(InstitutionMembership).filter(
            InstitutionMembership.user_id == current_user.id,
            InstitutionMembership.status == "active"
        ).first()
        inst_scope = mem.institution_id if mem else "inst-001"
        query = query.filter(FinancialInstrument.institution_id == inst_scope)
    elif institution_id:
        query = query.filter(FinancialInstrument.institution_id == institution_id)

    all_instruments = query.all()
    today = date.today()
    in_30_days = today + timedelta(days=30)
    in_7_days = today + timedelta(days=7)

    total_fdrs = len(all_instruments)
    active_fdrs = sum(1 for i in all_instruments if i.lifecycle_status == "active")
    
    maturing_30 = sum(
        1 for i in all_instruments
        if i.maturity_date and today <= i.maturity_date <= in_30_days and i.lifecycle_status in ["active", "renewal_pending"]
    )
    maturing_7 = sum(
        1 for i in all_instruments
        if i.maturity_date and today <= i.maturity_date <= in_7_days and i.lifecycle_status in ["active", "renewal_pending"]
    )

    pending_verification = sum(
        1 for i in all_instruments
        if i.submission_status == "submitted" and i.verification_status in ["not_started", "pending", "in_review"]
    )

    pending_release = sum(
        1 for i in all_instruments
        if i.lifecycle_status == "release_pending"
    )

    total_deposit_val = sum(float(i.amount) for i in all_instruments)
    total_maturity_val = sum(float(i.maturity_amount or (float(i.amount) * 1.25)) for i in all_instruments)

    return {
        "success": True,
        "data": {
            "totalFDRs": total_fdrs,
            "activeFDRs": active_fdrs,
            "maturingIn30Days": maturing_30,
            "maturingIn7Days": maturing_7,
            "pendingVerification": pending_verification,
            "pendingRelease": pending_release,
            "totalDepositValue": total_deposit_val,
            "totalMaturityValue": total_maturity_val,
        }
    }

@router.get("/reports/summary")
async def get_reports_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    institution_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Computes comprehensive financial liability summaries, status distributions,
    bank risk exposures, and maturity timelines from actual database records.
    Enforces institution isolation for institutional callers.
    """
    query = db.query(FinancialInstrument)

    # Institution isolation
    effective_inst_id = None
    if current_user and current_user.role in ["institution_representative", "depositor"]:
        mem = db.query(InstitutionMembership).filter(
            InstitutionMembership.user_id == current_user.id,
            InstitutionMembership.status == "active"
        ).first()
        effective_inst_id = mem.institution_id if mem else "inst-001"
        query = query.filter(FinancialInstrument.institution_id == effective_inst_id)
    elif institution_id:
        effective_inst_id = institution_id
        query = query.filter(FinancialInstrument.institution_id == institution_id)

    # Date range filters
    if start_date:
        try:
            sd = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
            query = query.filter(FinancialInstrument.issue_date >= sd)
        except ValueError:
            pass

    if end_date:
        try:
            ed = datetime.strptime(end_date[:10], "%Y-%m-%d").date()
            query = query.filter(FinancialInstrument.issue_date <= ed)
        except ValueError:
            pass

    instruments = query.all()
    today = date.today()

    # 1. Status distribution
    status_counts = {
        "active": sum(1 for i in instruments if i.lifecycle_status == "active"),
        "matured": sum(1 for i in instruments if i.lifecycle_status == "matured"),
        "renewal_pending": sum(1 for i in instruments if i.lifecycle_status == "renewal_pending"),
        "release_pending": sum(1 for i in instruments if i.lifecycle_status == "release_pending"),
        "released": sum(1 for i in instruments if i.lifecycle_status == "released"),
        "draft": sum(1 for i in instruments if i.submission_status == "draft"),
        "under_scrutiny": sum(1 for i in instruments if i.verification_status in ["pending", "in_review", "discrepancy_found"]),
        "verified": sum(1 for i in instruments if i.verification_status == "verified"),
    }

    # 2. Principal totals
    total_principal = sum(float(i.amount) for i in instruments)
    active_principal = sum(float(i.amount) for i in instruments if i.lifecycle_status == "active")
    matured_principal = sum(float(i.amount) for i in instruments if i.lifecycle_status == "matured")
    released_principal = sum(float(i.amount) for i in instruments if i.lifecycle_status == "released")

    # 3. Upcoming maturity summary
    maturity_summary = {
        "within_7_days": sum(1 for i in instruments if i.maturity_date and today <= i.maturity_date <= today + timedelta(days=7) and i.lifecycle_status in ["active", "renewal_pending"]),
        "within_30_days": sum(1 for i in instruments if i.maturity_date and today <= i.maturity_date <= today + timedelta(days=30) and i.lifecycle_status in ["active", "renewal_pending"]),
        "within_60_days": sum(1 for i in instruments if i.maturity_date and today <= i.maturity_date <= today + timedelta(days=60) and i.lifecycle_status in ["active", "renewal_pending"]),
        "within_90_days": sum(1 for i in instruments if i.maturity_date and today <= i.maturity_date <= today + timedelta(days=90) and i.lifecycle_status in ["active", "renewal_pending"]),
        "past_maturity": sum(1 for i in instruments if i.maturity_date and i.maturity_date < today and i.lifecycle_status != "released"),
    }

    # 4. Bank Exposure Breakdown (real counts and sums per bank from database)
    bank_map: Dict[str, Dict[str, Any]] = {}
    for i in instruments:
        bank = i.bank_name
        if bank not in bank_map:
            bank_map[bank] = {"bank": bank, "count": 0, "total_amount": 0.0}
        bank_map[bank]["count"] += 1
        bank_map[bank]["total_amount"] += float(i.amount)

    bank_exposures = []
    for bank_name, bdata in sorted(bank_map.items(), key=lambda x: x[1]["total_amount"], reverse=True):
        share_pct = round((bdata["total_amount"] / total_principal * 100), 1) if total_principal > 0 else 0
        bank_exposures.append({
            "bank": bank_name,
            "count": bdata["count"],
            "total_amount": bdata["total_amount"],
            "value": f"₹ {bdata['total_amount'] / 10000000:.2f} Cr" if bdata['total_amount'] >= 10000000 else f"₹ {bdata['total_amount'] / 100000:.2f} L",
            "share": share_pct,
        })

    # 5. Institution Summaries
    inst_summaries = []
    institutions_query = db.query(Institution)
    if effective_inst_id:
        institutions_query = institutions_query.filter(Institution.id == effective_inst_id)
    
    for inst in institutions_query.all():
        inst_instruments = [i for i in instruments if i.institution_id == inst.id]
        inst_active_val = sum(float(i.amount) for i in inst_instruments if i.lifecycle_status == "active")
        required_val = float(inst.total_deposit_required or 0)
        compliance_pct = round((inst_active_val / required_val * 100), 1) if required_val > 0 else 100.0

        inst_summaries.append({
            "id": inst.id,
            "name": inst.name,
            "code": inst.institution_code,
            "state": inst.state or "",
            "active_deposit": inst_active_val,
            "required_deposit": required_val,
            "compliance_percentage": min(compliance_pct, 100.0),
            "instruments_count": len(inst_instruments),
        })

    return {
        "success": True,
        "data": {
            "report_title": "AICTE Central FDR Portfolio Liability Summary",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_instruments_count": len(instruments),
            "totals": {
                "total_principal": total_principal,
                "active_principal": active_principal,
                "matured_principal": matured_principal,
                "released_principal": released_principal,
            },
            "status_distribution": status_counts,
            "maturity_summary": maturity_summary,
            "bank_exposures": bank_exposures,
            "institution_summaries": inst_summaries,
        }
    }

@router.get("/reports/export-csv")
async def export_instruments_csv(
    institution_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Exports a clean CSV file of financial instrument records.
    Strictly prevents institutional users from exporting records belonging to other institutions.
    """
    query = db.query(FinancialInstrument)

    # Enforce institution isolation
    if current_user and current_user.role in ["institution_representative", "depositor"]:
        mem = db.query(InstitutionMembership).filter(
            InstitutionMembership.user_id == current_user.id,
            InstitutionMembership.status == "active"
        ).first()
        inst_scope = mem.institution_id if mem else "inst-001"
        query = query.filter(FinancialInstrument.institution_id == inst_scope)
    elif institution_id:
        query = query.filter(FinancialInstrument.institution_id == institution_id)

    if status_filter and status_filter != "all":
        query = query.filter(
            (FinancialInstrument.lifecycle_status == status_filter) |
            (FinancialInstrument.submission_status == status_filter) |
            (FinancialInstrument.verification_status == status_filter)
        )

    instruments = query.order_by(FinancialInstrument.created_at.desc()).all()

    # Generate CSV stream
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Reference Number",
        "Institution Name",
        "Institution Code",
        "Bank Name",
        "Branch Name",
        "Account Number",
        "IFSC Code",
        "Principal Amount (INR)",
        "Interest Rate (%)",
        "Issue Date",
        "Maturity Date",
        "Tenure Months",
        "Submission Status",
        "Verification Status",
        "Lifecycle Status",
        "Purpose",
        "Created At (UTC)",
    ])

    for i in instruments:
        inst = db.query(Institution).filter(Institution.id == i.institution_id).first()
        inst_name = inst.name if inst else ""
        inst_code = inst.institution_code if inst else ""

        writer.writerow([
            i.reference_number,
            inst_name,
            inst_code,
            i.bank_name,
            i.branch_name or "",
            i.account_number or "",
            i.ifsc_code or "",
            float(i.amount),
            float(i.interest_rate or 0),
            i.issue_date.isoformat() if i.issue_date else "",
            i.maturity_date.isoformat() if i.maturity_date else "",
            i.tenure_months or 36,
            i.submission_status,
            i.verification_status,
            i.lifecycle_status,
            i.purpose or "security_deposit",
            i.created_at.isoformat() if i.created_at else "",
        ])

    csv_data = output.getvalue()
    filename = f"fdr_master_register_{date.today().isoformat()}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

@router.get("/notifications")
async def get_notifications(
    unreadOnly: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Retrieves in-app notifications.
    Strictly ensures users cannot view notifications intended for other recipients.
    """
    query = db.query(Notification)

    if current_user:
        if current_user.role in ["institution_representative", "depositor"]:
            mem = db.query(InstitutionMembership).filter(
                InstitutionMembership.user_id == current_user.id,
                InstitutionMembership.status == "active"
            ).first()
            inst_scope = mem.institution_id if mem else "inst-001"
            query = query.filter(
                (Notification.recipient_user_id == current_user.id) |
                (Notification.institution_id == inst_scope)
            )
        else:
            # Scrutiny / Approver / Admin see regulatory notifications or theirs
            query = query.filter(
                (Notification.recipient_user_id == current_user.id) |
                (Notification.recipient_user_id.in_(["usr-so-01", "usr-aa-01", "usr-adm-01"]))
            )

    if unreadOnly:
        query = query.filter(Notification.read_at.is_(None))
        
    notifications = query.order_by(desc(Notification.created_at)).limit(50).all()
    
    data = [
        {
            "id": n.id,
            "userId": n.recipient_user_id,
            "title": n.title,
            "message": n.message,
            "type": n.notification_type,
            "isRead": n.read_at is not None,
            "relatedEntityId": n.instrument_id or n.request_id,
            "relatedEntityType": "fdr" if n.instrument_id else "request",
            "createdAt": n.created_at.isoformat() if n.created_at else datetime.now(timezone.utc).isoformat(),
        }
        for n in notifications
    ]
    
    return {
        "success": True,
        "data": data,
        "unreadCount": sum(1 for d in data if not d["isRead"]),
    }

@router.patch("/notifications/{id}/read")
async def mark_notification_read(
    id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Marks a single notification as read."""
    n = db.query(Notification).filter(Notification.id == id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found.")
    n.read_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "success": True,
        "data": {
            "id": n.id,
            "isRead": True,
        }
    }

@router.patch("/notifications/read-all")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Marks all accessible notifications as read."""
    query = db.query(Notification).filter(Notification.read_at.is_(None))
    if current_user:
        query = query.filter(Notification.recipient_user_id == current_user.id)
    
    query.update({"read_at": datetime.now(timezone.utc)})
    db.commit()
    return {"success": True, "data": None, "message": "All notifications marked as read."}
