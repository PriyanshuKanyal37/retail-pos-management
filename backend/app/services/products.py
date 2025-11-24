from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreate, ProductUpdate


class ProductError(Exception):
    """Base class for product-related errors."""


class DuplicateSKUError(ProductError):
    """Raised when SKU already exists."""


class DuplicateBarcodeError(ProductError):
    """Raised when barcode already exists."""


class ProductNotFoundError(ProductError):
    """Raised when product is not found."""


class UnauthorizedProductAccessError(ProductError):
    """Raised when product access is not permitted for the current user."""


def resolve_product_owner_id(user: User) -> UUID:
    """
    Determine which super admin/manager owns the products a user may access.
    Super admins and managers can access their own catalogue; cashiers inherit their manager's catalogue.
    """
    if user.role in ["super_admin", "manager"]:
        return user.id
    if user.role == "cashier":
        if not user.manager_id:
            raise UnauthorizedProductAccessError("Cashier is not assigned to a manager")
        return user.manager_id
    raise UnauthorizedProductAccessError("Unsupported role for product access")


def get_product_by_sku(session: Session, sku: str) -> Product | None:
    """Get a product by SKU."""
    statement = select(Product).where(Product.sku == sku)
    result = session.execute(statement)
    return result.scalar_one_or_none()


def get_product_by_barcode(session: Session, barcode: str) -> Product | None:
    """Get a product by barcode."""
    statement = select(Product).where(Product.barcode == barcode)
    result = session.execute(statement)
    return result.scalar_one_or_none()


def list_products(session: Session, *, owner_id: UUID) -> Sequence[Product]:
    """Get all products owned by a specific super admin/manager ordered by name."""
    statement = (
        select(Product)
        .where(Product.owner_id == owner_id)
        .order_by(Product.name.asc())
    )
    result = session.execute(statement)
    return result.scalars().all()


def get_product(session: Session, product_id: UUID) -> Product | None:
    """Get a single product by ID (without ownership filtering)."""
    statement = select(Product).where(Product.id == product_id)
    result = session.execute(statement)
    return result.scalar_one_or_none()


def get_product_for_owner(
    session: Session, product_id: UUID, owner_id: UUID
) -> Product | None:
    """Retrieve a product ensuring it belongs to the specified owner."""
    statement = select(Product).where(
        Product.id == product_id,
        Product.owner_id == owner_id,
    )
    result = session.execute(statement)
    return result.scalar_one_or_none()


def create_product(
    session: Session,
    payload: ProductCreate,
    *,
    owner_id: UUID,
) -> Product:
    """Create a new product."""
    # Check for duplicate SKU
    existing = get_product_by_sku(session, payload.sku)
    if existing:
        raise DuplicateSKUError(f"Product with SKU '{payload.sku}' already exists")

    # Check for duplicate barcode if provided
    if payload.barcode:
        existing = get_product_by_barcode(session, payload.barcode)
        if existing:
            raise DuplicateBarcodeError(f"Product with barcode '{payload.barcode}' already exists")

    product = Product(
        name=payload.name,
        sku=payload.sku,
        barcode=payload.barcode,
        category=payload.category,
        price=payload.price,
        stock=payload.stock,
        img_url=payload.img_url,
        status=payload.status or "active",
        owner_id=owner_id,
    )
    session.add(product)

    try:
        session.commit()
        session.refresh(product)
    except IntegrityError as exc:
        session.rollback()
        if "sku" in str(exc).lower():
            raise DuplicateSKUError(f"Product with SKU '{payload.sku}' already exists") from exc
        elif "barcode" in str(exc).lower():
            raise DuplicateBarcodeError(f"Product with barcode '{payload.barcode}' already exists") from exc
        raise ProductError("Failed to create product") from exc

    return product


def update_product(
    session: Session,
    product_id: UUID,
    payload: ProductUpdate,
    *,
    owner_id: UUID,
) -> Product | None:
    """Update an existing product."""
    product = get_product_for_owner(session, product_id, owner_id)
    if not product:
        return None

    # Check for duplicate SKU if updating
    if payload.sku and payload.sku != product.sku:
        existing = get_product_by_sku(session, payload.sku)
        if existing:
            raise DuplicateSKUError(f"Product with SKU '{payload.sku}' already exists")

    # Check for duplicate barcode if updating
    if payload.barcode and payload.barcode != product.barcode:
        existing = get_product_by_barcode(session, payload.barcode)
        if existing:
            raise DuplicateBarcodeError(f"Product with barcode '{payload.barcode}' already exists")

    # Update only provided fields
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    try:
        session.commit()
        session.refresh(product)
    except IntegrityError as exc:
        session.rollback()
        if "sku" in str(exc).lower():
            raise DuplicateSKUError(f"Product with SKU '{payload.sku}' already exists") from exc
        elif "barcode" in str(exc).lower():
            raise DuplicateBarcodeError(f"Product with barcode '{payload.barcode}' already exists") from exc
        raise ProductError("Failed to update product") from exc

    return product


def delete_product(
    session: Session,
    product_id: UUID,
    *,
    owner_id: UUID,
) -> bool:
    """
    Soft delete a product by setting status to 'inactive'.
    Returns True if product was found and deleted, False otherwise.
    """
    product = get_product_for_owner(session, product_id, owner_id)
    if not product:
        return False

    product.status = "inactive"
    session.commit()
    return True


def get_low_stock_products(
    session: Session,
    owner_id: UUID,
    threshold: int = 5,
) -> Sequence[Product]:
    """Get products with stock below threshold."""
    statement = (
        select(Product)
        .where(Product.stock <= threshold)
        .where(Product.status == "active")
        .where(Product.owner_id == owner_id)
        .order_by(Product.stock.asc())
    )
    result = session.execute(statement)
    return result.scalars().all()


def build_products_query(
    owner_id: UUID,
    category: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
):
    """Build a products query with optional filters."""
    query = select(Product)

    # Apply filters
    conditions = []
    conditions.append(Product.owner_id == owner_id)
    if category:
        conditions.append(Product.category == category)
    if status:
        conditions.append(Product.status == status)
    if search:
        search_term = f"%{search}%"
        conditions.append(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.barcode.ilike(search_term),
                Product.category.ilike(search_term)
            )
        )

    if conditions:
        query = query.where(and_(*conditions))

    return query
