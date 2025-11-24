"""
Public API Routes - No Authentication Required
For testing file storage functionality without JWT tokens
"""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, status, Depends
from fastapi.responses import JSONResponse

from app.api.deps import get_storage_service
from app.services.storage_service import SupabaseStorageService

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/storage-test")
def test_storage(
    storage_service: SupabaseStorageService = Depends(get_storage_service)
):
    """Test storage service without authentication"""
    return {
        "message": "Storage service is working!",
        "buckets": {
            "products": "products",
            "invoices": "invoices",
            "branding": "branding"
        },
        "status": "connected"
    }


@router.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "FA POS Backend",
        "features": {
            "database": "SQLAlchemy + Supabase PostgreSQL",
            "storage": "Supabase Storage",
            "file_upload": "Product Images, Invoice PDFs",
            "multi_tenant": "Yes"
        }
    }


@router.get("/info")
def api_info():
    """API information without authentication"""
    return {
        "api_name": "FA POS Backend API",
        "version": "v1",
        "description": "Point of Sale System with File Storage",
        "features": [
            "Product Management with Image Upload",
            "Sales Management with Invoice PDFs",
            "Multi-tenant Architecture",
            "Role-based Access Control",
            "Supabase Storage Integration"
        ],
        "endpoints": {
            "auth": "/api/v1/auth/",
            "products": "/api/v1/products/",
            "sales": "/api/v1/sales/",
            "stores": "/api/v1/stores/",
            "customers": "/api/v1/customers/",
            "users": "/api/v1/users/",
            "public": "/api/v1/public/"
        },
        "authentication_required": "For all endpoints except /public/*"
    }


@router.post("/test-image-upload")
def test_image_upload(
    image: UploadFile = File(..., description="Test image file"),
    storage_service: SupabaseStorageService = Depends(get_storage_service)
):
    """
    Test image upload without authentication.
    Uploads to a special test location for validation.
    """
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
            )

        # Check file size (max 2MB for test)
        if image.size and image.size > 2 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum: 2MB"
            )

        # Read file content
        image_content = image.file.read()

        # Create test file path (using fixed test tenant and product)
        test_tenant_id = UUID("00000000-0000-0000-0000-000000000001")
        test_product_id = UUID("00000000-0000-0000-0000-000000000002")

        # Upload to products bucket in test location
        file_url = storage_service.upload_product_image(
            image_content=image_content,
            product_id=test_product_id,
            tenant_id=test_tenant_id,
            filename=f"test_{image.filename}"
        )

        return {
            "message": "Image upload test successful!",
            "file_url": file_url,
            "filename": image.filename,
            "file_size": len(image_content),
            "content_type": image.content_type
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload test failed: {str(e)}"
        )


@router.post("/test-pdf-upload")
def test_pdf_upload(
    pdf: UploadFile = File(..., description="Test PDF file"),
    storage_service: SupabaseStorageService = Depends(get_storage_service)
):
    """
    Test PDF upload without authentication.
    Uploads to a special test location for validation.
    """
    try:
        # Validate file type
        if pdf.content_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF files allowed"
            )

        # Check file size (max 5MB for test)
        if pdf.size and pdf.size > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum: 5MB"
            )

        # Read file content
        pdf_content = pdf.file.read()

        # Create test file path (using fixed test tenant and sale)
        test_tenant_id = UUID("00000000-0000-0000-0000-000000000001")
        test_sale_id = UUID("00000000-0000-0000-0000-000000000002")

        # Upload to invoices bucket in test location
        file_url = storage_service.upload_invoice_pdf(
            pdf_content=pdf_content,
            sale_id=test_sale_id,
            tenant_id=test_tenant_id
        )

        return {
            "message": "PDF upload test successful!",
            "file_url": file_url,
            "filename": pdf.filename,
            "file_size": len(pdf_content),
            "content_type": pdf.content_type
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Upload test failed: {str(e)}"
        )


@router.get("/test-file-list")
def list_test_files(
    storage_service: SupabaseStorageService = Depends(get_storage_service)
):
    """List test files in storage buckets"""
    try:
        test_tenant_id = "00000000-0000-0000-0000-000000000001"

        products_files = storage_service.list_files_in_bucket(
            "products",
            prefix=f"{test_tenant_id}/"
        )

        invoices_files = storage_service.list_files_in_bucket(
            "invoices",
            prefix=f"{test_tenant_id}/"
        )

        return {
            "message": "Test files retrieved successfully",
            "products_count": len(products_files),
            "invoices_count": len(invoices_files),
            "products_files": products_files[:5],  # Show first 5
            "invoices_files": invoices_files[:5]   # Show first 5
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list files: {str(e)}"
        )
