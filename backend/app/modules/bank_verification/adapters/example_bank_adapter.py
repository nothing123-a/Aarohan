"""
Example Bank Adapter Skeleton
=============================
This skeleton shows how to implement a real bank integration when an
authorized API agreement and credentials are available.

INTEGRATION STATUS: NOT ACTIVE
  - No live bank credentials are configured.
  - This adapter will not be selected unless EXAMPLE_BANK_API_KEY is set.
  - Replace the placeholder code with the bank's documented API contract.

CONFIGURATION (environment variables):
  EXAMPLE_BANK_API_KEY       – API key or client ID issued by the bank.
  EXAMPLE_BANK_API_SECRET    – Shared secret or client secret (if OAuth2).
  EXAMPLE_BANK_API_BASE_URL  – Base URL of the bank's FDR verification endpoint.
                                e.g. "https://api.examplebank.com/v1/fdr"

SECURITY REQUIREMENTS:
  - Credentials must only be read from environment / secrets manager.
  - Never log, return, or expose credentials in error messages or API responses.
  - Validate TLS certificates in production (ssl_verify=True).
  - Apply explicit timeouts to every outbound request.
  - Retry only idempotent GET-equivalent requests.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from decimal import Decimal

from app.modules.bank_verification.base import (
    AbstractBankAdapter,
    BankFDRDetails,
    BankVerificationResult,
    InstrumentSnapshot,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Credential resolution — read from environment, NEVER hardcoded
# ---------------------------------------------------------------------------
_API_KEY: str = os.getenv("EXAMPLE_BANK_API_KEY", "")
_API_SECRET: str = os.getenv("EXAMPLE_BANK_API_SECRET", "")
_BASE_URL: str = os.getenv(
    "EXAMPLE_BANK_API_BASE_URL",
    "https://api.examplebank.com/v1/fdr",  # placeholder — replace with real URL
)
_REQUEST_TIMEOUT_SECONDS: int = 15
_MAX_RETRIES: int = 2


class ExampleBankAdapter(AbstractBankAdapter):
    """
    Skeleton adapter for an authorized bank FDR verification API.

    Replace the TODO sections with real HTTP calls once the bank API
    contract and credentials are available.

    This adapter is ONLY selected when EXAMPLE_BANK_API_KEY is non-empty.
    """

    adapter_name: str = "example_bank"
    bank_label: str = "Example Bank (Integration Skeleton)"
    is_demo: bool = False

    async def verify(self, instrument: InstrumentSnapshot) -> BankVerificationResult:
        """
        Verify FDR against the bank's authorized API.

        Steps:
          1. Build the request payload from the instrument snapshot.
          2. Authenticate using the bank's documented method.
          3. Send the request with timeout and bounded retry.
          4. Validate and map the response to BankVerificationResult.
          5. Persist nothing here — caller (service layer) persists.
        """
        if not _API_KEY:
            # Credentials not configured — this adapter should not be active.
            # The registry prevents this, but guard defensively.
            return BankVerificationResult(
                status="service_unavailable",
                data_source="unavailable",
                bank_name=self.bank_label,
                adapter_name=self.adapter_name,
                summary="Bank integration not configured. API key is absent.",
                error_code="NOT_CONFIGURED",
                error_detail="Set EXAMPLE_BANK_API_KEY to enable this integration.",
                verified_at=datetime.now(timezone.utc),
            )

        now = datetime.now(timezone.utc)

        # TODO: Replace the block below with actual HTTP calls once the
        #       bank API contract is available.
        #
        # Suggested implementation outline:
        #
        #   import httpx
        #
        #   headers = {
        #       "X-API-Key": _API_KEY,
        #       "Content-Type": "application/json",
        #       "Accept": "application/json",
        #   }
        #
        #   payload = {
        #       "fdr_number": instrument.reference_number,
        #       "account_number": instrument.account_number,
        #       "ifsc": instrument.ifsc_code,
        #   }
        #
        #   for attempt in range(_MAX_RETRIES + 1):
        #       try:
        #           async with httpx.AsyncClient(verify=True, timeout=_REQUEST_TIMEOUT_SECONDS) as client:
        #               response = await client.post(
        #                   f"{_BASE_URL}/verify",
        #                   headers=headers,
        #                   json=payload,
        #               )
        #           if response.status_code == 401:
        #               return BankVerificationResult(
        #                   status="auth_failure",
        #                   data_source="live_bank",
        #                   bank_name=self.bank_label,
        #                   adapter_name=self.adapter_name,
        #                   summary="Bank API authentication failed. Check credentials.",
        #                   error_code="AUTH_FAILURE",
        #                   verified_at=now,
        #               )
        #           if response.status_code == 429:
        #               await asyncio.sleep(2 ** attempt)
        #               continue
        #           response.raise_for_status()
        #           data = response.json()
        #           break
        #       except httpx.TimeoutException:
        #           if attempt == _MAX_RETRIES:
        #               return BankVerificationResult(
        #                   status="service_unavailable", ...
        #               )
        #           await asyncio.sleep(2 ** attempt)
        #       except httpx.RequestError as exc:
        #           logger.warning("Bank API request error (attempt %d): %s", attempt + 1, type(exc).__name__)
        #           if attempt == _MAX_RETRIES:
        #               return BankVerificationResult(
        #                   status="service_unavailable", ...
        #               )
        #           await asyncio.sleep(2 ** attempt)
        #
        # After receiving data:
        #   bank_details = _map_response(data)
        #   mismatches = self._compare_fields(instrument, bank_details)
        #   status = "verified" if not mismatches else "discrepancy_found"
        #   return BankVerificationResult(status=status, data_source="live_bank", ...)

        # Until the above is implemented, return service_unavailable.
        logger.info(
            "ExampleBankAdapter.verify called for instrument %s — integration not yet active.",
            instrument.instrument_id,
        )
        return BankVerificationResult(
            status="service_unavailable",
            data_source="unavailable",
            bank_name=self.bank_label,
            adapter_name=self.adapter_name,
            summary=(
                "Bank integration is not yet active. "
                "Implement the TODO section in example_bank_adapter.py with the "
                "bank's documented API contract and configure EXAMPLE_BANK_API_KEY."
            ),
            error_code="NOT_IMPLEMENTED",
            verified_at=now,
        )


def _map_response(raw: dict) -> BankFDRDetails:
    """
    Maps raw bank API response fields to BankFDRDetails.
    Adjust field names to match the bank's actual JSON contract.

    TODO: Replace field names with those documented by the bank API.
    """
    from datetime import date

    def _parse_date(val) -> date | None:
        if not val:
            return None
        try:
            return date.fromisoformat(str(val))
        except ValueError:
            return None

    return BankFDRDetails(
        reference_number=raw.get("fdrNumber") or raw.get("fdr_number"),
        account_number=raw.get("accountNumber") or raw.get("account_number"),
        bank_name=raw.get("bankName") or raw.get("bank_name"),
        branch_name=raw.get("branchName") or raw.get("branch_name"),
        depositor_name=raw.get("depositorName") or raw.get("depositor_name"),
        principal_amount=Decimal(str(raw["principalAmount"])) if raw.get("principalAmount") else None,
        currency=raw.get("currency", "INR"),
        interest_rate=Decimal(str(raw["interestRate"])) if raw.get("interestRate") else None,
        maturity_amount=Decimal(str(raw["maturityAmount"])) if raw.get("maturityAmount") else None,
        issue_date=_parse_date(raw.get("issueDate") or raw.get("issue_date")),
        maturity_date=_parse_date(raw.get("maturityDate") or raw.get("maturity_date")),
        lien_holder=raw.get("lienHolder") or raw.get("lien_holder"),
        lien_type=raw.get("lienType") or raw.get("lien_type"),
        lien_confirmed=raw.get("lienConfirmed") or raw.get("lien_confirmed"),
        deposit_status=raw.get("depositStatus") or raw.get("deposit_status"),
        gateway_reference=raw.get("gatewayRef") or raw.get("gateway_reference"),
    )

