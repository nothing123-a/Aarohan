"""
FDR-SMART Core SQLAlchemy 2.x Models
Implements all 13 core database entities defined in DATABASE.md:
1. institutions
2. users
3. institution_memberships
4. financial_instruments
5. instrument_documents
6. document_extraction_runs
7. instrument_verifications
8. verification_discrepancies
9. instrument_lifecycle_events
10. release_refund_requests
11. release_refund_decisions
12. notifications
13. audit_events
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Text,
    Numeric,
    Date,
    DateTime,
    BigInteger,
    ForeignKey,
    JSON,
    Integer,
    Boolean,
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Institution(Base):
    """
    Stores institution identity and administrative registration information.
    DATABASE.md Section 5.1
    """
    __tablename__ = "institutions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    institution_type = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    state = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    contact_email = Column(String(254), nullable=True)
    contact_phone = Column(String(30), nullable=True)
    approved_intake = Column(Integer, nullable=True, default=0)
    total_deposit_required = Column(Numeric(18, 2), nullable=True, default=0.0)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    memberships = relationship("InstitutionMembership", back_populates="institution")
    instruments = relationship("FinancialInstrument", back_populates="institution")


class User(Base):
    """
    Stores application-level user profiles.
    DATABASE.md Section 5.2
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    auth_provider = Column(String(50), nullable=False, default="local")
    auth_subject = Column(String(255), nullable=True)
    email = Column(String(254), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)
    display_name = Column(String(255), nullable=False)
    role = Column(String(40), nullable=False, default="institution_representative")
    status = Column(String(20), nullable=False, default="active")
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    memberships = relationship("InstitutionMembership", back_populates="user")
    submitted_instruments = relationship("FinancialInstrument", back_populates="submitted_by_user", foreign_keys="FinancialInstrument.submitted_by_user_id")
    notifications = relationship("Notification", back_populates="recipient_user")


class InstitutionMembership(Base):
    """
    Associates users with institutions they are authorized to represent or administer.
    DATABASE.md Section 5.3
    """
    __tablename__ = "institution_memberships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String(40), nullable=False, default="institution_representative")
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    institution = relationship("Institution", back_populates="memberships")
    user = relationship("User", back_populates="memberships")


class FinancialInstrument(Base):
    """
    Central table for FDRs and other approved security deposit instruments.
    DATABASE.md Section 5.4
    """
    __tablename__ = "financial_instruments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    reference_number = Column(String(100), nullable=False, index=True)
    instrument_type = Column(String(30), nullable=False, default="fdr")
    bank_name = Column(String(255), nullable=False)
    branch_name = Column(String(255), nullable=True)
    account_number = Column(String(100), nullable=True)
    ifsc_code = Column(String(20), nullable=True)
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    interest_rate = Column(Numeric(5, 2), nullable=True)
    maturity_amount = Column(Numeric(18, 2), nullable=True)
    issue_date = Column(Date, nullable=True)
    maturity_date = Column(Date, nullable=True, index=True)
    tenure_months = Column(Integer, nullable=True)
    purpose = Column(String(100), nullable=True, default="security_deposit")
    contract_number = Column(String(100), nullable=True)
    project_name = Column(String(255), nullable=True)
    department = Column(String(100), nullable=True)
    submission_status = Column(String(30), nullable=False, default="draft")  # draft, submitted, returned_for_correction, resubmitted
    verification_status = Column(String(30), nullable=False, default="not_started")  # not_started, pending, under_scrutiny, in_review, verified, discrepancy_found, clarification_required, unable_to_verify, rejected
    financial_verification_status = Column(String(40), nullable=False, default="pending")  # pending, verified, discrepancy_found, unable_to_verify, not_available, requires_manual_review, approved, rejected
    lifecycle_status = Column(String(30), nullable=False, default="active")  # active, matured, renewal_pending, replacement_pending, released, closed
    predecessor_instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True)
    submitted_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    institution = relationship("Institution", back_populates="instruments")
    submitted_by_user = relationship("User", back_populates="submitted_instruments", foreign_keys=[submitted_by_user_id])
    documents = relationship("InstrumentDocument", back_populates="instrument", cascade="all, delete-orphan")
    verifications = relationship("InstrumentVerification", back_populates="instrument")
    lifecycle_events = relationship("InstrumentLifecycleEvent", back_populates="instrument", foreign_keys="InstrumentLifecycleEvent.instrument_id")
    release_requests = relationship("ReleaseRefundRequest", back_populates="instrument")
    predecessor = relationship("FinancialInstrument", remote_side=[id], foreign_keys=[predecessor_instrument_id])


class InstrumentDocument(Base):
    """
    Metadata and private storage references for uploaded documents.
    DATABASE.md Section 5.5
    """
    __tablename__ = "instrument_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=False, index=True)
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    document_type = Column(String(40), nullable=False, default="fdr_copy")
    original_filename = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False, unique=True)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    sha256_checksum = Column(String(64), nullable=False)
    scan_status = Column(String(20), nullable=False, default="clean")
    document_status = Column(String(20), nullable=False, default="active")
    uploaded_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    instrument = relationship("FinancialInstrument", back_populates="documents")
    extraction_runs = relationship("DocumentExtractionRun", back_populates="document", cascade="all, delete-orphan")


class DocumentExtractionRun(Base):
    """
    OCR and automated document extraction records.
    DATABASE.md Section 5.6
    """
    __tablename__ = "document_extraction_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("instrument_documents.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="queued")  # queued, processing, completed, failed
    processor_name = Column(String(100), nullable=False, default="PyMuPDF+Tesseract")
    processor_version = Column(String(100), nullable=True, default="1.0.0")
    extracted_fields = Column(JSON, nullable=True)
    raw_text = Column(Text, nullable=True)
    error_code = Column(String(100), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    document = relationship("InstrumentDocument", back_populates="extraction_runs")


class InstrumentVerification(Base):
    """
    Records human review and regulatory verification outcomes.
    DATABASE.md Section 5.7
    """
    __tablename__ = "instrument_verifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=False, index=True)
    reviewed_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    outcome = Column(String(30), nullable=False)  # verified, discrepancy_found, clarification_required, unable_to_verify, returned_for_correction, rejected
    stage = Column(String(50), nullable=False, default="technical_scrutiny")  # technical_scrutiny, executive_financial
    verification_method = Column(String(50), nullable=True, default="document_scrutiny")  # document_scrutiny, bank_sfms, weekly_statement, account_aggregator, financial_allocation
    source_of_evidence = Column(String(255), nullable=True)
    evidence_date = Column(DateTime(timezone=True), nullable=True)
    findings = Column(Text, nullable=True)
    outstanding_issues = Column(Text, nullable=True)
    exception_permitted = Column(Boolean, nullable=True, default=False)
    exception_reason = Column(Text, nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    instrument = relationship("FinancialInstrument", back_populates="verifications")
    discrepancies = relationship("VerificationDiscrepancy", back_populates="verification")


class VerificationDiscrepancy(Base):
    """
    Records differences discovered during review between submitted and extracted/confirmed data.
    DATABASE.md Section 5.8
    """
    __tablename__ = "verification_discrepancies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    verification_id = Column(String(36), ForeignKey("instrument_verifications.id"), nullable=False, index=True)
    field_name = Column(String(100), nullable=False)
    source_type = Column(String(30), nullable=False, default="extracted")
    expected_value = Column(Text, nullable=True)
    observed_value = Column(Text, nullable=True)
    resolution_status = Column(String(30), nullable=False, default="open")  # open, resolved, accepted_with_explanation, not_applicable
    resolution_notes = Column(Text, nullable=True)
    resolved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    verification = relationship("InstrumentVerification", back_populates="discrepancies")


class InstrumentLifecycleEvent(Base):
    """
    Preserves significant instrument lifecycle changes (business milestones).
    DATABASE.md Section 5.9
    """
    __tablename__ = "instrument_lifecycle_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=False, index=True)
    event_type = Column(String(40), nullable=False)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=True)
    related_instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True)
    initiated_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    event_notes = Column(Text, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    instrument = relationship("FinancialInstrument", foreign_keys=[instrument_id], back_populates="lifecycle_events")


class ReleaseRefundRequest(Base):
    """
    Stores requests to release or refund a security deposit or FDR.
    DATABASE.md Section 5.10
    """
    __tablename__ = "release_refund_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=False, index=True)
    requested_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    request_type = Column(String(30), nullable=False, default="release")  # release, refund, noc_issuance
    status = Column(String(30), nullable=False, default="submitted")  # draft, submitted, under_review, approved, rejected, completed
    reason = Column(Text, nullable=False)
    regulatory_clause = Column(String(255), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    instrument = relationship("FinancialInstrument", back_populates="release_requests")
    decisions = relationship("ReleaseRefundDecision", back_populates="request")


class ReleaseRefundDecision(Base):
    """
    Preserves decisions made on release/refund requests.
    DATABASE.md Section 5.11
    """
    __tablename__ = "release_refund_decisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    request_id = Column(String(36), ForeignKey("release_refund_requests.id"), nullable=False, index=True)
    decided_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    decision = Column(String(30), nullable=False)  # approved, rejected, returned_for_correction
    comments = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    request = relationship("ReleaseRefundRequest", back_populates="decisions")


class Notification(Base):
    """
    Stores user-facing notification records.
    DATABASE.md Section 5.12
    """
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    recipient_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=True)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True)
    request_id = Column(String(36), ForeignKey("release_refund_requests.id"), nullable=True)
    notification_type = Column(String(50), nullable=False, default="info")
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    recipient_user = relationship("User", back_populates="notifications")


class AuditEvent(Base):
    """
    Append-only security and compliance audit logs.
    DATABASE.md Section 5.13
    """
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=True)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(80), nullable=False)
    entity_id = Column(String(36), nullable=True)
    outcome = Column(String(20), nullable=False, default="success")  # success, failure, denied
    correlation_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)


# ===========================================================================
# Weekly Bank Statement Analyzer Models
# ===========================================================================

class BankStatement(Base):
    """
    Stores metadata, source, and private storage references for uploaded bank statements.
    Supports weekly and periodic financial monitoring.
    """
    __tablename__ = "bank_statements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    bank_name = Column(String(255), nullable=False)
    account_number = Column(String(100), nullable=False, index=True)
    reference_number = Column(String(100), nullable=True)  # Optional deposit/facility ref
    statement_source = Column(String(50), nullable=False, default="direct_upload")  # direct_upload, bank_portal_feed, authorized_email_feed, treasury_portal
    reporting_period_start = Column(Date, nullable=False, index=True)
    reporting_period_end = Column(Date, nullable=False, index=True)
    submission_date = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    original_filename = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False, unique=True)
    mime_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    sha256_checksum = Column(String(64), nullable=False)
    uploaded_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(30), nullable=False, default="uploaded")  # uploaded, processing, extracted, reconciled, discrepancy_flagged, requires_review, failed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    institution = relationship("Institution", foreign_keys=[institution_id])
    uploaded_by_user = relationship("User", foreign_keys=[uploaded_by_user_id])
    extraction = relationship("StatementExtraction", back_populates="statement", uselist=False, cascade="all, delete-orphan")
    analysis = relationship("StatementAnalysis", back_populates="statement", uselist=False, cascade="all, delete-orphan")
    transactions = relationship("StatementTransaction", back_populates="statement", cascade="all, delete-orphan")
    alerts = relationship("FinancialAlert", back_populates="statement", cascade="all, delete-orphan")


class StatementExtraction(Base):
    """
    Extracted fields and summary figures from a bank statement (PDF/CSV).
    """
    __tablename__ = "statement_extractions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    statement_id = Column(String(36), ForeignKey("bank_statements.id"), nullable=False, unique=True, index=True)
    account_holder_name = Column(String(255), nullable=True)
    bank_name = Column(String(255), nullable=True)
    account_number = Column(String(100), nullable=True)
    statement_period_start = Column(Date, nullable=True)
    statement_period_end = Column(Date, nullable=True)
    opening_balance = Column(Numeric(18, 2), nullable=True)
    closing_balance = Column(Numeric(18, 2), nullable=True)
    total_credits = Column(Numeric(18, 2), nullable=True, default=0.0)
    total_debits = Column(Numeric(18, 2), nullable=True, default=0.0)
    transaction_count = Column(Integer, nullable=False, default=0)
    missing_fields = Column(JSON, nullable=True)  # List of un-extracted/uncertain field names
    confidence_score = Column(Numeric(5, 2), nullable=True, default=100.0)
    raw_metadata = Column(JSON, nullable=True)
    extracted_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    statement = relationship("BankStatement", back_populates="extraction")


class StatementTransaction(Base):
    """
    Individual parsed transactions from a bank statement.
    """
    __tablename__ = "statement_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    statement_id = Column(String(36), ForeignKey("bank_statements.id"), nullable=False, index=True)
    transaction_date = Column(Date, nullable=False)
    description = Column(Text, nullable=False)
    reference_number = Column(String(100), nullable=True)
    credit_amount = Column(Numeric(18, 2), nullable=True, default=0.0)
    debit_amount = Column(Numeric(18, 2), nullable=True, default=0.0)
    running_balance = Column(Numeric(18, 2), nullable=True)
    transaction_type = Column(String(30), nullable=False, default="debit")  # credit, debit, interest, fee, transfer, reversal
    is_suspicious = Column(Boolean, nullable=False, default=False)
    flag_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    statement = relationship("BankStatement", back_populates="transactions")


class StatementAnalysis(Base):
    """
    Consolidated weekly statement analysis:
    - Arithmetic reconciliation (opening + credits - debits == closing)
    - Fund allocation compliance against configured statutory requirements
    - Unexplained large withdrawal detection
    - Continuity comparison against prior periods
    - Reviewer decisions
    """
    __tablename__ = "statement_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    statement_id = Column(String(36), ForeignKey("bank_statements.id"), nullable=False, unique=True, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    reporting_period_start = Column(Date, nullable=False)
    reporting_period_end = Column(Date, nullable=False)
    opening_balance = Column(Numeric(18, 2), nullable=False)
    closing_balance = Column(Numeric(18, 2), nullable=False)
    net_change = Column(Numeric(18, 2), nullable=False, default=0.0)
    net_change_percentage = Column(Numeric(6, 2), nullable=True, default=0.0)
    reconciliation_passed = Column(Boolean, nullable=False, default=True)
    reconciliation_variance = Column(Numeric(18, 2), nullable=False, default=0.0)
    required_minimum_balance = Column(Numeric(18, 2), nullable=False, default=0.0)
    balance_meets_requirement = Column(Boolean, nullable=False, default=True)
    unexplained_withdrawals_detected = Column(Boolean, nullable=False, default=False)
    unexplained_withdrawals_count = Column(Integer, nullable=False, default=0)
    unexplained_withdrawals_total = Column(Numeric(18, 2), nullable=False, default=0.0)
    prior_period_statement_id = Column(String(36), nullable=True)
    period_continuity_status = Column(String(30), nullable=False, default="initial_period")  # continuous, gap_detected, overlap_detected, initial_period
    status = Column(String(30), nullable=False, default="clean")  # clean, discrepancy_flagged, requires_review, reconciled, rejected
    discrepancies = Column(JSON, nullable=True)  # List of detected discrepancies
    reviewer_decision = Column(String(30), nullable=True)  # APPROVED, QUERY_RAISED, REJECTED, EXCEPTION_NOTED
    reviewer_notes = Column(Text, nullable=True)
    reviewed_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    statement = relationship("BankStatement", back_populates="analysis")
    institution = relationship("Institution", foreign_keys=[institution_id])
    reviewed_by_user = relationship("User", foreign_keys=[reviewed_by_user_id])


class FinancialAlert(Base):
    """
    Automated financial alerts generated from statement analysis,
    period gaps, balance drops, or allocation noncompliance.
    """
    __tablename__ = "financial_alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    statement_id = Column(String(36), ForeignKey("bank_statements.id"), nullable=True, index=True)
    alert_type = Column(String(50), nullable=False)  # MISSING_WEEKLY_STATEMENT, BALANCE_BELOW_REQUIREMENT, UNEXPECTED_WITHDRAWAL, RECONCILIATION_FAILURE, UNRESOLVED_DISCREPANCY, STATEMENT_PROCESSING_FAILURE, MATERIAL_BALANCE_DROP
    severity = Column(String(20), nullable=False, default="WARNING")  # CRITICAL, WARNING, INFO
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="OPEN")  # OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED
    resolution_notes = Column(Text, nullable=True)
    resolved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    statement = relationship("BankStatement", back_populates="alerts")
    institution = relationship("Institution", foreign_keys=[institution_id])
    resolved_by_user = relationship("User", foreign_keys=[resolved_by_user_id])


# ---------------------------------------------------------------------------
# Account Aggregator (AA) Models (RBI NBFC-AA / Sahamati Standard)
# ---------------------------------------------------------------------------

class AccountAggregatorConsent(Base):
    """
    Persists institutional digital consent requests and approved artifacts
    under India's Account Aggregator ecosystem.
    Never stores bank credentials, PINs, or OTPs.
    """
    __tablename__ = "account_aggregator_consents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    fip_id = Column(String(50), nullable=False)           # e.g. "fip@sbi.aa", "fip@canarabank.aa"
    fip_name = Column(String(100), nullable=False)        # "State Bank of India", "Canara Bank"
    customer_aa_handle = Column(String(100), nullable=False) # e.g. "dtu.reg@sahamati-aa"
    consent_handle = Column(String(100), nullable=False, unique=True, index=True)
    consent_id = Column(String(100), nullable=True, unique=True, index=True)  # Populated once approved
    
    # Status: PENDING, ACTIVE, REJECTED, REVOKED, EXPIRED
    status = Column(String(30), nullable=False, default="PENDING", index=True)
    
    consent_mode = Column(String(20), nullable=False, default="QUERY")  # VIEW, QUERY, STORE
    fetch_type = Column(String(20), nullable=False, default="ONETIME")   # ONETIME, PERIODIC
    data_categories = Column(JSON, nullable=False)                       # e.g. ["DEPOSIT", "TERM_DEPOSIT"]
    purpose_code = Column(String(20), nullable=False, default="101")     # 101: Regulatory Compliance & Deposit Audit
    purpose_description = Column(String(255), nullable=False, default="AICTE APH Security Deposit & Regulatory Lien Verification")
    
    consent_start_date = Column(DateTime(timezone=True), nullable=False)
    consent_expiry_date = Column(DateTime(timezone=True), nullable=False)
    
    redirect_url = Column(String(500), nullable=True)     # Regulated AA hosted authorization page
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    authorized_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now)

    # Relationships
    institution = relationship("Institution", foreign_keys=[institution_id])
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    retrievals = relationship("AccountAggregatorRetrieval", back_populates="consent", cascade="all, delete-orphan")


class AccountAggregatorRetrieval(Base):
    """
    Cryptographic non-repudiable financial data retrieval records retrieved
    via the Account Aggregator network from an authorized FIP.
    """
    __tablename__ = "account_aggregator_retrievals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    consent_id = Column(String(36), ForeignKey("account_aggregator_consents.id"), nullable=False, index=True)
    instrument_id = Column(String(36), ForeignKey("financial_instruments.id"), nullable=True, index=True)
    institution_id = Column(String(36), ForeignKey("institutions.id"), nullable=False, index=True)
    
    fip_name = Column(String(100), nullable=False)
    # data_source: "live_aa" | "demonstration" | "unavailable"
    data_source = Column(String(30), nullable=False, default="demonstration")
    # status: "verified" | "field_mismatch" | "pending_consent" | "consent_expired" | "fip_unsupported" | "service_unavailable"
    status = Column(String(30), nullable=False, default="verified")
    
    # Concordance comparison
    concordance_matched = Column(Boolean, nullable=False, default=False)
    
    # Extracted Term Deposit payload & field details (ReBIT TERM_DEPOSIT schema)
    retrieved_data = Column(JSON, nullable=True)
    mismatches = Column(JSON, nullable=True)           # List of field mismatch dicts
    unsupported_fields = Column(JSON, nullable=True)   # Fields not exposed by FIP
    
    # Cryptographic provenance
    raw_signature_info = Column(JSON, nullable=True)   # Algorithm, certificate serial, digest, timestamp
    demo_notice = Column(String(255), nullable=True)   # Explicit disclaimer when in demonstration mode
    
    retrieved_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)

    # Relationships
    consent = relationship("AccountAggregatorConsent", back_populates="retrievals")
    instrument = relationship("FinancialInstrument", foreign_keys=[instrument_id])
    institution = relationship("Institution", foreign_keys=[institution_id])

