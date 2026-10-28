"""
Bank Statement Analysis Service Layer
Coordinates upload handling, parsing, persistence, RBAC-scoped queries,
historical trend calculation, and alert management.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, date
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
    InstitutionMembership,
    User,
    AuditEvent,
)
from app.modules.documents.storage import (
    save_document_binary,
    calculate_sha256,
    validate_document_upload,
    get_document_binary,
)
from app.modules.statement_analysis.parser import parse_statement
from app.modules.statement_analysis.analyzer import perform_statement_analysis


class StatementServiceError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _get_caller_institution_id(caller: Optional[User], db: Session) -> Optional[str]:
    """Resolves authorized institution ID for an institution representative."""
    if not caller:
        return None
    if caller.role in ["institution_representative", "depositor"]:
        membership = db.query(InstitutionMembership).filter(
            InstitutionMembership.user_id == caller.id,
            InstitutionMembership.status == "active",
        ).first()
        return membership.institution_id if membership else None
    return None


def create_statement_upload(
    institution_id: str,
    bank_name: str,
    account_number: str,
    period_start: date,
    period_end: date,
    statement_source: str,
    file_bytes: bytes,
    filename: str,
    uploader: User,
    reference_number: Optional[str] = None,
    notes: Optional[str] = None,
    db: Session = None,
) -> Dict[str, Any]:
    """
    Handles upload, validation, parsing, storage, and initial weekly analysis.
    """
    # RBAC check: if caller is institution representative, ensure institution_id matches
    if uploader.role in ["institution_representative", "depositor"]:
        inst_id = _get_caller_institution_id(uploader, db)
        if inst_id and inst_id != institution_id:
            raise StatementServiceError("Permission Denied: You cannot upload statements for another institution.", status_code=403)

    # 1. Validate Document Binary
    verified_mime = validate_document_upload(
        content=file_bytes,
        filename=filename,
        mime_type="application/octet-stream",
    )
    if verified_mime not in ["application/pdf", "text/csv"]:
        raise StatementServiceError("Only PDF and CSV bank statements are supported.", status_code=400)

    # 2. Check Institution Existence
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise StatementServiceError(f"Institution '{institution_id}' not found.", status_code=404)

    # 3. Save Binary into Vault
    sha256 = calculate_sha256(file_bytes)
    storage_key = save_document_binary(
        content=file_bytes,
        filename=filename,
        instrument_id=f"stmt-inst-{institution_id[:8]}",
    )

    now = datetime.now(timezone.utc)
    stmt_id = f"stmt-{uuid.uuid4().hex[:10]}"

    stmt = BankStatement(
        id=stmt_id,
        institution_id=institution_id,
        bank_name=bank_name.strip(),
        account_number=account_number.strip(),
        reference_number=reference_number.strip() if reference_number else None,
        statement_source=statement_source,
        reporting_period_start=period_start,
        reporting_period_end=period_end,
        submission_date=now,
        original_filename=filename,
        storage_key=storage_key,
        mime_type=verified_mime,
        file_size_bytes=len(file_bytes),
        sha256_checksum=sha256,
        uploaded_by_user_id=uploader.id,
        status="uploaded",
        notes=notes,
        created_at=now,
    )
    db.add(stmt)
    db.commit()

    # 4. Extract Structured Fields
    parsed = parse_statement(
        content=file_bytes,
        filename=filename,
        mime_type=verified_mime,
    )

    ext = StatementExtraction(
        id=f"ext-{uuid.uuid4().hex[:8]}",
        statement_id=stmt.id,
        account_holder_name=parsed.account_holder_name or inst.name,
        bank_name=parsed.bank_name or bank_name,
        account_number=parsed.account_number or account_number,
        statement_period_start=parsed.statement_period_start or period_start,
        statement_period_end=parsed.statement_period_end or period_end,
        opening_balance=parsed.opening_balance,
        closing_balance=parsed.closing_balance,
        total_credits=parsed.total_credits,
        total_debits=parsed.total_debits,
        transaction_count=len(parsed.transactions),
        missing_fields=parsed.missing_fields,
        confidence_score=parsed.confidence_score,
        raw_metadata=parsed.raw_metadata,
        extracted_at=now,
    )
    db.add(ext)

    for tx in parsed.transactions:
        db.add(StatementTransaction(
            id=f"tx-{uuid.uuid4().hex[:8]}",
            statement_id=stmt.id,
            transaction_date=tx.transaction_date,
            description=tx.description,
            reference_number=tx.reference_number,
            credit_amount=tx.credit_amount,
            debit_amount=tx.debit_amount,
            running_balance=tx.running_balance,
            transaction_type=tx.transaction_type,
            is_suspicious=tx.is_suspicious,
            flag_reason=tx.flag_reason,
            created_at=now,
        ))

    db.commit()

    # 5. Run Weekly Statement Analysis
    analysis = perform_statement_analysis(statement_id=stmt.id, db=db)

    return {
        "id": stmt.id,
        "statement_id": stmt.id,
        "institution_id": inst.id,
        "institution_name": inst.name,
        "bank_name": stmt.bank_name,
        "account_number": stmt.account_number,
        "period": f"{stmt.reporting_period_start} to {stmt.reporting_period_end}",
        "status": stmt.status,
        "transaction_count": len(parsed.transactions),
        "reconciliation_passed": analysis.reconciliation_passed,
        "discrepancies_count": len(analysis.discrepancies or []),
    }


def list_statements_scoped(
    institution_id: Optional[str],
    status: Optional[str],
    page: int,
    page_size: int,
    caller: User,
    db: Session,
) -> Dict[str, Any]:
    """
    Returns statements scoped by role (Institution Representatives only see their own).
    """
    query = db.query(BankStatement)

    if caller.role in ["institution_representative", "depositor"]:
        caller_inst = _get_caller_institution_id(caller, db)
        if caller_inst:
            query = query.filter(BankStatement.institution_id == caller_inst)
        elif institution_id:
            query = query.filter(BankStatement.institution_id == institution_id)
    elif institution_id:
        query = query.filter(BankStatement.institution_id == institution_id)

    if status:
        query = query.filter(BankStatement.status == status)

    total = query.count()
    statements = (
        query.order_by(desc(BankStatement.reporting_period_end))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    is_internal_officer = caller.role in ["scrutiny_officer", "approving_authority", "admin", "officer"]

    for s in statements:
        ana = s.analysis
        items.append({
            "id": s.id,
            "institution_id": s.institution_id,
            "institution_name": s.institution.name if s.institution else "",
            "bank_name": s.bank_name,
            "account_number": s.account_number,
            "statement_source": s.statement_source,
            "reporting_period_start": s.reporting_period_start.isoformat(),
            "reporting_period_end": s.reporting_period_end.isoformat(),
            "submission_date": s.submission_date.isoformat(),
            "original_filename": s.original_filename,
            "mime_type": s.mime_type,
            "file_size_bytes": s.file_size_bytes,
            "status": s.status,
            "opening_balance": float(ana.opening_balance) if ana else None,
            "closing_balance": float(ana.closing_balance) if ana else None,
            "reconciliation_passed": ana.reconciliation_passed if ana else None,
            "discrepancies_count": len(ana.discrepancies or []) if ana else 0,
            "reviewer_decision": ana.reviewer_decision if ana else None,
            "reviewer_notes": ana.reviewer_notes if ana and is_internal_officer else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_statement_details(statement_id: str, caller: User, db: Session) -> Dict[str, Any]:
    """Returns detailed statement including extraction, transactions, and analysis."""
    stmt = db.query(BankStatement).filter(BankStatement.id == statement_id).first()
    if not stmt:
        raise StatementServiceError(f"Statement '{statement_id}' not found.", status_code=404)

    # Scoping check
    if caller.role in ["institution_representative", "depositor"]:
        caller_inst = _get_caller_institution_id(caller, db)
        if caller_inst and caller_inst != stmt.institution_id:
            raise StatementServiceError("Permission Denied: Access restricted to your authorized institution.", status_code=403)

    is_internal_officer = caller.role in ["scrutiny_officer", "approving_authority", "admin", "officer"]

    ext = stmt.extraction
    ana = stmt.analysis
    txs = stmt.transactions

    return {
        "id": stmt.id,
        "institution_id": stmt.institution_id,
        "institution_name": stmt.institution.name if stmt.institution else "",
        "bank_name": stmt.bank_name,
        "account_number": stmt.account_number,
        "reference_number": stmt.reference_number,
        "statement_source": stmt.statement_source,
        "reporting_period_start": stmt.reporting_period_start.isoformat(),
        "reporting_period_end": stmt.reporting_period_end.isoformat(),
        "submission_date": stmt.submission_date.isoformat(),
        "original_filename": stmt.original_filename,
        "mime_type": stmt.mime_type,
        "file_size_bytes": stmt.file_size_bytes,
        "status": stmt.status,
        "extraction": {
            "account_holder_name": ext.account_holder_name if ext else None,
            "bank_name": ext.bank_name if ext else None,
            "account_number": ext.account_number if ext else None,
            "opening_balance": float(ext.opening_balance) if ext and ext.opening_balance is not None else None,
            "closing_balance": float(ext.closing_balance) if ext and ext.closing_balance is not None else None,
            "total_credits": float(ext.total_credits) if ext and ext.total_credits is not None else 0.0,
            "total_debits": float(ext.total_debits) if ext and ext.total_debits is not None else 0.0,
            "transaction_count": ext.transaction_count if ext else 0,
            "missing_fields": ext.missing_fields if ext else [],
            "confidence_score": float(ext.confidence_score) if ext and ext.confidence_score is not None else 100.0,
        } if ext else None,
        "analysis": {
            "id": ana.id,
            "opening_balance": float(ana.opening_balance),
            "closing_balance": float(ana.closing_balance),
            "net_change": float(ana.net_change),
            "net_change_percentage": float(ana.net_change_percentage or 0.0),
            "reconciliation_passed": ana.reconciliation_passed,
            "reconciliation_variance": float(ana.reconciliation_variance),
            "required_minimum_balance": float(ana.required_minimum_balance),
            "balance_meets_requirement": ana.balance_meets_requirement,
            "unexplained_withdrawals_detected": ana.unexplained_withdrawals_detected,
            "unexplained_withdrawals_count": ana.unexplained_withdrawals_count,
            "unexplained_withdrawals_total": float(ana.unexplained_withdrawals_total),
            "period_continuity_status": ana.period_continuity_status,
            "status": ana.status,
            "discrepancies": ana.discrepancies or [],
            "reviewer_decision": ana.reviewer_decision,
            "reviewer_notes": ana.reviewer_notes if is_internal_officer else None,
            "reviewed_by_user_id": ana.reviewed_by_user_id if is_internal_officer else None,
            "reviewed_at": ana.reviewed_at.isoformat() if ana.reviewed_at else None,
        } if ana else None,
        "transactions": [
            {
                "id": t.id,
                "date": t.transaction_date.isoformat(),
                "description": t.description,
                "reference_number": t.reference_number,
                "credit_amount": float(t.credit_amount or 0.0),
                "debit_amount": float(t.debit_amount or 0.0),
                "running_balance": float(t.running_balance) if t.running_balance is not None else None,
                "transaction_type": t.transaction_type,
                "is_suspicious": t.is_suspicious,
                "flag_reason": t.flag_reason,
            }
            for t in txs
        ],
    }


def record_statement_review(
    statement_id: str,
    decision: str,
    notes: str,
    reviewer: User,
    db: Session,
) -> Dict[str, Any]:
    """
    Scrutiny Officer or Approving Authority records formal review outcome for statement.
    """
    if reviewer.role not in ["scrutiny_officer", "approving_authority", "admin", "officer"]:
        raise StatementServiceError("Permission Denied: Only authorized review officers can record decisions.", status_code=403)

    valid_decisions = {"APPROVED", "QUERY_RAISED", "REJECTED", "EXCEPTION_NOTED"}
    norm_decision = decision.upper().strip()
    if norm_decision not in valid_decisions:
        raise StatementServiceError(f"Invalid decision '{decision}'. Permitted: {list(valid_decisions)}", status_code=400)

    stmt = db.query(BankStatement).filter(BankStatement.id == statement_id).first()
    if not stmt:
        raise StatementServiceError(f"Statement '{statement_id}' not found.", status_code=404)

    ana = stmt.analysis
    now = datetime.now(timezone.utc)

    if not ana:
        ana = perform_statement_analysis(statement_id=statement_id, db=db)

    ana.reviewer_decision = norm_decision
    ana.reviewer_notes = notes
    ana.reviewed_by_user_id = reviewer.id
    ana.reviewed_at = now

    if norm_decision == "APPROVED":
        stmt.status = "reconciled"
    elif norm_decision == "REJECTED":
        stmt.status = "rejected"
    elif norm_decision == "QUERY_RAISED":
        stmt.status = "requires_review"
        notice_ref = f"NOTICE/AICTE/STMT/{now.strftime('%Y%m')}/{uuid.uuid4().hex[:6].upper()}"
        alert = FinancialAlert(
            id=f"alert-notice-{uuid.uuid4().hex[:8]}",
            institution_id=stmt.institution_id,
            statement_id=stmt.id,
            alert_type="STATUTORY_NOTICE",
            severity="CRITICAL",
            title=f"Statutory Inquiry Notice {notice_ref} — Bank Statement Query ({stmt.bank_name} A/C {stmt.account_number})",
            description=f"{notes} [Response required within 7 business days]",
            status="OPEN",
            created_at=now,
        )
        db.add(alert)

    # Audit event
    db.add(AuditEvent(
        id=f"audit-rev-{uuid.uuid4().hex[:8]}",
        actor_user_id=reviewer.id,
        institution_id=stmt.institution_id,
        action="STATEMENT_REVIEW_DECISION_RECORDED",
        entity_type="bank_statements",
        entity_id=stmt.id,
        outcome="success",
        details={
            "decision": norm_decision,
            "reviewer_role": reviewer.role,
            "notes": notes,
        },
        occurred_at=now,
    ))

    db.commit()

    return {
        "statement_id": stmt.id,
        "decision": norm_decision,
        "status": stmt.status,
        "reviewed_at": now.isoformat(),
        "reviewer": reviewer.display_name,
    }


def get_institution_trend(institution_id: str, caller: User, db: Session) -> Dict[str, Any]:
    """
    Returns weekly balance history, net weekly deltas, and allocation status.
    """
    if caller.role in ["institution_representative", "depositor"]:
        caller_inst = _get_caller_institution_id(caller, db)
        if caller_inst and caller_inst != institution_id:
            raise StatementServiceError("Permission Denied: Institution access restricted.", status_code=403)

    statements = (
        db.query(BankStatement)
        .filter(BankStatement.institution_id == institution_id)
        .order_by(BankStatement.reporting_period_end.asc())
        .all()
    )

    history = []
    for s in statements:
        if s.analysis:
            a = s.analysis
            history.append({
                "statement_id": s.id,
                "period_start": s.reporting_period_start.isoformat(),
                "period_end": s.reporting_period_end.isoformat(),
                "opening_balance": float(a.opening_balance),
                "closing_balance": float(a.closing_balance),
                "net_change": float(a.net_change),
                "net_change_percentage": float(a.net_change_percentage or 0.0),
                "reconciliation_passed": a.reconciliation_passed,
                "status": a.status,
            })

    return {
        "institution_id": institution_id,
        "data_points": len(history),
        "history": history,
    }

