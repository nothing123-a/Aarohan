"""
Bank Verification Module
========================
Provides the BankVerificationService and related types for verifying
FDR information against authorized bank integrations.
"""
from app.modules.bank_verification.base import (
    AbstractBankAdapter,
    BankFDRDetails,
    BankVerificationResult,
    FieldMismatch,
    InstrumentSnapshot,
)
from app.modules.bank_verification.service import (
    verify_fdr,
    BankVerificationServiceResult,
    BankVerificationServiceError,
)

__all__ = [
    "AbstractBankAdapter",
    "BankFDRDetails",
    "BankVerificationResult",
    "FieldMismatch",
    "InstrumentSnapshot",
    "verify_fdr",
    "BankVerificationServiceResult",
    "BankVerificationServiceError",
]

