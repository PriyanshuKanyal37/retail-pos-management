"""
Base CRUD operations with multi-tenant support.
"""

from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from uuid import UUID

from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from sqlalchemy import select, update, delete, func, and_
from sqlalchemy.exc import SQLAlchemyError

from app.db.base_class import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base class for CRUD operations with multi-tenant support.
    """

    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).

        Args:
            model: A SQLAlchemy model class
        """
        self.model = model

    async def get(
        self,
        db: AsyncSession,
        id: Any,
        *,
        tenant_id: Optional[UUID] = None
    ) -> Optional[ModelType]:
        """
        Get a single record by ID with optional tenant filtering.

        Args:
            db: Database session
            id: Record ID
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            Model instance or None if not found
        """
        query = select(self.model).where(self.model.id == id)

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
        Get multiple records with pagination and filtering.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            tenant_id: Optional tenant ID for multi-tenant isolation
            order_by: Column to order by (e.g., "created_at desc")
            filters: Additional filters as dict

        Returns:
            List of model instances
        """
        query = select(self.model)

        # Add tenant filtering
        if tenant_id and hasattr(self.model, 'tenant_id'):
            query = query.where(self.model.tenant_id == tenant_id)

        # Add custom filters
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    if isinstance(value, list):
                        query = query.where(getattr(self.model, key).in_(value))
                    else:
                        query = query.where(getattr(self.model, key) == value)

        # Add ordering
        if order_by:
            if order_by.startswith('-'):
                query = query.order_by(getattr(self.model, order_by[1:]).desc())
            else:
                query = query.order_by(getattr(self.model, order_by))
        else:
            # Default ordering by created_at desc if available
            if hasattr(self.model, 'created_at'):
                query = query.order_by(self.model.created_at.desc())

        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    async def count(
        self,
        db: AsyncSession,
        *,
        tenant_id: Optional[UUID] = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Count records with optional filtering.

        Args:
            db: Database session
            tenant_id: Optional tenant ID for multi-tenant isolation
            filters: Additional filters as dict

        Returns:
            Number of matching records
        """
        query = select(func.count(self.model.id))

        # Add tenant filtering
        if tenant_id and hasattr(self.model, 'tenant_id'):
            query = query.where(self.model.tenant_id == tenant_id)

        # Add custom filters
        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    if isinstance(value, list):
                        query = query.where(getattr(self.model, key).in_(value))
                    else:
                        query = query.where(getattr(self.model, key) == value)

        result = await db.execute(query)
        return result.scalar()

    async def create(
        self,
        db: AsyncSession,
        *,
        obj_in: CreateSchemaType,
        tenant_id: Optional[UUID] = None
    ) -> ModelType:
        """
        Create a new record.

        Args:
            db: Database session
            obj_in: Creation schema
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            Created model instance

        Raises:
            SQLAlchemyError: If database operation fails
        """
        try:
            obj_in_data = jsonable_encoder(obj_in)

            # Add tenant_id if model supports it
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

    async def update(
        self,
        db: AsyncSession,
        *,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        """
        Update an existing record.

        Args:
            db: Database session
            db_obj: Existing model instance
            obj_in: Update schema or dict

        Returns:
            Updated model instance

        Raises:
            SQLAlchemyError: If database operation fails
        """
        try:
            obj_data = jsonable_encoder(db_obj)

            if isinstance(obj_in, dict):
                update_data = obj_in
            else:
                update_data = obj_in.dict(exclude_unset=True)

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

    async def remove(
        self,
        db: AsyncSession,
        *,
        id: int,
        tenant_id: Optional[UUID] = None
    ) -> Optional[ModelType]:
        """
        Delete a record by ID.

        Args:
            db: Database session
            id: Record ID
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            Deleted model instance or None if not found

        Raises:
            SQLAlchemyError: If database operation fails
        """
        try:
            obj = await self.get(db, id=id, tenant_id=tenant_id)
            if obj:
                await db.delete(obj)
                await db.commit()
            return obj
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
        Check if a record exists with given filters.

        Args:
            db: Database session
            filters: Filters as dict
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            True if record exists, False otherwise
        """
        query = select(func.count(self.model.id)).where(
            and_(
                getattr(self.model, key) == value
                for key, value in filters.items()
                if hasattr(self.model, key)
            )
        )

        if tenant_id and hasattr(self.model, 'tenant_id'):
            query = query.where(self.model.tenant_id == tenant_id)

        result = await db.execute(query)
        count = result.scalar()
        return count > 0

    async def get_by_field(
        self,
        db: AsyncSession,
        *,
        field_name: str,
        field_value: Any,
        tenant_id: Optional[UUID] = None
    ) -> Optional[ModelType]:
        """
        Get a single record by field value.

        Args:
            db: Database session
            field_name: Field name to search
            field_value: Field value to match
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            Model instance or None if not found
        """
        if not hasattr(self.model, field_name):
            return None

        query = select(self.model).where(getattr(self.model, field_name) == field_value)

        if tenant_id and hasattr(self.model, 'tenant_id'):
            query = query.where(self.model.tenant_id == tenant_id)

        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def bulk_create(
        self,
        db: AsyncSession,
        *,
        objs_in: List[CreateSchemaType],
        tenant_id: Optional[UUID] = None
    ) -> List[ModelType]:
        """
        Create multiple records in bulk.

        Args:
            db: Database session
            objs_in: List of creation schemas
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            List of created model instances

        Raises:
            SQLAlchemyError: If database operation fails
        """
        try:
            db_objs = []
            for obj_in in objs_in:
                obj_in_data = jsonable_encoder(obj_in)

                # Add tenant_id if model supports it
                if tenant_id and hasattr(self.model, 'tenant_id'):
                    obj_in_data["tenant_id"] = tenant_id

                db_obj = self.model(**obj_in_data)
                db_objs.append(db_obj)

            db.add_all(db_objs)
            await db.commit()

            # Refresh all objects to get their IDs and timestamps
            for db_obj in db_objs:
                await db.refresh(db_obj)

            return db_objs
        except SQLAlchemyError as e:
            await db.rollback()
            raise e