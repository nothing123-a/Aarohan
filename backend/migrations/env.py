import os
import sys
from logging.config import fileConfig
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context

from app.core.config import settings
from app.core.database import Base
import app.core.models  # Ensure all 13 models are registered in Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Use configured database URL
db_url = settings.DATABASE_URL
if not db_url.startswith("postgresql"):
    db_url = "sqlite:///./fdr_smart.db"

config.set_main_option("sqlalchemy.url", db_url)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Attempt to connect to configured DB; fallback to sqlite if postgres offline
    target_url = config.get_main_option("sqlalchemy.url")
    try:
        connectable = create_engine(target_url, poolclass=pool.NullPool)
        with connectable.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
            return
    except Exception as e:
        print(f"Warning: Primary DB migration connection failed ({e}). Falling back to sqlite.")
        connectable = create_engine("sqlite:///./fdr_smart.db", poolclass=pool.NullPool)
        with connectable.connect() as connection:
            context.configure(connection=connection, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
