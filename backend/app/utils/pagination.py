"""
Production-ready pagination utilities
"""

from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel, Field, validator
from math import ceil

T = TypeVar('T')


class PaginationParams(BaseModel):
    """Pagination parameters for API endpoints"""
    page: int = Field(1, ge=1, description="Page number (starting from 1)")
    size: int = Field(20, ge=1, le=100, description="Number of items per page (max 100)")
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: str = Field("desc", pattern="^(asc|desc)$", description="Sort order (asc/desc)")

    @validator('size')
    def validate_size(cls, v):
        if v > 100:
            return 100
        return v

    @property
    def offset(self) -> int:
        """Calculate offset for database query"""
        return (self.page - 1) * self.size

    @property
    def limit(self) -> int:
        """Get limit for database query"""
        return self.size


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response model"""
    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., ge=0, description="Total number of items")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")

    @classmethod
    def create(
        cls,
        items: List[T],
        total: int,
        pagination_params: PaginationParams
    ) -> "PaginatedResponse[T]":
        """Create a paginated response"""
        pages = ceil(total / pagination_params.size) if total > 0 else 1
        has_next = pagination_params.page < pages
        has_prev = pagination_params.page > 1

        return cls(
            items=items,
            total=total,
            page=pagination_params.page,
            size=pagination_params.size,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev
        )


def paginate_query(
    query,
    session,
    pagination_params: PaginationParams,
    total_count: Optional[int] = None
):
    """
    Apply pagination to a SQLAlchemy query
    Returns tuple of (items, total_count)
    """
    # Apply sorting
    if pagination_params.sort_by:
        order_column = getattr(query.column_descriptions[0]['type'], pagination_params.sort_by, None)
        if order_column:
            if pagination_params.sort_order == "desc":
                query = query.order_by(order_column.desc())
            else:
                query = query.order_by(order_column.asc())

    # Get total count if not provided
    if total_count is None:
        # Use func.count() for SQLAlchemy 2.0
        from sqlalchemy import func
        count_query = query.order_by(None).with_only_columns(func.count())
        result = session.execute(count_query)
        total_count = result.scalar()

    # Apply pagination
    paginated_query = query.offset(pagination_params.offset).limit(pagination_params.limit)
    items = session.execute(paginated_query)
    items = items.scalars().all()

    return items, total_count


def get_pagination_params(
    page: Optional[int] = 1,
    size: Optional[int] = 20,
    sort_by: Optional[str] = None,
    sort_order: str = "desc"
) -> PaginationParams:
    """Create pagination parameters from query params"""
    return PaginationParams(
        page=page or 1,
        size=min(size or 20, 100),  # Ensure max 100
        sort_by=sort_by,
        sort_order=sort_order if sort_order in ["asc", "desc"] else "desc"
    )
