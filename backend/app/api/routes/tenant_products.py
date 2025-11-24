from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, get_tenant_id, require_admin
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.tenant_products import (
    DuplicateBarcodeError,
    DuplicateSKUError,
    TenantProductService,
)
from app.services.storage import (
    StorageError,
    delete_product_image as storage_delete_product_image,
    upload_product_image as storage_upload_product_image,
)

router = APIRouter(prefix="/products", tags=["products"])


def get_product_service(
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> TenantProductService:
    """Dependency to get tenant-aware product service"""
    return TenantProductService(session, tenant_id)


@router.get("/")
def get_products(
    service: TenantProductService = Depends(get_product_service),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search term"),
    status: Optional[str] = Query(None, pattern="^(active|inactive)$", description="Filter by status"),
    current_user: User = Depends(get_current_user),
):
    """Get all products for the current tenant with optional filtering."""
    query = service.build_filtered_query(category=category, search=search, status=status)
    result =  service.session.execute(query)
    products = result.scalars().all()

    return [
        ProductResponse(
            id=str(product.id),
            name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            category=product.category,
            price=float(product.price),
            stock=product.stock,
            img_url=product.img_url,
            status=product.status,
            created_at=product.created_at,
            updated_at=product.updated_at,
        )
        for product in products
    ]


@router.get("/low-stock")
def get_low_stock_products(
    threshold: int = Query(20, ge=1, description="Stock threshold"),
    service: TenantProductService = Depends(get_product_service),
    current_user: User = Depends(get_current_user),
):
    """Get products with stock below threshold for the current tenant."""
    products =  service.get_low_stock_products(threshold)

    return [
        ProductResponse(
            id=str(product.id),
            name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            category=product.category,
            price=float(product.price),
            stock=product.stock,
            img_url=product.img_url,
            status=product.status,
            created_at=product.created_at,
            updated_at=product.updated_at,
        )
        for product in products
    ]


@router.get("/{product_id}")
def get_product(
    product_id: UUID,
    service: TenantProductService = Depends(get_product_service),
    current_user: User = Depends(get_current_user),
):
    """Get a specific product by ID for the current tenant."""
    product =  service.get_by_id(product_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return ProductResponse(
        id=str(product.id),
        name=product.name,
        sku=product.sku,
        barcode=product.barcode,
        category=product.category,
        price=float(product.price),
        stock=product.stock,
        img_url=product.img_url,
        status=product.status,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.post("/", response_model=ProductResponse, status_code=201)
def create_product(
    product_data: ProductCreate,
    service: TenantProductService = Depends(get_product_service),
    current_user: User = Depends(require_admin),  # Only admins can create products
):
    """Create a new product for the current tenant."""
    try:
        # Add store_id from current user to product data
        product_dict = product_data.model_dump()

        # Validate that user has a store_id - it's required for products
        if not current_user.store_id:
            raise HTTPException(
                status_code=400,
                detail="User must be assigned to a store to create products"
            )

        product_dict['store_id'] = current_user.store_id
        product =  service.create(product_dict)

        return ProductResponse(
            id=str(product.id),
            name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            category=product.category,
            price=float(product.price),
            stock=product.stock,
            low_stock_threshold=product.low_stock_threshold,
            img_url=product.img_url,
            status=product.status,
            created_at=product.created_at,
            updated_at=product.updated_at,
        )
    except DuplicateSKUError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DuplicateBarcodeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    service: TenantProductService = Depends(get_product_service),
    current_user: User = Depends(require_admin),  # Only admins can update products
):
    """Update a product for the current tenant."""
    try:
        product = service.update(product_id, product_data.model_dump(exclude_unset=True))

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        return ProductResponse(
            id=str(product.id),
            name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            category=product.category,
            price=float(product.price),
            stock=product.stock,
            img_url=product.img_url,
            status=product.status,
            created_at=product.created_at,
            updated_at=product.updated_at,
        )
    except DuplicateSKUError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except DuplicateBarcodeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: UUID,
    service: TenantProductService = Depends(get_product_service),
    current_user: User = Depends(require_admin),  # Only admins can delete products
):
    """Soft delete a product for the current tenant."""
    success = service.soft_delete(product_id)

    if not success:
        raise HTTPException(status_code=404, detail="Product not found")


@router.post("/{product_id}/image", response_model=dict)
def upload_product_image(
    product_id: UUID,
    file: UploadFile = File(...),
    service: TenantProductService = Depends(get_product_service),
    current_user: User = Depends(require_admin),  # Only admins can upload images
):
    """Upload an image for a product in the current tenant."""
    product = service.get_by_id(product_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    if file.size > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")

    try:
        # Upload image using storage service
        image_url = storage_upload_product_image(file.file, file.filename)

        # Update product with new image URL
        service.update(product_id, {"img_url": image_url})

        return {"image_url": image_url}
    except StorageError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/{product_id}/image", status_code=204)
def delete_product_image(
    product_id: UUID,
    service: TenantProductService = Depends(get_product_service),
    current_user: User = Depends(require_admin),  # Only admins can delete images
):
    """Delete the image for a product in the current tenant."""
    product = service.get_by_id(product_id)

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if product.img_url:
        try:
            # Delete image using storage service
            storage_delete_product_image(str(product_id))

            # Update product to remove image URL
            service.update(product_id, {"img_url": None})
        except StorageError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
