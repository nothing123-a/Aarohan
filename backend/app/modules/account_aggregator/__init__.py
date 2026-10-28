"""
Account Aggregator Module
"""
from app.modules.account_aggregator.service import (
    AccountAggregatorService,
    get_account_aggregator_service,
)
from app.modules.account_aggregator.router import router as account_aggregator_router

__all__ = [
    "AccountAggregatorService",
    "get_account_aggregator_service",
    "account_aggregator_router",
]
