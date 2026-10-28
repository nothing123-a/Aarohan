"""
Weekly Bank Statement Analysis & Alert Generation Engine
Orchestrates statement verification, period-over-period comparison,
fund allocation checking, and deduplicated financial alert dispatch.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.models import (
    BankStatement,
    StatementExtraction,
    StatementTransaction,
    StatementAnalysis,
    FinancialAlert,
    Institution,
    FinancialInstrument,
    AuditEvent,
    User,
)
from app.modules.statement_analysis.parser import ParsedStatement, ParsedTransaction
from app.modules.statement_analysis.validator import validate_statement_data
from app.modules.statement_analysis.allocation_rules import evaluate_allocation_rules, AllocationPolicyConfig, DEFAULT_ALLOCATION_POLICY


def create_or_update_alert(
    db: Session,
    institution_id: str,
    statement_id: Optional[str],
    alert_type: str,
    severity: str,
    title: str,
    description: str,
) -> FinancialAlert:
    """
    Creates a financial alert if an OPEN alert for the same condition does not already exist.
    Avoids duplicate alerts for the same unresolved condition.
    """
    existing = db.query(FinancialAlert).filter(
        FinancialAlert.institution_id == institution_id,
        FinancialAlert.statement_id == statement_id,
        FinancialAlert.alert_type == alert_type,
        FinancialAlert.status == "OPEN",
    ).first()

    if existing:
        return existing

    alert = FinancialAlert(
        id=f"alert-{uuid.uuid4().hex[:8]}",
        institution_id=institution_id,
        statement_id=statement_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        description=description,
        status="OPEN",
        created_at=datetime.now(timezone.utc),
    )
    db.add(alert)
    return alert


def perform_statement_analysis(
    statement_id: str,
    db: Session,
    reviewed_by_user: Optional[User] = None,
    policy: AllocationPolicyConfig = DEFAULT_ALLOCATION_POLICY,
) -> StatementAnalysis:
    """
    Runs full weekly statement analysis for a given bank statement:
    1. Loads statement, extraction, and transaction records.
    2. Runs arithmetic and timeline validation.
    3. Runs statutory allocation and reserve evaluations.
    4. Compares with prior weekly period.
    5. Persists StatementAnalysis record.
    6. Dispatches deduplicated alerts.
    """
    stmt = db.query(BankStatement).filter(BankStatement.id == statement_id).first()
    if not stmt:
        raise ValueError(f"Bank statement '{statement_id}' not found.")

    ext = stmt.extraction
    if not ext:
        raise ValueError(f"No extraction run found for statement '{statement_id}'.")

    # Reconstruct ParsedStatement for validation and evaluation engines
    transactions = [
        ParsedTransaction(
            transaction_date=t.transaction_date,
            description=t.description,
            reference_number=t.reference_number,
            credit_amount=Decimal(str(t.credit_amount or 0)),
            debit_amount=Decimal(str(t.debit_amount or 0)),
            running_balance=Decimal(str(t.running_balance)) if t.running_balance is not None else None,
            transaction_type=t.transaction_type,
            is_suspicious=t.is_suspicious,
            flag_reason=t.flag_reason,
        )
        for t in stmt.transactions
    ]

    parsed = ParsedStatement(
        account_holder_name=ext.account_holder_name,
        bank_name=ext.bank_name or stmt.bank_name,
        account_number=ext.account_number or stmt.account_number,
        statement_period_start=stmt.reporting_period_start,
        statement_period_end=stmt.reporting_period_end,
        opening_balance=Decimal(str(ext.opening_balance)) if ext.opening_balance is not None else None,
        closing_balance=Decimal(str(ext.closing_balance)) if ext.closing_balance is not None else None,
        total_credits=Decimal(str(ext.total_credits or 0)),
        total_debits=Decimal(str(ext.total_debits or 0)),
        transactions=transactions,
        missing_fields=ext.missing_fields or [],
        confidence_score=float(ext.confidence_score or 100),
    )

    # 1. Validation
    val_result = validate_statement_data(
        parsed=parsed,
        institution_id=stmt.institution_id,
        account_number=stmt.account_number,
        current_statement_id=stmt.id,
        db=db,
    )

    # 2. Institutional Obligations Lookup
    inst = stmt.institution
    inst_deposit_req = Decimal(str(inst.total_deposit_required or 0)) if inst else Decimal("10000000.00")

    # Query active FDR principal for this institution
    active_instruments = db.query(FinancialInstrument).filter(
        FinancialInstrument.institution_id == stmt.institution_id,
        FinancialInstrument.lifecycle_status == "active",
    ).all()

    total_fdr_principal = sum((Decimal(str(i.amount or 0)) for i in active_instruments), Decimal("0.00"))
    # FDRs verified under AICTE joint lien
    total_lien = sum(
        (Decimal(str(i.amount or 0)) for i in active_instruments if i.verification_status == "verified"),
        Decimal("0.00"),
    )

    # 3. Allocation Rule Evaluation
    alloc_result = evaluate_allocation_rules(
        parsed=parsed,
        institution_total_deposit_required=inst_deposit_req,
        total_active_fdr_principal=total_fdr_principal,
        total_fdr_under_lien=total_lien,
        policy=policy,
    )

    # Combine discrepancies
    all_discrepancies = [d.model_dump() for d in (val_result.discrepancies + alloc_result.discrepancies)]

    # 4. Period-over-period trend analysis
    opening_bal = parsed.opening_balance if parsed.opening_balance is not None else Decimal("0.00")
    closing_bal = parsed.closing_balance if parsed.closing_balance is not None else Decimal("0.00")
    net_change = closing_bal - opening_bal
    pct_change = Decimal("0.00")
    if opening_bal > Decimal("0.00"):
        pct_change = round(((closing_bal - opening_bal) / opening_bal) * Decimal("100.0"), 2)

    # 5. Determine Analysis Status
    has_critical = any(d.get("severity") == "CRITICAL" for d in all_discrepancies)
    has_warning = any(d.get("severity") == "WARNING" for d in all_discrepancies)

    if has_critical:
        analysis_status = "discrepancy_flagged"
    elif has_warning:
        analysis_status = "requires_review"
    elif val_result.reconciliation_passed and alloc_result.meets_minimum_balance:
        analysis_status = "clean"
    else:
        analysis_status = "requires_review"

    # 6. Save/Update StatementAnalysis
    now = datetime.now(timezone.utc)
    analysis = db.query(StatementAnalysis).filter(StatementAnalysis.statement_id == statement_id).first()
    if not analysis:
        analysis = StatementAnalysis(
            id=f"ana-{uuid.uuid4().hex[:8]}",
            statement_id=stmt.id,
            institution_id=stmt.institution_id,
            reporting_period_start=stmt.reporting_period_start,
            reporting_period_end=stmt.reporting_period_end,
            opening_balance=opening_bal,
            closing_balance=closing_bal,
            net_change=net_change,
            net_change_percentage=pct_change,
            reconciliation_passed=val_result.reconciliation_passed,
            reconciliation_variance=val_result.reconciliation_variance,
            required_minimum_balance=alloc_result.required_minimum_balance,
            balance_meets_requirement=alloc_result.meets_minimum_balance,
            unexplained_withdrawals_detected=alloc_result.unexplained_withdrawals_detected,
            unexplained_withdrawals_count=alloc_result.unexplained_withdrawals_count,
            unexplained_withdrawals_total=alloc_result.unexplained_withdrawals_total,
            prior_period_statement_id=val_result.prior_statement_id,
            period_continuity_status=val_result.period_continuity_status,
            status=analysis_status,
            discrepancies=all_discrepancies,
            created_at=now,
        )
        db.add(analysis)
    else:
        analysis.opening_balance = opening_bal
        analysis.closing_balance = closing_bal
        analysis.net_change = net_change
        analysis.net_change_percentage = pct_change
        analysis.reconciliation_passed = val_result.reconciliation_passed
        analysis.reconciliation_variance = val_result.reconciliation_variance
        analysis.required_minimum_balance = alloc_result.required_minimum_balance
        analysis.balance_meets_requirement = alloc_result.meets_minimum_balance
        analysis.unexplained_withdrawals_detected = alloc_result.unexplained_withdrawals_detected
        analysis.unexplained_withdrawals_count = alloc_result.unexplained_withdrawals_count
        analysis.unexplained_withdrawals_total = alloc_result.unexplained_withdrawals_total
        analysis.period_continuity_status = val_result.period_continuity_status
        analysis.status = analysis_status
        analysis.discrepancies = all_discrepancies
        analysis.updated_at = now

    # Update statement overall status
    stmt.status = analysis_status

    # 7. Generate Targeted Alerts (Deduplicated)
    if not val_result.reconciliation_passed:
        create_or_update_alert(
            db=db,
            institution_id=stmt.institution_id,
            statement_id=stmt.id,
            alert_type="RECONCILIATION_FAILURE",
            severity="CRITICAL",
            title=f"Reconciliation Mismatch: {stmt.bank_name} A/C {stmt.account_number}",
            description=f"Statement opening balance + credits - debits does not match closing balance (Variance ₹{float(val_result.reconciliation_variance):,.2f}).",
        )

    if not alloc_result.meets_minimum_balance:
        create_or_update_alert(
            db=db,
            institution_id=stmt.institution_id,
            statement_id=stmt.id,
            alert_type="BALANCE_BELOW_REQUIREMENT",
            severity="CRITICAL",
            title=f"Operating Reserve Deficit: {inst.name if inst else 'Institution'}",
            description=f"Observed balance ₹{float(closing_bal):,.2f} fell below minimum regulatory threshold ₹{float(alloc_result.required_minimum_balance):,.2f}.",
        )

    if alloc_result.unexplained_withdrawals_detected:
        create_or_update_alert(
            db=db,
            institution_id=stmt.institution_id,
            statement_id=stmt.id,
            alert_type="UNEXPECTED_WITHDRAWAL",
            severity="WARNING",
            title=f"High-Value Withdrawal Flagged: A/C {stmt.account_number}",
            description=f"Detected {alloc_result.unexplained_withdrawals_count} withdrawal(s) totaling ₹{float(alloc_result.unexplained_withdrawals_total):,.2f} exceeding verification thresholds.",
        )

    if val_result.period_continuity_status == "gap_detected":
        create_or_update_alert(
            db=db,
            institution_id=stmt.institution_id,
            statement_id=stmt.id,
            alert_type="MISSING_WEEKLY_STATEMENT",
            severity="WARNING",
            title=f"Reporting Gap Flagged: A/C {stmt.account_number}",
            description=f"Gap detected between prior statement period and reporting week starting {stmt.reporting_period_start}.",
        )

    # 8. Record Tamper-Evident Audit Trail
    audit = AuditEvent(
        id=f"audit-stmt-{uuid.uuid4().hex[:8]}",
        actor_user_id=reviewed_by_user.id if reviewed_by_user else stmt.uploaded_by_user_id,
        institution_id=stmt.institution_id,
        action="STATEMENT_WEEKLY_ANALYSIS_COMPLETED",
        entity_type="bank_statements",
        entity_id=stmt.id,
        outcome="success",
        details={
            "status": analysis_status,
            "reconciliation_passed": val_result.reconciliation_passed,
            "closing_balance": float(closing_bal),
            "discrepancies_count": len(all_discrepancies),
        },
        occurred_at=now,
    )
    db.add(audit)
    db.commit()

    return analysis

