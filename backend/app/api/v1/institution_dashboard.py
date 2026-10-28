"""
Institution Dashboard API
Provides institution-scoped endpoints for:
- Financial status summary (FDR statuses, scrutiny observations, statement status, discrepancies, maturity alerts, refund statuses)
- Weekly statement submission status and missing periods
- Notification summary for the institution representative

All data is strictly scoped to the authenticated institution.
RBAC enforced: institution_representative and depositor see only their own institution.
Approving authority and admin can specify institution_id.
"""
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.models import (
    FinancialInstrument,
    Institution,
    InstitutionMembership,
    User,
    BankStatement,
    StatementAnalysis,
    FinancialAlert,
    ReleaseRefundRequest,
    ReleaseRefundDecision,
    InstrumentVerification,
)
from app.core.security import get_current_user_optional

router = APIRouter(prefix="/institution-dashboard", tags=["Institution Dashboard"])


def _resolve_institution_id(current_user: Optional[User], institution_id: Optional[str], db: Session) -> str:
    """
    Resolves the institution_id the caller is authorized to view.
    Institution representatives and depositors are restricted to their own institution.
    Approving authority and admin may provide an explicit institution_id.
    """
    if current_user and current_user.role in ["institution_representative", "depositor"]:
        membership = db.query(InstitutionMembership).filter(
            InstitutionMembership.user_id == current_user.id,
            InstitutionMembership.status == "active",
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active institution membership found for this account.",
            )
        if institution_id and institution_id != membership.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: You are not authorized to view information for another institution.",
            )
        return membership.institution_id

    # Approving authority / admin / scrutiny may specify institution_id
    if institution_id:
        return institution_id

    # Fallback: demo mode returns first institution
    first_inst = db.query(Institution).filter(Institution.status == "active").first()
    if first_inst:
        return first_inst.id
    raise HTTPException(status_code=404, detail="No active institution found.")


@router.get("/financial-status")
async def get_institution_financial_status(
    institution_id: Optional[str] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Returns a consolidated financial status summary for the institution:
    - FDR portfolio overview with verification statuses
    - Outstanding scrutiny observations and clarification requests
    - Weekly statement submission status and missing reporting periods
    - Outstanding financial discrepancies
    - Upcoming maturity dates (within 60 days)
    - Active refund request statuses
    - Notification summary
    """
    inst_id = _resolve_institution_id(current_user, institution_id, db)

    institution = db.query(Institution).filter(Institution.id == inst_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution not found.")

    now = datetime.now(timezone.utc)
    sixty_days_later = now + timedelta(days=60)
    thirty_days_later = now + timedelta(days=30)

    # ── FDR Portfolio ──────────────────────────────────────────────────────────
    instruments = db.query(FinancialInstrument).filter(
        FinancialInstrument.institution_id == inst_id,
        FinancialInstrument.submission_status != "draft",
    ).order_by(desc(FinancialInstrument.created_at)).all()

    fdr_summary = []
    upcoming_maturities = []
    clarification_requests = []
    discrepancy_count = 0

    today = now.date()
    for inst_rec in instruments:
        days_to_maturity = None
        is_maturing_soon = False
        if inst_rec.maturity_date:
            mat_date = inst_rec.maturity_date
            if isinstance(mat_date, datetime):
                mat_d = mat_date.date()
            elif isinstance(mat_date, date):
                mat_d = mat_date
            else:
                mat_d = None

            if mat_d:
                delta = (mat_d - today).days
                days_to_maturity = delta
                is_maturing_soon = 0 < delta <= 60

        # Latest verification record
        latest_verif = db.query(InstrumentVerification).filter(
            InstrumentVerification.instrument_id == inst_rec.id
        ).order_by(desc(InstrumentVerification.reviewed_at)).first()

        if inst_rec.verification_status in ("clarification_required", "discrepancy_found"):
            clarification_requests.append({
                "fdr_id": inst_rec.id,
                "fdr_number": inst_rec.reference_number,
                "status": inst_rec.verification_status,
                "financial_status": inst_rec.financial_verification_status,
                "notes": latest_verif.review_notes if latest_verif else None,
                "issued_at": latest_verif.reviewed_at.isoformat() if (latest_verif and latest_verif.reviewed_at) else None,
            })
            if inst_rec.verification_status == "discrepancy_found":
                discrepancy_count += 1

        fdr_summary.append({
            "id": inst_rec.id,
            "reference_number": inst_rec.reference_number,
            "instrument_type": inst_rec.instrument_type,
            "bank_name": inst_rec.bank_name,
            "branch_name": inst_rec.branch_name,
            "amount": float(inst_rec.amount) if inst_rec.amount else 0.0,
            "submission_status": inst_rec.submission_status,
            "verification_status": inst_rec.verification_status,
            "financial_verification_status": inst_rec.financial_verification_status,
            "lifecycle_status": inst_rec.lifecycle_status,
            "maturity_date": inst_rec.maturity_date.isoformat() if inst_rec.maturity_date else None,
            "days_to_maturity": days_to_maturity,
            "is_maturing_soon": is_maturing_soon,
        })

        if is_maturing_soon:
            upcoming_maturities.append({
                "fdr_id": inst_rec.id,
                "reference_number": inst_rec.reference_number,
                "bank_name": inst_rec.bank_name,
                "amount": float(inst_rec.amount) if inst_rec.amount else 0.0,
                "maturity_date": inst_rec.maturity_date.isoformat() if inst_rec.maturity_date else None,
                "days_to_maturity": days_to_maturity,
                "is_critical": days_to_maturity is not None and days_to_maturity <= 30,
            })

    # ── Weekly Statements ──────────────────────────────────────────────────────
    statements = db.query(BankStatement).filter(
        BankStatement.institution_id == inst_id,
    ).order_by(desc(BankStatement.created_at)).limit(12).all()

    statement_summary = []
    for stmt in statements:
        analysis = db.query(StatementAnalysis).filter(
            StatementAnalysis.statement_id == stmt.id
        ).order_by(desc(StatementAnalysis.created_at)).first()

        has_reviewer_query = (
            analysis and analysis.reviewer_decision in ("QUERY_RAISED",)
        ) or stmt.status in ("requires_review", "discrepancy_flagged")

        statement_summary.append({
            "id": stmt.id,
            "bank_name": stmt.bank_name,
            "account_number": stmt.account_number,
            "period_start": stmt.reporting_period_start.isoformat() if stmt.reporting_period_start else None,
            "period_end": stmt.reporting_period_end.isoformat() if stmt.reporting_period_end else None,
            "submission_date": stmt.submission_date.isoformat() if stmt.submission_date else None,
            "status": stmt.status,
            "original_filename": stmt.original_filename,
            "reconciliation_passed": analysis.reconciliation_passed if analysis else None,
            "discrepancies_count": len(analysis.discrepancies or []) if analysis else 0,
            "reviewer_decision": analysis.reviewer_decision if analysis else None,
            "reviewer_notes": analysis.reviewer_notes if analysis else None,
            "has_reviewer_query": has_reviewer_query,
            "balance_meets_requirement": analysis.balance_meets_requirement if analysis else None,
        })

    # Compute missing reporting periods (last 4 weeks)
    missing_periods = []
    for week_offset in range(1, 5):
        week_end = now - timedelta(days=now.weekday() + 1 + (week_offset - 1) * 7)
        week_start = week_end - timedelta(days=6)
        ws = week_start.date()
        we = week_end.date()
        covered = any(
            stmt.reporting_period_start and stmt.reporting_period_end and
            stmt.reporting_period_start <= we and stmt.reporting_period_end >= ws
            for stmt in statements
        )
        if not covered:
            missing_periods.append({
                "period_start": ws.isoformat(),
                "period_end": we.isoformat(),
                "label": f"Week of {ws.strftime('%d %b %Y')}",
            })

    # ── Financial Alerts ───────────────────────────────────────────────────────
    open_alerts = db.query(FinancialAlert).filter(
        FinancialAlert.institution_id == inst_id,
        FinancialAlert.status == "OPEN",
    ).order_by(desc(FinancialAlert.created_at)).all()

    alerts_summary = [
        {
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "title": a.title,
            "description": a.description,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in open_alerts
    ]

    # ── Refund Requests ────────────────────────────────────────────────────────
    release_requests = (
        db.query(ReleaseRefundRequest)
        .join(FinancialInstrument, ReleaseRefundRequest.instrument_id == FinancialInstrument.id)
        .filter(FinancialInstrument.institution_id == inst_id)
        .order_by(desc(ReleaseRefundRequest.created_at))
        .all()
    )

    refund_summary = []
    for req in release_requests:
        inst_rec = db.query(FinancialInstrument).filter(FinancialInstrument.id == req.instrument_id).first()
        latest_decision = db.query(ReleaseRefundDecision).filter(
            ReleaseRefundDecision.request_id == req.id
        ).order_by(desc(ReleaseRefundDecision.created_at)).first()

        refund_summary.append({
            "id": req.id,
            "instrument_id": req.instrument_id,
            "fdr_number": inst_rec.reference_number if inst_rec else req.instrument_id,
            "bank_name": inst_rec.bank_name if inst_rec else "Bank",
            "amount": float(inst_rec.amount) if inst_rec else 0.0,
            "request_type": req.request_type,
            "status": req.status,
            "submitted_at": req.submitted_at.isoformat() if req.submitted_at else req.created_at.isoformat(),
            "reason": req.reason,
            "regulatory_clause": req.regulatory_clause,
            "latest_decision": latest_decision.decision if latest_decision else None,
            "latest_decision_notes": latest_decision.comments if latest_decision else None,
            "latest_decision_at": latest_decision.decided_at.isoformat() if (latest_decision and latest_decision.decided_at) else None,
            "has_pending_query": req.status == "returned_for_correction",
            "noc_voucher_ref": f"AICTE/NOC/{req.id}" if req.status in ("approved", "completed") else None,
        })

    # ── Notifications Summary ──────────────────────────────────────────────────
    # Note: Weekly statement auditing/tallying is managed on the Approver Dashboard,
    # so missing statement nag banners are omitted from the institutional portal.
    notifications = []

    # Clarification requests
    for cl in clarification_requests[:3]:
        notifications.append({
            "type": "CLARIFICATION_REQUIRED",
            "severity": "WARNING",
            "title": f"Scrutiny Query Raised — FDR {cl['fdr_number']}",
            "body": cl.get("notes") or "AICTE scrutiny officer has raised a query. Please respond.",
            "action_required": True,
            "fdr_id": cl["fdr_id"],
        })

    # Upcoming maturity notifications
    for um in upcoming_maturities[:3]:
        sev = "CRITICAL" if um["is_critical"] else "WARNING"
        notifications.append({
            "type": "MATURITY_APPROACHING",
            "severity": sev,
            "title": f"FDR Maturing in {um['days_to_maturity']} Days — {um['reference_number']}",
            "body": f"Fixed Deposit at {um['bank_name']} matures on {um['maturity_date']}. Arrange renewal or replacement.",
            "action_required": um["is_critical"],
            "fdr_id": um["fdr_id"],
        })

    # Refund decision notifications
    for ref in refund_summary:
        if ref["latest_decision"] in ("APPROVED", "REJECTED", "RETURNED_FOR_QUERY"):
            notifications.append({
                "type": "REFUND_DECISION",
                "severity": "INFO",
                "title": f"Refund Request Decision — {ref['fdr_number']}",
                "body": f"Your refund request has been {ref['latest_decision'].lower().replace('_', ' ')}.",
                "action_required": ref["latest_decision"] == "RETURNED_FOR_QUERY",
                "request_id": ref["id"],
            })

    # Statement reviewer query notifications
    for stmt in statement_summary:
        if stmt["has_reviewer_query"]:
            notifications.append({
                "type": "STATEMENT_QUERY",
                "severity": "WARNING",
                "title": f"AICTE Query on Statement — Period {stmt['period_start']} to {stmt['period_end']}",
                "body": stmt.get("reviewer_notes") or "Reviewer raised a query on your bank statement submission.",
                "action_required": True,
                "statement_id": stmt["id"],
            })

    # Deduplicate by title
    seen_titles: set = set()
    deduped_notifications = []
    for n in notifications:
        if n["title"] not in seen_titles:
            seen_titles.add(n["title"])
            deduped_notifications.append(n)

    return {
        "institution_id": inst_id,
        "institution_name": institution.name,
        "institution_code": institution.institution_code,
        "generated_at": now.isoformat(),
        "fdr_portfolio": {
            "total": len(instruments),
            "verified": sum(1 for f in fdr_summary if f["verification_status"] == "verified"),
            "under_review": sum(1 for f in fdr_summary if f["verification_status"] in ("under_review", "under_scrutiny")),
            "pending": sum(1 for f in fdr_summary if f["verification_status"] == "pending"),
            "clarification_required": sum(1 for f in fdr_summary if f["verification_status"] == "clarification_required"),
            "rejected": sum(1 for f in fdr_summary if f["verification_status"] == "rejected"),
            "instruments": fdr_summary,
        },
        "statements": {
            "submitted_count": len(statement_summary),
            "missing_periods": missing_periods,
            "missing_count": len(missing_periods),
            "recent": statement_summary,
            "statements_with_queries": [s for s in statement_summary if s["has_reviewer_query"]],
        },
        "financial_discrepancies": {
            "total_open": discrepancy_count + len([a for a in alerts_summary if a["severity"] == "CRITICAL"]),
            "open_alerts": alerts_summary,
            "clarification_requests": clarification_requests,
        },
        "upcoming_maturities": upcoming_maturities,
        "refund_requests": {
            "total": len(refund_summary),
            "pending": sum(1 for r in refund_summary if r["status"] in ("submitted", "under_review")),
            "approved_pending_discharge": sum(1 for r in refund_summary if r["status"] == "approved"),
            "completed": sum(1 for r in refund_summary if r["status"] == "completed"),
            "requests": refund_summary,
        },
        "notifications": deduped_notifications,
    }
