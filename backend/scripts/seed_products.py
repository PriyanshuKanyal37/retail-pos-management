"""Utility script to seed a handful of default products for a tenant/store.

Run with: `python backend/scripts/seed_products.py`
"""

from __future__ import annotations

import sys
from decimal import Decimal
from dotenv import load_dotenv
from pathlib import Path
from typing import Iterable
from uuid import UUID

from sqlalchemy import select

# Ensure the backend package (which contains `app`) is importable when the script
# is executed directly with `python backend/scripts/seed_products.py`.
CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

dotenv_path = BACKEND_DIR / ".env"
if dotenv_path.is_file():
    load_dotenv(dotenv_path)
else:
    load_dotenv()  # fall back to default lookup (may be set in environment)

from app.db.session import SessionLocal  # noqa: E402  (import after sys.path tweak)
from app.models.product import Product  # noqa: E402

TENANT_ID = UUID("25761c3c-0237-4ab6-b09e-de8411d32d24")
STORE_ID = UUID("42d12656-c9cc-4a9e-bc20-197c7c8da834")


ProductRow = dict[str, object]


def product_rows() -> Iterable[ProductRow]:
    """Return a stable list of restaurant product payloads to seed."""
    return [
        {
            "name": "Paneer Butter Masala",
            "sku": "RST-MAIN-001",
            "barcode": "8904500001001",
            "category": "Main Course",
            "price": Decimal("249.00"),
            "stock": 45,
            "img_url": None,
            "status": "active",
        },
        {
            "name": "Chicken Biryani",
            "sku": "RST-MAIN-002",
            "barcode": "8904500001002",
            "category": "Main Course",
            "price": Decimal("299.00"),
            "stock": 60,
            "img_url": None,
            "status": "active",
        },
        {
            "name": "Masala Dosa",
            "sku": "RST-BRK-003",
            "barcode": "8904500001003",
            "category": "Breakfast",
            "price": Decimal("129.00"),
            "stock": 80,
            "img_url": None,
            "status": "active",
        },
        {
            "name": "Veg Manchurian Dry",
            "sku": "RST-STR-004",
            "barcode": "8904500001004",
            "category": "Starters",
            "price": Decimal("179.00"),
            "stock": 55,
            "img_url": None,
            "status": "active",
        },
        {
            "name": "Tandoori Chicken (Half)",
            "sku": "RST-STR-005",
            "barcode": "8904500001005",
            "category": "Starters",
            "price": Decimal("239.00"),
            "stock": 35,
            "img_url": None,
            "status": "active",
        },
        {
            "name": "Cold Coffee Frappe",
            "sku": "RST-BEV-006",
            "barcode": "8904500001006",
            "category": "Beverages",
            "price": Decimal("149.00"),
            "stock": 90,
            "img_url": None,
            "status": "active",
        },
        {
            "name": "Gulab Jamun (2 pcs)",
            "sku": "RST-DES-007",
            "barcode": "8904500001007",
            "category": "Desserts",
            "price": Decimal("79.00"),
            "stock": 70,
            "img_url": None,
            "status": "active",
        },
        {
            "name": "Chocolate Brownie Sundae",
            "sku": "RST-DES-008",
            "barcode": "8904500001008",
            "category": "Desserts",
            "price": Decimal("189.00"),
            "stock": 40,
            "img_url": None,
            "status": "inactive",
        },
    ]


def seed_products() -> None:
    """Insert or update products for the configured tenant/store."""
    created = 0
    updated = 0

    with SessionLocal() as session:
        for payload in product_rows():
            stmt = select(Product).where(
                Product.tenant_id == TENANT_ID,
                Product.sku == payload["sku"],
            )
            existing = session.execute(stmt).scalar_one_or_none()

            if existing:
                for field, value in payload.items():
                    setattr(existing, field, value)
                existing.store_id = STORE_ID
                updated += 1
            else:
                session.add(
                    Product(
                        tenant_id=TENANT_ID,
                        store_id=STORE_ID,
                        **payload,
                    )
                )
                created += 1

        session.commit()

    print(f"Seeded products. created={created}, updated={updated}")


if __name__ == "__main__":
    seed_products()
