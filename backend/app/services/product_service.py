"""
Product Service with Storage Integration
Handles product management with Supabase Storage for images.
"""

import logging
from typing import List, Optional, Sequence
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_

from app.crud.crud_product import crud_product
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.storage_service import SupabaseStorageService

logger = logging.getLogger(__name__)


class ProductServiceError(Exception):
    """Base class for product service errors."""
    pass


class ProductNotFoundError(ProductServiceError):
    """Raised when product is not found."""
    pass


class ProductStorageError(ProductServiceError):
    """Raised when storage operations fail."""
    pass


class DuplicateSKUError(ProductServiceError):
    """Raised when SKU already exists."""
    pass


class DuplicateBarcodeError(ProductServiceError):
    """Raised when barcode already exists."""
    pass


class ProductService:
    """
    Service for managing products with integrated storage functionality.
    Uses SQLAlchemy for database operations and Supabase for file storage.
    """

    def __init__(self, db: Session, storage_service: SupabaseStorageService):
        self.db = db
        self.storage = storage_service

    def get_product(
        self,
        product_id: UUID,
        tenant_id: UUID
    ) -> Optional[Product]:
        """
        Get a product by ID with tenant filtering.

        Args:
            product_id: Product ID
            tenant_id: Tenant ID for multi-tenant isolation

        Returns:
            Product instance or None if not found
        """
        return crud_product.get(db=self.db, id=product_id)

    def get_product_by_sku(
        self,
        sku: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None
    ) -> Optional[Product]:
        """
        Get a product by SKU with tenant and store filtering.

        Args:
            sku: Product SKU
            tenant_id: Tenant ID
            store_id: Optional store ID

        Returns:
            Product instance or None if not found
        """
        return crud_product.get_by_sku(
            db=self.db,
            sku=sku,
            tenant_id=tenant_id,
            store_id=store_id
        )

    def get_product_by_barcode(
        self,
        barcode: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None
    ) -> Optional[Product]:
        """
        Get a product by barcode with tenant and store filtering.

        Args:
            barcode: Product barcode
            tenant_id: Tenant ID
            store_id: Optional store ID

        Returns:
            Product instance or None if not found
        """
        return crud_product.get_by_barcode(
            db=self.db,
            barcode=barcode,
            tenant_id=tenant_id,
            store_id=store_id
        )

    def create_product_with_image(
        self,
        product_data: ProductCreate,
        tenant_id: UUID,
        image_content: Optional[bytes] = None,
        image_filename: Optional[str] = None
    ) -> Product:
        """
        Create a new product with optional image upload.

        Args:
            product_data: Product data
            tenant_id: Tenant ID
            image_content: Optional image file content
            image_filename: Optional image filename

        Returns:
            Created product instance

        Raises:
            DuplicateSKUError: If SKU already exists
            DuplicateBarcodeError: If barcode already exists
            ProductStorageError: If image upload fails
        """
        # Check for duplicate SKU
        if crud_product.sku_exists(
            db=self.db,
            sku=product_data.sku,
            tenant_id=tenant_id,
            store_id=product_data.store_id
        ):
            raise DuplicateSKUError(f"Product with SKU '{product_data.sku}' already exists")

        # Check for duplicate barcode if provided
        if product_data.barcode and crud_product.barcode_exists(
            db=self.db,
            barcode=product_data.barcode,
            tenant_id=tenant_id,
            store_id=product_data.store_id
        ):
            raise DuplicateBarcodeError(f"Product with barcode '{product_data.barcode}' already exists")

        # Create product
        product_data_dict = product_data.model_dump()
        product_data_dict["tenant_id"] = tenant_id

        product = crud_product.create(db=self.db, obj_in=product_data_dict)

        # Upload image if provided
        if image_content and image_filename and product_data.store_id:
            try:
                image_url = self.storage.upload_product_image(
                    image_content=image_content,
                    product_id=product.id,
                    tenant_id=tenant_id,
                    filename=image_filename
                )

                product.img_url = image_url
                self.db.commit()
                self.db.refresh(product)

                logger.info(f"Successfully uploaded image for product {product.id}")

            except Exception as e:
                # Product is still valid without image, but log the error
                logger.error(f"Failed to upload product image for {product.id}: {e}")
                self.db.rollback()
                # Don't raise - the product was created successfully

        return product

    def update_product_with_image(
        self,
        product_id: UUID,
        tenant_id: UUID,
        update_data: ProductUpdate,
        new_image_content: Optional[bytes] = None,
        new_image_filename: Optional[str] = None
    ) -> Product:
        """
        Update a product with optional image replacement.

        Args:
            product_id: Product ID
            tenant_id: Tenant ID
            update_data: Product update data
            new_image_content: Optional new image content
            new_image_filename: Optional new image filename

        Returns:
            Updated product instance

        Raises:
            ProductNotFoundError: If product not found
            DuplicateSKUError: If new SKU already exists
            DuplicateBarcodeError: If new barcode already exists
        """
        # Get existing product
        product = self.get_product(product_id, tenant_id)
        if not product:
            raise ProductNotFoundError(f"Product {product_id} not found")

        # Check for duplicate SKU if updating
        if update_data.sku and update_data.sku != product.sku:
            if crud_product.sku_exists(
                db=self.db,
                sku=update_data.sku,
                tenant_id=tenant_id,
                store_id=product.store_id,
                exclude_product_id=product_id
            ):
                raise DuplicateSKUError(f"Product with SKU '{update_data.sku}' already exists")

        # Check for duplicate barcode if updating
        if update_data.barcode and update_data.barcode != product.barcode:
            if crud_product.barcode_exists(
                db=self.db,
                barcode=update_data.barcode,
                tenant_id=tenant_id,
                store_id=product.store_id,
                exclude_product_id=product_id
            ):
                raise DuplicateBarcodeError(f"Product with barcode '{update_data.barcode}' already exists")

        # Update product image if new image provided
        if new_image_content and new_image_filename and product.store_id:
            try:
                new_image_url = self.storage.update_product_image(
                    product_id=product_id,
                    tenant_id=tenant_id,
                    old_image_url=product.img_url,
                    new_image_content=new_image_content,
                    new_filename=new_image_filename
                )

                update_data_dict = update_data.model_dump(exclude_unset=True)
                update_data_dict["img_url"] = new_image_url

            except Exception as e:
                logger.error(f"Failed to update product image for {product_id}: {e}")
                # Continue with product update even if image fails
                update_data_dict = update_data.model_dump(exclude_unset=True)
        else:
            update_data_dict = update_data.model_dump(exclude_unset=True)

        # Update product
        updated_product = crud_product.update(
            db=self.db,
            db_obj=product,
            obj_in=update_data_dict
        )

        return updated_product

    def get_products_by_store(
        self,
        store_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Product]:
        """
        Get products for a specific store with optional filtering.

        Args:
            store_id: Store ID
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional search term
            category: Optional category filter
            status: Optional status filter

        Returns:
            List of product instances
        """
        if search:
            return crud_product.search_products(
                db=self.db,
                search_term=search,
                tenant_id=tenant_id,
                store_id=store_id,
                skip=skip,
                limit=limit
            )
        elif category:
            return crud_product.get_by_category(
                db=self.db,
                category=category,
                tenant_id=tenant_id,
                store_id=store_id,
                skip=skip,
                limit=limit
            )
        else:
            return crud_product.get_products_by_store(
                db=self.db,
                store_id=store_id,
                tenant_id=tenant_id,
                skip=skip,
                limit=limit,
                status=status
            )

    def search_products(
        self,
        search_term: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Product]:
        """
        Search products by name, SKU, or barcode.

        Args:
            search_term: Search term
            tenant_id: Tenant ID
            store_id: Optional store ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of matching product instances
        """
        return crud_product.search_products(
            db=self.db,
            search_term=search_term,
            tenant_id=tenant_id,
            store_id=store_id,
            skip=skip,
            limit=limit
        )

    def get_categories(
        self,
        tenant_id: UUID,
        store_id: Optional[UUID] = None
    ) -> List[str]:
        """
        Get all unique categories for a tenant and optionally for a specific store.

        Args:
            tenant_id: Tenant ID
            store_id: Optional store ID

        Returns:
            List of unique category names
        """
        return crud_product.get_categories(
            db=self.db,
            tenant_id=tenant_id,
            store_id=store_id
        )

    def get_low_stock_products(
        self,
        tenant_id: UUID,
        threshold: int = 5,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Get products with low stock.

        Args:
            tenant_id: Tenant ID
            threshold: Low stock threshold
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of low stock product instances
        """
        return crud_product.get_low_stock_products(
            db=self.db,
            tenant_id=tenant_id,
            threshold=threshold,
            skip=skip,
            limit=limit
        )

    def update_stock(
        self,
        product_id: UUID,
        tenant_id: UUID,
        new_stock: int
    ) -> Product:
        """
        Update product stock.

        Args:
            product_id: Product ID
            tenant_id: Tenant ID
            new_stock: New stock quantity

        Returns:
            Updated product instance

        Raises:
            ProductNotFoundError: If product not found
        """
        product = crud_product.update_stock(
            db=self.db,
            product_id=product_id,
            new_stock=new_stock,
            tenant_id=tenant_id
        )

        if not product:
            raise ProductNotFoundError(f"Product {product_id} not found")

        return product

    def adjust_stock(
        self,
        product_id: UUID,
        tenant_id: UUID,
        adjustment: int
    ) -> Product:
        """
        Adjust product stock by a given amount (positive or negative).

        Args:
            product_id: Product ID
            tenant_id: Tenant ID
            adjustment: Stock adjustment amount

        Returns:
            Updated product instance

        Raises:
            ProductNotFoundError: If product not found
        """
        product = crud_product.adjust_stock(
            db=self.db,
            product_id=product_id,
            adjustment=adjustment,
            tenant_id=tenant_id
        )

        if not product:
            raise ProductNotFoundError(f"Product {product_id} not found")

        return product

    def delete_product(
        self,
        product_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """
        Delete a product and its associated image.

        Args:
            product_id: Product ID
            tenant_id: Tenant ID

        Returns:
            True if deletion successful, False otherwise
        """
        product = self.get_product(product_id, tenant_id)
        if not product:
            return False

        # Delete associated image if exists
        if product.img_url:
            try:
                file_path = self.storage.extract_file_path_from_url(product.img_url)
                if file_path:
                    self.storage.delete_file("products", file_path)
            except Exception as e:
                logger.error(f"Failed to delete product image for {product_id}: {e}")
                # Continue with product deletion even if image deletion fails

        # Delete product from database
        crud_product.remove(db=self.db, id=product_id)
        return True

    def get_product_statistics(
        self,
        tenant_id: UUID
    ) -> dict:
        """
        Get product statistics for a tenant.

        Args:
            tenant_id: Tenant ID

        Returns:
            Dictionary with product statistics
        """
        return crud_product.get_product_statistics(db=self.db, tenant_id=tenant_id)
