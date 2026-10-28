"""
Weekly Bank Statement Seed Data
Initializes realistic demonstration statements for authorized institutions:
- DTU (Delhi Technological University) - Clean reconciled weekly statements
- BITS Goa - Flagged statement with high-value withdrawal for reviewer escalation
- Manipal Institute of Technology - Statement requiring manual review
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.core.models import (
    BankStatement,
    StatementExtraction,
    StatementTransaction,
    StatementAnalysis,
    FinancialAlert,
    Institution,
    User,
)
from app.modules.documents.storage import save_document_binary, calculate_sha256


def seed_weekly_statements_if_empty(db: Session):
    """Seeds sample statements if the bank_statements table is empty."""
    existing_count = db.query(BankStatement).count()
    if existing_count > 0:
        return

    # Find admin or uploader user
    uploader = db.query(User).filter(User.status == "active").first()
    uploader_id = uploader.id if uploader else str(uuid.uuid4())

    # Ensure DTU institution exists
    dtu = db.query(Institution).filter(Institution.id == "inst-001").first()
    if not dtu:
        dtu = db.query(Institution).first()
    if not dtu:
        return

    dtu_id = dtu.id

    now = datetime.now(timezone.utc)

    # ───────────────────────────────────────────────────────────────────────
    # STATEMENT 1: DTU — Week 1 (Oct 12 to Oct 18, 2026) — Clean & Reconciled
    # ───────────────────────────────────────────────────────────────────────
    csv_content_1 = b"""State Bank of India, Main Branch Delhi
Account Holder,Delhi Technological University (DTU)
Account Number,SB-10928374652
Period Start,2026-10-12
Period End,2026-10-18
Opening Balance,12500000.00
Closing Balance,13150000.00

Txn Date,Particulars,Chq/Ref No,Debit,Credit,Balance
12/10/2026,B/F Opening Balance,,0.00,0.00,12500000.00
13/10/2026,State Govt Grant Disbursal,SBIN987123,0.00,1000000.00,13500000.00
15/10/2026,Campus Electricity Utility,CMS-ELEC-44,250000.00,0.00,13250000.00
16/10/2026,Laboratory Consumables Purchase,NEFT-LAB-01,100000.00,0.00,13150000.00
"""
    storage_key_1 = save_document_binary(csv_content_1, "SBI_DTU_Statement_W42.csv", f"stmt-{dtu_id[:8]}")
    stmt_1 = BankStatement(
        id=f"stmt-dtu-w42",
        institution_id=dtu_id,
        bank_name="State Bank of India",
        account_number="SB-10928374652",
        reference_number="SBI/OPR/2026/01",
        statement_source="treasury_portal",
        reporting_period_start=date(2026, 10, 12),
        reporting_period_end=date(2026, 10, 18),
        submission_date=now - timedelta(days=10),
        original_filename="SBI_DTU_Statement_W42.csv",
        storage_key=storage_key_1,
        mime_type="text/csv",
        file_size_bytes=len(csv_content_1),
        sha256_checksum=calculate_sha256(csv_content_1),
        uploaded_by_user_id=uploader_id,
        status="reconciled",
        created_at=now - timedelta(days=10),
    )
    db.add(stmt_1)

    ext_1 = StatementExtraction(
        id=f"ext-dtu-w42",
        statement_id=stmt_1.id,
        account_holder_name="Delhi Technological University (DTU)",
        bank_name="State Bank of India",
        account_number="SB-10928374652",
        statement_period_start=date(2026, 10, 12),
        statement_period_end=date(2026, 10, 18),
        opening_balance=Decimal("12500000.00"),
        closing_balance=Decimal("13150000.00"),
        total_credits=Decimal("1000000.00"),
        total_debits=Decimal("350000.00"),
        transaction_count=3,
        missing_fields=[],
        confidence_score=100.0,
        raw_metadata={"source": "treasury_portal_direct_feed"},
        extracted_at=now - timedelta(days=10),
    )
    db.add(ext_1)

    db.add(StatementTransaction(
        id=f"tx-dtu-1", statement_id=stmt_1.id, transaction_date=date(2026, 10, 13),
        description="State Govt Grant Disbursal", reference_number="SBIN987123",
        credit_amount=Decimal("1000000.00"), debit_amount=Decimal("0.00"), running_balance=Decimal("13500000.00"),
        transaction_type="credit", is_suspicious=False, created_at=now - timedelta(days=10),
    ))
    db.add(StatementTransaction(
        id=f"tx-dtu-2", statement_id=stmt_1.id, transaction_date=date(2026, 10, 15),
        description="Campus Electricity Utility", reference_number="CMS-ELEC-44",
        credit_amount=Decimal("0.00"), debit_amount=Decimal("250000.00"), running_balance=Decimal("13250000.00"),
        transaction_type="debit", is_suspicious=False, created_at=now - timedelta(days=10),
    ))
    db.add(StatementTransaction(
        id=f"tx-dtu-3", statement_id=stmt_1.id, transaction_date=date(2026, 10, 16),
        description="Laboratory Consumables Purchase", reference_number="NEFT-LAB-01",
        credit_amount=Decimal("0.00"), debit_amount=Decimal("100000.00"), running_balance=Decimal("13150000.00"),
        transaction_type="debit", is_suspicious=False, created_at=now - timedelta(days=10),
    ))

    analysis_1 = StatementAnalysis(
        id=f"ana-dtu-w42",
        statement_id=stmt_1.id,
        institution_id=dtu_id,
        reporting_period_start=date(2026, 10, 12),
        reporting_period_end=date(2026, 10, 18),
        opening_balance=Decimal("12500000.00"),
        closing_balance=Decimal("13150000.00"),
        net_change=Decimal("650000.00"),
        net_change_percentage=Decimal("5.20"),
        reconciliation_passed=True,
        reconciliation_variance=Decimal("0.00"),
        required_minimum_balance=Decimal("500000.00"),
        balance_meets_requirement=True,
        unexplained_withdrawals_detected=False,
        unexplained_withdrawals_count=0,
        unexplained_withdrawals_total=Decimal("0.00"),
        period_continuity_status="continuous",
        status="clean",
        discrepancies=[],
        reviewer_decision="APPROVED",
        reviewer_notes="Verified against state treasury weekly ledger. All entries accounted for.",
        reviewed_by_user_id=uploader_id,
        reviewed_at=now - timedelta(days=9),
        created_at=now - timedelta(days=10),
    )
    db.add(analysis_1)

    # ───────────────────────────────────────────────────────────────────────
    # STATEMENT 2: DTU — Week 2 (Oct 19 to Oct 25, 2026) — Recent Clean Statement
    # ───────────────────────────────────────────────────────────────────────
    csv_content_2 = b"""State Bank of India, Main Branch Delhi
Account Holder,Delhi Technological University (DTU)
Account Number,SB-10928374652
Period Start,2026-10-19
Period End,2026-10-25
Opening Balance,13150000.00
Closing Balance,12950000.00

Txn Date,Particulars,Chq/Ref No,Debit,Credit,Balance
19/10/2026,B/F Opening Balance,,0.00,0.00,13150000.00
20/10/2026,Library Journal Subscriptions,RTGS-LIB-99,150000.00,0.00,13000000.00
22/10/2026,Faculty Research Grant Inflow,GOV-RES-88,0.00,200000.00,13200000.00
24/10/2026,Hostel Mess Vendor Settlement,NEFT-VEND-12,250000.00,0.00,12950000.00
"""
    storage_key_2 = save_document_binary(csv_content_2, "SBI_DTU_Statement_W43.csv", f"stmt-{dtu_id[:8]}")
    stmt_2 = BankStatement(
        id=f"stmt-dtu-w43",
        institution_id=dtu_id,
        bank_name="State Bank of India",
        account_number="SB-10928374652",
        reference_number="SBI/OPR/2026/02",
        statement_source="treasury_portal",
        reporting_period_start=date(2026, 10, 19),
        reporting_period_end=date(2026, 10, 25),
        submission_date=now - timedelta(days=3),
        original_filename="SBI_DTU_Statement_W43.csv",
        storage_key=storage_key_2,
        mime_type="text/csv",
        file_size_bytes=len(csv_content_2),
        sha256_checksum=calculate_sha256(csv_content_2),
        uploaded_by_user_id=uploader_id,
        status="reconciled",
        created_at=now - timedelta(days=3),
    )
    db.add(stmt_2)

    ext_2 = StatementExtraction(
        id=f"ext-dtu-w43",
        statement_id=stmt_2.id,
        account_holder_name="Delhi Technological University (DTU)",
        bank_name="State Bank of India",
        account_number="SB-10928374652",
        statement_period_start=date(2026, 10, 19),
        statement_period_end=date(2026, 10, 25),
        opening_balance=Decimal("13150000.00"),
        closing_balance=Decimal("12950000.00"),
        total_credits=Decimal("200000.00"),
        total_debits=Decimal("400000.00"),
        transaction_count=3,
        missing_fields=[],
        confidence_score=100.0,
        raw_metadata={"source": "treasury_portal_direct_feed"},
        extracted_at=now - timedelta(days=3),
    )
    db.add(ext_2)

    db.add(StatementTransaction(
        id=f"tx-dtu-4", statement_id=stmt_2.id, transaction_date=date(2026, 10, 20),
        description="Library Journal Subscriptions", reference_number="RTGS-LIB-99",
        credit_amount=Decimal("0.00"), debit_amount=Decimal("150000.00"), running_balance=Decimal("13000000.00"),
        transaction_type="debit", is_suspicious=False, created_at=now - timedelta(days=3),
    ))
    db.add(StatementTransaction(
        id=f"tx-dtu-5", statement_id=stmt_2.id, transaction_date=date(2026, 10, 22),
        description="Faculty Research Grant Inflow", reference_number="GOV-RES-88",
        credit_amount=Decimal("200000.00"), debit_amount=Decimal("0.00"), running_balance=Decimal("13200000.00"),
        transaction_type="credit", is_suspicious=False, created_at=now - timedelta(days=3),
    ))
    db.add(StatementTransaction(
        id=f"tx-dtu-6", statement_id=stmt_2.id, transaction_date=date(2026, 10, 24),
        description="Hostel Mess Vendor Settlement", reference_number="NEFT-VEND-12",
        credit_amount=Decimal("0.00"), debit_amount=Decimal("250000.00"), running_balance=Decimal("12950000.00"),
        transaction_type="debit", is_suspicious=False, created_at=now - timedelta(days=3),
    ))

    analysis_2 = StatementAnalysis(
        id=f"ana-dtu-w43",
        statement_id=stmt_2.id,
        institution_id=dtu_id,
        reporting_period_start=date(2026, 10, 19),
        reporting_period_end=date(2026, 10, 25),
        opening_balance=Decimal("13150000.00"),
        closing_balance=Decimal("12950000.00"),
        net_change=Decimal("-200000.00"),
        net_change_percentage=Decimal("-1.52"),
        reconciliation_passed=True,
        reconciliation_variance=Decimal("0.00"),
        required_minimum_balance=Decimal("500000.00"),
        balance_meets_requirement=True,
        unexplained_withdrawals_detected=False,
        unexplained_withdrawals_count=0,
        unexplained_withdrawals_total=Decimal("0.00"),
        prior_period_statement_id=stmt_1.id,
        period_continuity_status="continuous",
        status="clean",
        discrepancies=[],
        reviewer_decision="APPROVED",
        reviewer_notes="Weekly reconciliation 100% matched. Reserve requirement satisfied.",
        reviewed_by_user_id=uploader_id,
        reviewed_at=now - timedelta(days=2),
        created_at=now - timedelta(days=3),
    )
    db.add(analysis_2)

    # ───────────────────────────────────────────────────────────────────────
    # STATEMENT 3: Flagged Discrepancy Statement (Large Withdrawal)
    # ───────────────────────────────────────────────────────────────────────
    bits = db.query(Institution).filter(Institution.id == "inst-002").first()
    target_inst_id = bits.id if bits else dtu_id

    csv_content_3 = b"""Bank of Baroda, Panaji Branch
Account Holder,BITS Pilani - Goa Campus
Account Number,CA-20993847511
Period Start,2026-10-19
Period End,2026-10-25
Opening Balance,8000000.00
Closing Balance,6800000.00

Txn Date,Particulars,Chq/Ref No,Debit,Credit,Balance
19/10/2026,B/F Opening Balance,,0.00,0.00,8000000.00
21/10/2026,Unexplained Transfer to Contractor,BOB-UNX-77,1200000.00,0.00,6800000.00
"""
    storage_key_3 = save_document_binary(csv_content_3, "BOB_Statement_W43_Flagged.csv", f"stmt-{target_inst_id[:8]}")
    stmt_3 = BankStatement(
        id=f"stmt-flagged-w43",
        institution_id=target_inst_id,
        bank_name="Bank of Baroda",
        account_number="CA-20993847511",
        statement_source="direct_upload",
        reporting_period_start=date(2026, 10, 19),
        reporting_period_end=date(2026, 10, 25),
        submission_date=now - timedelta(days=1),
        original_filename="BOB_Statement_W43_Flagged.csv",
        storage_key=storage_key_3,
        mime_type="text/csv",
        file_size_bytes=len(csv_content_3),
        sha256_checksum=calculate_sha256(csv_content_3),
        uploaded_by_user_id=uploader_id,
        status="discrepancy_flagged",
        created_at=now - timedelta(days=1),
    )
    db.add(stmt_3)

    ext_3 = StatementExtraction(
        id=f"ext-flagged-w43",
        statement_id=stmt_3.id,
        account_holder_name="BITS Pilani - Goa Campus",
        bank_name="Bank of Baroda",
        account_number="CA-20993847511",
        statement_period_start=date(2026, 10, 19),
        statement_period_end=date(2026, 10, 25),
        opening_balance=Decimal("8000000.00"),
        closing_balance=Decimal("6800000.00"),
        total_credits=Decimal("0.00"),
        total_debits=Decimal("1200000.00"),
        transaction_count=1,
        missing_fields=[],
        confidence_score=100.0,
        raw_metadata={"source": "direct_upload"},
        extracted_at=now - timedelta(days=1),
    )
    db.add(ext_3)

    db.add(StatementTransaction(
        id=f"tx-flagged-1", statement_id=stmt_3.id, transaction_date=date(2026, 10, 21),
        description="Unexplained Transfer to Contractor", reference_number="BOB-UNX-77",
        credit_amount=Decimal("0.00"), debit_amount=Decimal("1200000.00"), running_balance=Decimal("6800000.00"),
        transaction_type="debit", is_suspicious=True, flag_reason="High-value debit ₹12,00,000.00 exceeds standard operational threshold.",
        created_at=now - timedelta(days=1),
    ))

    analysis_3 = StatementAnalysis(
        id=f"ana-flagged-w43",
        statement_id=stmt_3.id,
        institution_id=target_inst_id,
        reporting_period_start=date(2026, 10, 19),
        reporting_period_end=date(2026, 10, 25),
        opening_balance=Decimal("8000000.00"),
        closing_balance=Decimal("6800000.00"),
        net_change=Decimal("-1200000.00"),
        net_change_percentage=Decimal("-15.00"),
        reconciliation_passed=True,
        reconciliation_variance=Decimal("0.00"),
        required_minimum_balance=Decimal("500000.00"),
        balance_meets_requirement=True,
        unexplained_withdrawals_detected=True,
        unexplained_withdrawals_count=1,
        unexplained_withdrawals_total=Decimal("1200000.00"),
        period_continuity_status="initial_period",
        status="discrepancy_flagged",
        discrepancies=[{
            "field_name": "transactions",
            "category": "UNEXPLAINED_WITHDRAWAL",
            "expected_value": "Standard operational disbursements (< ₹5,00,000)",
            "observed_value": "1 high-value debit totaling ₹12,00,000.00",
            "severity": "WARNING",
            "explanation": "Detected large single withdrawal of ₹12,00,000.00 on 21/10/2026. Reviewer clarification required.",
        }],
        reviewer_decision="QUERY_RAISED",
        reviewer_notes="Clarification letter dispatched to Registrar regarding ₹12L contractor remittance.",
        reviewed_by_user_id=uploader_id,
        reviewed_at=now,
        created_at=now - timedelta(days=1),
    )
    db.add(analysis_3)

    # Add alert for the flagged statement
    db.add(FinancialAlert(
        id=f"alert-sample-01",
        institution_id=target_inst_id,
        statement_id=stmt_3.id,
        alert_type="UNEXPECTED_WITHDRAWAL",
        severity="WARNING",
        title="High-Value Withdrawal Flagged: A/C CA-20993847511",
        description="Debit of ₹12,00,000.00 on 21/10/2026 exceeds standard operational variance limits. Verification of underlying invoice required.",
        status="OPEN",
        created_at=now - timedelta(days=1),
    ))

    db.commit()

