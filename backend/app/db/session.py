from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings

engine = create_async_engine(
    settings.supabase_db_url,
    echo=settings.app_env == "development",
    pool_size=5,
    max_overflow=10,
    # Disable asyncpg prepared statements because Railway's Postgres uses PgBouncer
    # in transaction mode (prepared statements break in this mode).
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

AsyncSessionLocal = async_sessionmaker[AsyncSession](
    bind=engine,
    expire_on_commit=False,
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
