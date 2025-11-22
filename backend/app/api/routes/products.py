"""
Updated Product API Routes with Storage Integration
Handles product CRUD operations with image upload support using Supabase Storage.
"""

import json
from typing import Optional, List, Type, TypeVar
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, ValidationError

from app.api.deps import (
    get_current_user_with_tenant,
    get_product_service,
    require_admin
)
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.product_service import (
    ProductService,
    ProductNotFoundError,
    DuplicateSKUError,
    DuplicateBarcodeError,
    ProductStorageError
)


ModelT = TypeVar("ModelT", bound=BaseModel)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024


async def _parse_product_payload(
    request: Request,
    model: Type[ModelT]
) -> tuple[ModelT, UploadFile | None]:
    """
    Normalize incoming request payloads so we can accept both JSON and multipart form data.
    """
    content_type = request.headers.get("content-type", "") or ""
    payload_data: dict | None = None
    image_upload: UploadFile | None = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        image_upload = (
            form.get("image")
            or form.get("new_image")
            or form.get("file")
        )

        raw_payload = form.get("product_data") or form.get("product") or form.get("data")
        if raw_payload:
            try:
                payload_data = json.loads(raw_payload)
            except json.JSONDecodeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid JSON in product_data field"
                ) from exc
        else:
            payload_data = {}
            for key, value in form.multi_items():
                if key in {"image", "new_image", "file"}:
                    continue
                if isinstance(value, UploadFile):
                    continue
                payload_data[key] = value
    else:
        try:
            payload_data = await request.json()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload"
            ) from exc

    if not isinstance(payload_data, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product payload must be a JSON object"
        )

    try:
        product_model = model(**payload_data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors()
        ) from exc

    return product_model, image_upload


async def _read_image_upload(
    upload: UploadFile | None
) -> tuple[bytes | None, str | None]:
    """
    Validate and read the optional image upload from the request.
    """
    if not upload:
        return None, None

    if upload.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed types: JPG, PNG, GIF, WebP"
        )

    content = await upload.read()
    await upload.close()

    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum size is 5MB"
        )

    return content, upload.filename


router = APIRouter(prefix="/products", tags=["products"])


@router.get("/", response_model=List[ProductResponse])
async def get_products(
    store_id: Optional[UUID] = Query(None, description="Filter by store ID"),
    search: Optional[str] = Query(None, description="Search term for name, SKU, barcode, or category"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status (active/inactive)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get products with filtering and pagination.
    Automatically filtered by tenant using RLS.
    """
    try:
        user, tenant_id = user_tenant

        # If user is assigned to a store, only get products for that store
        if not store_id and user.store_id:
            store_id = user.store_id

        products = await product_service.get_products_by_store(
            store_id=store_id,
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            search=search,
            category=category,
            status=status
        )

        return [ProductResponse.model_validate(product) for product in products]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve products: {str(e)}"
        )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get a single product by ID.
    """
    try:
        user, tenant_id = user_tenant

        product = await product_service.get_product(product_id, tenant_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        return ProductResponse.model_validate(product)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve product: {str(e)}"
        )


@router.get("/sku/{sku}", response_model=ProductResponse)
async def get_product_by_sku(
    sku: str,
    store_id: Optional[UUID] = Query(None, description="Store ID for multi-store filtering"),
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get a product by SKU.
    """
    try:
        user, tenant_id = user_tenant

        # If user is assigned to a store, only search in that store
        if not store_id and user.store_id:
            store_id = user.store_id

        product = await product_service.get_product_by_sku(sku, tenant_id, store_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        return ProductResponse.model_validate(product)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve product: {str(e)}"
        )


@router.get("/barcode/{barcode}", response_model=ProductResponse)
async def get_product_by_barcode(
    barcode: str,
    store_id: Optional[UUID] = Query(None, description="Store ID for multi-store filtering"),
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get a product by barcode.
    """
    try:
        user, tenant_id = user_tenant

        # If user is assigned to a store, only search in that store
        if not store_id and user.store_id:
            store_id = user.store_id

        product = await product_service.get_product_by_barcode(barcode, tenant_id, store_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        return ProductResponse.model_validate(product)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve product: {str(e)}"
        )


@router.post("/", response_model=ProductResponse)
async def create_product(
    request: Request,
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    current_user: User = Depends(require_admin)
):
    """
    Create a new product with optional image upload.
    Supports either JSON payloads or multipart form-data.
    Requires admin or manager role.
    """
    try:
        user, tenant_id = user_tenant
        product_data, image_upload = await _parse_product_payload(request, ProductCreate)

        # Validate store_id - users can only create products in their assigned store
        if not product_data.store_id:
            if user.store_id:
                product_data = product_data.model_copy(update={"store_id": user.store_id})
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Store ID is required"
                )

        image_content, image_filename = await _read_image_upload(image_upload)

        product = await product_service.create_product_with_image(
            product_data=product_data,
            tenant_id=tenant_id,
            image_content=image_content,
            image_filename=image_filename
        )

        return ProductResponse.model_validate(product)

    except (DuplicateSKUError, DuplicateBarcodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {str(e)}"
        )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    request: Request,
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    current_user: User = Depends(require_admin)
):
    """
    Update an existing product with optional image replacement.
    Accepts either JSON or multipart form-data payloads.
    Requires admin or manager role.
    """
    try:
        user, tenant_id = user_tenant

        product_data, image_upload = await _parse_product_payload(request, ProductUpdate)
        new_image_content, new_image_filename = await _read_image_upload(image_upload)

        product = await product_service.update_product_with_image(
            product_id=product_id,
            tenant_id=tenant_id,
            update_data=product_data,
            new_image_content=new_image_content,
            new_image_filename=new_image_filename
        )

        return ProductResponse.model_validate(product)

    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except (DuplicateSKUError, DuplicateBarcodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update product: {str(e)}"
        )


@router.delete("/{product_id}")
async def delete_product(
    product_id: UUID,
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    current_user: User = Depends(require_admin)
):
    """
    Delete a product and its associated image.
    Requires admin or manager role.
    """
    try:
        user, tenant_id = user_tenant

        success = await product_service.delete_product(product_id, tenant_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        return {"message": "Product deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete product: {str(e)}"
        )


@router.get("/categories/", response_model=List[str])
async def get_categories(
    store_id: Optional[UUID] = Query(None, description="Filter by store ID"),
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get all product categories.
    """
    try:
        user, tenant_id = user_tenant

        # If user is assigned to a store, only get categories for that store
        if not store_id and user.store_id:
            store_id = user.store_id

        categories = await product_service.get_categories(tenant_id, store_id)
        return categories

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve categories: {str(e)}"
        )


@router.get("/search/{search_term}", response_model=List[ProductResponse])
async def search_products(
    search_term: str,
    store_id: Optional[UUID] = Query(None, description="Filter by store ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Search products by name, SKU, barcode, or category.
    """
    try:
        user, tenant_id = user_tenant

        # If user is assigned to a store, only search in that store
        if not store_id and user.store_id:
            store_id = user.store_id

        products = await product_service.search_products(
            search_term=search_term,
            tenant_id=tenant_id,
            store_id=store_id,
            skip=skip,
            limit=limit
        )

        return [ProductResponse.model_validate(product) for product in products]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search products: {str(e)}"
        )


@router.get("/stock/low", response_model=List[ProductResponse])
async def get_low_stock_products(
    threshold: int = Query(5, ge=0, description="Low stock threshold"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get products with low stock.
    """
    try:
        user, tenant_id = user_tenant

        products = await product_service.get_low_stock_products(
            tenant_id=tenant_id,
            threshold=threshold,
            skip=skip,
            limit=limit
        )

        return [ProductResponse.model_validate(product) for product in products]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve low stock products: {str(e)}"
        )


@router.patch("/{product_id}/stock")
async def update_product_stock(
    product_id: UUID,
    new_stock: int = Query(..., ge=0, description="New stock quantity"),
    product_service: ProductService = Depends(get_product_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    current_user: User = Depends(require_admin)
):
    """
    Update product stock quantity.
    Requires admin or manager role.
    """
    try:
        user, tenant_id = user_tenant

        product = await product_service.update_stock(product_id, tenant_id, new_stock)

        return {
            "message": "Stock updated successfully",
            "product_id": str(product.id),
            "new_stock": product.stock
        }

    except ProductNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update stock: {str(e)}"
        )
