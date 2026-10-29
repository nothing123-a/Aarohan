"""
FDR-SMART Database Engine & Session Factory
SQLAlchemy 2.x configuration according to ARCHITECTURE.md and DATABASE.md.
Supports PostgreSQL (primary) with resilient fallback for offline evaluation.
"""
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger("fdr_smart.database")

Base = declarative_base()

def create_db_engine():
    db_url = settings.DATABASE_URL
    # Normalize postgres url prefix for SQLAlchemy 2.x psycopg2 driver
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    if db_url.startswith("sqlite"):
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True,
        )

    try:
        if "postgresql" in db_url:
            # Fast 3s connect timeout to prevent freezing when cloud network or DNS is unreachable
            pg_engine = create_engine(
                db_url,
                connect_args={"connect_timeout": 3},
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
            with pg_engine.connect() as conn:
                logger.info(f"Successfully connected to cloud PostgreSQL database at {pg_engine.url.host}.")
            return pg_engine
    except Exception as e:
        logger.warning(
            f"PostgreSQL connection to cloud database encountered error ({e}). "
            "Falling back to local SQLite database 'fdr_smart.db'."
        )
    
    # Fallback to SQLite with thread safety
    sqlite_url = "sqlite:///./fdr_smart.db"
    return create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )

engine = create_db_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """FastAPI Dependency for database session management."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
