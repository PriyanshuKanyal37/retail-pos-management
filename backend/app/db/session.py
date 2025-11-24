from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

engine = create_async_engine(
    settings.supabase_db_url,
    echo=settings.app_env == "development",
    pool_size=5,
    max_overflow=10,
    connect_args={},  # psycopg doesn't accept prepared_statement_cache_size
    execution_options={
        # Disable prepared statements for PgBouncer session pool compatibility.
        "psycopg_disable_prepared_statements": True,
    },
)

AsyncSessionLocal = async_sessionmaker[AsyncSession](
    bind=engine,
    expire_on_commit=False,
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
