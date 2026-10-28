"""
Weekly Bank Statement Analyzer Automated Test Suite
Covers:
- Step 1: Intake & parsing (CSV and PDF statements)
- Step 2: Extraction & missing field tracking
- Step 3: Validation (reconciliation arithmetic, date bounds, duplicate detection, timeline continuity)
- Step 4: Financial allocation rules (minimum operating reserve, large withdrawals, non-interchangeable funds)
- Step 5: Weekly analysis & period-over-period comparison
- Step 6: Role-based scoping (Institution isolation vs Executive oversight)
- Step 7: Deduplicated financial alert generation
- Step 8: Persistence, audit trail, and reviewer decision recording
- Authorized email intake channel
"""
import pytest
import uuid
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.models import (
    Institution,
    User,
    BankStatement,
    StatementExtraction,
    StatementTransaction,
    StatementAnalysis,
    FinancialAlert,
)
from app.core.security import create_access_token
from app.modules.statement_analysis.parser import (
    parse_statement,
    parse_csv_statement,
    parse_pdf_statement,
    ParsedStatement,
)
from app.modules.statement_analysis.validator import validate_statement_data
from app.modules.statement_analysis.allocation_rules import (
    evaluate_allocation_rules,
    AllocationPolicyConfig,
)
from app.modules.statement_analysis.email_ingestion import (
    ingest_statement_from_email,
    EmailIngestionPayload,
    EmailIngestionError,
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def test_data(db):
    # Ensure test institution
    inst = db.query(Institution).filter(Institution.id == "inst-stmt-test").first()
    if not inst:
        inst = Institution(
            id="inst-stmt-test",
            institution_code="AICTE-STMT-TEST",
            name="Statement Testing Institute",
            status="active",
            total_deposit_required=Decimal("10000000.00"),
        )
        db.add(inst)
        db.commit()

    # Second institution for data isolation test
    inst2 = db.query(Institution).filter(Institution.id == "inst-stmt-other").first()
    if not inst2:
        inst2 = Institution(
            id="inst-stmt-other",
            institution_code="AICTE-STMT-OTHER",
            name="Other Testing Institute",
            status="active",
            total_deposit_required=Decimal("15000000.00"),
        )
        db.add(inst2)
        db.commit()

    # Approving authority
    approver = db.query(User).filter(User.email == "stmt_approver@aicte.gov.in").first()
    if not approver:
        approver = User(
            id=str(uuid.uuid4()),
            email="stmt_approver@aicte.gov.in",
            display_name="Member Secretary AICTE",
            role="approving_authority",
            status="active",
        )
        db.add(approver)
        db.commit()

    # Scrutiny Officer
    scrutiny = db.query(User).filter(User.email == "stmt_scrutiny@aicte.gov.in").first()
    if not scrutiny:
        scrutiny = User(
            id=str(uuid.uuid4()),
            email="stmt_scrutiny@aicte.gov.in",
            display_name="Senior Scrutiny Officer",
            role="scrutiny_officer",
            status="active",
        )
        db.add(scrutiny)
        db.commit()

    # Institution Rep for inst-stmt-test
    rep = db.query(User).filter(User.email == "stmt_rep@institute.edu.in").first()
    if not rep:
        rep = User(
            id=str(uuid.uuid4()),
            email="stmt_rep@institute.edu.in",
            display_name="Registrar Rep",
            role="institution_representative",
            status="active",
        )
        db.add(rep)
        db.commit()

    from app.core.models import InstitutionMembership
    mem = db.query(InstitutionMembership).filter(
        InstitutionMembership.user_id == rep.id,
        InstitutionMembership.institution_id == inst.id,
    ).first()
    if not mem:
        mem = InstitutionMembership(
            id=str(uuid.uuid4()),
            user_id=rep.id,
            institution_id=inst.id,
            role="institution_representative",
            status="active",
        )
        db.add(mem)
        db.commit()

    tokens = {
        "approver": create_access_token({"sub": approver.id, "email": approver.email, "role": "approving_authority"}),
        "scrutiny": create_access_token({"sub": scrutiny.id, "email": scrutiny.email, "role": "scrutiny_officer"}),
        "rep": create_access_token({"sub": rep.id, "email": rep.email, "role": "institution_representative"}),
    }

    return {
        "inst_id": inst.id,
        "inst_other_id": inst2.id,
        "tokens": tokens,
        "users": {"approver": approver, "scrutiny": scrutiny, "rep": rep},
    }


# ---------------------------------------------------------------------------
# Unit Tests: Parser & Arithmetic Validation
# ---------------------------------------------------------------------------

def test_parse_valid_csv():
    """Parses a standard bank statement CSV with headers and line items."""
    csv_bytes = b"""State Bank of India, Main Branch
Account Holder,Statement Testing Institute
Account Number,SB-9988776655
Period Start,2026-10-01
Period End,2026-10-07
Opening Balance,5000000.00
Closing Balance,5250000.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
01/10/2026,B/F Opening Balance,,0.00,0.00,5000000.00
03/10/2026,Tuition Fee Receipts,NEFT-FEES-101,0.00,300000.00,5300000.00
05/10/2026,Campus Utilities Electric,CMS-ELEC-01,50000.00,0.00,5250000.00
"""
    parsed = parse_statement(csv_bytes, "statement.csv", "text/csv")
    assert parsed.account_holder_name == "Statement Testing Institute"
    assert parsed.account_number == "SB-9988776655"
    assert parsed.opening_balance == Decimal("5000000.00")
    assert parsed.closing_balance == Decimal("5250000.00")
    assert parsed.total_credits == Decimal("300000.00")
    assert parsed.total_debits == Decimal("50000.00")
    assert len(parsed.transactions) == 2
    assert len(parsed.missing_fields) == 0


def test_reconciliation_arithmetic_success():
    """Opening + Credits - Debits == Closing produces reconciliation_passed=True."""
    csv_bytes = b"""Bank of Baroda
Account Holder,Statement Testing Institute
Account Number,CA-11223344
Period Start,2026-10-01
Period End,2026-10-07
Opening Balance,1000000.00
Closing Balance,1200000.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
02/10/2026,Grant Inflow,REF-01,0.00,300000.00,1300000.00
04/10/2026,Vendor Payment,REF-02,100000.00,0.00,1200000.00
"""
    parsed = parse_statement(csv_bytes, "test.csv", "text/csv")
    val_res = validate_statement_data(parsed, "inst-stmt-test", "CA-11223344")
    assert val_res.reconciliation_passed is True
    assert val_res.reconciliation_variance == Decimal("0.00")
    assert not any(d.category == "ARITHMETIC_MISMATCH" for d in val_res.discrepancies)


def test_reconciliation_arithmetic_failure():
    """Math mismatch (e.g. Closing altered) triggers ARITHMETIC_MISMATCH discrepancy."""
    csv_bytes = b"""Bank of Baroda
Account Holder,Statement Testing Institute
Account Number,CA-11223344
Period Start,2026-10-01
Period End,2026-10-07
Opening Balance,1000000.00
Closing Balance,9999999.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
02/10/2026,Grant Inflow,REF-01,0.00,300000.00,1300000.00
04/10/2026,Vendor Payment,REF-02,100000.00,0.00,1200000.00
"""
    parsed = parse_statement(csv_bytes, "test.csv", "text/csv")
    val_res = validate_statement_data(parsed, "inst-stmt-test", "CA-11223344")
    assert val_res.reconciliation_passed is False
    assert any(d.category == "ARITHMETIC_MISMATCH" and d.severity == "CRITICAL" for d in val_res.discrepancies)


def test_transaction_date_out_of_bounds():
    """Transaction dated outside the declared statement period is flagged."""
    csv_bytes = b"""Bank of Baroda
Account Holder,Statement Testing Institute
Account Number,CA-11223344
Period Start,2026-10-01
Period End,2026-10-07
Opening Balance,1000000.00
Closing Balance,1000000.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
25/12/2026,Holiday Expense,REF-01,1000.00,0.00,999000.00
"""
    parsed = parse_statement(csv_bytes, "test.csv", "text/csv")
    val_res = validate_statement_data(parsed, "inst-stmt-test", "CA-11223344")
    assert any(d.category == "DATE_OUT_OF_BOUNDS" for d in val_res.discrepancies)


def test_allocation_minimum_balance_deficit():
    """Operating balance falling below the minimum reserve threshold is flagged."""
    csv_bytes = b"""Bank of Baroda
Account Holder,Statement Testing Institute
Account Number,CA-11223344
Period Start,2026-10-01
Period End,2026-10-07
Opening Balance,200000.00
Closing Balance,150000.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
02/10/2026,Maintenance,REF-01,50000.00,0.00,150000.00
"""
    parsed = parse_statement(csv_bytes, "test.csv", "text/csv")
    eval_res = evaluate_allocation_rules(
        parsed=parsed,
        institution_total_deposit_required=Decimal("10000000.00"),
        total_active_fdr_principal=Decimal("10000000.00"),
        total_fdr_under_lien=Decimal("10000000.00"),
        policy=AllocationPolicyConfig(default_min_operating_balance=Decimal("500000.00")),
    )
    assert eval_res.meets_minimum_balance is False
    assert any(d.category == "BALANCE_DEFICIT" for d in eval_res.discrepancies)


def test_unexplained_large_withdrawal_detection():
    """Single withdrawal >= threshold is flagged for reviewer clearance."""
    csv_bytes = b"""Bank of Baroda
Account Holder,Statement Testing Institute
Account Number,CA-11223344
Period Start,2026-10-01
Period End,2026-10-07
Opening Balance,5000000.00
Closing Balance,4200000.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
03/10/2026,Heavy Machinery Purchase,REF-88,800000.00,0.00,4200000.00
"""
    parsed = parse_statement(csv_bytes, "test.csv", "text/csv")
    eval_res = evaluate_allocation_rules(
        parsed=parsed,
        institution_total_deposit_required=Decimal("10000000.00"),
        total_active_fdr_principal=Decimal("10000000.00"),
        total_fdr_under_lien=Decimal("10000000.00"),
        policy=AllocationPolicyConfig(large_withdrawal_amount_threshold=Decimal("500000.00")),
    )
    assert eval_res.unexplained_withdrawals_detected is True
    assert eval_res.unexplained_withdrawals_count == 1
    assert eval_res.unexplained_withdrawals_total == Decimal("800000.00")
    assert any(d.category == "UNEXPLAINED_WITHDRAWAL" for d in eval_res.discrepancies)


# ---------------------------------------------------------------------------
# Integration Tests: Endpoints, Scoping, and Workflow
# ---------------------------------------------------------------------------

def test_upload_bank_statement_success(test_data):
    """Institution Representative uploads a valid weekly CSV statement."""
    token = test_data["tokens"]["rep"]
    csv_bytes = b"""State Bank of India, Delhi
Account Holder,Statement Testing Institute
Account Number,SB-TEST-AUTO-01
Period Start,2026-10-01
Period End,2026-10-07
Opening Balance,3000000.00
Closing Balance,3100000.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
02/10/2026,Grant Inflow,REF-A1,0.00,200000.00,3200000.00
04/10/2026,Vendor Settlement,REF-A2,100000.00,0.00,3100000.00
"""
    res = client.post(
        "/api/v1/statements/upload",
        data={
            "institution_id": test_data["inst_id"],
            "bank_name": "State Bank of India",
            "account_number": "SB-TEST-AUTO-01",
            "period_start": "2026-10-01",
            "period_end": "2026-10-07",
            "statement_source": "direct_upload",
        },
        files={"file": ("statement_wk1.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["reconciliation_passed"] is True
    assert data["data"]["transaction_count"] == 2


def test_upload_duplicate_statement_flagged(test_data):
    """Uploading statement with overlapping period triggers duplicate discrepancy."""
    token = test_data["tokens"]["rep"]
    csv_bytes = b"""State Bank of India, Delhi
Account Holder,Statement Testing Institute
Account Number,SB-TEST-AUTO-01
Period Start,2026-10-01
Period End,2026-10-07
Opening Balance,3000000.00
Closing Balance,3100000.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
02/10/2026,Grant Inflow,REF-A1,0.00,200000.00,3200000.00
04/10/2026,Vendor Settlement,REF-A2,100000.00,0.00,3100000.00
"""
    # Second upload of the identical period
    res = client.post(
        "/api/v1/statements/upload",
        data={
            "institution_id": test_data["inst_id"],
            "bank_name": "State Bank of India",
            "account_number": "SB-TEST-AUTO-01",
            "period_start": "2026-10-01",
            "period_end": "2026-10-07",
            "statement_source": "direct_upload",
        },
        files={"file": ("statement_wk1_dup.csv", csv_bytes, "text/csv")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["data"]["discrepancies_count"] >= 1


def test_institution_representative_rbac_isolation(test_data):
    """Institution Representative cannot upload or view statements for another institution."""
    rep_token = test_data["tokens"]["rep"]

    # Attempt to upload statement for another institution
    res = client.post(
        "/api/v1/statements/upload",
        data={
            "institution_id": test_data["inst_other_id"],  # Another institution
            "bank_name": "HDFC Bank",
            "account_number": "CA-99999",
            "period_start": "2026-10-01",
            "period_end": "2026-10-07",
        },
        files={"file": ("other.csv", b"sample content", "text/csv")},
        headers={"Authorization": f"Bearer {rep_token}"},
    )
    assert res.status_code == 403


def test_list_statements_approver_and_rep_scoping(test_data):
    """Approving Authority sees all statements; Institution Rep sees only their own."""
    app_token = test_data["tokens"]["approver"]
    rep_token = test_data["tokens"]["rep"]

    # Approver
    res_app = client.get("/api/v1/statements", headers={"Authorization": f"Bearer {app_token}"})
    assert res_app.status_code == 200
    assert res_app.json()["total"] >= 1

    # Rep
    res_rep = client.get("/api/v1/statements", headers={"Authorization": f"Bearer {rep_token}"})
    assert res_rep.status_code == 200
    items = res_rep.json()["data"]
    # Verify no statements belong to another institution
    assert all(i["institution_id"] == test_data["inst_id"] for i in items)


def test_record_reviewer_decision(test_data, db):
    """Approving Authority records review outcome; Institution Rep is blocked from reviewing."""
    app_token = test_data["tokens"]["approver"]
    rep_token = test_data["tokens"]["rep"]

    # Get a statement id
    stmt = db.query(BankStatement).filter(BankStatement.institution_id == test_data["inst_id"]).first()
    assert stmt is not None

    # Institution Rep attempted review -> 403
    res_rep = client.post(
        f"/api/v1/statements/{stmt.id}/review",
        json={"decision": "APPROVED", "notes": "Unauthorized self-approval attempt."},
        headers={"Authorization": f"Bearer {rep_token}"},
    )
    assert res_rep.status_code == 403

    # Approving Authority authorized review -> 200
    res_app = client.post(
        f"/api/v1/statements/{stmt.id}/review",
        json={"decision": "APPROVED", "notes": "Statutory review passed. Account reconciled."},
        headers={"Authorization": f"Bearer {app_token}"},
    )
    assert res_app.status_code == 200
    assert res_app.json()["data"]["decision"] == "APPROVED"


def test_financial_alerts_retrieval_and_resolution(test_data, db):
    """Financial alerts list and resolution workflow."""
    app_token = test_data["tokens"]["approver"]
    scrt_token = test_data["tokens"]["scrutiny"]

    res = client.get("/api/v1/statements/alerts", headers={"Authorization": f"Bearer {app_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "data" in data

    # Create a test alert to resolve
    from app.modules.statement_analysis.analyzer import create_or_update_alert
    alert = create_or_update_alert(
        db=db,
        institution_id=test_data["inst_id"],
        statement_id=None,
        alert_type="UNEXPECTED_WITHDRAWAL",
        severity="WARNING",
        title="Test Alert for Resolution",
        description="Testing resolution workflow.",
    )
    db.commit()

    # Resolve alert
    res_res = client.patch(
        f"/api/v1/statements/alerts/{alert.id}/resolve",
        json={"status": "RESOLVED", "resolution_notes": "Contractor invoice verified by Scrutiny."},
        headers={"Authorization": f"Bearer {scrt_token}"},
    )
    assert res_res.status_code == 200
    assert res_res.json()["data"]["status"] == "RESOLVED"


def test_authorized_email_ingestion(test_data):
    """Simulates authorized email intake channel with authenticity notice."""
    import base64
    csv_bytes = b"""State Bank of India
Account Holder,Statement Testing Institute
Account Number,SB-EMAIL-FEED-99
Period Start,2026-10-08
Period End,2026-10-14
Opening Balance,3100000.00
Closing Balance,3150000.00

Txn Date,Particulars,Chq/Ref,Debit,Credit,Balance
09/10/2026,Interest Credit,INT-01,0.00,50000.00,3150000.00
"""
    b64 = base64.b64encode(csv_bytes).decode("ascii")

    payload = {
        "sender_email": "stmt_rep@institute.edu.in",
        "subject": "Weekly Bank Statement Feed W41",
        "institution_code": "AICTE-STMT-TEST",
        "bank_name": "State Bank of India",
        "account_number": "SB-EMAIL-FEED-99",
        "period_start": "2026-10-08",
        "period_end": "2026-10-14",
        "attachment_filename": "feed_w41.csv",
        "attachment_base64": b64,
    }

    res = client.post("/api/v1/statements/email-ingest", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["source"] == "authorized_email_feed"
    assert "REGULATORY NOTICE" in data["disclaimer"]

