"""
Bank Statement Validation Engine
Validates statement arithmetic, date consistency, duplicate uploads,
and period continuity across historical submissions.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.models import BankStatement
from app.modules.statement_analysis.parser import ParsedStatement


class DiscrepancyItem(BaseModel):
    field_name: str
    category: str  # ARITHMETIC_MISMATCH, DATE_OUT_OF_BOUNDS, MISSING_REQUIRED_FIELD, DUPLICATE_SUBMISSION, PERIOD_CONTINUITY, BALANCE_DEFICIT, UNEXPLAINED_WITHDRAWAL
    expected_value: Optional[str] = None
    observed_value: Optional[str] = None
    severity: str = "WARNING"  # CRITICAL, WARNING, INFO
    explanation: str


class StatementValidationResult(BaseModel):
    is_valid: bool
    reconciliation_passed: bool
    reconciliation_variance: Decimal = Decimal("0.00")
    period_continuity_status: str = "initial_period"  # continuous, gap_detected, overlap_detected, initial_period
    prior_statement_id: Optional[str] = None
    discrepancies: List[DiscrepancyItem] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


def validate_statement_data(
    parsed: ParsedStatement,
    institution_id: str,
    account_number: str,
    current_statement_id: Optional[str] = None,
    db: Optional[Session] = None,
) -> StatementValidationResult:
    """
    Validates parsed statement fields, arithmetic reconciliation,
    duplicate submission prevention, and timeline continuity.
    """
    discrepancies: List[DiscrepancyItem] = []
    warnings: List[str] = []

    # ── 1. Statement Period Check ───────────────────────────────────────
    if not parsed.statement_period_start or not parsed.statement_period_end:
        discrepancies.append(DiscrepancyItem(
            field_name="statement_period",
            category="MISSING_REQUIRED_FIELD",
            expected_value="Valid start and end dates",
            observed_value=f"{parsed.statement_period_start} to {parsed.statement_period_end}",
            severity="CRITICAL",
            explanation="Statement period dates could not be verified from the document.",
        ))
    elif parsed.statement_period_start > parsed.statement_period_end:
        discrepancies.append(DiscrepancyItem(
            field_name="statement_period",
            category="DATE_OUT_OF_BOUNDS",
            expected_value=f"Start date <= End date",
            observed_value=f"{parsed.statement_period_start} > {parsed.statement_period_end}",
            severity="CRITICAL",
            explanation="Statement period start date cannot be after the end date.",
        ))

    # ── 2. Transaction Date Consistency ─────────────────────────────────
    if parsed.statement_period_start and parsed.statement_period_end:
        for idx, tx in enumerate(parsed.transactions):
            if tx.transaction_date < parsed.statement_period_start or tx.transaction_date > parsed.statement_period_end:
                discrepancies.append(DiscrepancyItem(
                    field_name=f"transactions[{idx}].date",
                    category="DATE_OUT_OF_BOUNDS",
                    expected_value=f"Between {parsed.statement_period_start} and {parsed.statement_period_end}",
                    observed_value=str(tx.transaction_date),
                    severity="WARNING",
                    explanation=f"Transaction '{tx.description[:30]}' dated {tx.transaction_date} falls outside the declared statement period.",
                ))

    # ── 3. Arithmetic Reconciliation ────────────────────────────────────
    reconciliation_passed = True
    variance = Decimal("0.00")

    if parsed.opening_balance is not None and parsed.closing_balance is not None:
        computed_closing = parsed.opening_balance + parsed.total_credits - parsed.total_debits
        diff = abs(computed_closing - parsed.closing_balance)
        variance = diff

        # Allow 1 rupee rounding tolerance
        if diff > Decimal("1.00"):
            reconciliation_passed = False
            discrepancies.append(DiscrepancyItem(
                field_name="closing_balance",
                category="ARITHMETIC_MISMATCH",
                expected_value=f"₹{float(computed_closing):,.2f} (Opening ₹{float(parsed.opening_balance):,.2f} + Credits ₹{float(parsed.total_credits):,.2f} - Debits ₹{float(parsed.total_debits):,.2f})",
                observed_value=f"₹{float(parsed.closing_balance):,.2f}",
                severity="CRITICAL",
                explanation=f"Statement arithmetic failed: Opening balance + Credits - Debits does not equal Closing balance (Variance: ₹{float(diff):,.2f}).",
            ))
    else:
        reconciliation_passed = False
        warnings.append("Opening or closing balance missing; complete arithmetic reconciliation could not be computed.")

    # ── 4. Duplicate Check & Timeline Continuity (if DB session provided) ─
    continuity_status = "initial_period"
    prior_stmt_id: Optional[str] = None

    if db and parsed.statement_period_start and parsed.statement_period_end:
        # Check duplicate statement
        dup_query = db.query(BankStatement).filter(
            BankStatement.institution_id == institution_id,
            BankStatement.account_number == account_number,
            BankStatement.reporting_period_start == parsed.statement_period_start,
            BankStatement.reporting_period_end == parsed.statement_period_end,
        )
        if current_statement_id:
            dup_query = dup_query.filter(BankStatement.id != current_statement_id)
        
        duplicate = dup_query.first()
        if duplicate:
            discrepancies.append(DiscrepancyItem(
                field_name="statement_period",
                category="DUPLICATE_SUBMISSION",
                expected_value="Unique weekly statement period",
                observed_value=f"Period {parsed.statement_period_start} to {parsed.statement_period_end} already submitted on {duplicate.submission_date}",
                severity="CRITICAL",
                explanation=f"Duplicate statement detected for account {account_number} covering the identical period ({duplicate.id}).",
            ))

        # Check Continuity with prior statement
        prior_query = db.query(BankStatement).filter(
            BankStatement.institution_id == institution_id,
            BankStatement.account_number == account_number,
            BankStatement.reporting_period_end <= parsed.statement_period_start,
        )
        if current_statement_id:
            prior_query = prior_query.filter(BankStatement.id != current_statement_id)
            
        prior_stmt = prior_query.order_by(BankStatement.reporting_period_end.desc()).first()

        if prior_stmt:
            prior_stmt_id = prior_stmt.id
            gap_days = (parsed.statement_period_start - prior_stmt.reporting_period_end).days

            if gap_days <= 1:
                continuity_status = "continuous"
            elif gap_days > 1:
                continuity_status = "gap_detected"
                discrepancies.append(DiscrepancyItem(
                    field_name="period_continuity",
                    category="PERIOD_CONTINUITY",
                    expected_value=f"Continuous from prior period ending {prior_stmt.reporting_period_end}",
                    observed_value=f"Gap of {gap_days - 1} un-reported day(s) before {parsed.statement_period_start}",
                    severity="WARNING",
                    explanation=f"Missing statement gap detected: Prior statement ended {prior_stmt.reporting_period_end}, current statement begins {parsed.statement_period_start}.",
                ))
            else:
                continuity_status = "overlap_detected"
                discrepancies.append(DiscrepancyItem(
                    field_name="period_continuity",
                    category="PERIOD_CONTINUITY",
                    expected_value=f"Starting after prior period ending {prior_stmt.reporting_period_end}",
                    observed_value=f"Overlaps prior period by {abs(gap_days)} day(s)",
                    severity="WARNING",
                    explanation=f"Statement period overlaps with previously verified period ending {prior_stmt.reporting_period_end}.",
                ))

    # Overall validity: valid if no critical discrepancies
    has_critical = any(d.severity == "CRITICAL" for d in discrepancies)

    return StatementValidationResult(
        is_valid=not has_critical,
        reconciliation_passed=reconciliation_passed,
        reconciliation_variance=variance,
        period_continuity_status=continuity_status,
        prior_statement_id=prior_stmt_id,
        discrepancies=discrepancies,
        warnings=warnings,
    )

