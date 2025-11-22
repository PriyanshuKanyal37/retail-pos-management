"""
Updated Sales API Routes with Storage Integration
Handles sales CRUD operations with invoice PDF upload support using Supabase Storage.
"""

from typing import Optional, List
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from fastapi.responses import Response, JSONResponse

from app.api.deps import (
    get_current_user_with_tenant,
    get_sales_service,
    require_admin
)
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleResponse, SaleUpdate
from app.schemas.sale_item import SaleItemCreate
from app.services.sales_service import (
    SalesService,
    SaleNotFoundError,
    SaleStorageError,
    InvalidSaleStatusError
)

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("/", response_model=List[dict])
async def get_sales(
    store_id: Optional[UUID] = Query(None, description="Filter by store ID"),
    date_from: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    status: Optional[str] = Query(None, description="Filter by status (completed/held)"),
    payment_method: Optional[str] = Query(None, description="Filter by payment method"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get sales with filtering and pagination.
    Automatically filtered by tenant using RLS.
    """
    try:
        user, tenant_id = user_tenant

        # If user is assigned to a store, only get sales for that store
        if not store_id and user.store_id:
            store_id = user.store_id

        sales = await sales_service.get_sales_by_store(
            store_id=store_id,
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            date_from=date_from.isoformat() if date_from else None,
            date_to=date_to.isoformat() if date_to else None,
            status=status,
            payment_method=payment_method
        )

        # Format response
        formatted_sales = []
        for sale in sales:
            formatted_sales.append({
                "id": str(sale.id),
                "invoice_no": sale.invoice_no,
                "store_id": str(sale.store_id) if sale.store_id else None,
                "customer_id": str(sale.customer_id) if sale.customer_id else None,
                "cashier_id": str(sale.cashier_id) if sale.cashier_id else None,
                "payment_method": sale.payment_method,
                "payment_status": sale.payment_status,
                "subtotal": float(sale.subtotal),
                "discount": float(sale.discount),
                "tax": float(sale.tax),
                "total": float(sale.total),
                "paid_amount": float(sale.paid_amount),
                "change_amount": float(sale.change_amount) if sale.change_amount else None,
                "status": sale.status,
                "has_invoice": bool(sale.invoice_pdf_url),
                "created_at": sale.created_at.isoformat() if sale.created_at else None
            })

        return formatted_sales

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve sales: {str(e)}"
        )


@router.get("/next-invoice", response_model=dict)
async def get_next_invoice_number(
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get the next available invoice number for the current tenant.
    """
    try:
        user, tenant_id = user_tenant
        invoice_number = await sales_service.get_next_invoice_number(tenant_id)
        return {"invoice_number": invoice_number}
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate invoice number: {str(e)}"
        )


@router.get("/{sale_id}", response_model=dict)
async def get_sale_details(
    sale_id: UUID,
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get sale details including items and invoice information.
    """
    try:
        user, tenant_id = user_tenant

        sale_details = await sales_service.get_sale_with_items(sale_id, tenant_id)
        if not sale_details:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Sale not found"
            )

        # Format response
        formatted_items = []
        for item in sale_details["items"]:
            formatted_items.append({
                "id": str(item.id),
                "product_id": str(item.product_id) if item.product_id else None,
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
                "total": float(item.total) if item.total else None,
                "created_at": item.created_at.isoformat() if item.created_at else None
            })

        return {
            "sale": {
                "id": str(sale_details["sale"].id),
                "invoice_no": sale_details["sale"].invoice_no,
                "store_id": str(sale_details["sale"].store_id) if sale_details["sale"].store_id else None,
                "customer_id": str(sale_details["sale"].customer_id) if sale_details["sale"].customer_id else None,
                "cashier_id": str(sale_details["sale"].cashier_id) if sale_details["sale"].cashier_id else None,
                "payment_method": sale_details["sale"].payment_method,
                "payment_status": sale_details["sale"].payment_status,
                "subtotal": sale_details["subtotal"],
                "discount": sale_details["discount"],
                "tax": sale_details["tax"],
                "total": sale_details["total"],
                "paid_amount": sale_details["paid_amount"],
                "change_amount": sale_details["change_amount"],
                "status": sale_details["sale"].status,
                "invoice_pdf_url": sale_details["invoice_url"],
                "has_invoice": sale_details["has_invoice"],
                "created_at": sale_details["sale"].created_at.isoformat() if sale_details["sale"].created_at else None
            },
            "items": formatted_items
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve sale details: {str(e)}"
        )


@router.post("/", response_model=SaleResponse)
async def create_sale(
    sale_data: SaleCreate,
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Create a new sale with optional invoice PDF upload.
    """
    try:
        user, tenant_id = user_tenant

        # Validate store_id - users can only create sales in their assigned store
        store_id = sale_data.store_id or user.store_id
        if not store_id:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Store ID is required"
            )

        if not sale_data.items:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="At least one sale item is required"
            )

        sale_data = sale_data.model_copy(
            update={
                "store_id": store_id,
                "cashier_id": user.id,
            }
        )

        # Create sale with items (invoice upload handled by dedicated endpoint)
        sale = await sales_service.create_sale_with_items(
            sale_data=sale_data,
            items_data=sale_data.items,
            tenant_id=tenant_id,
            pdf_content=None
        )
        return sale

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sale: {str(e)}"
        )


@router.put("/{sale_id}", response_model=dict)
async def update_sale(
    sale_id: UUID,
    sale_data: SaleUpdate,
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    current_user: User = Depends(require_admin)
):
    """
    Update an existing sale.
    Requires admin or manager role.
    """
    try:
        user, tenant_id = user_tenant

        sale = await sales_service.update_sale(sale_id, tenant_id, sale_data)

        return {
            "message": "Sale updated successfully",
            "sale": {
                "id": str(sale.id),
                "invoice_no": sale.invoice_no,
                "status": sale.status,
                "payment_status": sale.payment_status,
                "total": float(sale.total)
            }
        }

    except SaleNotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvalidSaleStatusError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update sale: {str(e)}"
        )


@router.patch("/{sale_id}/payment-status")
async def update_payment_status(
    sale_id: UUID,
    payment_status: str = Query(..., description="New payment status (pending/paid/partial/refunded)"),
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    current_user: User = Depends(require_admin)
):
    """
    Update sale payment status.
    Requires admin or manager role.
    """
    try:
        user, tenant_id = user_tenant

        sale = await sales_service.update_payment_status(sale_id, tenant_id, payment_status)

        return {
            "message": "Payment status updated successfully",
            "sale_id": str(sale.id),
            "payment_status": sale.payment_status
        }

    except SaleNotFoundError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvalidSaleStatusError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update payment status: {str(e)}"
        )


@router.get("/{sale_id}/invoice")
async def download_invoice_pdf(
    sale_id: UUID,
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Download invoice PDF for a sale.
    """
    try:
        user, tenant_id = user_tenant

        pdf_content = await sales_service.download_invoice_pdf(sale_id, tenant_id)
        if not pdf_content:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Invoice not found"
            )

        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=invoice_{sale_id}.pdf"}
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download invoice: {str(e)}"
        )


@router.delete("/{sale_id}")
async def delete_sale(
    sale_id: UUID,
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    current_user: User = Depends(require_admin)
):
    """
    Delete a sale and its associated invoice.
    Requires admin or manager role.
    """
    try:
        user, tenant_id = user_tenant

        success = await sales_service.delete_sale(sale_id, tenant_id)
        if not success:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Sale not found"
            )

        return {"message": "Sale deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete sale: {str(e)}"
        )


@router.get("/statistics/summary")
async def get_sales_statistics(
    store_id: Optional[UUID] = Query(None, description="Filter by store ID"),
    days: int = Query(30, ge=1, le=365, description="Number of days for statistics"),
    sales_service: SalesService = Depends(get_sales_service),
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant)
):
    """
    Get sales statistics summary.
    """
    try:
        user, tenant_id = user_tenant

        # If user is assigned to a store, only get statistics for that store
        if not store_id and user.store_id:
            store_id = user.store_id

        statistics = await sales_service.get_sales_statistics(
            tenant_id=tenant_id,
            store_id=store_id,
            days=days
        )

        return statistics

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve sales statistics: {str(e)}"
        )
