import logging
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.api.router import api_router
from app.db.session import engine
from app.utils.logger import setup_logging, log_request_context
from app.utils.exceptions import FAPOSException
from app.utils.error_handlers import log_error


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger = logging.getLogger(__name__)
    logger.info("POS application starting up...", extra={'action': 'application_startup'})

    # Try database connection but don't fail startup if it's not available
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection established successfully")
    except Exception as e:
        logger.warning(f"Database connection failed: {str(e)}")
        logger.info("Application will continue without database connection")

    # Initialize Supabase client
    try:
        from app.core.supabase_client import is_supabase_available
        if is_supabase_available():
            logger.info("Supabase client initialized successfully")
        else:
            logger.warning("Supabase client not available - storage features will be disabled")
    except Exception as e:
        logger.warning(f"Supabase initialization failed: {str(e)}")

    logger.info("POS application startup completed", extra={'action': 'startup_complete'})
    yield

    logger.info("FA POS application shutting down...", extra={'action': 'application_shutdown'})
    try:
        await engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.warning(f"Error during database shutdown: {str(e)}")

    logger.info("FA POS application shutdown completed", extra={'action': 'shutdown_complete'})


def create_application() -> FastAPI:
    setup_logging()
    logger = logging.getLogger(__name__)

    app = FastAPI(
        title=settings.project_name,
        description="FastAPI-based Point of Sale System with multi-tenant architecture",
        version="2.0.0",
        openapi_url="/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    allowed_origins = set(settings.frontend_origins or [])
    allowed_origins.update({
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "null"
    })

    cors_kwargs = {
        "allow_origins": list(allowed_origins),
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }

    if settings.app_env.lower() == "development":
        cors_kwargs["allow_origin_regex"] = r"https?://(localhost|127\.0\.0\.1)(:\d+)?$"

    app.add_middleware(CORSMiddleware, **cors_kwargs)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        request_id = f"{request.method}_{hash(request.url.path)}_{id(request)}"
        user_id = None
        tenant_id = None

        auth_header = request.headers.get("authorization")
        if auth_header:
            try:
                from app.core.security import decode_token
                token = auth_header.split(" ")[1] if len(auth_header.split(" ")) > 1 else None
                if token:
                    payload = decode_token(token)
                    user_id = payload.get("sub")
                    tenant_id = payload.get("tenant_id")
            except Exception:
                pass

        client_ip = request.client.host if request.client else "unknown"

        with log_request_context(
            logger=logger,
            request_id=request_id,
            user_id=UUID(user_id) if user_id else None,
            ip_address=client_ip
        ):
            logger.info(
                f"{request.method} {request.url.path}",
                extra={
                    'action': 'request_start',
                    'method': request.method,
                    'path': request.url.path,
                    'query_params': str(request.query_params),
                }
            )

            response = await call_next(request)

            logger.info(
                f"{request.method} {request.url.path} - {response.status_code}",
                extra={
                    'action': 'request_complete',
                    'method': request.method,
                    'path': request.url.path,
                    'status_code': response.status_code,
                }
            )

            return response

    @app.exception_handler(FAPOSException)
    async def fapos_exception_handler(request: Request, exc: FAPOSException):
        log_error(
            func_name="fapos_exception_handler",
            error=exc,
            additional_info={"path": request.url.path, "method": request.method}
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "FAPOS_ERROR",
                "message": exc.message,
                "details": exc.details,
                "status_code": exc.status_code
            }
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(request: Request, exc: SQLAlchemyError):
        log_error(
            func_name="database_exception_handler",
            error=exc,
            additional_info={"path": request.url.path, "method": request.method}
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": "DATABASE_ERROR",
                "message": "A database error occurred. Please try again later.",
                "details": {}
            }
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        log_error(
            func_name="http_exception_handler",
            error=Exception(f"HTTP {exc.status_code}: {exc.detail}"),
            additional_info={
                "path": request.url.path,
                "method": request.method,
                "status_code": exc.status_code
            }
        )

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTP_ERROR",
                "message": exc.detail,
                "details": {"status_code": exc.status_code}
            }
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        log_error(
            func_name="general_exception_handler",
            error=exc,
            additional_info={"path": request.url.path, "method": request.method}
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {}
            }
        )

    @app.get("/")
    async def root():
        """Root endpoint to avoid 404 errors"""
        return {
            "service": settings.project_name,
            "api_version": "2.0.0",
            "description": "FastAPI Point of Sale System with Supabase Storage",
            "status": "running",
            "endpoints": {
                "health": "/health",
                "api_docs": "/docs",
                "api": f"{settings.api_prefix}/",
                "public": f"{settings.api_prefix}/public/",
                "health_check": "/health"
            }
        }

    @app.get("/health")
    async def health_check():
        health_status = {
            "status": "healthy",
            "service": settings.project_name,
            "environment": settings.app_env,
            "database": "disconnected",
            "supabase": "disconnected"
        }

        # Check database connection
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
            health_status["database"] = "connected"
        except Exception as e:
            logger.warning(f"Database health check failed: {str(e)}")

        # Check Supabase connection
        try:
            from app.core.supabase_client import is_supabase_available
            if is_supabase_available():
                health_status["supabase"] = "connected"
        except Exception as e:
            logger.warning(f"Supabase health check failed: {str(e)}")

        # Determine overall status
        overall_status = "healthy" if health_status["database"] == "connected" else "degraded"

        if overall_status == "degraded":
            return JSONResponse(
                status_code=503,
                content={**health_status, "status": "degraded"}
            )

        return health_status

    app.include_router(api_router, prefix=settings.api_prefix)

    return app


app = create_application()
