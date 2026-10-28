"""
Email-Based Statement Ingestion Channel
Treats incoming email as an independent ingestion channel with explicit sender
authorization, attachment validation, and authenticity disclaimers.

REGULATORY RULE:
Receiving an email containing a bank statement does NOT establish statement authenticity.
Every statement must still undergo technical extraction, arithmetic reconciliation,
and human scrutiny before it can be used for financial review.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, date
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.core.models import BankStatement, Institution, User
from app.modules.documents.storage import save_document_binary, calculate_sha256, validate_document_upload
from app.modules.statement_analysis.parser import parse_statement
from app.modules.statement_analysis.analyzer import perform_statement_analysis


class EmailIngestionError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


class EmailIngestionPayload:
    def __init__(
        self,
        sender_email: str,
        subject: str,
        institution_code: str,
        bank_name: str,
        account_number: str,
        period_start: date,
        period_end: date,
        attachment_filename: str,
        attachment_bytes: bytes,
    ):
        self.sender_email = sender_email.strip().lower()
        self.subject = subject
        self.institution_code = institution_code.strip()
        self.bank_name = bank_name.strip()
        self.account_number = account_number.strip()
        self.period_start = period_start
        self.period_end = period_end
        self.attachment_filename = attachment_filename
        self.attachment_bytes = attachment_bytes


def ingest_statement_from_email(
    payload: EmailIngestionPayload,
    db: Session,
) -> Dict[str, Any]:
    """
    Ingests a bank statement received via authorized institutional email feed:
    1. Validates sender identity and institution authorization.
    2. Validates attachment binary and MIME signature.
    3. Stores original document in private storage vault.
    4. Records statement with statement_source="authorized_email_feed".
    5. Extracts fields and triggers automated weekly analysis.
    """
    # 1. Sender Validation
    sender_user = db.query(User).filter(
        User.email == payload.sender_email,
        User.status == "active",
    ).first()

    if not sender_user:
        raise EmailIngestionError(
            f"Sender '{payload.sender_email}' is not registered as an active authorized user in FDR-SMART.",
            status_code=403,
        )

    # 2. Institution Resolution
    inst = db.query(Institution).filter(
        (Institution.institution_code == payload.institution_code) |
        (Institution.id == payload.institution_code)
    ).first()

    if not inst:
        raise EmailIngestionError(
            f"Institution code '{payload.institution_code}' not found in registry.",
            status_code=404,
        )

    # 3. Attachment Validation
    verified_mime = validate_document_upload(
        content=payload.attachment_bytes,
        filename=payload.attachment_filename,
        mime_type="application/octet-stream",
    )

    if verified_mime not in ["application/pdf", "text/csv"]:
        raise EmailIngestionError(
            f"Unsupported statement attachment type '{verified_mime}'. Only PDF and CSV statements are authorized.",
            status_code=400,
        )

    # 4. Save to Private Storage Vault
    sha256 = calculate_sha256(payload.attachment_bytes)
    storage_key = save_document_binary(
        content=payload.attachment_bytes,
        filename=payload.attachment_filename,
        instrument_id=f"stmt-inst-{inst.id[:8]}",
    )

    # 5. Create BankStatement Record
    now = datetime.now(timezone.utc)
    stmt_id = f"stmt-{uuid.uuid4().hex[:10]}"

    stmt = BankStatement(
        id=stmt_id,
        institution_id=inst.id,
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        statement_source="authorized_email_feed",
        reporting_period_start=payload.period_start,
        reporting_period_end=payload.period_end,
        submission_date=now,
        original_filename=payload.attachment_filename,
        storage_key=storage_key,
        mime_type=verified_mime,
        file_size_bytes=len(payload.attachment_bytes),
        sha256_checksum=sha256,
        uploaded_by_user_id=sender_user.id,
        status="uploaded",
        notes=f"Ingested via authorized email feed from {payload.sender_email}. Subject: {payload.subject}",
        created_at=now,
    )
    db.add(stmt)
    db.commit()

    # 6. Extract Statement Fields
    from app.core.models import StatementExtraction, StatementTransaction

    parsed = parse_statement(
        content=payload.attachment_bytes,
        filename=payload.attachment_filename,
        mime_type=verified_mime,
    )

    ext = StatementExtraction(
        id=f"ext-{uuid.uuid4().hex[:8]}",
        statement_id=stmt.id,
        account_holder_name=parsed.account_holder_name or inst.name,
        bank_name=parsed.bank_name or payload.bank_name,
        account_number=parsed.account_number or payload.account_number,
        statement_period_start=parsed.statement_period_start or payload.period_start,
        statement_period_end=parsed.statement_period_end or payload.period_end,
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

    # 7. Perform Weekly Analysis
    analysis = perform_statement_analysis(statement_id=stmt.id, db=db)

    return {
        "success": True,
        "statement_id": stmt.id,
        "institution_id": inst.id,
        "source": "authorized_email_feed",
        "sender": payload.sender_email,
        "status": stmt.status,
        "analysis_status": analysis.status,
        "reconciliation_passed": analysis.reconciliation_passed,
        "disclaimer": (
            "REGULATORY NOTICE: Ingestion via email feed does NOT establish bank statement authenticity. "
            "Statements remain subject to technical reconciliation and reviewer scrutiny."
        ),
    }

