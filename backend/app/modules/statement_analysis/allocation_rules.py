"""
Financial Allocation & Statutory Fund Rules Engine
Evaluates bank statement evidence against institutional deposit and liquidity requirements.

CRITICAL REGULATORY DISTINCTIONS:
- operating_account_balance: Working capital in institutional current/savings account.
- fixed_deposit_principal: Term deposits locked under statutory pledge (FinancialInstrument).
- available_balance: Unencumbered liquid funds available for operational draw.
- funds_subject_to_lien: FDR principal irrevocably pledged to Member Secretary, AICTE.
- earmarked_funds: Capital restricted for specified endowments or building funds.

These five financial concepts are NOT interchangeable. Fixed deposit principal
is NOT expected to appear as cash inside an operating account statement.
"""
from __future__ import annotations

from decimal import Decimal
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from app.modules.statement_analysis.parser import ParsedStatement
from app.modules.statement_analysis.validator import DiscrepancyItem


class AllocationPolicyConfig(BaseModel):
    """
    Configurable parameters for institutional financial allocation monitoring.
    """
    # Operating account minimum liquidity reserve (₹)
    default_min_operating_balance: Decimal = Decimal("500000.00")
    
    # Large withdrawal threshold (absolute amount)
    large_withdrawal_amount_threshold: Decimal = Decimal("500000.00")
    
    # Large withdrawal threshold as percentage of opening balance
    large_withdrawal_percentage_threshold: Decimal = Decimal("25.0")
    
    # Material weekly balance drop threshold (%)
    material_balance_drop_percentage: Decimal = Decimal("20.0")


DEFAULT_ALLOCATION_POLICY = AllocationPolicyConfig()


class FundAllocationBreakdown(BaseModel):
    """
    Explicit breakdown distinguishing non-interchangeable financial pools.
    """
    operating_account_balance: Decimal
    fixed_deposit_principal: Decimal
    funds_subject_to_lien: Decimal
    available_balance: Decimal
    earmarked_funds: Decimal
    total_financial_holding: Decimal
    required_statutory_deposit: Decimal
    allocation_compliance_status: str  # COMPLIANT, DEFICIT, REQUIRES_REVIEW
    compliance_percentage: float


class AllocationEvaluationResult(BaseModel):
    meets_minimum_balance: bool
    required_minimum_balance: Decimal
    observed_balance: Decimal
    unexplained_withdrawals_detected: bool
    unexplained_withdrawals_count: int
    unexplained_withdrawals_total: Decimal
    suspicious_transactions: List[Dict[str, Any]] = Field(default_factory=list)
    fund_breakdown: FundAllocationBreakdown
    discrepancies: List[DiscrepancyItem] = Field(default_factory=list)


def evaluate_allocation_rules(
    parsed: ParsedStatement,
    institution_total_deposit_required: Decimal,
    total_active_fdr_principal: Decimal,
    total_fdr_under_lien: Decimal,
    policy: AllocationPolicyConfig = DEFAULT_ALLOCATION_POLICY,
) -> AllocationEvaluationResult:
    """
    Evaluates whether the institution's observed financial position satisfies
    statutory security deposit and operational liquidity allocations.
    """
    discrepancies: List[DiscrepancyItem] = []
    
    closing_bal = parsed.closing_balance if parsed.closing_balance is not None else Decimal("0.00")
    opening_bal = parsed.opening_balance if parsed.opening_balance is not None else Decimal("0.00")

    # ── 1. Minimum Operating Reserve Check ──────────────────────────────
    min_required = policy.default_min_operating_balance
    meets_minimum = closing_bal >= min_required

    if not meets_minimum:
        discrepancies.append(DiscrepancyItem(
            field_name="closing_balance",
            category="BALANCE_DEFICIT",
            expected_value=f"Minimum reserve ₹{float(min_required):,.2f}",
            observed_value=f"₹{float(closing_bal):,.2f}",
            severity="CRITICAL",
            explanation=f"Operating account closing balance (₹{float(closing_bal):,.2f}) fell below minimum required regulatory reserve of ₹{float(min_required):,.2f}.",
        ))

    # ── 2. Material Balance Drop Check ──────────────────────────────────
    if opening_bal > Decimal("0.00") and closing_bal < opening_bal:
        drop_pct = ((opening_bal - closing_bal) / opening_bal) * Decimal("100.0")
        if drop_pct >= policy.material_balance_drop_percentage:
            discrepancies.append(DiscrepancyItem(
                field_name="closing_balance",
                category="BALANCE_DEFICIT",
                expected_value=f"Within {policy.material_balance_drop_percentage}% weekly variance",
                observed_value=f"Balance drop of {float(drop_pct):.1f}% (Opening: ₹{float(opening_bal):,.2f} -> Closing: ₹{float(closing_bal):,.2f})",
                severity="WARNING",
                explanation=f"Material weekly balance contraction detected: {float(drop_pct):.1f}% drop during reporting week.",
            ))

    # ── 3. Unexplained Large Withdrawal Check ───────────────────────────
    suspicious_txs: List[Dict[str, Any]] = []
    unexplained_count = 0
    unexplained_total = Decimal("0.00")

    for tx in parsed.transactions:
        # Check against absolute or relative threshold
        is_large = tx.debit_amount >= policy.large_withdrawal_amount_threshold
        if opening_bal > Decimal("0.00") and not is_large:
            tx_pct = (tx.debit_amount / opening_bal) * Decimal("100.0")
            if tx_pct >= policy.large_withdrawal_percentage_threshold:
                is_large = True

        if is_large:
            unexplained_count += 1
            unexplained_total += tx.debit_amount
            suspicious_txs.append({
                "date": str(tx.transaction_date),
                "description": tx.description,
                "amount": float(tx.debit_amount),
                "reference": tx.reference_number,
                "reason": f"High-value debit of ₹{float(tx.debit_amount):,.2f} requires verification.",
            })

    if unexplained_count > 0:
        discrepancies.append(DiscrepancyItem(
            field_name="transactions",
            category="UNEXPLAINED_WITHDRAWAL",
            expected_value="Standard operational disbursements",
            observed_value=f"{unexplained_count} high-value debit(s) totaling ₹{float(unexplained_total):,.2f}",
            severity="WARNING",
            explanation=f"Detected {unexplained_count} large withdrawals totaling ₹{float(unexplained_total):,.2f}. Reviewer clearance required to confirm purpose.",
        ))

    # ── 4. Non-Interchangeable Financial Breakdown ──────────────────────
    # Available balance = operating account balance
    available_bal = closing_bal
    
    # Earmarked funds = zero unless specific reservation clause present
    earmarked = Decimal("0.00")

    total_holding = closing_bal + total_active_fdr_principal

    # Compliance against statutory deposit obligation
    req_deposit = institution_total_deposit_required if institution_total_deposit_required > 0 else Decimal("10000000.00")
    compliance_pct = float(min(Decimal("100.0"), (total_fdr_under_lien / req_deposit) * Decimal("100.0"))) if req_deposit > 0 else 100.0

    compliance_status = "COMPLIANT"
    if total_fdr_under_lien < req_deposit:
        compliance_status = "DEFICIT"
    elif not meets_minimum:
        compliance_status = "REQUIRES_REVIEW"

    breakdown = FundAllocationBreakdown(
        operating_account_balance=closing_bal,
        fixed_deposit_principal=total_active_fdr_principal,
        funds_subject_to_lien=total_fdr_under_lien,
        available_balance=available_bal,
        earmarked_funds=earmarked,
        total_financial_holding=total_holding,
        required_statutory_deposit=req_deposit,
        allocation_compliance_status=compliance_status,
        compliance_percentage=compliance_pct,
    )

    return AllocationEvaluationResult(
        meets_minimum_balance=meets_minimum,
        required_minimum_balance=min_required,
        observed_balance=closing_bal,
        unexplained_withdrawals_detected=unexplained_count > 0,
        unexplained_withdrawals_count=unexplained_count,
        unexplained_withdrawals_total=unexplained_total,
        suspicious_transactions=suspicious_txs,
        fund_breakdown=breakdown,
        discrepancies=discrepancies,
    )

