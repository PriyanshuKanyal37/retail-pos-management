"""Health check endpoint for monitoring and deployment."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check():
    """Basic health check - returns 200 if service is running."""
    return {
        "status": "healthy",
        "service": settings.project_name,
        "environment": settings.app_env,
    }


@router.get("/db")
async def database_health_check(session: AsyncSession = Depends(get_db_session)):
    """
    Database health check - verifies database connectivity.
    Returns 200 if database is reachable, 503 otherwise.
    """
    try:
        # Simple query to test connection
        result = await session.execute(text("SELECT 1"))
        result.scalar()
        return {
            "status": "healthy",
            "database": "connected",
            "message": "Database connection successful",
        }
    except Exception as exc:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(exc),
        }
