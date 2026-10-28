"""
Integration Tests for Institution Representative Dashboard:
- PART 1: Weekly Statement Submissions (upload, persistence, status not marked verified automatically, invalid files, period validations)
- PART 2: Financial Status Endpoint (portfolio overview, scrutiny observations, discrepancies, upcoming maturities)
- PART 3: Request for Refund (submission, tracking, unable to self-approve or modify verified deposit information)
- PART 4: Status Synchronization (live updates from authoritative backend records)
- PART 5: Notifications & Scoping (missing statement notifications, clarification queries, upcoming maturities, deduplication)
- PART 6: Multi-Tenant RBAC Isolation (strictly verifying Institution A cannot access Institution B records)
"""

import io
import pytest
from datetime import date, datetime, timezone, timedelta
from fastapi.testclient import TestClient
import uuid

from app.main import app
from app.core.database import SessionLocal
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
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture(scope="module")
def inst_dashboard_setup(db):
    # Institution A
    inst_a = db.query(Institution).filter(Institution.id == "inst-test-dash-a").first()
    if not inst_a:
        inst_a = Institution(
            id="inst-test-dash-a",
            institution_code="AICTE-DASH-A",
            name="Delhi Institute of Advanced Technology",
            status="active",
        )
        db.add(inst_a)
        db.commit()

    # Institution B (for cross-tenant checks)
    inst_b = db.query(Institution).filter(Institution.id == "inst-test-dash-b").first()
    if not inst_b:
        inst_b = Institution(
            id="inst-test-dash-b",
            institution_code="AICTE-DASH-B",
            name="Mumbai College of Engineering",
            status="active",
        )
        db.add(inst_b)
        db.commit()

    # User: Rep for Institution A
    user_rep_a = db.query(User).filter(User.email == "rep_a@diat.edu.in").first()
    if not user_rep_a:
        user_rep_a = User(
            id=str(uuid.uuid4()),
            email="rep_a@diat.edu.in",
            display_name="Registrar DIAT",
            role="institution_representative",
            status="active",
        )
        db.add(user_rep_a)
        db.commit()

    mem_a = db.query(InstitutionMembership).filter(
        InstitutionMembership.user_id == user_rep_a.id,
        InstitutionMembership.institution_id == inst_a.id,
    ).first()
    if not mem_a:
        mem_a = InstitutionMembership(
            id=str(uuid.uuid4()),
            institution_id=inst_a.id,
            user_id=user_rep_a.id,
            role="institution_representative",
            status="active",
        )
        db.add(mem_a)
        db.commit()

    # User: Rep for Institution B
    user_rep_b = db.query(User).filter(User.email == "rep_b@mumbai.edu.in").first()
    if not user_rep_b:
        user_rep_b = User(
            id=str(uuid.uuid4()),
            email="rep_b@mumbai.edu.in",
            display_name="Registrar MCE",
            role="institution_representative",
            status="active",
        )
        db.add(user_rep_b)
        db.commit()

    mem_b = db.query(InstitutionMembership).filter(
        InstitutionMembership.user_id == user_rep_b.id,
        InstitutionMembership.institution_id == inst_b.id,
    ).first()
    if not mem_b:
        mem_b = InstitutionMembership(
            id=str(uuid.uuid4()),
            institution_id=inst_b.id,
            user_id=user_rep_b.id,
            role="institution_representative",
            status="active",
        )
        db.add(mem_b)
        db.commit()

    # Approving Authority
    approver = db.query(User).filter(User.email == "approver_inst_dash@aicte.gov.in").first()
    if not approver:
        approver = User(
            id=str(uuid.uuid4()),
            email="approver_inst_dash@aicte.gov.in",
            display_name="Member Secretary AICTE",
            role="approving_authority",
            status="active",
        )
        db.add(approver)
        db.commit()

    # FDR for Institution A (maturing in 25 days -> critical)
    now = datetime.now(timezone.utc)
    fdr_a_id = "fdr-dash-a-" + str(uuid.uuid4())[:8]
    instrument_a = FinancialInstrument(
        id=fdr_a_id,
        institution_id=inst_a.id,
        reference_number="FDR/DIAT/2026/001",
        instrument_type="fixed_deposit",
        amount=5000000.0,
        bank_name="State Bank of India",
        branch_name="Connaught Place",
        account_number="SBI0012345678",
        submission_status="submitted",
        verification_status="under_review",
        financial_verification_status="pending",
        submitted_by_user_id=user_rep_a.id,
        maturity_date=now + timedelta(days=25),
        lifecycle_status="active",
    )
    db.add(instrument_a)

    # FDR for Institution B
    fdr_b_id = "fdr-dash-b-" + str(uuid.uuid4())[:8]
    instrument_b = FinancialInstrument(
        id=fdr_b_id,
        institution_id=inst_b.id,
        reference_number="FDR/MCE/2026/002",
        instrument_type="fixed_deposit",
        amount=7500000.0,
        bank_name="Bank of Baroda",
        branch_name="Fort Branch",
        account_number="BOB0098765432",
        submission_status="submitted",
        verification_status="verified",
        financial_verification_status="approved",
        submitted_by_user_id=user_rep_b.id,
        maturity_date=now + timedelta(days=180),
        lifecycle_status="active",
    )
    db.add(instrument_b)
    db.commit()

    tokens = {
        "rep_a": create_access_token({"sub": user_rep_a.id, "email": user_rep_a.email, "role": "institution_representative"}),
        "rep_b": create_access_token({"sub": user_rep_b.id, "email": user_rep_b.email, "role": "institution_representative"}),
        "approver": create_access_token({"sub": approver.id, "email": approver.email, "role": "approving_authority"}),
    }

    return {
        "inst_a_id": inst_a.id,
        "inst_b_id": inst_b.id,
        "fdr_a_id": fdr_a_id,
        "fdr_b_id": fdr_b_id,
        "tokens": tokens,
        "user_rep_a_id": user_rep_a.id,
        "user_rep_b_id": user_rep_b.id,
    }


# =====================================================================
# PART 1: Weekly Statement Submissions & Validations
# =====================================================================

def test_weekly_statement_upload_persistence(inst_dashboard_setup, db):
    """
    Institution Rep uploads a valid CSV weekly bank statement.
    Verifies persistence, arithmetic analysis run, and that statement
    is NOT automatically marked verified until official AICTE review.
    """
    token = inst_dashboard_setup["tokens"]["rep_a"]
    inst_id = inst_dashboard_setup["inst_a_id"]

    csv_content = (
        "Date,Description,Reference,Withdrawal,Deposit,Balance\n"
        "2026-10-18,OPENING BALANCE,,,1000000,1000000\n"
        "2026-10-19,Tuition Fees Credit,REF-001,,250000,1250000\n"
        "2026-10-22,Lab Equipment Debit,REF-002,150000,,1100000\n"
        "2026-10-24,CLOSING BALANCE,,,1100000,1100000\n"
    ).encode("utf-8")

    files = {"file": ("SBI_DIAT_W43.csv", io.BytesIO(csv_content), "text/csv")}
    data = {
        "institution_id": inst_id,
        "bank_name": "State Bank of India",
        "account_number": "SBI0012345678",
        "period_start": "2026-10-18",
        "period_end": "2026-10-24",
        "statement_source": "direct_upload",
        "reference_number": "FDR/DIAT/2026/001",
    }

    res = client.post("/api/v1/statements/upload", data=data, files=files, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    stmt_id = res_data["data"]["id"]

    # Verify directly in database
    stmt = db.query(BankStatement).filter(BankStatement.id == stmt_id).first()
    assert stmt is not None
    assert stmt.institution_id == inst_id
    assert stmt.original_filename == "SBI_DIAT_W43.csv"
    # IMPORTANT: Not marked as verified/approved yet! Status is in-progress/reconciled/discrepancy_flagged
    assert stmt.status != "verified"
    assert stmt.status in ("reconciled", "extracted", "uploaded", "discrepancy_flagged", "requires_review")
    analysis = db.query(StatementAnalysis).filter(StatementAnalysis.statement_id == stmt_id).first()
    assert analysis is not None
    # Reviewer decision has NOT been set by institution upload
    assert analysis.reviewer_decision is None


def test_statement_upload_invalid_file(inst_dashboard_setup):
    """Rejects empty or prohibited file format uploads."""
    token = inst_dashboard_setup["tokens"]["rep_a"]
    inst_id = inst_dashboard_setup["inst_a_id"]

    files = {"file": ("malicious.exe", io.BytesIO(b"MZ executable header"), "application/x-msdownload")}
    data = {
        "institution_id": inst_id,
        "bank_name": "State Bank of India",
        "account_number": "SBI0012345678",
        "period_start": "2026-10-18",
        "period_end": "2026-10-24",
    }
    res = client.post("/api/v1/statements/upload", data=data, files=files, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code in (400, 422)


def test_statement_upload_cross_institution_blocked(inst_dashboard_setup):
    """Institution Rep A CANNOT upload statements for Institution B."""
    token = inst_dashboard_setup["tokens"]["rep_a"]
    inst_b_id = inst_dashboard_setup["inst_b_id"]

    csv_content = b"Date,Description,Reference,Withdrawal,Deposit,Balance\n2026-10-18,OPENING,,,500000,500000\n"
    files = {"file": ("statement.csv", io.BytesIO(csv_content), "text/csv")}
    data = {
        "institution_id": inst_b_id,  # Tampering with target institution
        "bank_name": "Bank of Baroda",
        "account_number": "BOB0098765432",
        "period_start": "2026-10-18",
        "period_end": "2026-10-24",
    }
    res = client.post("/api/v1/statements/upload", data=data, files=files, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "another institution" in res.json()["detail"].lower() or "denied" in res.json()["detail"].lower()


# =====================================================================
# PART 2 & 5: Financial Status Summary & Notifications
# =====================================================================

def test_institution_financial_status_endpoint(inst_dashboard_setup):
    """
    Institution Rep retrieves its authoritative live financial status:
    - FDR portfolio breakdown
    - Missing weekly reporting periods
    - Upcoming maturities (within 60 days)
    - Deduplicated notification items
    """
    token = inst_dashboard_setup["tokens"]["rep_a"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/institution-dashboard/financial-status", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["institution_id"] == inst_dashboard_setup["inst_a_id"]
    assert "fdr_portfolio" in data
    assert data["fdr_portfolio"]["total"] >= 1

    # Check upcoming maturities includes FDR A (which matures in 25 days)
    assert len(data["upcoming_maturities"]) >= 1
    crit_mat = next((m for m in data["upcoming_maturities"] if m["fdr_id"] == inst_dashboard_setup["fdr_a_id"]), None)
    assert crit_mat is not None
    assert crit_mat["is_critical"] is True

    # Check notifications are present and deduplicated
    assert "notifications" in data
    titles = [n["title"] for n in data["notifications"]]
    assert len(titles) == len(set(titles)), "Notifications must not contain duplicate titles"


def test_cross_institution_financial_status_blocked(inst_dashboard_setup):
    """
    Multi-tenant isolation: Institution Rep A is FORBIDDEN from requesting
    Institution B's financial status.
    """
    token = inst_dashboard_setup["tokens"]["rep_a"]
    inst_b_id = inst_dashboard_setup["inst_b_id"]

    res = client.get(
        f"/api/v1/institution-dashboard/financial-status?institution_id={inst_b_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 403
    assert "another institution" in res.json()["detail"].lower() or "denied" in res.json()["detail"].lower()


# =====================================================================
# PART 3: Request for Refund & Self-Approval Prevention
# =====================================================================

def test_refund_request_submission_and_self_approval_prevention(inst_dashboard_setup, db):
    """
    1. Institution Rep submits a deposit refund request.
    2. Request is persisted in database and linked to the FDR.
    3. Institution Rep CANNOT approve its own refund request (Strict RBAC).
    """
    token = inst_dashboard_setup["tokens"]["rep_a"]
    headers = {"Authorization": f"Bearer {token}"}
    fdr_id = inst_dashboard_setup["fdr_a_id"]

    payload = {
        "fdr_id": fdr_id,
        "fdr_number": "FDR/DIAT/2026/001",
        "institution_id": inst_dashboard_setup["inst_a_id"],
        "institution_name": "Delhi Institute of Advanced Technology",
        "bank_name": "State Bank of India",
        "principal_amount": 5000000.0,
        "request_type": "FULL_RELEASE",
        "justification_reason": "Statutory 5-year lock-in period successfully concluded with zero liabilities.",
        "regulatory_clause_reference": "AICTE APH 2026-27 Clause 11.2",
        "supporting_document_names": ["No_Dues_Certificate.pdf", "Original_Receipt.pdf"],
        "applicant_name": "Dr. S. K. Gupta",
        "applicant_designation": "Director",
    }

    res = client.post("/api/v1/releases", json=payload, headers=headers)
    assert res.status_code == 200
    req_id = res.json()["release_request"]["id"]

    # Verify request is persisted
    db_req = db.query(ReleaseRefundRequest).filter(ReleaseRefundRequest.id == req_id).first()
    assert db_req is not None
    assert db_req.status == "submitted"

    # RULE: Institution Rep CANNOT approve its own refund request (HTTP 403)
    decision_payload = {
        "officer_id": inst_dashboard_setup["user_rep_a_id"],
        "officer_name": "Dr. S. K. Gupta",
        "officer_role": "institution_representative",
        "decision": "APPROVED",
        "decision_reason": "Attempting self-approval of refund",
    }
    decision_res = client.post(
        f"/api/v1/releases/{req_id}/decision",
        json=decision_payload,
        headers=headers,
    )
    assert decision_res.status_code == 403
    assert "institution representative" in decision_res.json()["detail"].lower()


# =====================================================================
# PART 4: Status Synchronization
# =====================================================================

def test_status_synchronization_after_approver_decision(inst_dashboard_setup, db):
    """
    When Approving Authority reviews a refund request or raises a query,
    the institution dashboard reflects the update from authoritative backend records.
    """
    fdr_id = inst_dashboard_setup["fdr_a_id"]
    req = db.query(ReleaseRefundRequest).filter(ReleaseRefundRequest.instrument_id == fdr_id).first()
    assert req is not None

    # Approving Authority issues query
    query_payload = {
        "officer_id": "usr-aa-01",
        "officer_name": "Member Secretary AICTE",
        "officer_role": "approving_authority",
        "decision": "RETURNED_FOR_QUERY",
        "decision_reason": "Please attach certified audit statement from chartered accountant.",
    }
    dec_res = client.post(
        f"/api/v1/releases/{req.id}/decision",
        json=query_payload,
        headers={"Authorization": f"Bearer {inst_dashboard_setup['tokens']['approver']}"},
    )
    assert dec_res.status_code == 200

    # Institution Rep fetches financial status: must show updated query and returned_for_correction status
    inst_res = client.get(
        "/api/v1/institution-dashboard/financial-status",
        headers={"Authorization": f"Bearer {inst_dashboard_setup['tokens']['rep_a']}"},
    )
    assert inst_res.status_code == 200
    inst_data = inst_res.json()
    req_item = next((r for r in inst_data["refund_requests"]["requests"] if r["id"] == req.id), None)
    assert req_item is not None
    assert req_item["status"] == "returned_for_correction"
    assert req_item["has_pending_query"] is True
    assert "chartered accountant" in req_item["latest_decision_notes"].lower()

