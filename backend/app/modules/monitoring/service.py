"""
FDR-SMART Maturity Monitoring & Scheduled Deadline Reminder Engine
DATABASE.md Sections 5.4, 5.9, 5.12 & PRD.md Section 5

Key invariants:
1. Configurable reminder intervals (60, 30, 15, 7 days before maturity, and 0 days for matured).
2. Strict duplicate prevention: An in-app notification is NEVER recreated for the same instrument
   and threshold, guaranteeing idempotent execution.
3. Does NOT classify an instrument as noncompliant based solely on its maturity date.
4. Does NOT automatically trigger a financial release or refund upon maturity.
"""
import logging
from datetime import date, datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.models import (
    FinancialInstrument,
    Institution,
    Notification,
    InstrumentLifecycleEvent,
    User,
    InstitutionMembership,
)

logger = logging.getLogger("fdr_smart.monitoring")

REMINDER_THRESHOLDS_DAYS = [60, 30, 15, 7, 0]

def determine_next_action(inst: FinancialInstrument, days_remaining: int) -> str:
    """Determines regulatory guidance without making punitive assumptions."""
    if inst.lifecycle_status == "released":
        return "Discharge NOC Issued — Custody Concluded"
    if inst.lifecycle_status == "renewal_pending":
        return "Replacement Instrument Under Scrutiny"
    if inst.lifecycle_status == "release_pending":
        return "Release Application Under Scrutiny"
    if days_remaining <= 0:
        return "Contractual Maturity Reached — File Rollover or Exit Clearance"
    if days_remaining <= 15:
        return "Statutory Rollover Deposit or Bank Confirmation Letter Due"
    if days_remaining <= 30:
        return "Initiate CBS Lien Renewal Discussion with Issuing Bank"
    if days_remaining <= 60:
        return "Review Lock-in Period & Plan Replacement or Extension"
    return "Active Custody — Compliance Monitoring Active"

def run_deadline_checks(db: Session, force_system_actor: bool = True) -> Dict[str, Any]:
    """
    Idempotent deadline evaluation.
    Scans active instruments, compares maturity dates against reminder thresholds,
    and dispatches non-duplicate in-app notifications to authorized institution representatives.
    """
    today = date.today()
    instruments = db.query(FinancialInstrument).filter(
        FinancialInstrument.lifecycle_status.in_(["active", "matured", "renewal_pending"])
    ).all()

    new_notifications_count = 0
    skipped_duplicates_count = 0
    maturing_soon_count = 0
    matured_count = 0

    for inst in instruments:
        if not inst.maturity_date:
            continue

        days_remaining = (inst.maturity_date - today).days

        # Count categories
        if days_remaining <= 0:
            matured_count += 1
            # Update lifecycle status to matured if currently active
            if inst.lifecycle_status == "active":
                inst.lifecycle_status = "matured"
                # Record lifecycle milestone
                event = InstrumentLifecycleEvent(
                    instrument_id=inst.id,
                    event_type="maturity_detected",
                    previous_status="active",
                    new_status="matured",
                    event_notes=f"Instrument reached contractual maturity date {inst.maturity_date.isoformat()}.",
                    occurred_at=datetime.now(timezone.utc),
                )
                db.add(event)
        elif days_remaining <= 60:
            maturing_soon_count += 1

        # Check thresholds for notifications
        for threshold in REMINDER_THRESHOLDS_DAYS:
            # Trigger if days_remaining is within threshold window
            is_matching_threshold = False
            if threshold == 0 and days_remaining <= 0:
                is_matching_threshold = True
            elif threshold > 0 and 0 < days_remaining <= threshold:
                is_matching_threshold = True

            if not is_matching_threshold:
                continue

            notif_type = f"maturity_reminder_{threshold}d" if threshold > 0 else "maturity_reached"

            # ─── IDEMPOTENCY CHECK / DUPLICATE PREVENTION ─────────────────────
            # Check if notification for this instrument and threshold was already dispatched
            existing = db.query(Notification).filter(
                Notification.instrument_id == inst.id,
                Notification.notification_type == notif_type
            ).first()

            if existing:
                skipped_duplicates_count += 1
                continue

            # Identify target recipient: Institution representative
            recipient_id = inst.submitted_by_user_id
            membership = db.query(InstitutionMembership).filter(
                InstitutionMembership.institution_id == inst.institution_id,
                InstitutionMembership.status == "active"
            ).first()
            if membership:
                recipient_id = membership.user_id

            if not recipient_id:
                u = db.query(User).filter(User.role == "institution_representative").first()
                recipient_id = u.id if u else "usr-rep-01"

            # Format descriptive notification
            if threshold == 0:
                title = f"Maturity Alert: {inst.reference_number}"
                msg = (
                    f"Fixed Deposit Receipt {inst.reference_number} ({inst.bank_name}) has reached contractual maturity "
                    f"on {inst.maturity_date.isoformat()}. Please submit a replacement instrument or initiate an authorized "
                    f"release request. Note: Maturity does not automatically constitute noncompliance."
                )
            else:
                title = f"Maturity Reminder ({days_remaining} Days): {inst.reference_number}"
                msg = (
                    f"Fixed Deposit Receipt {inst.reference_number} with {inst.bank_name} matures in {days_remaining} days "
                    f"(on {inst.maturity_date.isoformat()}). Principal: ₹{float(inst.amount):,.2f}. "
                    f"Next Action: {determine_next_action(inst, days_remaining)}."
                )

            new_notif = Notification(
                recipient_user_id=recipient_id,
                institution_id=inst.institution_id,
                instrument_id=inst.id,
                notification_type=notif_type,
                title=title,
                message=msg,
                created_at=datetime.now(timezone.utc),
            )
            db.add(new_notif)
            new_notifications_count += 1
            # Only trigger one reminder per pass per instrument (the tightest threshold)
            break

    db.commit()

    return {
        "status": "COMPLETED",
        "checked_instruments": len(instruments),
        "new_notifications_created": new_notifications_count,
        "skipped_duplicates": skipped_duplicates_count,
        "maturing_soon_count": maturing_soon_count,
        "matured_count": matured_count,
        "executed_at": datetime.now(timezone.utc).isoformat(),
    }

def get_maturity_register(db: Session, institution_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Returns full maturity register categorized into approaching maturity, past maturity,
    and compliant custody with remaining days and reminder status.
    """
    today = date.today()
    query = db.query(FinancialInstrument)

    if institution_id:
        query = query.filter(FinancialInstrument.institution_id == institution_id)

    instruments = query.order_by(FinancialInstrument.maturity_date.asc()).all()

    approaching_maturity = []
    past_maturity = []
    active_long_term = []

    for inst in instruments:
        inst_obj = db.query(Institution).filter(Institution.id == inst.institution_id).first()
        inst_name = inst_obj.name if inst_obj else "Registered Institution"

        days_remaining = (inst.maturity_date - today).days if inst.maturity_date else 9999

        # Check existing reminders sent
        reminders = db.query(Notification).filter(
            Notification.instrument_id == inst.id,
            Notification.notification_type.ilike("%maturity%")
        ).order_by(desc(Notification.created_at)).all()

        last_reminder_date = reminders[0].created_at.strftime("%Y-%m-%d") if reminders else None
        reminder_status = f"{len(reminders)} Sent (Last: {last_reminder_date})" if reminders else "Pending Scheduled Cycle"

        record = {
            "id": inst.id,
            "fdrNumber": inst.reference_number,
            "institutionId": inst.institution_id,
            "institutionName": inst_name,
            "bankName": inst.bank_name,
            "branchName": inst.branch_name or "",
            "amount": float(inst.amount),
            "amountFormatted": f"₹ {float(inst.amount):,.2f}",
            "issueDate": inst.issue_date.isoformat() if inst.issue_date else "",
            "maturityDate": inst.maturity_date.isoformat() if inst.maturity_date else "",
            "daysRemaining": days_remaining,
            "lifecycleStatus": inst.lifecycle_status,
            "verificationStatus": inst.verification_status,
            "severity": "urgent" if days_remaining <= 15 else "warning" if days_remaining <= 60 else "normal",
            "reminderStatus": reminder_status,
            "remindersCount": len(reminders),
            "lastReminderSent": last_reminder_date,
            "nextRequiredAction": determine_next_action(inst, days_remaining),
        }

        if days_remaining <= 0:
            past_maturity.append(record)
        elif days_remaining <= 90:
            approaching_maturity.append(record)
        else:
            active_long_term.append(record)

    return {
        "summary": {
            "total_monitored": len(instruments),
            "approaching_maturity_count": len(approaching_maturity),
            "past_maturity_count": len(past_maturity),
            "active_long_term_count": len(active_long_term),
            "evaluation_date": today.isoformat(),
        },
        "approaching_maturity": approaching_maturity,
        "past_maturity": past_maturity,
        "active_long_term": active_long_term,
        "all_monitored": past_maturity + approaching_maturity + active_long_term,
    }
