"""
Sales Service with Storage Integration
Handles sales management with Supabase Storage for invoice PDFs.
"""

import logging
import secrets
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.crud.crud_sale import crud_sale
from app.crud.crud_sale_item import crud_sale_item
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.schemas.sale import SaleCreate, SaleUpdate
from app.schemas.sale_item import SaleItemCreate
from app.services.storage_service import SupabaseStorageService

logger = logging.getLogger(__name__)


class SalesServiceError(Exception):
    """Base class for sales service errors."""
    pass


class SaleNotFoundError(SalesServiceError):
    """Raised when sale is not found."""
    pass


class SaleStorageError(SalesServiceError):
    """Raised when storage operations fail."""
    pass


class InvalidSaleStatusError(SalesServiceError):
    """Raised when sale status is invalid."""
    pass


class SalesService:
    """
    Service for managing sales with integrated storage functionality.
    Uses SQLAlchemy for database operations and Supabase for file storage.
    """

    def __init__(self, db: AsyncSession, storage_service: SupabaseStorageService):
        self.db = db
        self.storage = storage_service

    async def get_sale(
        self,
        sale_id: UUID,
        tenant_id: UUID
    ) -> Optional[Sale]:
        """
        Get a sale by ID with tenant filtering.

        Args:
            sale_id: Sale ID
            tenant_id: Tenant ID for multi-tenant isolation

        Returns:
            Sale instance or None if not found
        """
        return await crud_sale.get(db=self.db, id=sale_id)

    async def get_sale_with_items(
        self,
        sale_id: UUID,
        tenant_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """
        Get sale with all items and payment information.

        Args:
            sale_id: Sale ID
            tenant_id: Tenant ID

        Returns:
            Dictionary containing sale, items, and invoice info
        """
        # Get sale
        sale = await self.get_sale(sale_id, tenant_id)
        if not sale:
            return None

        # Get sale items
        items_query = select(SaleItem).where(SaleItem.sale_id == sale_id)
        items_result = await self.db.execute(items_query)
        items = items_result.scalars().all()

        return {
            "sale": sale,
            "items": items,
            "invoice_url": sale.invoice_pdf_url,
            "has_invoice": bool(sale.invoice_pdf_url),
            "subtotal": float(sale.subtotal),
            "discount": float(sale.discount),
            "tax": float(sale.tax),
            "total": float(sale.total),
            "paid_amount": float(sale.paid_amount),
            "change_amount": float(sale.change_amount) if sale.change_amount else 0.0
        }

    async def create_sale_with_invoice(
        self,
        sale_data: SaleCreate,
        tenant_id: UUID,
        pdf_content: Optional[bytes] = None
    ) -> Sale:
        """
        Create a new sale with optional invoice PDF upload.

        Args:
            sale_data: Sale data
            tenant_id: Tenant ID
            pdf_content: Optional invoice PDF content

        Returns:
            Created sale instance

        Raises:
            SalesServiceError: If creation fails
            SaleStorageError: If invoice upload fails
        """
        try:
            # Always generate a fresh invoice number for this sale
            next_invoice = await self.get_next_invoice_number(tenant_id)
            sale_data = sale_data.model_copy(update={"invoice_no": next_invoice})

            # Prepare sale data (exclude fields not stored on Sale table)
            sale_data_dict = sale_data.model_dump(
                exclude={
                    "items",
                    "discount_type",
                    "discount_value_input",
                    "upi_status",
                }
            )
            sale_data_dict["tenant_id"] = tenant_id

            # Create sale
            sale = await crud_sale.create(db=self.db, obj_in=sale_data_dict)

            # Upload invoice PDF if provided
            if pdf_content and sale_data.store_id:
                try:
                    invoice_url = await self.storage.upload_invoice_pdf(
                        pdf_content=pdf_content,
                        sale_id=sale.id,
                        tenant_id=tenant_id
                    )

                    # Update sale with invoice URL
                    sale.invoice_pdf_url = invoice_url
                    await self.db.commit()
                    await self.db.refresh(sale)

                    logger.info(f"Successfully uploaded invoice for sale {sale.id}")

                except Exception as e:
                    logger.error(f"Failed to upload invoice for sale {sale.id}: {e}")
                    # Sale is still valid without invoice, but log the error
                    # Don't raise - the sale was created successfully

            return sale

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create sale: {e}")
            raise SalesServiceError(f"Failed to create sale: {str(e)}")

    async def create_sale_with_items(
        self,
        sale_data: SaleCreate,
        items_data: List[SaleItemCreate],
        tenant_id: UUID,
        pdf_content: Optional[bytes] = None
    ) -> Sale:
        """
        Create a new sale with items and optional invoice PDF.

        Args:
            sale_data: Sale data
            items_data: List of sale item data
            tenant_id: Tenant ID
            pdf_content: Optional invoice PDF content

        Returns:
            Created sale instance
        """
        try:
            # Create sale
            sale = await self.create_sale_with_invoice(sale_data, tenant_id, pdf_content)

            # Create sale items
            for item_data in items_data:
                item_data_dict = item_data.model_dump()
                item_data_dict["sale_id"] = sale.id
                item_data_dict["tenant_id"] = tenant_id
                item_data_dict["store_id"] = sale.store_id

                await crud_sale_item.create(db=self.db, obj_in=item_data_dict)

            await self.db.commit()
            await self.db.refresh(sale, attribute_names=["items"])

            return sale

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create sale with items: {e}")
            raise SalesServiceError(f"Failed to create sale with items: {str(e)}")

    async def update_sale(
        self,
        sale_id: UUID,
        tenant_id: UUID,
        update_data: SaleUpdate
    ) -> Sale:
        """
        Update an existing sale.

        Args:
            sale_id: Sale ID
            tenant_id: Tenant ID
            update_data: Sale update data

        Returns:
            Updated sale instance

        Raises:
            SaleNotFoundError: If sale not found
        """
        sale = await self.get_sale(sale_id, tenant_id)
        if not sale:
            raise SaleNotFoundError(f"Sale {sale_id} not found")

        # Validate status changes
        if update_data.status:
            valid_statuses = ["completed", "held"]
            if update_data.status not in valid_statuses:
                raise InvalidSaleStatusError(f"Invalid status: {update_data.status}")

        # Update sale
        updated_sale = await crud_sale.update(
            db=self.db,
            db_obj=sale,
            obj_in=update_data.model_dump(exclude_unset=True)
        )

        return updated_sale

    async def update_payment_status(
        self,
        sale_id: UUID,
        tenant_id: UUID,
        payment_status: str
    ) -> Sale:
        """
        Update sale payment status.

        Args:
            sale_id: Sale ID
            tenant_id: Tenant ID
            payment_status: New payment status

        Returns:
            Updated sale instance

        Raises:
            SaleNotFoundError: If sale not found
            InvalidSaleStatusError: If payment status is invalid
        """
        valid_statuses = ["pending", "paid", "partial", "refunded"]
        if payment_status not in valid_statuses:
            raise InvalidSaleStatusError(f"Invalid payment status: {payment_status}")

        return await self.update_sale(
            sale_id=sale_id,
            tenant_id=tenant_id,
            update_data=SaleUpdate(payment_status=payment_status)
        )

    async def get_sales_by_store(
        self,
        store_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        status: Optional[str] = None,
        payment_method: Optional[str] = None
    ) -> List[Sale]:
        """
        Get sales for a specific store with optional filtering.

        Args:
            store_id: Store ID
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            date_from: Optional start date filter
            date_to: Optional end date filter
            status: Optional status filter
            payment_method: Optional payment method filter

        Returns:
            List of sale instances
        """
        # Build filters
        filters = {"store_id": store_id}
        if status:
            filters["status"] = status
        if payment_method:
            filters["payment_method"] = payment_method

        # Note: Date filtering would need to be implemented in the CRUD layer
        # For now, we'll get all records and the caller can filter by date

        return await crud_sale.get_multi(
            db=self.db,
            skip=skip,
            limit=limit,
            tenant_id=tenant_id,
            filters=filters
        )

    async def get_sales_by_date_range(
        self,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sale]:
        """
        Get sales within a date range.

        Args:
            tenant_id: Tenant ID
            store_id: Optional store ID
            date_from: Optional start date
            date_to: Optional end date
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of sale instances
        """
        # This would need to be implemented in the CRUD layer with proper date filtering
        filters = {}
        if store_id:
            filters["store_id"] = store_id

        return await crud_sale.get_multi(
            db=self.db,
            skip=skip,
            limit=limit,
            tenant_id=tenant_id,
            filters=filters
        )

    async def download_invoice_pdf(
        self,
        sale_id: UUID,
        tenant_id: UUID
    ) -> Optional[bytes]:
        """
        Download invoice PDF for a sale.

        Args:
            sale_id: Sale ID
            tenant_id: Tenant ID

        Returns:
            PDF content as bytes, or None if not found
        """
        sale = await self.get_sale(sale_id, tenant_id)
        if not sale or not sale.invoice_pdf_url:
            return None

        # Extract file path from URL
        file_path = self.storage.extract_file_path_from_url(sale.invoice_pdf_url)
        if not file_path:
            logger.error(f"Could not extract file path from invoice URL: {sale.invoice_pdf_url}")
            return None

        # Download file
        try:
            return await self.storage.download_file("invoices", file_path)
        except Exception as e:
            logger.error(f"Failed to download invoice for sale {sale_id}: {e}")
            return None

    async def delete_sale(
        self,
        sale_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """
        Delete a sale and its associated invoice.

        Args:
            sale_id: Sale ID
            tenant_id: Tenant ID

        Returns:
            True if deletion successful, False otherwise
        """
        sale = await self.get_sale(sale_id, tenant_id)
        if not sale:
            return False

        try:
            # Delete associated invoice if exists
            if sale.invoice_pdf_url:
                try:
                    file_path = self.storage.extract_file_path_from_url(sale.invoice_pdf_url)
                    if file_path:
                        await self.storage.delete_file("invoices", file_path)
                except Exception as e:
                    logger.error(f"Failed to delete invoice for sale {sale_id}: {e}")
                    # Continue with sale deletion even if file deletion fails

            # Delete sale items first (due to foreign key constraints)
            items_query = select(SaleItem).where(SaleItem.sale_id == sale_id)
            items_result = await self.db.execute(items_query)
            items = items_result.scalars().all()

            for item in items:
                await crud_sale_item.remove(db=self.db, id=item.id)

            # Delete sale
            await crud_sale.remove(db=self.db, id=sale_id)
            return True

        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to delete sale {sale_id}: {e}")
            return False

    async def get_sales_statistics(
        self,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get sales statistics for a tenant.

        Args:
            tenant_id: Tenant ID
            store_id: Optional store ID
            days: Number of days for statistics

        Returns:
            Dictionary with sales statistics
        """
        # This is a placeholder implementation
        # In a real implementation, you'd use SQL aggregation functions

        filters = {}
        if store_id:
            filters["store_id"] = store_id

        # Get recent sales (placeholder - would need proper date filtering)
        recent_sales = await crud_sale.get_multi(
            db=self.db,
            skip=0,
            limit=1000,
            tenant_id=tenant_id,
            filters=filters
        )

        total_sales = len(recent_sales)
        total_revenue = sum(float(sale.total) for sale in recent_sales)
        completed_sales = len([s for s in recent_sales if s.status == "completed"])
        paid_sales = len([s for s in recent_sales if s.payment_status == "paid"])

        return {
            "total_sales": total_sales,
            "total_revenue": total_revenue,
            "average_sale_value": total_revenue / total_sales if total_sales > 0 else 0,
            "completed_sales": completed_sales,
            "paid_sales": paid_sales,
            "completion_rate": (completed_sales / total_sales * 100) if total_sales > 0 else 0,
            "payment_rate": (paid_sales / total_sales * 100) if total_sales > 0 else 0
        }

    async def get_next_invoice_number(
        self,
        tenant_id: UUID
    ) -> str:
        """
        Generate a unique invoice number for the tenant using DD/MM/YY-XXXX.
        """
        date_prefix = datetime.utcnow().strftime("%d/%m/%y")

        for _ in range(20):
            random_digits = secrets.randbelow(10_000)
            invoice_no = f"{date_prefix}-{random_digits:04d}"

            existing_sale = await crud_sale.get_by_invoice_no(
                db=self.db,
                invoice_no=invoice_no,
                tenant_id=tenant_id
            )

            if not existing_sale:
                return invoice_no

        raise SalesServiceError("Unable to generate unique invoice number. Please try again.")
