"""CRUD operations package."""

from app.crud.base import CRUDBase
from app.crud.crud_tenant import crud_tenant
from app.crud.crud_user import crud_user
from app.crud.crud_store import crud_store
from app.crud.crud_customer import crud_customer
from app.crud.crud_product import crud_product
from app.crud.crud_sale import crud_sale
from app.crud.crud_sale_item import crud_sale_item
from app.crud.crud_setting import crud_setting

__all__ = [
    "CRUDBase",
    "crud_tenant",
    "crud_user",
    "crud_store",
    "crud_customer",
    "crud_product",
    "crud_sale",
    "crud_sale_item",
    "crud_setting",
]