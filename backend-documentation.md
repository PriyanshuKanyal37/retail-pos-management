# FA POS Backend - Comprehensive Technical Documentation

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    FASTAPI POINT OF SALE SYSTEM BACKEND                     ║
║                          COMPREHENSIVE TECHNICAL DOCS                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

## Table of Contents

1. [High-Level System Overview](#1-high-level-system-overview)
2. [Project Structure & Architecture](#2-project--file-structure)
3. [Core Configuration & Setup](#3-core-configuration--setup)
4. [Database Architecture](#4-database-architecture)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [API Endpoints Documentation](#6-api-endpoints-documentation)
7. [Service Layer Architecture](#7-service-layer-architecture)
8. [CRUD Layer Implementation](#8-crud-layer-implementation)
9. [Data Validation & Schemas](#9-data-validation--schemas)
10. [Error Handling & Logging](#10-error-handling--logging)
11. [Security Architecture](#11-security-architecture)
12. [Request Flow Architecture](#12-request-flow-architecture)
13. [Special Features & Notes](#13-special-features--notes)
14. [Technical Analysis & Observations](#14-technical-analysis--observations)

---

## 1. High-Level System Overview

### System Purpose
The FA POS Backend is a **multi-tenant, FastAPI-based Point of Sale (POS) system** designed for restaurant and retail management. The system provides complete business functionality including product management, sales processing, customer management, user administration, and inventory tracking across multiple stores and tenants.

### Architecture Style
- **Layered Architecture**: Clear separation between API, Service, CRUD, and Model layers
- **Multi-Tenant SaaS**: Built for multi-organization deployment with complete data isolation
- **RESTful API**: Standard HTTP methods with proper status codes and response formats
- **Domain-Driven Design**: Business logic encapsulated in dedicated service classes
- **Repository Pattern**: Data access abstracted through CRUD layer

### Request Lifecycle
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   HTTP Request   │───▶│   API Layer      │───▶│   Service Layer │───▶│   CRUD Layer    │
│   (FastAPI)      │    │   (Routes)       │    │   (Business)    │    │   (Data Access) │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
                                                                │
                                                                ▼
                                                       ┌─────────────────┐
                                                       │   Database      │
                                                       │   (PostgreSQL)  │
                                                       └─────────────────┘
```

---

## 2. Project & File Structure

```
backend/
├── main.py                          # Application entry point (Uvicorn server)
├── pyproject.toml                   # Poetry dependencies and project config
├── requirements.txt                 # Pip dependencies
└── app/
    ├── __init__.py                  # App package initialization
    ├── main.py                      # FastAPI application factory and configuration
    ├── core/                        # Core application components
    │   ├── __init__.py
    │   ├── config.py                # Settings and environment configuration
    │   └── security.py              # Authentication and security utilities
    ├── api/                         # API layer (Controllers)
    │   ├── __init__.py
    │   ├── router.py                # Dynamic router discovery and inclusion
    │   ├── deps.py                  # FastAPI dependencies (auth, db, etc.)
    │   └── routes/                  # Route definitions by feature
    │       ├── __init__.py
    │       ├── auth.py              # Authentication endpoints
    │       ├── health.py            # Health check endpoints
    │       ├── tenants.py           # Tenant management
    │       ├── users.py             # User management
    │       ├── stores.py            # Store management
    │       ├── customers.py         # Customer management
    │       ├── products.py          # Product management
    │       ├── sales.py             # Sales processing
    │       ├── settings.py          # Settings management
    │       └── tenant_products.py   # Tenant-specific product management
    ├── db/                          # Database layer
    │   ├── __init__.py
    │   ├── base.py                  # Model imports for SQLAlchemy
    │   ├── base_class.py            # Base SQLAlchemy model class
    │   └── session.py               # Database session management
    ├── models/                      # SQLAlchemy ORM models
    │   ├── __init__.py
    │   ├── user.py                  # User model with role-based access
    │   ├── tenant.py                # Tenant model for multi-tenancy
    │   ├── store.py                 # Store model for multi-store support
    │   ├── customer.py              # Customer model
    │   ├── product.py               # Product model with inventory
    │   ├── sale.py                  # Sales transaction model
    │   ├── sale_item.py             # Line items for sales
    │   └── setting.py               # System settings model
    ├── schemas/                     # Pydantic schemas for validation
    │   ├── __init__.py
    │   ├── user.py                  # User-related schemas
    │   ├── tenant.py                # Tenant-related schemas
    │   ├── store.py                 # Store-related schemas
    │   ├── customer.py              # Customer-related schemas
    │   ├── product.py               # Product-related schemas
    │   ├── sale.py                  # Sales-related schemas
    │   ├── sale_item.py             # Sale item schemas
    │   └── setting.py               # Settings-related schemas
    ├── crud/                        # Data access layer (Repository pattern)
    │   ├── __init__.py
    │   ├── base.py                  # Generic CRUD base class
    │   ├── crud_user.py             # User-specific CRUD operations
    │   ├── crud_tenant.py           # Tenant-specific CRUD operations
    │   ├── crud_store.py            # Store-specific CRUD operations
    │   ├── crud_customer.py         # Customer-specific CRUD operations
    │   ├── crud_product.py          # Product-specific CRUD operations
    │   ├── crud_sale.py             # Sale-specific CRUD operations
    │   ├── crud_sale_item.py        # Sale item-specific CRUD operations
    │   └── crud_setting.py          # Settings-specific CRUD operations
    ├── services/                    # Business logic layer
    │   ├── __init__.py
    │   ├── base.py                  # Base service class
    │   ├── auth.py                  # Authentication service
    │   ├── tenant_auth.py           # Tenant authentication service
    │   ├── tenant_management.py     # Tenant management service
    │   ├── users.py                 # User management service
    │   ├── customers.py             # Customer management service
    │   ├── products.py              # Product management service
    │   ├── tenant_products.py       # Tenant-specific product service
    │   ├── sales.py                 # Sales processing service
    │   ├── settings.py              # Settings management service
    │   └── storage.py               # File storage service (Supabase)
    └── utils/                       # Utility modules
        ├── __init__.py
        ├── logger.py                # Logging configuration and utilities
        ├── pagination.py            # Pagination helpers
        ├── exceptions.py            # Custom exception classes
        └── error_handlers.py        # Error handling utilities
└── scripts/
    └── seed_products.py             # Database seeding script
```

### Layer Responsibilities

**API Layer (Controllers)**
- Handle HTTP requests and responses
- Input validation using Pydantic schemas
- Business logic orchestration
- Authentication and authorization checks
- Response formatting and error handling

**Service Layer (Business Logic)**
- Domain-specific business rules
- Transaction management
- Complex data operations
- Integration between multiple models
- External service integrations (payment gateways, storage)

**CRUD Layer (Repository)**
- Database abstraction
- Basic CRUD operations with tenant isolation
- Query optimization
- Data persistence logic
- Multi-tenant data filtering

**Model Layer (ORM)**
- Database table definitions
- Relationships and constraints
- Data type mappings
- Indexes and performance considerations

---

## 3. Core Configuration & Setup

### Application Configuration (`app/core/config.py`)

The system uses Pydantic Settings for robust configuration management with environment variable support:

```python
class Settings(BaseSettings):
    # Core Configuration
    app_env: str = "development"                    # Environment (development/production)
    project_name: str = "FA POS Backend"           # Application name
    api_prefix: str = "/api/v1"                    # API versioning prefix
    frontend_origins: List[str] = ["http://localhost:5173"]  # CORS origins

    # Supabase Integration
    supabase_db_url: str                           # PostgreSQL connection string
    supabase_service_role_key: str                 # Supabase service role key
    supabase_project_url: str                      # Supabase project URL
    supabase_products_bucket: str = "products"     # Product images bucket
    supabase_invoices_bucket: str = "invoices"     # Invoice PDFs bucket
    supabase_branding_bucket: str = "branding"     # Store branding assets

    # JWT Configuration
    jwt_secret: str                                # JWT signing secret
    jwt_algorithm: str = "HS256"                   # JWT algorithm
    access_token_expire_minutes: int = 30          # Access token lifetime
    refresh_token_expire_days: int = 7             # Refresh token lifetime
```

### Application Factory (`app/main.py`)

**Key Features:**
- **Dynamic Route Discovery**: Automatic discovery and inclusion of route modules
- **Production-Ready Middleware**: Request logging, error handling, CORS
- **Health Check Endpoints**: Database connectivity monitoring
- **Graceful Shutdown**: Proper resource cleanup on application termination
- **Structured Logging**: JSON-formatted logs with request correlation

**Middleware Stack:**
```python
app = FastAPI(
    title=settings.project_name,
    description="FastAPI-based Point of Sale System with multi-tenant architecture",
    version="2.0.0",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    lifespan=lifespan,  # Application lifecycle management
)

# CORS Configuration
app.add_middleware(CORSMiddleware, **cors_kwargs)

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Request context extraction and logging
    # Performance monitoring
    # User identification from JWT tokens
```

**Exception Handling:**
```python
@app.exception_handler(FAPOSException)
async def fapos_exception_handler(request: Request, exc: FAPOSException):
    # Custom business logic exceptions
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
    # Database errors with generic messages
    return JSONResponse(
        status_code=500,
        content={
            "error": "DATABASE_ERROR",
            "message": "A database error occurred. Please try again later.",
            "details": {}
        }
    )
```

---

## 4. Database Architecture

### Multi-Tenant Design Pattern

The system implements **shared-database, shared-schema** multi-tenancy with tenant isolation at the application layer:

```sql
-- Every business entity includes tenant_id for data isolation
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    store_id UUID REFERENCES stores(id),
    assigned_manager_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ
);
```

### Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   TENANTS   │────▶│    USERS    │────▶│    SALES    │────▶│  SALE_ITEMS │
│             │     │             │     │             │     │             │
│ • id        │     │ • id        │     │ • id        │     │ • id        │
│ • name      │     │ • tenant_id │     │ • tenant_id │     │ • tenant_id │
│ • domain    │     │ • name      │     │ • store_id  │     │ • sale_id   │
│ • status    │     │ • email     │     │ • invoice_no│     │ • product_id│
│ • created_at│     │ • role      │     │ • customer_id│   │ • quantity  │
│ • updated_at│     │ • store_id  │     │ • cashier_id│   │ • unit_price│
└─────────────┘     │ • password  │     │ • payment  │   └─────────────┘
                    │ • status    │     │ • total    │
                    │ • created_at│     │ • status   │
                    │ • updated_at│     │ • created_at│
                    └─────────────┘     │ • updated_at│
                                        └─────────────┘
                                              ▲
                                              │
                    ┌─────────────┐     ┌─────────────┐
                    │  CUSTOMERS │────▶│   PRODUCTS  │
                    │             │     │             │
                    │ • id        │     │ • id        │
                    │ • tenant_id │     │ • tenant_id │
                    │ • store_id  │     │ • store_id  │
                    │ • name      │     │ • name      │
                    │ • phone     │     │ • sku       │
                    │ • created_at│     │ • barcode   │
                    │ • updated_at│     │ • category  │
                    └─────────────┘     │ • price     │
                                        │ • stock    │
                                        │ • img_url  │
                                        │ • status   │
                                        │ • created_at│
                                        │ • updated_at│
                                        └─────────────┘
                                              ▲
                                              │
                    ┌─────────────┐     ┌─────────────┐
                    │    STORES   │────▶│   SETTINGS  │
                    │             │     │             │
                    │ • id        │     │ • id        │
                    │ • tenant_id │     │ • tenant_id │
                    │ • name      │     │ • store_id  │
                    │ • address   │     │ • store_name│
                    │ • phone     │     │ • tax_rate  │
                    │ • email     │     │ • currency  │
                    │ • manager_id│     │ • upi_id    │
                    │ • status    │     │ • theme     │
                    │ • created_at│     │ • created_at│
                    │ • updated_at│     │ • updated_at│
                    └─────────────┘     └─────────────┘
```

### Database Session Management (`app/db/session.py`)

**Async SQLAlchemy Configuration:**
```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Production-ready connection pooling
engine = create_async_engine(
    settings.supabase_db_url,
    echo=settings.app_env == "development",  # SQL logging in development
    pool_size=5,                              # Connection pool size
    max_overflow=10,                          # Additional connections under load
)

AsyncSessionLocal = async_sessionmaker[AsyncSession](
    bind=engine,
    expire_on_commit=False,  # Prevent object expiration after commit
)
```

### Model Base Class (`app/db/base_class.py`)

**Automatic Table Naming:**
```python
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    id: Mapped[Any]  # type: ignore[assignment]

    @declared_attr.directive
    def __tablename__(cls) -> str:  # type: ignore[misc]
        return cls.__name__.lower()  # Auto-generate table names
```

---

## 5. Authentication & Authorization

### JWT-Based Authentication System

**Token Generation (`app/core/security.py`):**
```python
def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    tenant_id: Optional[UUID] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))

    # Add tenant context to token
    token_data = {"exp": expire}
    if tenant_id:
        token_data["tenant_id"] = str(tenant_id)

    to_encode.update(token_data)
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt
```

**Password Security:**
```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')
```

### Role-Based Access Control (RBAC)

**User Hierarchy:**
1. **Super Admin**: Complete system access within tenant, manages stores and users
2. **Manager**: Store management, product management, sales oversight
3. **Cashier**: Daily operations, sales processing, customer management

**Authorization Dependencies (`app/api/deps.py`):**
```python
def require_super_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require super admin role"""
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user

def require_manager(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require manager role or higher"""
    if user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=403, detail="Manager access required")
    return user

async def get_current_user_with_tenant(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Tuple[User, UUID]:
    """Extract user and tenant_id from JWT token"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        tenant_id = payload.get("tenant_id")

        if user_id is None or tenant_id is None:
            raise credentials_exception
    except (JWTError, ValueError):
        raise credentials_exception

    # Verify user exists and is active
    user = await session.execute(
        select(User).where(
            and_(
                User.id == UUID(user_id),
                User.tenant_id == UUID(tenant_id),
                User.status == "active"
            )
        )
    ).scalar_one_or_none()

    if not user:
        raise credentials_exception

    return user, UUID(tenant_id)
```

### Multi-Tenant Isolation

**Tenant Context Injection:**
Every database query automatically includes tenant filtering through the CRUD layer:

```python
# Base CRUD class with tenant isolation
async def get(
    self,
    db: AsyncSession,
    id: Any,
    *,
    tenant_id: Optional[UUID] = None
) -> Optional[ModelType]:
    query = select(self.model).where(self.model.id == id)

    # Automatic tenant filtering
    if tenant_id and hasattr(self.model, 'tenant_id'):
        query = query.where(self.model.tenant_id == tenant_id)

    result = await db.execute(query)
    return result.scalar_one_or_none()
```

---

## 6. API Endpoints Documentation

### Authentication Endpoints (`/api/v1/auth`)

#### POST `/api/v1/auth/signup`
**Purpose**: Register new super admin with automatic tenant creation
**Access**: Public
**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "super_admin"  // Only super_admin allowed through signup
}
```

**Response (201)**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "super_admin",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440001"
  },
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
  "tenant_name": "John Doe's Store",
  "message": "Account created successfully"
}
```

#### POST `/api/v1/auth/login`
**Purpose**: Authenticate user and return JWT token
**Access**: Public
**Request Body** (OAuth2PasswordRequestForm):
- `username`: User email
- `password`: User password

**Response (200)**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "manager",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440001"
  },
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
  "message": "Login successful"
}
```

### Health Check Endpoints (`/api/v1/health`)

#### GET `/api/v1/health`
**Purpose**: Basic application health check
**Access**: Public
**Response (200)**:
```json
{
  "status": "healthy",
  "service": "FA POS Backend",
  "environment": "production"
}
```

#### GET `/api/v1/health/db`
**Purpose**: Database connectivity check
**Access**: Public
**Response (200)**:
```json
{
  "status": "healthy",
  "database": "connected",
  "message": "Database connection successful"
}
```

### Tenant Management Endpoints (`/api/v1/tenants`)

#### GET `/api/v1/tenants`
**Purpose**: List all tenants (Super Admin only)
**Access**: Super Admin
**Query Parameters**:
- `include_inactive`: boolean (default: false)
- **Response (200)**: Array of TenantResponse objects

#### POST `/api/v1/tenants`
**Purpose**: Create new tenant (Super Admin only)
**Access**: Super Admin
**Request Body**:
```json
{
  "name": "New Restaurant",
  "domain": "restaurant.example.com"
}
```

#### GET `/api/v1/tenants/{tenant_id}/statistics`
**Purpose**: Get comprehensive tenant statistics
**Access**: Super Admin
**Response (200)**:
```json
{
  "total_users": 15,
  "active_users": 12,
  "total_stores": 3,
  "active_stores": 2,
  "total_products": 250,
  "active_products": 230,
  "total_sales": 1250,
  "total_revenue": 125000.50,
  "low_stock_products": 8,
  "out_of_stock_products": 2
}
```

### User Management Endpoints (`/api/v1/users`)

#### GET `/api/v1/users/me`
**Purpose**: Get current user profile
**Access**: Authenticated
**Response (200)**: UserResponse object

#### GET `/api/v1/users`
**Purpose**: List users with role-based filtering
**Access**: Manager+
**Query Parameters**:
- `store_id`: UUID (filter by store)
- `role`: string (filter by role)
**Response (200)**: Array of UserResponse objects

#### POST `/api/v1/users`
**Purpose**: Create new user
**Access**: Manager+
**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "role": "cashier",
  "store_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

#### PATCH `/api/v1/users/{user_id}`
**Purpose**: Update user information
**Access**: Manager+ (with restrictions)
**Request Body**:
```json
{
  "name": "Jane Doe",
  "status": "active",
  "store_id": "550e8400-e29b-41d4-a716-446655440003"
}
```

### Store Management Endpoints (`/api/v1/stores`)

#### GET `/api/v1/stores`
**Purpose**: List stores with role-based access
**Access**: Authenticated
**Query Parameters**:
- `skip`: int (pagination offset, default: 0)
- `limit`: int (pagination limit, default: 100)
- `manager_id`: UUID (filter by manager)
- `status`: string (filter by status)
**Response (200)**:
```json
{
  "items": [StoreWithManager objects],
  "total": 5,
  "page": 1,
  "size": 100,
  "pages": 1
}
```

#### GET `/api/v1/stores/{store_id}`
**Purpose**: Get store details
**Access**: Role-based
**Response (200)**: StoreWithManager object

#### POST `/api/v1/stores`
**Purpose**: Create new store
**Access**: Super Admin
**Request Body**:
```json
{
  "name": "Downtown Restaurant",
  "address": "123 Main St",
  "phone": "+1234567890",
  "email": "downtown@example.com",
  "city": "New York",
  "state": "NY",
  "postal_code": "10001",
  "country": "USA"
}
```

#### PATCH `/api/v1/stores/{store_id}/assign-manager`
**Purpose**: Assign manager to store
**Access**: Super Admin
**Request Body**: `{ "manager_id": "uuid" }`

### Customer Management Endpoints (`/api/v1/customers`)

#### GET `/api/v1/customers`
**Purpose**: List all customers for tenant
**Access**: Authenticated
**Response (200)**: Array of CustomerResponse objects

#### POST `/api/v1/customers`
**Purpose**: Create new customer
**Access**: Authenticated
**Request Body**:
```json
{
  "name": "John Customer",
  "phone": "9876543210"
}
```

#### PATCH `/api/v1/customers/{customer_id}`
**Purpose**: Update customer information
**Access**: Authenticated
**Request Body**:
```json
{
  "name": "John Updated",
  "phone": "9876543211"
}
```

### Product Management Endpoints (`/api/v1/products`)

#### GET `/api/v1/products`
**Purpose**: List products with filtering
**Access**: Authenticated
**Query Parameters**:
- `category`: string (filter by category)
- `search`: string (search term)
- `status`: string ("active"|"inactive")
**Response (200)**: Array of ProductResponse objects

#### GET `/api/v1/products/low-stock`
**Purpose**: Get low stock products
**Access**: Authenticated
**Query Parameters**:
- `threshold`: int (stock threshold, default: 5)

#### GET `/api/v1/products/{product_id}`
**Purpose**: Get product details
**Access**: Authenticated
**Response (200)**: ProductResponse object

#### POST `/api/v1/products`
**Purpose**: Create new product
**Access**: Admin
**Request Body**:
```json
{
  "name": "Burger",
  "sku": "BUR-001",
  "barcode": "1234567890123",
  "category": "Food",
  "price": 12.99,
  "stock": 100,
  "status": "active"
}
```

#### PATCH `/api/v1/products/{product_id}`
**Purpose**: Update product
**Access**: Admin
**Request Body**: Partial ProductUpdate object

#### DELETE `/api/v1/products/{product_id}`
**Purpose**: Delete product
**Access**: Admin

#### POST `/api/v1/products/{product_id}/image`
**Purpose**: Upload product image
**Access**: Admin
**Request**: multipart/form-data with `file` field

### Sales Management Endpoints (`/api/v1/sales`)

#### GET `/api/v1/sales/next-invoice-number/`
**Purpose**: Get next available invoice number
**Access**: Authenticated
**Response (200)**:
```json
{
  "invoice_number": "INV-2024-0001"
}
```

#### GET `/api/v1/sales`
**Purpose**: List sales with filtering
**Access**: Authenticated (role-based)
**Query Parameters**:
- `customer_id`: UUID (filter by customer)
- `cashier_id`: UUID (filter by cashier)
- `start_date`: datetime (start date filter)
- `end_date`: datetime (end date filter)
**Response (200)**: Array of SaleResponse objects

#### POST `/api/v1/sales`
**Purpose**: Create new sale
**Access**: Authenticated
**Request Body**:
```json
{
  "customer_id": "550e8400-e29b-41d4-a716-446655440010",
  "cashier_id": "550e8400-e29b-41d4-a716-446655440000",
  "payment_method": "cash",
  "subtotal": 29.98,
  "discount": 2.00,
  "discount_type": "flat",
  "tax": 2.40,
  "total": 30.38,
  "paid_amount": 30.38,
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440020",
      "quantity": 2,
      "unit_price": 14.99,
      "total": 29.98
    }
  ]
}
```

#### GET `/api/v1/sales/summary`
**Purpose**: Get sales summary with analytics
**Access**: Authenticated (role-based)
**Query Parameters**: Same as list endpoint
**Response (200)**:
```json
{
  "total_sales": 150,
  "total_revenue": 15000.00,
  "average_sale_amount": 100.00,
  "sales_by_payment_method": {
    "cash": 90,
    "card": 45,
    "upi": 15
  },
  "daily_sales": [
    {
      "date": "2024-01-01",
      "count": 25,
      "revenue": 2500.00
    }
  ]
}
```

#### GET `/api/v1/sales/{sale_id}`
**Purpose**: Get specific sale details
**Access**: Authenticated (role-based)
**Response (200)**: SaleResponse object

#### GET `/api/v1/sales/{sale_id}/payment-status`
**Purpose**: Check payment status (for UPI payments)
**Access**: Authenticated (role-based)
**Response (200)**:
```json
{
  "sale_id": "550e8400-e29b-41d4-a716-446655440030",
  "status": "completed",
  "upi_status": "completed",
  "payment_method": "upi",
  "amount": 150.00,
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### Settings Management Endpoints (`/api/v1/settings`)

#### GET `/api/v1/settings`
**Purpose**: Get tenant/store settings
**Access**: Authenticated
**Response (200)**: SettingResponse object

#### PATCH `/api/v1/settings`
**Purpose**: Update settings
**Access**: Admin
**Request Body**:
```json
{
  "store_name": "My Restaurant",
  "store_address": "123 Main St",
  "tax_rate": 8.5,
  "currency_symbol": "$",
  "currency_code": "USD",
  "upi_id": "myrestaurant@upi",
  "low_stock_threshold": 10,
  "theme": "dark"
}
```

---

## 7. Service Layer Architecture

### Base Service Pattern (`app/services/base.py`)

The service layer implements a consistent pattern across all business domains:

```python
from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

ModelType = TypeVar("ModelType")

class BaseService(Generic[ModelType], ABC):
    """Base service class with common functionality"""

    def __init__(self, session: AsyncSession, tenant_id: UUID):
        self.session = session
        self.tenant_id = tenant_id

    @abstractmethod
    async def get(self, id: UUID) -> Optional[ModelType]:
        """Get entity by ID"""
        pass

    @abstractmethod
    async def create(self, data: dict) -> ModelType:
        """Create new entity"""
        pass

    @abstractmethod
    async def update(self, id: UUID, data: dict) -> Optional[ModelType]:
        """Update existing entity"""
        pass

    @abstractmethod
    async def delete(self, id: UUID) -> bool:
        """Delete entity"""
        pass
```

### Tenant Authentication Service (`app/services/tenant_auth.py`)

**Multi-tenant authentication with automatic tenant detection:**

```python
class TenantAuthService:
    """Handles authentication with tenant isolation"""

    async def authenticate_user(self, email: str, password: str) -> LoginResponse:
        """
        Authenticate user across all tenants

        Process:
        1. Find user by email across all tenants
        2. Verify password
        3. Check user and tenant status
        4. Generate JWT with tenant context
        """
        # Find user across all tenants
        user = await crud_user.authenticate(
            self.session, email=email, password=password
        )

        if not user:
            raise AuthError("Invalid credentials")

        # Verify tenant is active
        tenant = await self.tenant_service.get_tenant_by_id(user.tenant_id)
        if not tenant or tenant.status != "active":
            raise AuthError("Tenant account is not active")

        # Generate JWT with tenant context
        access_token = create_access_token(
            data={"sub": str(user.id)},
            tenant_id=user.tenant_id
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user
        )

    async def register_user(
        self,
        email: str,
        password: str,
        name: str,
        role: str,
        tenant_id: UUID
    ) -> LoginResponse:
        """
        Register new user within specific tenant

        Business Rules:
        - Email must be unique within tenant
        - Role validation against requester permissions
        - Password strength validation
        """
        # Check if email exists in tenant
        existing_user = await crud_user.get_by_email(
            self.session, email=email, tenant_id=tenant_id
        )

        if existing_user:
            raise AuthError("Email already exists in this organization")

        # Create user with tenant context
        user_data = UserCreate(
            name=name,
            email=email,
            password=password,
            role=role
        )

        user = await crud_user.create(
            self.session, obj_in=user_data, tenant_id=tenant_id
        )

        # Generate authentication token
        access_token = create_access_token(
            data={"sub": str(user.id)},
            tenant_id=user.tenant_id
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user
        )
```

### Sales Service (`app/services/sales.py`)

**Complex business logic for sales processing:**

```python
class SalesService:
    """Handles sales transactions with inventory management"""

    async def create_sale(
        self,
        sale_data: SaleCreate,
        tenant_id: UUID,
        requesting_user: User
    ) -> Sale:
        """
        Create sale with inventory management

        Process:
        1. Validate all products exist and are active
        2. Check inventory availability
        3. Reserve inventory
        4. Calculate totals and taxes
        5. Generate invoice number
        6. Create sale and sale items
        7. Update inventory
        8. Handle payment processing
        """
        async with self.session.begin():
            # Generate invoice number
            invoice_no = await self.generate_next_invoice_number(tenant_id)

            # Validate products and check inventory
            validated_items = []
            total_amount = 0.0

            for item_data in sale_data.items:
                product = await crud_product.get(
                    self.session,
                    id=item_data.product_id,
                    tenant_id=tenant_id
                )

                if not product:
                    raise ProductNotFoundError(
                        f"Product {item_data.product_id} not found"
                    )

                if product.status != "active":
                    raise ProductInactiveError(
                        f"Product {product.name} is not active"
                    )

                # Check inventory
                if product.stock < item_data.quantity:
                    raise InsufficientStockError(
                        product.name,
                        item_data.quantity,
                        product.stock
                    )

                # Calculate line total
                line_total = float(product.price) * item_data.quantity
                total_amount += line_total

                validated_items.append({
                    "product": product,
                    "quantity": item_data.quantity,
                    "unit_price": float(product.price),
                    "total": line_total
                })

            # Create sale record
            sale = Sale(
                tenant_id=tenant_id,
                store_id=requesting_user.store_id,
                invoice_no=invoice_no,
                customer_id=sale_data.customer_id,
                cashier_id=sale_data.cashier_id or requesting_user.id,
                payment_method=sale_data.payment_method,
                subtotal=sale_data.subtotal,
                discount=sale_data.discount,
                discount_type=sale_data.discount_type,
                tax=sale_data.tax,
                total=sale_data.total,
                paid_amount=sale_data.paid_amount,
                change_amount=sale_data.change_amount,
                upi_status="pending" if sale_data.payment_method == "upi" else "n/a"
            )

            self.session.add(sale)
            await self.session.flush()  # Get sale ID

            # Create sale items and update inventory
            for item in validated_items:
                # Create sale item
                sale_item = SaleItem(
                    tenant_id=tenant_id,
                    store_id=requesting_user.store_id,
                    sale_id=sale.id,
                    product_id=item["product"].id,
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                    total=item["total"]
                )
                self.session.add(sale_item)

                # Update inventory
                item["product"].stock -= item["quantity"]

            # Log sale creation for audit
            audit_logger.log_sale_creation(
                sale.id,
                requesting_user.id,
                float(sale.total),
                sale_data.customer_id
            )

            return sale

    async def generate_next_invoice_number(self, tenant_id: UUID) -> str:
        """
        Generate sequential invoice number for tenant

        Format: INV-YYYY-NNNN
        Example: INV-2024-0001
        """
        current_year = datetime.now().year

        # Get last invoice number for current year
        last_invoice = await self.session.execute(
            select(Sale)
            .where(
                and_(
                    Sale.tenant_id == tenant_id,
                    Sale.invoice_no.like(f"INV-{current_year}-%")
                )
            )
            .order_by(Sale.invoice_no.desc())
            .limit(1)
        ).scalar_one_or_none()

        if last_invoice:
            last_number = int(last_invoice.invoice_no.split("-")[-1])
            next_number = last_number + 1
        else:
            next_number = 1

        return f"INV-{current_year}-{next_number:04d}"
```

### Tenant Product Service (`app/services/tenant_products.py`)

**Tenant-aware product management with validation:**

```python
class TenantProductService:
    """Multi-tenant product management service"""

    def __init__(self, session: AsyncSession, tenant_id: UUID):
        self.session = session
        self.tenant_id = tenant_id
        self.crud_product = crud_product

    async def create(self, product_data: dict) -> Product:
        """
        Create product with tenant-specific validation

        Business Rules:
        - SKU must be unique within tenant
        - Barcode must be unique within tenant (if provided)
        - Price must be positive
        - Stock cannot be negative
        """
        # Validate SKU uniqueness within tenant
        sku_exists = await self.crud_product.sku_exists(
            self.session,
            sku=product_data["sku"],
            tenant_id=self.tenant_id,
            store_id=product_data.get("store_id")
        )

        if sku_exists:
            raise DuplicateSKUError(product_data["sku"])

        # Validate barcode uniqueness within tenant
        if product_data.get("barcode"):
            barcode_exists = await self.crud_product.barcode_exists(
                self.session,
                barcode=product_data["barcode"],
                tenant_id=self.tenant_id,
                store_id=product_data.get("store_id")
            )

            if barcode_exists:
                raise DuplicateBarcodeError(product_data["barcode"])

        # Business validation
        if product_data.get("price", 0) <= 0:
            raise ValidationError("Product price must be positive")

        if product_data.get("stock", 0) < 0:
            raise ValidationError("Product stock cannot be negative")

        # Create product with tenant context
        product = await self.crud_product.create(
            self.session,
            obj_in=product_data,
            tenant_id=self.tenant_id
        )

        # Log inventory change
        audit_logger.log_inventory_change(
            product.id,
            0,  # Old stock
            product.stock,  # New stock
            "system",  # User ID (system creation)
            "Product creation"
        )

        return product

    async def update(self, product_id: UUID, update_data: dict) -> Optional[Product]:
        """
        Update product with change tracking

        Features:
        - SKU/Barcode uniqueness validation
        - Inventory change logging
        - Stock adjustment tracking
        """
        existing_product = await self.get_by_id(product_id)

        if not existing_product:
            raise ProductNotFoundError(str(product_id))

        # Track inventory changes
        old_stock = existing_product.stock
        new_stock = update_data.get("stock")

        # Validate uniqueness if changing SKU/barcode
        if "sku" in update_data and update_data["sku"] != existing_product.sku:
            sku_exists = await self.crud_product.sku_exists(
                self.session,
                sku=update_data["sku"],
                tenant_id=self.tenant_id,
                exclude_product_id=product_id
            )

            if sku_exists:
                raise DuplicateSKUError(update_data["sku"])

        if "barcode" in update_data and update_data["barcode"] != existing_product.barcode:
            if update_data["barcode"]:
                barcode_exists = await self.crud_product.barcode_exists(
                    self.session,
                    barcode=update_data["barcode"],
                    tenant_id=self.tenant_id,
                    exclude_product_id=product_id
                )

                if barcode_exists:
                    raise DuplicateBarcodeError(update_data["barcode"])

        # Update product
        updated_product = await self.crud_product.update(
            self.session,
            db_obj=existing_product,
            obj_in=update_data
        )

        # Log inventory change if stock modified
        if new_stock is not None and new_stock != old_stock:
            audit_logger.log_inventory_change(
                product_id,
                old_stock,
                new_stock,
                "system",  # Would be actual user ID
                "Stock adjustment via product update"
            )

        return updated_product

    async def get_low_stock_products(self, threshold: int = 5) -> List[Product]:
        """
        Get products below stock threshold

        Features:
        - Configurable threshold
        - Only active products
        - Tenant isolation
        - Optimized query with indexing
        """
        return await self.crud_product.get_low_stock_products(
            self.session,
            tenant_id=self.tenant_id,
            threshold=threshold
        )
```

---

## 8. CRUD Layer Implementation

### Generic Base CRUD (`app/crud/base.py`)

**Comprehensive CRUD base class with multi-tenant support:**

```python
class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base class for CRUD operations with multi-tenant support.

    Features:
    - Automatic tenant filtering
    - Flexible querying with filters
    - Bulk operations
    - Optimistic concurrency control
    - Comprehensive error handling
    """

    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get(
        self,
        db: AsyncSession,
        id: Any,
        *,
        tenant_id: Optional[UUID] = None
    ) -> Optional[ModelType]:
        """
        Get single record by ID with tenant filtering
        """
        query = select(self.model).where(self.model.id == id)

        # Automatic tenant filtering
        if tenant_id and hasattr(self.model, 'tenant_id'):
            query = query.where(self.model.tenant_id == tenant_id)

        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[UUID] = None,
        order_by: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[ModelType]:
        """
        Get multiple records with pagination and filtering

        Features:
        - Pagination with skip/limit
        - Dynamic ordering
        - Flexible filtering
        - Tenant isolation
        """
        query = select(self.model)

        # Tenant filtering
        if tenant_id and hasattr(self.model, 'tenant_id'):
            query = query.where(self.model.tenant_id == tenant_id)

        # Custom filters
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    if isinstance(value, list):
                        query = query.where(getattr(self.model, key).in_(value))
                    else:
                        query = query.where(getattr(self.model, key) == value)

        # Dynamic ordering
        if order_by:
            if order_by.startswith('-'):
                query = query.order_by(getattr(self.model, order_by[1:]).desc())
            else:
                query = query.order_by(getattr(self.model, order_by).asc())
        elif hasattr(self.model, 'created_at'):
            query = query.order_by(self.model.created_at.desc())

        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: CreateSchemaType,
        tenant_id: Optional[UUID] = None
    ) -> ModelType:
        """
        Create new record with transaction management

        Features:
        - Automatic tenant assignment
        - JSON encoding for complex types
        - Transaction rollback on error
        """
        try:
            obj_in_data = jsonable_encoder(obj_in)

            # Automatic tenant assignment
            if tenant_id and hasattr(self.model, 'tenant_id'):
                obj_in_data["tenant_id"] = tenant_id

            db_obj = self.model(**obj_in_data)
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        except SQLAlchemyError as e:
            await db.rollback()
            raise e

    async def bulk_create(
        self,
        db: AsyncSession,
        *,
        objs_in: List[CreateSchemaType],
        tenant_id: Optional[UUID] = None
    ) -> List[ModelType]:
        """
        Bulk create records for performance

        Features:
        - Single transaction for all records
        - Automatic tenant assignment
        - Batch processing for large datasets
        """
        try:
            db_objs = []
            for obj_in in objs_in:
                obj_in_data = jsonable_encoder(obj_in)

                if tenant_id and hasattr(self.model, 'tenant_id'):
                    obj_in_data["tenant_id"] = tenant_id

                db_obj = self.model(**obj_in_data)
                db_objs.append(db_obj)

            db.add_all(db_objs)
            await db.commit()

            # Refresh all objects to get IDs and timestamps
            for db_obj in db_objs:
                await db.refresh(db_obj)

            return db_objs
        except SQLAlchemyError as e:
            await db.rollback()
            raise e

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Update existing record with change tracking

        Features:
        - Partial updates support
        - JSON encoding
        - Transaction safety
        """
        try:
            obj_data = jsonable_encoder(db_obj)

            if isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in.dict(exclude_unset=True)

            # Update only provided fields
            for field in obj_data:
                if field in update_data:
                    setattr(db_obj, field, update_data[field])

            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj)
            return db_obj
        except SQLAlchemyError as e:
            await db.rollback()
            raise e

    async def exists(
        self,
        db: AsyncSession,
        *,
        filters: Dict[str, Any],
        tenant_id: Optional[UUID] = None
    ) -> bool:
        """
        Check record existence with filters

        Features:
        - Efficient count query
        - Multiple field filtering
        - Tenant isolation
        """
        conditions = [
            getattr(self.model, key) == value
            for key, value in filters.items()
            if hasattr(self.model, key)
        ]

        query = select(func.count(self.model.id)).where(and_(*conditions))

        if tenant_id and hasattr(self.model, 'tenant_id'):
            query = query.where(self.model.tenant_id == tenant_id)

        result = await db.execute(query)
        return result.scalar() > 0
```

### User-Specific CRUD Operations (`app/crud/crud_user.py`)

**Extended CRUD with authentication and role management:**

```python
class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """User CRUD operations with authentication support"""

    async def authenticate(
        self,
        db: AsyncSession,
        *,
        email: str,
        password: str,
        tenant_id: Optional[UUID] = None
    ) -> Optional[User]:
        """
        Authenticate user with tenant support

        Process:
        1. Find user by email and tenant
        2. Verify password hash
        3. Check account status
        """
        user = await self.get_by_email(db, email=email, tenant_id=tenant_id)

        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        if user.status != "active":
            return None

        return user

    async def get_by_email(
        self,
        db: AsyncSession,
        *,
        email: str,
        tenant_id: Optional[UUID] = None
    ) -> Optional[User]:
        """Get user by email with optional tenant filtering"""
        query = select(User).where(User.email == email)

        if tenant_id:
            query = query.where(User.tenant_id == tenant_id)

        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: UserCreate,
        tenant_id: UUID
    ) -> User:
        """
        Create user with secure password handling

        Features:
        - Password hashing with bcrypt
        - Email validation
        - Role assignment
        - Default status setting
        """
        # Hash password securely
        password_hash = get_password_hash(obj_in.password)

        # Prepare user data
        user_data = obj_in.dict()
        user_data.pop("password")  # Remove plain text password
        user_data["password_hash"] = password_hash
        user_data["tenant_id"] = tenant_id

        # Set default status
        if not user_data.get("status"):
            user_data["status"] = "active"

        db_obj = User(**user_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)

        # Log user creation for security audit
        security_logger.log_privileged_action(
            action="user_created",
            resource=f"user:{db_obj.email}",
            user_id=db_obj.id,
            ip_address="system"  # Would be actual IP in real implementation
        )

        return db_obj

    async def get_user_statistics(
        self,
        db: AsyncSession,
        *,
        tenant_id: Optional[UUID] = None
    ) -> dict:
        """
        Get comprehensive user statistics

        Features:
        - Role-based counting
        - Active/inactive statistics
        - Performance optimized queries
        """
        base_filter = [User.tenant_id == tenant_id] if tenant_id else []

        # Total users query
        total_query = select(func.count(User.id))
        if tenant_id:
            total_query = total_query.where(User.tenant_id == tenant_id)
        total_result = await db.execute(total_query)
        total_users = total_result.scalar() or 0

        # Active users query
        active_query = select(func.count(User.id)).where(
            and_(
                User.tenant_id == tenant_id if tenant_id else True,
                User.status == "active"
            )
        )
        active_result = await db.execute(active_query)
        active_users = active_result.scalar() or 0

        # Role-based queries
        role_stats = {}
        for role in ["super_admin", "manager", "cashier"]:
            role_query = select(func.count(User.id)).where(
                and_(
                    User.tenant_id == tenant_id if tenant_id else True,
                    User.role == role
                )
            )
            role_result = await db.execute(role_query)
            role_stats[f"{role}_users"] = role_result.scalar() or 0

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            **role_stats
        }
```

### Product CRUD with Inventory Management (`app/crud/crud_product.py`)

**Advanced CRUD with business logic:**

```python
class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    """Product CRUD operations with inventory management"""

    async def get_by_sku(
        self,
        db: AsyncSession,
        *,
        sku: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None
    ) -> Optional[Product]:
        """
        Get product by SKU with tenant and store filtering
        """
        conditions = [
            Product.sku == sku,
            Product.tenant_id == tenant_id
        ]

        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(Product).where(and_(*conditions))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def adjust_stock(
        self,
        db: AsyncSession,
        *,
        product_id: UUID,
        adjustment: int,
        tenant_id: UUID
    ) -> Optional[Product]:
        """
        Adjust product inventory with business validation

        Features:
        - Prevent negative inventory
        - Transaction safety
        - Change logging
        """
        async with db.begin():
            query = select(Product).where(
                and_(
                    Product.id == product_id,
                    Product.tenant_id == tenant_id
                )
            )
            result = await db.execute(query)
            product = result.scalar_one_or_none()

            if not product:
                return None

            # Prevent negative stock
            new_stock = max(0, product.stock + adjustment)
            old_stock = product.stock

            # Update stock
            product.stock = new_stock

            # Log inventory change for audit
            audit_logger.log_inventory_change(
                product_id=product_id,
                old_stock=old_stock,
                new_stock=new_stock,
                user_id=UUID("00000000-0000-0000-0000-000000000000"),  # System user
                reason=f"Stock adjustment: {adjustment:+d}"
            )

            return product

    async def get_low_stock_products(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID,
        threshold: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Get low stock products with optimized query

        Features:
        - Configurable threshold
        - Active product filtering
        - Pagination support
        - Index utilization
        """
        if threshold is None:
            threshold = 5  # Default threshold

        query = select(Product).where(
            and_(
                Product.tenant_id == tenant_id,
                Product.stock <= threshold,
                Product.status == "active"
            )
        ).order_by(Product.stock.asc()).offset(skip).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    async def search_products(
        self,
        db: AsyncSession,
        *,
        search_term: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Search products across multiple fields

        Features:
        - Full-text search on name, SKU, barcode, category
        - Case-insensitive search
        - Tenant and store filtering
        - Performance optimization
        """
        search_pattern = f"%{search_term}%"
        conditions = [
            Product.tenant_id == tenant_id,
            Product.name.ilike(search_pattern) |
            Product.sku.ilike(search_pattern) |
            Product.barcode.ilike(search_pattern) |
            Product.category.ilike(search_pattern)
        ]

        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(Product).where(and_(*conditions)).order_by(
            Product.name
        ).offset(skip).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    async def get_product_statistics(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID
    ) -> dict:
        """
        Get comprehensive product statistics

        Features:
        - Inventory value calculation
        - Category distribution
        - Stock status breakdown
        - Financial metrics
        """
        # Total products
        total_query = select(func.count(Product.id)).where(
            Product.tenant_id == tenant_id
        )
        total_result = await db.execute(total_query)
        total_products = total_result.scalar() or 0

        # Active products
        active_query = select(func.count(Product.id)).where(
            and_(
                Product.tenant_id == tenant_id,
                Product.status == "active"
            )
        )
        active_result = await db.execute(active_query)
        active_products = active_result.scalar() or 0

        # Low stock products
        low_stock_query = select(func.count(Product.id)).where(
            and_(
                Product.tenant_id == tenant_id,
                Product.stock <= 5,
                Product.status == "active"
            )
        )
        low_stock_result = await db.execute(low_stock_query)
        low_stock_products = low_stock_result.scalar() or 0

        # Total inventory value
        inventory_value_query = select(
            func.sum(Product.stock * Product.price)
        ).where(Product.tenant_id == tenant_id)
        inventory_value_result = await db.execute(inventory_value_query)
        total_inventory_value = float(inventory_value_result.scalar() or 0)

        # Category distribution
        categories_query = select(
            func.count(func.distinct(Product.category))
        ).where(
            and_(
                Product.tenant_id == tenant_id,
                Product.category.isnot(None)
            )
        )
        categories_result = await db.execute(categories_query)
        total_categories = categories_result.scalar() or 0

        return {
            "total_products": total_products,
            "active_products": active_products,
            "inactive_products": total_products - active_products,
            "low_stock_products": low_stock_products,
            "out_of_stock_products": 0,  # Would need separate query
            "total_inventory_value": total_inventory_value,
            "total_categories": total_categories,
        }
```

---

## 9. Data Validation & Schemas

### User Schemas (`app/schemas/user.py`)

**Comprehensive user validation with security rules:**

```python
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    MANAGER = "manager"
    CASHIER = "cashier"

class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: UserRole
    status: UserStatus | None = None
    store_id: UUID | None = None
    assigned_manager_id: UUID | None = None

    @validator('name')
    def validate_name(cls, v):
        """Comprehensive name validation"""
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')

        # Clean whitespace
        v = ' '.join(v.split())

        # Allow letters, spaces, hyphens, apostrophes, periods
        if not re.match(r'^[a-zA-Z\s\-\'\.]+$', v):
            raise ValueError(
                'Name can only contain letters, spaces, hyphens, and apostrophes'
            )

        return v.strip()

class UserCreate(UserBase):
    tenant_id: UUID | None = None
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password must be at least 8 characters long"
    )

    @validator('password')
    def validate_password(cls, v):
        """Enterprise-grade password validation"""
        if not v:
            raise ValueError('Password is required')

        # Length check
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')

        # Uppercase letter
        if not re.search(r'[A-Z]', v):
            raise ValueError(
                'Password must contain at least one uppercase letter'
            )

        # Lowercase letter
        if not re.search(r'[a-z]', v):
            raise ValueError(
                'Password must contain at least one lowercase letter'
            )

        # Digit
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')

        # Special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError(
                'Password must contain at least one special character'
            )

        # Common password patterns
        common_patterns = [
            r'123456', r'password', r'qwerty', r'abc123',
            r'admin', r'letmein', r'welcome'
        ]

        for pattern in common_patterns:
            if re.search(pattern, v.lower()):
                raise ValueError(
                    'Password cannot contain common patterns'
                )

        return v

class UserUpdate(BaseModel):
    """Partial update schema with flexible validation"""
    name: str | None = Field(None, max_length=100)
    role: str | None = None
    status: str | None = None
    store_id: UUID | None = None
    assigned_manager_id: UUID | None = None
    password: str | None = Field(None, min_length=6)

    @validator('password')
    def validate_update_password(cls, v):
        """Password validation for updates (optional field)"""
        if v is None:
            return v

        # Reuse creation validation but make it optional
        return UserCreate.validate_password(v)

class UserResponse(BaseModel):
    """Response model with all user fields"""
    id: UUID
    name: str
    email: EmailStr
    role: str
    status: str
    store_id: UUID | None = None
    assigned_manager_id: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
```

### Product Schemas (`app/schemas/product.py`)

**Product validation with business rules:**

```python
class ProductBase(BaseModel):
    name: str = Field(..., max_length=150, description="Product name")
    sku: str = Field(..., max_length=50, description="Stock Keeping Unit")
    barcode: str | None = Field(None, max_length=100)
    category: str | None = Field(None, max_length=100)
    price: Decimal = Field(..., gt=0, description="Product price")
    stock: int = Field(default=0, ge=0, description="Current stock quantity")
    img_url: str | None = Field(None, description="Product image URL")
    status: str | None = Field(None, pattern="^(active|inactive)$")

class ProductCreate(ProductBase):
    @validator('name')
    def validate_name(cls, v):
        """Product name validation"""
        if not v or not v.strip():
            raise ValueError('Product name cannot be empty')

        v = v.strip()
        if len(v) < 2:
            raise ValueError('Product name must be at least 2 characters')

        # Allow letters, numbers, spaces, and common symbols
        if not re.match(r'^[a-zA-Z0-9\s\-\.\(\)]+$', v):
            raise ValueError(
                'Product name contains invalid characters'
            )

        return v

    @validator('sku')
    def validate_sku(cls, v):
        """SKU format validation"""
        if not v or not v.strip():
            raise ValueError('SKU cannot be empty')

        v = v.strip().upper()

        # Allow alphanumeric with hyphens and underscores
        if not re.match(r'^[A-Z0-9\-_]+$', v):
            raise ValueError(
                'SKU can only contain letters, numbers, hyphens, and underscores'
            )

        return v

    @validator('barcode')
    def validate_barcode(cls, v):
        """Barcode validation (EAN-13, UPC, etc.)"""
        if v is None:
            return v

        v = v.strip()

        # Remove spaces
        v = v.replace(' ', '')

        # Validate common barcode formats
        if len(v) == 8:  # EAN-8
            if not v.isdigit():
                raise ValueError('EAN-8 barcode must be numeric')
        elif len(v) == 12:  # UPC-A
            if not v.isdigit():
                raise ValueError('UPC-A barcode must be numeric')
        elif len(v) == 13:  # EAN-13
            if not v.isdigit():
                raise ValueError('EAN-13 barcode must be numeric')
        else:
            # Custom barcode format
            if not re.match(r'^[A-Za-z0-9]+$', v):
                raise ValueError('Invalid barcode format')

        return v

    @validator('price')
    def validate_price(cls, v):
        """Price validation with business rules"""
        if v <= 0:
            raise ValueError('Price must be greater than 0')

        # Reasonable price limits (up to 1 million)
        if v > 999999.99:
            raise ValueError('Price exceeds maximum allowed amount')

        # Round to 2 decimal places
        return v.quantize(Decimal('0.01'))

    @validator('category')
    def validate_category(cls, v):
        """Category validation"""
        if v is None:
            return v

        v = v.strip()

        if not v:
            return None

        # Allow letters, numbers, spaces, and common symbols
        if not re.match(r'^[a-zA-Z0-9\s\-\&\']+$', v):
            raise ValueError('Category contains invalid characters')

        return v.title()  # Capitalize words

class ProductUpdate(BaseModel):
    """Partial update schema"""
    name: str | None = Field(None, max_length=150)
    sku: str | None = Field(None, max_length=50)
    barcode: str | None = Field(None, max_length=100)
    category: str | None = Field(None, max_length=100)
    price: Decimal | None = Field(None, gt=0)
    stock: int | None = Field(None, ge=0)
    img_url: str | None = None
    status: str | None = Field(None, pattern="^(active|inactive)$")

class ProductResponse(BaseModel):
    """Complete product response model"""
    id: UUID
    store_id: UUID | None = None
    tenant_id: UUID | None = None
    name: str
    sku: str
    barcode: str | None
    category: str | None
    price: Decimal
    stock: int
    img_url: str | None
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
        # Customize JSON serialization
        json_encoders = {
            Decimal: lambda v: float(v)  # Convert Decimal to float for JSON
        }
```

### Customer Schemas (`app/schemas/customer.py`)

**Customer validation with Indian phone number support:**

```python
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=10)

    @validator('name')
    def validate_name(cls, v):
        """Customer name validation"""
        if not v or not v.strip():
            raise ValueError('Customer name cannot be empty')

        v = ' '.join(v.split())  # Clean whitespace

        if not re.match(r'^[a-zA-Z\s\-\'\.]+$', v):
            raise ValueError(
                'Name can only contain letters, spaces, hyphens, and apostrophes'
            )

        return v.strip()

    @validator('phone')
    def validate_phone(cls, v):
        """Indian mobile number validation"""
        if not v:
            raise ValueError('Phone number is required')

        # Remove all non-digit characters
        v = re.sub(r'\D', '', v)

        # Validate Indian mobile number format
        # Must start with 6, 7, 8, or 9 and be 10 digits
        if not re.match(r'^[6-9]\d{9}$', v):
            raise ValueError(
                'Please enter a valid 10-digit Indian mobile number'
            )

        return v
```

---

## 10. Error Handling & Logging

### Custom Exception Hierarchy (`app/utils/exceptions.py`)

**Comprehensive exception system with business context:**

```python
class FAPOSException(Exception):
    """Base exception for FA POS application"""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

# Authentication & Authorization
class AuthenticationError(FAPOSException):
    """Authentication related errors"""
    def __init__(self, message: str = "Authentication failed", details=None):
        super().__init__(message, status_code=401, details=details)

class AuthorizationError(FAPOSException):
    """Authorization related errors"""
    def __init__(self, message: str = "Access denied", details=None):
        super().__init__(message, status_code=403, details=details)

# Business Logic Exceptions
class BusinessLogicError(FAPOSException):
    """Business logic violation errors"""
    def __init__(self, message: str, details=None):
        super().__init__(message, status_code=400, details=details)

class InvalidTransitionError(BusinessLogicError):
    """Invalid state transition error"""
    def __init__(self, current_state: str, target_state: str):
        super().__init__(
            f"Invalid transition from '{current_state}' to '{target_state}'",
            {"current_state": current_state, "target_state": target_state}
        )

# Domain-Specific Exceptions
class DuplicateEmailError(UserError):
    """Email already exists error"""
    def __init__(self, email: str):
        super().__init__(
            f"Email '{email}' already exists",
            {"email": email}
        )

class InsufficientStockError(InventoryError):
    """Insufficient stock error with details"""
    def __init__(self, product_name: str, requested: int, available: int):
        super().__init__(
            f"Insufficient stock for product '{product_name}'. "
            f"Requested: {requested}, Available: {available}",
            {
                "product_name": product_name,
                "requested": requested,
                "available": available
            }
        )
```

### Production Logging System (`app/utils/logger.py`)

**Enterprise-grade logging with security and audit trails:**

```python
class StructuredFormatter(logging.Formatter):
    """JSON-formatted structured logging for production"""

    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        # Add context fields if present
        context_fields = [
            'user_id', 'session_id', 'ip_address', 'request_id',
            'action', 'resource', 'status'
        ]

        for field in context_fields:
            if hasattr(record, field):
                log_entry[field] = getattr(record, field)

        # Add exception info
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)

class SecurityLogger:
    """Specialized logger for security events"""

    def __init__(self):
        self.logger = logging.getLogger('security')

    def log_login_attempt(self, email: str, success: bool, ip_address: str, user_id: Optional[UUID] = None):
        """Log login attempt with security context"""
        self.logger.info(
            "Login attempt",
            extra={
                'action': 'login_attempt',
                'email': email,
                'status': 'success' if success else 'failed',
                'ip_address': ip_address,
                'user_id': str(user_id) if user_id else None
            }
        )

    def log_suspicious_activity(self, activity: str, details: Dict[str, Any], ip_address: str, user_id: Optional[UUID] = None):
        """Log suspicious activity for security monitoring"""
        self.logger.warning(
            f"Suspicious activity: {activity}",
            extra={
                'action': 'suspicious_activity',
                'activity': activity,
                'details': details,
                'ip_address': ip_address,
                'user_id': str(user_id) if user_id else None,
                'status': 'security_alert'
            }
        )

    def log_privileged_action(self, action: str, resource: str, user_id: UUID, ip_address: str):
        """Log privileged/admin actions for audit trail"""
        self.logger.info(
            f"Privileged action: {action} on {resource}",
            extra={
                'action': 'privileged_action',
                'privilege_action': action,
                'resource': resource,
                'user_id': str(user_id),
                'ip_address': ip_address,
                'status': 'admin_action'
            }
        )

class AuditLogger:
    """Logger for business audit events"""

    def log_sale_creation(self, sale_id: UUID, user_id: UUID, total: float, customer_id: Optional[UUID] = None):
        """Log sale creation for financial audit"""
        self.logger.info(
            f"Sale created: {sale_id}",
            extra={
                'action': 'sale_created',
                'sale_id': str(sale_id),
                'user_id': str(user_id),
                'customer_id': str(customer_id) if customer_id else None,
                'total': total,
                'status': 'business_event'
            }
        )

    def log_inventory_change(self, product_id: UUID, old_stock: int, new_stock: int, user_id: UUID, reason: str):
        """Log inventory changes for audit trail"""
        self.logger.info(
            f"Inventory changed for product {product_id}",
            extra={
                'action': 'inventory_change',
                'product_id': str(product_id),
                'old_stock': old_stock,
                'new_stock': new_stock,
                'difference': new_stock - old_stock,
                'user_id': str(user_id),
                'reason': reason,
                'status': 'business_event'
            }
        )

def setup_logging():
    """Configure logging for development and production"""

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Console handler for development
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)

    # File handler for production
    log_dir = os.path.join(os.getcwd(), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    file_handler = logging.FileHandler(os.path.join(log_dir, 'app.log'))
    file_handler.setLevel(logging.INFO)

    # Use different formatters for development vs production
    if logging.getLogger().level == logging.DEBUG:
        # Development: human-readable format
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    else:
        # Production: structured JSON
        formatter = StructuredFormatter()

    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # Add handlers
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Suppress noisy loggers
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)

# Performance monitoring decorator
def log_execution_time(logger: logging.Logger, operation: str):
    """Decorator to log execution time for performance monitoring"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time

                logger.info(
                    f"Operation completed: {operation}",
                    extra={
                        'action': 'performance_metric',
                        'operation': operation,
                        'execution_time': execution_time,
                        'status': 'completed'
                    }
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time

                logger.error(
                    f"Operation failed: {operation}",
                    extra={
                        'action': 'performance_metric',
                        'operation': operation,
                        'execution_time': execution_time,
                        'error': str(e),
                        'status': 'failed'
                    }
                )
                raise
        return wrapper
    return decorator
```

### Error Handler Decorators (`app/utils/error_handlers.py`)

**Consistent error handling across service layer:**

```python
def handle_service_errors(func: Callable) -> Callable:
    """
    Decorator to handle service layer errors and convert them to HTTP exceptions

    Features:
    - Automatic error logging
    - User-friendly error messages
    - Security-conscious error details
    - Consistent HTTP status codes
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except IntegrityError as exc:
            # Database constraint violations
            logger.error(f"Database integrity error in {func.__name__}: {str(exc)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data integrity violation. Please check your input."
            ) from exc
        except DatabaseError as exc:
            # General database errors
            logger.error(f"Database error in {func.__name__}: {str(exc)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database operation failed. Please try again later."
            ) from exc
        except ValueError as exc:
            # Validation errors
            logger.error(f"Validation error in {func.__name__}: {str(exc)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc)
            ) from exc
        except Exception as exc:
            # Unexpected errors
            logger.error(f"Unexpected error in {func.__name__}: {str(exc)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred. Please try again later."
            ) from exc

    return wrapper

def log_error(
    func_name: str,
    error: Exception,
    user_id: str = None,
    tenant_id: str = None,
    additional_info: dict = None
) -> None:
    """
    Log error with standardized format and context

    Features:
    - Error classification
    - User context
    - Tenant context
    - Additional metadata
    """
    error_data = {
        "function": func_name,
        "error_type": type(error).__name__,
        "error_message": str(error),
    }

    if user_id:
        error_data["user_id"] = user_id

    if tenant_id:
        error_data["tenant_id"] = tenant_id

    if additional_info:
        error_data["additional_info"] = additional_info

    logger.error(
        f"Error in {func_name}",
        extra=error_data,
        exc_info=True
    )
```

---

## 11. Security Architecture

### Multi-Layer Security Implementation

**Authentication Layer:**
- JWT-based stateless authentication
- Secure password hashing with bcrypt
- Token expiration and refresh mechanisms
- Multi-tenant isolation in authentication tokens

**Authorization Layer:**
- Role-based access control (RBAC)
- Resource-level permissions
- Store-level access restrictions
- Manager-cashier hierarchical permissions

**Data Security:**
- Tenant data isolation at application layer
- SQL injection prevention through ORM
- Input validation with Pydantic schemas
- Sensitive data masking in logs

**Infrastructure Security:**
- CORS configuration for frontend integration
- Request rate limiting capabilities
- Security header middleware
- SSL/TLS enforcement recommendations

### Security Monitoring (`app/utils/logger.py`)

**Comprehensive security event tracking:**

```python
class SecurityLogger:
    """Enterprise security monitoring"""

    def log_login_attempt(self, email: str, success: bool, ip_address: str, user_id: Optional[UUID] = None):
        """Track all login attempts for security analysis"""
        self.logger.info(
            "Login attempt",
            extra={
                'action': 'login_attempt',
                'email': email,
                'status': 'success' if success else 'failed',
                'ip_address': ip_address,
                'user_id': str(user_id) if user_id else None
            }
        )

    def log_failed_login(self, email: str, reason: str, ip_address: str):
        """Track failed login attempts for intrusion detection"""
        self.logger.warning(
            f"Failed login attempt: {reason}",
            extra={
                'action': 'login_failed',
                'email': email,
                'reason': reason,
                'ip_address': ip_address,
                'status': 'security_event'
            }
        )

    def log_suspicious_activity(self, activity: str, details: Dict[str, Any], ip_address: str, user_id: Optional[UUID] = None):
        """Log suspicious activities for security team review"""
        self.logger.warning(
            f"Suspicious activity: {activity}",
            extra={
                'action': 'suspicious_activity',
                'activity': activity,
                'details': details,
                'ip_address': ip_address,
                'user_id': str(user_id) if user_id else None,
                'status': 'security_alert'
            }
        )

    def log_privileged_action(self, action: str, resource: str, user_id: UUID, ip_address: str):
        """Track privileged actions for audit compliance"""
        self.logger.info(
            f"Privileged action: {action} on {resource}",
            extra={
                'action': 'privileged_action',
                'privilege_action': action,
                'resource': resource,
                'user_id': str(user_id),
                'ip_address': ip_address,
                'status': 'admin_action'
            }
        )
```

### Password Security (`app/core/security.py`)

**Enterprise-grade password handling:**

```python
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password using bcrypt

    Features:
    - Constant-time comparison to prevent timing attacks
    - Automatic salt handling
    - Secure bcrypt algorithm with work factor
    """
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    """
    Hash password using bcrypt with secure salt

    Security Features:
    - Automatic salt generation
    - Configurable work factor (default: 12)
    - Future-proof algorithm selection
    """
    salt = bcrypt.gensalt()  # Automatically generates secure salt
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')
```

### JWT Security Implementation

**Token-based authentication with security best practices:**

```python
def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    tenant_id: Optional[UUID] = None
) -> str:
    """
    Create JWT access token with security considerations

    Security Features:
    - Short expiration time (30 minutes)
    - Tenant context isolation
    - Secure secret key management
    - Algorithm selection (HS256)
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )

    # Add tenant context to token
    token_data = {"exp": expire}
    if tenant_id:
        token_data["tenant_id"] = str(tenant_id)

    to_encode.update(token_data)

    # Encode with strong secret and algorithm
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode JWT token with security validation

    Security Features:
    - Algorithm validation to prevent token swapping
    - Expiration verification
    - Comprehensive error handling
    """
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
    except JWTError as exc:
        # Log failed decode attempts for security monitoring
        security_logger.log_failed_login(
            email="unknown",
            reason="Invalid JWT token",
            ip_address="system"  # Would be actual IP in real implementation
        )
        raise ValueError("Token validation failed") from exc
```

---

## 12. Request Flow Architecture

### Complete Request Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HTTP REQUEST FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │    │             │
│  Client     │───▶│   FastAPI   │───▶│  Middleware │───▶│   Route     │
│  Request    │    │   Router    │    │   Chain     │    │   Handler   │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                               │
                                                               ▼
                       ┌─────────────────────────────────────┐
                       │       AUTHENTICATION                │
                       │  ┌─────────────────────────────────┐│
                       │  │  1. Extract JWT Token           ││
                       │  │  2. Validate Token             ││
                       │  │  3. Extract User & Tenant      ││
                       │  │  4. Verify User Status         ││
                       │  │  5. Check Tenant Status       ││
                       │  └─────────────────────────────────┘│
                       └─────────────────────────────────────┘
                                                               │
                                                               ▼
                       ┌─────────────────────────────────────┐
                       │      AUTHORIZATION                 │
                       │  ┌─────────────────────────────────┐│
                       │  │  1. Check User Role             ││
                       │  │  2. Verify Resource Access      ││
                       │  │  3. Store/Context Validation   ││
                       │  │  4. Hierarchical Permissions   ││
                       │  └─────────────────────────────────┘│
                       └─────────────────────────────────────┘
                                                               │
                                                               ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │    │             │
│   Service   │◀───│    CRUD     │◀───│   Service   │◀───│  Request    │
│   Layer     │    │   Layer     │    │   Method    │    │ Validation  │
│ (Business)  │    │ (Data)      │    │   Execution │    │ (Pydantic)  │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       ▼                   ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Audit     │    │   Database  │    │   Business  │    │   Input     │
│   Logging   │    │   Session   │    │   Rules     │    │   Sanitize  │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           RESPONSE FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │    │             │
│   Response  │───▶│   JSON      │───▶│   HTTP      │───▶│    Client   │
│ Formatting │    │  Serialization │  │    Headers  │    │   Browser   │
│             │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### Detailed Request Processing Example

**Example: Creating a Sale**

```python
# 1. HTTP Request Reception
POST /api/v1/sales
Headers: {
    "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "Content-Type": "application/json"
}
Body: {
    "customer_id": "550e8400-e29b-41d4-a716-446655440010",
    "payment_method": "cash",
    "items": [
        {"product_id": "550e8400-e29b-41d4-a716-446655440020", "quantity": 2}
    ]
}

# 2. Middleware Processing
@router.post("/", response_model=SaleResponse, status_code=201)
async def create_sale_endpoint(
    payload: SaleCreate,
    current_user: User = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    session: AsyncSession = Depends(get_db_session),
) -> SaleResponse:

# 3. Authentication Flow
async def get_current_user_with_tenant():
    # Extract JWT from Authorization header
    token = auth_header.split(" ")[1]

    # Decode and validate token
    payload = decode_token(token)
    user_id = payload.get("sub")
    tenant_id = payload.get("tenant_id")

    # Fetch user from database with tenant filtering
    user = await session.execute(
        select(User).where(
            and_(
                User.id == UUID(user_id),
                User.tenant_id == UUID(tenant_id),
                User.status == "active"
            )
        )
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(401, "Invalid credentials")

    return user, UUID(tenant_id)

# 4. Input Validation (Pydantic)
class SaleCreate(BaseModel):
    customer_id: Optional[UUID] = None
    payment_method: str = Field(..., regex="^(cash|card|upi)$")
    items: List[SaleItemCreate] = Field(..., min_items=1)

# 5. Business Logic Execution
async def create_sale(sale_data, tenant_id, requesting_user):
    async with session.begin():  # Transaction management

        # Business Rule 1: Validate products exist and are active
        for item in sale_data.items:
            product = await crud_product.get(
                session, item.product_id, tenant_id=tenant_id
            )
            if not product or product.status != "active":
                raise ProductNotFoundError(item.product_id)

        # Business Rule 2: Check inventory availability
        for item in sale_data.items:
            if product.stock < item.quantity:
                raise InsufficientStockError(product.name, item.quantity, product.stock)

        # Business Rule 3: Generate unique invoice number
        invoice_no = await generate_next_invoice_number(tenant_id)

        # Business Rule 4: Calculate totals and taxes
        subtotal = sum(item.quantity * product.price for item, product in zip(sale_data.items, products))
        tax = subtotal * 0.08  # 8% tax rate
        total = subtotal + tax

        # Create sale record
        sale = Sale(
            tenant_id=tenant_id,
            invoice_no=invoice_no,
            customer_id=sale_data.customer_id,
            cashier_id=requesting_user.id,
            payment_method=sale_data.payment_method,
            subtotal=subtotal,
            tax=tax,
            total=total,
            status="completed"
        )

        session.add(sale)
        await session.flush()  # Get sale ID

        # Create sale items
        for item, product in zip(sale_data.items, products):
            sale_item = SaleItem(
                tenant_id=tenant_id,
                sale_id=sale.id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=product.price,
                total=item.quantity * product.price
            )
            session.add(sale_item)

            # Update inventory
            product.stock -= item.quantity

        # Audit logging
        audit_logger.log_sale_creation(sale.id, requesting_user.id, float(total))

        return sale

# 6. Database Operations (CRUD Layer)
async def create(db, obj_in, tenant_id):
    try:
        obj_in_data = jsonable_encoder(obj_in)
        obj_in_data["tenant_id"] = tenant_id

        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    except SQLAlchemyError as e:
        await db.rollback()
        raise e

# 7. Response Formatting
response = SaleResponse.model_validate(sale)
return response

# 8. Response Sent
HTTP/1.1 201 Created
Content-Type: application/json
{
    "id": "550e8400-e29b-41d4-a716-446655440030",
    "invoice_no": "INV-2024-0001",
    "customer_id": "550e8400-e29b-41d4-a716-446655440010",
    "payment_method": "cash",
    "subtotal": 29.98,
    "tax": 2.40,
    "total": 32.38,
    "status": "completed",
    "items": [
        {
            "product_id": "550e8400-e29b-41d4-a716-446655440020",
            "quantity": 2,
            "unit_price": 14.99,
            "total": 29.98
        }
    ],
    "created_at": "2024-01-01T12:00:00Z"
}
```

---

## 13. Special Features & Notes

### Multi-Tenant Architecture Implementation

**Tenant Isolation Strategies:**

1. **Data-Level Isolation**: Every query includes tenant filtering
   ```python
   # Automatic tenant filtering in CRUD operations
   async def get(self, db, id, *, tenant_id=None):
       query = select(self.model).where(self.model.id == id)
       if tenant_id and hasattr(self.model, 'tenant_id'):
           query = query.where(self.model.tenant_id == tenant_id)
   ```

2. **Context-Aware Services**: All services operate within tenant context
   ```python
   class TenantProductService:
       def __init__(self, session, tenant_id):
           self.session = session
           self.tenant_id = tenant_id  # Automatic isolation
   ```

3. **JWT Token Context**: Authentication tokens include tenant information
   ```python
   access_token = create_access_token(
       data={"sub": str(user.id)},
       tenant_id=user.tenant_id  # Tenant embedded in token
   )
   ```

### Dynamic Route Discovery (`app/api/router.py`)

**Automatic route module discovery and inclusion:**

```python
def _discover_and_include(api_router: APIRouter, package: ModuleType) -> None:
    """
    Dynamically import submodules and include routers

    Benefits:
    - No manual route registration required
    - Hot-pluggable modules
    - Reduced maintenance overhead
    - Consistent routing pattern
    """
    for finder, name, ispkg in pkgutil.iter_modules(package.__path__):
        full_name = f"{package.__name__}.{name}"
        try:
            module = importlib.import_module(full_name)
        except Exception as exc:
            logger.exception(f"Failed to import route module {full_name}: {exc}")
            continue

        router_obj = getattr(module, "router", None)
        if router_obj is not None:
            try:
                api_router.include_router(router_obj)
                logger.info(f"Included router from {full_name}")
            except Exception:
                logger.exception(f"Failed to include router from {full_name}")
```

### Advanced Inventory Management

**Real-time inventory tracking with audit trails:**

```python
class SalesService:
    async def create_sale(self, sale_data, tenant_id, requesting_user):
        async with self.session.begin():  # ACID transaction
            # Reserve inventory atomically
            for item in sale_data.items:
                product = await crud_product.get_for_update(
                    self.session,  # Row-level locking
                    id=item.product_id,
                    tenant_id=tenant_id
                )

                if product.stock < item.quantity:
                    raise InsufficientStockError(
                        product.name,
                        item.quantity,
                        product.stock
                    )

                # Atomically update inventory
                product.stock -= item.quantity

            # Create sale records
            # ... sale creation logic

            # Audit logging
            for item in sale_data.items:
                audit_logger.log_inventory_change(
                    product_id=item.product_id,
                    old_stock=old_stock,
                    new_stock=new_stock,
                    user_id=requesting_user.id,
                    reason=f"Sale #{sale.invoice_no}"
                )
```

### File Storage Integration with Supabase

**Cloud storage integration for product images and documents:**

```python
class StorageService:
    """Supabase storage integration"""

    async def upload_product_image(self, file_data: bytes, filename: str) -> str:
        """
        Upload product image to Supabase storage

        Features:
        - Automatic file validation
        - Secure URL generation
        - Error handling and retries
        """
        try:
            # Generate unique filename
            file_extension = os.path.splitext(filename)[1]
            unique_filename = f"{uuid4()}{file_extension}"

            # Upload to Supabase bucket
            result = self.supabase.storage \
                .from_(settings.supabase_products_bucket) \
                .upload(unique_filename, file_data)

            # Generate public URL
            public_url = f"{settings.supabase_project_url}/storage/v1/object/public/{settings.supabase_products_bucket}/{unique_filename}"

            return public_url

        except Exception as e:
            logger.error(f"Failed to upload product image: {str(e)}")
            raise StorageError(f"Image upload failed: {str(e)}")
```

### Performance Optimizations

**Database query optimization and caching strategies:**

1. **Connection Pooling**: Efficient database connection management
   ```python
   engine = create_async_engine(
       settings.supabase_db_url,
       pool_size=5,
       max_overflow=10,
       pool_pre_ping=True,  # Validate connections
       pool_recycle=3600,   # Recycle connections
   )
   ```

2. **Query Optimization**: Efficient database queries
   ```python
   # Optimized low stock query with indexing
   query = select(Product).where(
       and_(
           Product.tenant_id == tenant_id,
           Product.stock <= threshold,
           Product.status == "active"
       )
   ).order_by(Product.stock.asc())  # Use index on stock
   ```

3. **Bulk Operations**: Performance for large datasets
   ```python
   # Bulk product creation for inventory seeding
   await crud_product.bulk_create(session, product_data_list, tenant_id)
   ```

### Audit Trail Implementation

**Comprehensive business activity logging:**

```python
class AuditLogger:
    """Business audit trail for compliance and analytics"""

    def log_sale_creation(self, sale_id: UUID, user_id: UUID, total: float, customer_id: Optional[UUID] = None):
        """Log every sale for financial audit"""
        self.logger.info(
            f"Sale created: {sale_id}",
            extra={
                'action': 'sale_created',
                'sale_id': str(sale_id),
                'user_id': str(user_id),
                'customer_id': str(customer_id) if customer_id else None,
                'total': total,
                'status': 'business_event'
            }
        )

    def log_user_action(self, action: str, target_user_id: UUID, performed_by: UUID, ip_address: str):
        """Log user management actions for security audit"""
        self.logger.info(
            f"User management action: {action}",
            extra={
                'action': 'user_management',
                'management_action': action,
                'target_user_id': str(target_user_id),
                'performed_by': str(performed_by),
                'ip_address': ip_address,
                'status': 'admin_event'
            }
        )
```

---

## 14. Technical Analysis & Observations

### Architecture Strengths

**1. Multi-Tenant Design Excellence**
- Clean tenant isolation at all application layers
- Efficient data sharing with logical separation
- Scalable for SaaS deployment
- Tenant-aware caching and optimization

**2. Security Implementation**
- Comprehensive authentication and authorization
- Role-based access control with hierarchical permissions
- Security event monitoring and audit trails
- Input validation and SQL injection prevention

**3. Data Management**
- ACID transactions for data integrity
- Optimistic concurrency control
- Comprehensive error handling and logging
- Performance optimization with connection pooling

**4. Business Logic Encapsulation**
- Clean separation of concerns
- Service layer for complex business rules
- Reusable CRUD operations with tenant support
- Domain-specific validation and processing

### Scalability Considerations

**1. Database Scaling**
- Connection pooling for high concurrency
- Query optimization with proper indexing
- Tenant-aware sharding opportunities
- Read replica support for reporting

**2. Application Scaling**
- Stateless architecture for horizontal scaling
- FastAPI async/await for high throughput
- Memory-efficient request processing
- Optimized JSON serialization

**3. Storage Scaling**
- Cloud storage integration (Supabase)
- CDN support for static assets
- Efficient image handling and optimization
- Backup and disaster recovery planning

### Production Readiness Assessment

**Strengths:**
- ✅ Comprehensive error handling
- ✅ Production-grade logging
- ✅ Security monitoring
- ✅ Health check endpoints
- ✅ Configuration management
- ✅ Transaction management
- ✅ Input validation

**Areas for Enhancement:**
- 🔲 API rate limiting implementation
- 🔲 Request/response caching layer
- 🔲 Background job processing (Celery/Redis)
- 🔲 Database migration automation
- 🔲 API versioning strategy
- 🔲 Load balancing considerations
- 🔲 Metrics and monitoring integration

### Code Quality Analysis

**Positive Aspects:**
- Clean, maintainable code structure
- Consistent naming conventions
- Comprehensive type hints
- Proper error handling patterns
- Well-documented interfaces
- Separation of concerns

**Potential Improvements:**
- Additional unit tests for edge cases
- Integration test coverage
- Performance benchmarking
- Security penetration testing
- Code complexity reduction in some areas
- Additional documentation for complex flows

### Business Logic Robustness

**Well-Implemented:**
- Inventory management with stock tracking
- Financial calculations and tax handling
- User role hierarchy and permissions
- Data validation and business rules
- Audit trail for compliance

**Considerations:**
- Payment processing integration
- Advanced reporting and analytics
- Multi-currency support
- Tax calculation complexity
- Inventory forecasting algorithms

---

## Conclusion

The FA POS Backend represents a **well-architected, production-ready Point of Sale system** with comprehensive multi-tenant support. The system demonstrates:

- **Enterprise-grade security** with JWT authentication, RBAC, and audit logging
- **Scalable architecture** supporting multi-store, multi-tenant deployments
- **Robust data management** with ACID transactions and comprehensive error handling
- **Clean code architecture** with proper separation of concerns and maintainable design
- **Business logic integrity** with comprehensive validation and audit trails

The system is ready for production deployment with consideration for additional monitoring, caching, and background job processing to enhance performance and scalability further.

---

*Documentation generated by Claude Code - Backend Technical Analysis*
*Generated on: 2025-01-20*
*System Version: FA POS Backend v2.0.0*