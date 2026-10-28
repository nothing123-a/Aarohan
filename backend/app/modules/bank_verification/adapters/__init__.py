"""
Bank Verification Adapter Registry
===================================
Maps bank names (normalised to lower-case) to their adapter classes.

Selection logic in BankVerificationService:
  1. Look up the instrument's bank_name in LIVE_ADAPTERS.
     A live adapter is returned only if its required credentials are present.
  2. Fall back to the DEMO_ADAPTER for any bank without a live integration.

To register a new live adapter:
  1. Create a subclass of AbstractBankAdapter in this package.
  2. Add it to LIVE_ADAPTERS with the normalised bank name as the key.
  3. Document the required environment variables in the adapter module.
"""
import os
from typing import Optional

from app.modules.bank_verification.base import AbstractBankAdapter
from app.modules.bank_verification.adapters.mock_adapter import MockBankAdapter
from app.modules.bank_verification.adapters.example_bank_adapter import (
    ExampleBankAdapter,
    _API_KEY as _EXAMPLE_BANK_KEY,
)

# Demo adapter — used when no live integration is available
DEMO_ADAPTER: AbstractBankAdapter = MockBankAdapter()

# Live adapters — keyed by normalised bank name fragment(s).
# An adapter is only active when its credentials are configured.
_LIVE_REGISTRY: dict[str, tuple[AbstractBankAdapter, bool]] = {
    # "bank name fragment": (adapter instance, is_credentials_present)
    "example bank": (ExampleBankAdapter(), bool(_EXAMPLE_BANK_KEY)),
    # Add further adapters here, e.g.:
    # "state bank of india": (SBISFMSAdapter(), bool(os.getenv("SBI_API_KEY"))),
    # "bank of baroda":       (BOBAdapter(),     bool(os.getenv("BOB_API_KEY"))),
}


def get_adapter_for_bank(bank_name: str) -> tuple[AbstractBankAdapter, bool]:
    """
    Returns (adapter, is_live) for the given bank_name.

    is_live=True  → adapter contacts a real bank API.
    is_live=False → adapter uses demonstration data.
    """
    normalised = bank_name.strip().lower()
    for fragment, (adapter, has_creds) in _LIVE_REGISTRY.items():
        if fragment in normalised and has_creds:
            return adapter, True
    # No live adapter — fall back to demo
    return DEMO_ADAPTER, False

