from __future__ import annotations

from typing import Any, Generator, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


engine: Engine = create_engine(
    settings.supabase_db_url,
    echo=settings.app_env == "development",
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    execution_options={
        # Disable prepared statements for PgBouncer session pooling compatibility.
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


class AsyncConnectionAdapter:
    """Transitional adapter that mimics async SQLAlchemy Connection APIs."""

    def __init__(self, sync_connection: Connection):
        self._connection = sync_connection

    def __await__(self):
        async def _return_self():
            return self

        return _return_self().__await__()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        self._connection.close()

    async def execution_options(self, *args: Any, **kwargs: Any) -> "AsyncConnectionAdapter":
        self._connection = self._connection.execution_options(*args, **kwargs)
        return self

    async def execute(self, *args: Any, **kwargs: Any):
        return self._connection.execute(*args, **kwargs)

    async def close(self) -> None:
        self._connection.close()

    def __getattr__(self, item: str) -> Any:
        return getattr(self._connection, item)


class AsyncEngineAdapter:
    """Transitional adapter that provides async-like methods over a sync engine."""

    def __init__(self, sync_engine: Engine):
        self._engine = sync_engine

    def connect(self) -> AsyncConnectionAdapter:
        return AsyncConnectionAdapter(self._engine.connect())

    def __getattr__(self, item: str) -> Any:
        return getattr(self._engine, item)


class AsyncSessionAdapter:
    """
    Temporary adapter allowing existing async code paths to continue operating
    while the rest of the codebase is migrated to synchronous SQLAlchemy.
    """

    def __init__(self, sync_session: Session):
        self._session = sync_session

    @property
    def bind(self) -> Optional[AsyncEngineAdapter]:
        bind = self._session.get_bind()
        return AsyncEngineAdapter(bind) if bind is not None else None

    async def execute(self, *args: Any, **kwargs: Any):
        return self._session.execute(*args, **kwargs)

    async def commit(self) -> None:
        self._session.commit()

    async def rollback(self) -> None:
        self._session.rollback()

    async def flush(self) -> None:
        self._session.flush()

    async def refresh(self, instance: Any) -> None:
        self._session.refresh(instance)

    async def close(self) -> None:
        self._session.close()

    def __getattr__(self, item: str) -> Any:
        return getattr(self._session, item)


class _AsyncSessionContextManager:
    def __init__(self):
        self._session: Optional[Session] = None
        self._adapter: Optional[AsyncSessionAdapter] = None

    async def __aenter__(self) -> AsyncSessionAdapter:
        self._session = SessionLocal()
        self._adapter = AsyncSessionAdapter(self._session)
        return self._adapter

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if not self._session:
            return
        if exc_type:
            self._session.rollback()
        self._session.close()
        self._session = None
        self._adapter = None


class _AsyncSessionFactory:
    """Callable factory mimicking async_sessionmaker for compatibility."""

    def __call__(self) -> _AsyncSessionContextManager:
        return _AsyncSessionContextManager()


AsyncSessionLocal = _AsyncSessionFactory()
