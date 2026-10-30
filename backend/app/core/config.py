"""
FDR-SMART Backend Configuration
Defines settings, security constraints, and document storage paths according to ARCHITECTURE.md and DATABASE.md.
"""
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

STORAGE_DIR = BASE_DIR / "storage" / "documents"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "Aarohan Backend"
    API_V1_PREFIX: str = "/api/v1"
    
    # Document storage & security constraints per PRD & DATABASE.md
    DOCUMENT_STORAGE_DIR: Path = STORAGE_DIR
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB limit
    ALLOWED_MIME_TYPES: list[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/tiff",
        "text/csv",
        "text/plain",
    ]
    
    # Database configuration per ARCHITECTURE.md and DATABASE.md
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./fdr_smart.db"
    )

    # JWT Authentication settings
    # ⚠️  SECURITY: Set JWT_SECRET env var to a strong random value before any deployment.
    # The fallback below is for LOCAL DEVELOPMENT / SIH DEMO ONLY.
    # Generate a secure key: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "aicte-fdr-smart-demo-jwt-key-change-before-any-deployment")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours


    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Account Aggregator (AA) Integration Settings (RBI / Sahamati ReBIT Spec)
    AA_ENABLED: bool = os.getenv("AA_ENABLED", "false").lower() in ("true", "1", "yes")
    AA_ENVIRONMENT: str = os.getenv("AA_ENVIRONMENT", "demonstration")  # "production", "sandbox", "demonstration"
    AA_CLIENT_ID: Optional[str] = os.getenv("AA_CLIENT_ID", None)
    AA_CLIENT_SECRET: Optional[str] = os.getenv("AA_CLIENT_SECRET", None)
    AA_FIU_ID: str = os.getenv("AA_FIU_ID", "fiu@aicte-india.org")
    AA_GATEWAY_URL: Optional[str] = os.getenv("AA_GATEWAY_URL", None)
    AA_WEBHOOK_SECRET: Optional[str] = os.getenv("AA_WEBHOOK_SECRET", None)

settings = Settings()

# Ensure private document storage directory exists
os.makedirs(settings.DOCUMENT_STORAGE_DIR, exist_ok=True)
