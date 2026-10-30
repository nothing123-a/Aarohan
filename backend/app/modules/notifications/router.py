"""
FDR-SMART Role-Aware Notifications API
Provides distinct, role-tailored notifications for Institution Representatives,
Scrutiny Officers, Approving Authorities, and System Administrators.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.core.models import User, Notification, InstitutionMembership
from app.core.security import get_current_user_optional

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Global tracker for manual notices dispatched by Scrutiny/Approver officers
DISPATCHED_NOTICES: List[Dict[str, Any]] = []

def add_institution_notification(
    institution_id: Optional[str],
    fdr_number: str,
    title: str,
    message: str,
    notification_type: str = "manual_maturity_notice",
    link: str = "/renewals",
) -> Dict[str, Any]:
    """Adds a real-time dispatched notice to the institution's feed."""
    import uuid
    notif_id = f"notif-dispatch-{uuid.uuid4().hex[:8]}"
    item = {
        "id": notif_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "isRead": False,
        "link": link,
        "fdr_number": fdr_number,
        "institutionId": institution_id,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    DISPATCHED_NOTICES.insert(0, item)
    # Prepend to institution_representative notifications so it shows at the very top!
    ROLE_NOTIFICATIONS["institution_representative"].insert(0, item)
    return item

ROLE_NOTIFICATIONS: Dict[str, List[Dict[str, Any]]] = {
    "institution_representative": [
        {
            "id": "notif-inst-1",
            "title": "FDR Certificate Uploaded",
            "message": "FDR certificate FDR_AICTE_2026_FD143 uploaded successfully. Forwarded to Scrutiny Officer for OCR verification.",
            "type": "submission_update",
            "isRead": False,
            "link": "/fdr",
            "createdAt": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat(),
        },
        {
            "id": "notif-inst-2",
            "title": "Clarification Required for Lien Notation",
            "message": "Scrutiny Officer requested clarification on Bank of Baroda deposit joint lien endorsement.",
            "type": "discrepancy_update",
            "isRead": False,
            "link": "/dashboard",
            "createdAt": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
        },
        {
            "id": "notif-inst-3",
            "title": "Statutory Deposit Maturing in 28 Days",
            "message": "Fixed deposit FDR-2024-9841 (₹50,00,000) reaches maturity soon. Initiate renewal or release claim.",
            "type": "maturity_reminder_30d",
            "isRead": False,
            "link": "/renewals",
            "createdAt": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat(),
        },
        {
            "id": "notif-inst-4",
            "title": "Security Deposit Refund Sanctioned",
            "message": "Refund request REF-2026-081 approved by AICTE Approving Authority. Disbursement initiated to registered treasury account.",
            "type": "release_refund_update",
            "isRead": True,
            "link": "/release-requests",
            "createdAt": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        },
    ],
    "scrutiny_officer": [
        {
            "id": "notif-scrutiny-1",
            "title": "New Instrument Submitted for Scrutiny",
            "message": "Delhi Technological University submitted new FDR (₹50 Lakh). Document awaiting OCR scrutiny and verification.",
            "type": "submission_update",
            "isRead": False,
            "link": "/verification",
            "createdAt": (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat(),
        },
        {
            "id": "notif-scrutiny-2",
            "title": "OCR Amount Discrepancy Flagged",
            "message": "Punjab National Bank deposit (FDR-2026-98124): claimed amount ₹35,00,000 vs extracted ₹30,00,000.",
            "type": "discrepancy_update",
            "isRead": False,
            "link": "/verification",
            "createdAt": (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
        },
        {
            "id": "notif-scrutiny-3",
            "title": "Institution Clarification Received",
            "message": "DTU submitted bank clarification letter regarding joint lien clause on instrument FDR-2024-9841.",
            "type": "submission_update",
            "isRead": False,
            "link": "/verification",
            "createdAt": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
        },
        {
            "id": "notif-scrutiny-4",
            "title": "Branch Manager Lien Confirmation",
            "message": "State Bank of India Parliament Street branch confirmed irrevocable joint lien notation via CBS inquiry.",
            "type": "submission_update",
            "isRead": True,
            "link": "/fdr",
            "createdAt": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
        },
    ],
    "approving_authority": [
        {
            "id": "notif-approver-1",
            "title": "Release Request Pending Final Sanction",
            "message": "Delhi Technological University requested release of ₹50,00,000 against FDR-2024-9841. Scrutiny cleared with zero discrepancies.",
            "type": "release_refund_update",
            "isRead": False,
            "link": "/release-requests",
            "createdAt": (datetime.now(timezone.utc) - timedelta(minutes=25)).isoformat(),
        },
        {
            "id": "notif-approver-2",
            "title": "Scrutiny Dossiers Recommended",
            "message": "3 FDR dossiers verified by Scrutiny Officers and awaiting executive approval.",
            "type": "submission_update",
            "isRead": False,
            "link": "/dashboard",
            "createdAt": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        },
        {
            "id": "notif-approver-3",
            "title": "Weekly Statement Non-Compliance Alert",
            "message": "2 institutions missed the statutory deadline for weekly bank confirmation statement upload.",
            "type": "maturity_reached",
            "isRead": False,
            "link": "/statements",
            "createdAt": (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat(),
        },
        {
            "id": "notif-approver-4",
            "title": "Executive Compliance Ledger Ready",
            "message": "Monthly security deposit compliance and maturity risk digest compiled for AICTE Regulation Bureau.",
            "type": "info",
            "isRead": True,
            "link": "/reports",
            "createdAt": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        },
    ],
    "admin": [
        {
            "id": "notif-admin-1",
            "title": "Security & Document Storage Audit Clean",
            "message": "Automated security scan completed. All uploaded FDR certificates validated with zero malware signatures.",
            "type": "info",
            "isRead": False,
            "link": "/audit-logs",
            "createdAt": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat(),
        },
        {
            "id": "notif-admin-2",
            "title": "New Institution Representative Onboarded",
            "message": "Representative account for Netaji Subhas University of Technology verified and assigned active status.",
            "type": "submission_update",
            "isRead": False,
            "link": "/admin/users",
            "createdAt": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
        },
        {
            "id": "notif-admin-3",
            "title": "OCR Processing Throughput",
            "message": "Document extraction engine processed 18 deposit certificates with 98.4% average OCR confidence.",
            "type": "info",
            "isRead": False,
            "link": "/settings",
            "createdAt": (datetime.now(timezone.utc) - timedelta(hours=8)).isoformat(),
        },
        {
            "id": "notif-admin-4",
            "title": "Database Synchronization Healthy",
            "message": "PostgreSQL pooler checkpoints verified. Automated fallback mechanisms operational.",
            "type": "info",
            "isRead": True,
            "link": "/audit-logs",
            "createdAt": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        },
    ],
}

# In-memory read tracking for demo/session persistence
READ_STATUS: Dict[str, bool] = {}

@router.get("")
@router.get("/")
async def list_notifications(
    unreadOnly: bool = Query(False),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Returns notifications tailored to the current user's role and institution.
    """
    role = "institution_representative"
    if current_user and current_user.role:
        role = current_user.role

    # Map aliases
    if role in ["depositor", "institution_representative"]:
        role_key = "institution_representative"
    elif role in ["scrutiny_officer", "officer", "verifier"]:
        role_key = "scrutiny_officer"
    elif role == "approving_authority":
        role_key = "approving_authority"
    else:
        role_key = "admin"

    items = ROLE_NOTIFICATIONS.get(role_key, ROLE_NOTIFICATIONS["admin"])

    # Apply read status
    result = []
    for item in items:
        item_copy = dict(item)
        if item_copy["id"] in READ_STATUS:
            item_copy["isRead"] = READ_STATUS[item_copy["id"]]
        if unreadOnly and item_copy["isRead"]:
            continue
        result.append(item_copy)

    unread_count = sum(1 for n in items if not READ_STATUS.get(n["id"], n["isRead"]))

    return {
        "success": True,
        "data": result,
        "unreadCount": unread_count,
    }

@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Marks a single notification as read."""
    READ_STATUS[notification_id] = True
    return {
        "success": True,
        "data": {"id": notification_id, "isRead": True},
    }

@router.patch("/read-all")
async def mark_all_notifications_read(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Marks all notifications as read for current user."""
    role = "institution_representative"
    if current_user and current_user.role:
        role = current_user.role

    if role in ["depositor", "institution_representative"]:
        role_key = "institution_representative"
    elif role in ["scrutiny_officer", "officer", "verifier"]:
        role_key = "scrutiny_officer"
    elif role == "approving_authority":
        role_key = "approving_authority"
    else:
        role_key = "admin"

    for n in ROLE_NOTIFICATIONS.get(role_key, []):
        READ_STATUS[n["id"]] = True

    return {
        "success": True,
        "data": None,
        "message": "All notifications marked as read.",
    }
