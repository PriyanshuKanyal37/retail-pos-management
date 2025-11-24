import random
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Sequence
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User
from app.schemas.sale import SaleCreate
from sqlalchemy import and_


class SaleError(Exception):
    """Base class for sale-related errors."""


class ProductNotFoundError(SaleError):
    def __init__(self, product_id: UUID):
        super().__init__(f"Product {product_id} not found")
        self.product_id = product_id


class InsufficientStockError(SaleError):
    def __init__(self, product_id: UUID, available: int, requested: int):
        super().__init__(f"Insufficient stock for product {product_id}")
        self.product_id = product_id
        self.available = available
        self.requested = requested


class DuplicateInvoiceError(SaleError):
    """Raised when invoice number already exists."""



def generate_next_invoice_number(session: Session, *, tenant_id: UUID | None = None) -> str:
    """Generate the next invoice number in INV-YYYY-XXXX-RRRRR format.

    Format: INV-2025-0001-12345 (sequential + 5-digit random suffix)
    If tenant_id is provided, sequence is scoped per-tenant.
    """
    year = datetime.now().year
    prefix = f"INV-{year}-"

    # Get the highest invoice number for this year (extract sequence part only)
    stmt = (
        select(Sale.invoice_no)
        .where(Sale.invoice_no.like(f"{prefix}%"))
        .order_by(Sale.invoice_no.desc())
        .limit(1)
    )
    # NOTE: Do NOT scope by tenant to avoid collisions with a global unique constraint
    result = session.execute(stmt)
    latest_invoice = result.scalar_one_or_none()

    if latest_invoice:
        # Extract the sequence number (before any random suffix)
        try:
            # Remove prefix and then split on dash to get sequence number
            number_part = latest_invoice.replace(prefix, "")
            sequence_part = number_part.split("-")[0]  # Get first part after dash
            sequence = int(sequence_part)
            next_sequence = sequence + 1
        except (ValueError, IndexError):
            # Fallback if parsing fails
            next_sequence = 1
    else:
        # No invoices for this year yet
        next_sequence = 1

    # Generate 5-digit random suffix
    random_suffix = f"{random.randint(10000, 99999)}"

    invoice_number = f"{prefix}{next_sequence:04d}-{random_suffix}"

    return invoice_number


def _apply_sale_filters(
    statement: Select,
    customer_id: UUID | None,
    cashier_id: UUID | None,
    start_date: datetime | None,
    end_date: datetime | None,
) -> Select:
    if customer_id:
        statement = statement.where(Sale.customer_id == customer_id)
    if cashier_id:
        statement = statement.where(Sale.cashier_id == cashier_id)
    if start_date:
        statement = statement.where(Sale.created_at >= start_date)
    if end_date:
        statement = statement.where(Sale.created_at <= end_date)
    return statement


def list_sales(
    session: Session,
    *,
    tenant_id: UUID,
    customer_id: UUID | None = None,
    cashier_id: UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> Sequence[Sale]:
    statement = (
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.tenant_id == tenant_id)
        .order_by(Sale.created_at.desc())
    )
    statement = _apply_sale_filters(statement, customer_id, cashier_id, start_date, end_date)
    result = session.execute(statement)
    return result.scalars().all()


def get_sale(session: Session, sale_id: UUID, *, tenant_id: UUID) -> Sale | None:
    statement = (
        select(Sale)
        .options(selectinload(Sale.items))
        .where(and_(Sale.id == sale_id, Sale.tenant_id == tenant_id))
    )
    result = session.execute(statement)
    return result.scalar_one_or_none()


def create_sale(
    session: Session,
    payload: SaleCreate,
    *,
    tenant_id: UUID,
    requesting_user: User,
) -> Sale:
    # Ensure invoice number is unique (pre-check to avoid IntegrityError under common cases)
    existing_invoice = session.execute(
        select(Sale.id).where(Sale.invoice_no == payload.invoice_no)
    )
    if existing_invoice.scalar_one_or_none() is not None:
        # Fallback to next available global invoice number
        payload.invoice_no = generate_next_invoice_number(session)
    product_ids = [item.product_id for item in payload.items]
    if not product_ids:
        raise SaleError("Sale must include at least one item")

    # ATOMIC STOCK CHECKING AND DEDUCTION
    # Lock products for update to prevent race conditions
    products_result = session.execute(
        select(Product)
        .where(Product.id.in_(product_ids))
        .where(Product.tenant_id == tenant_id)
        .with_for_update()
    )
    products = {product.id: product for product in products_result.scalars().all()}

    for product_id in product_ids:
        if product_id not in products:
            raise ProductNotFoundError(product_id)

    # Aggregate quantities per product
    requested_quantity: dict[UUID, int] = defaultdict(int)
    for item in payload.items:
        requested_quantity[item.product_id] += item.quantity

    # Check and deduct stock atomically to prevent race conditions
    for product_id, qty in requested_quantity.items():
        product = products[product_id]
        if product.stock < qty:
            session.rollback()
            raise InsufficientStockError(product_id, product.stock, qty)

        # Immediately deduct stock to prevent overselling
        product.stock -= qty
        session.add(product)

    sale = Sale(
        tenant_id=tenant_id,
        invoice_no=payload.invoice_no,
        customer_id=payload.customer_id,
        cashier_id=payload.cashier_id,
        payment_method=payload.payment_method,
        subtotal=Decimal(payload.subtotal),
        discount=Decimal(payload.discount),
        discount_type=payload.discount_type,
        discount_value_input=Decimal(payload.discount_value_input),
        tax=Decimal(payload.tax),
        total=Decimal(payload.total),
        paid_amount=Decimal(payload.paid_amount),
        change_amount=Decimal(payload.change_amount) if payload.change_amount is not None else None,
        upi_status=payload.upi_status,
        invoice_pdf_url=payload.invoice_pdf_url,
        status=payload.status,
    )
    session.add(sale)

    # Flush to get the sale.id before creating sale items
    session.flush()

    # Create sale items (stock already deducted above)
    sale_items = []
    for item in payload.items:
        sale_item = SaleItem(
            tenant_id=tenant_id,
            sale_id=sale.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=Decimal(item.unit_price),
        )
        sale_items.append(sale_item)
        session.add(sale_item)

    session.commit()

    result = session.execute(
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.id == sale.id)
    )
    return result.scalar_one()


def sales_summary(
    session: Session,
    *,
    tenant_id: UUID,
    customer_id: UUID | None = None,
    cashier_id: UUID | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> dict:
    base_statement = select(Sale).where(Sale.tenant_id == tenant_id)
    base_statement = _apply_sale_filters(base_statement, customer_id, cashier_id, start_date, end_date)

    filters = base_statement.whereclause

    aggregate_stmt = select(
        func.count(Sale.id),
        func.coalesce(func.sum(Sale.total), 0),
        func.coalesce(func.sum(Sale.discount), 0),
    )
    if filters is not None:
        aggregate_stmt = aggregate_stmt.where(filters)
    total_sales, total_revenue, total_discount = session.execute(aggregate_stmt).one()

    payment_stmt = select(
        Sale.payment_method,
        func.coalesce(func.sum(Sale.total), 0),
    )
    if filters is not None:
        payment_stmt = payment_stmt.where(filters)
    payment_stmt = payment_stmt.group_by(Sale.payment_method)
    payment_rows = session.execute(payment_stmt)
    payment_breakdown = [
        {"method": method, "total": Decimal(total)}
        for method, total in payment_rows.all()
    ]

    top_products_stmt = (
        select(
            SaleItem.product_id,
            Product.name,
            func.coalesce(func.sum(SaleItem.quantity), 0),
            func.coalesce(func.sum(SaleItem.unit_price * SaleItem.quantity), 0),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .outerjoin(Product, Product.id == SaleItem.product_id)
    )
    if filters is not None:
        top_products_stmt = top_products_stmt.where(filters)
    top_products_stmt = (
        top_products_stmt.group_by(SaleItem.product_id, Product.name)
        .order_by(func.coalesce(func.sum(SaleItem.quantity), 0).desc())
        .limit(5)
    )
    top_rows = session.execute(top_products_stmt)
    top_products = [
        {
            "product_id": product_id,
            "product_name": product_name,
            "quantity": int(quantity),
            "revenue": Decimal(revenue),
        }
        for product_id, product_name, quantity, revenue in top_rows.all()
    ]

    total_sales = int(total_sales)
    total_revenue = Decimal(total_revenue)
    total_discount = Decimal(total_discount)
    average_order_value = (
        total_revenue / total_sales if total_sales > 0 else Decimal("0")
    )

    return {
        "total_sales": total_sales,
        "total_revenue": total_revenue,
        "total_discount": total_discount,
        "average_order_value": average_order_value,
        "payment_breakdown": payment_breakdown,
        "top_products": top_products,
    }
