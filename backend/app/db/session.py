from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


engine = create_engine(
    settings.supabase_db_url,
    echo=settings.app_env == "development",
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    execution_options={
        # Disable prepared statements for PgBouncer session pool compatibility.
        "psycopg_disable_prepared_statements": True,
    },
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Synchronous database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
