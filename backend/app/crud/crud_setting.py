"""
CRUD operations for Setting model.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.setting import Setting
from app.schemas.setting import SettingUpdate


class CRUDSetting(CRUDBase[Setting, dict, SettingUpdate]):
    """
    CRUD operations for Setting model with multi-tenant support.
    """

    def get_by_tenant(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> Optional[Setting]:
        """
        Get settings for a specific tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Setting instance or None if not found
        """
        query = select(Setting).where(Setting.tenant_id == tenant_id)
        result =  db.execute(query)
        return result.scalar_one_or_none()

    def create_or_update(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        setting_data: dict
    ) -> Setting:
        """
        Create or update settings for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID
            setting_data: Settings data

        Returns:
            Created or updated setting instance
        """
        # Try to get existing settings
        existing_setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if existing_setting:
            # Update existing settings
            update_data = {k: v for k, v in setting_data.items() if v is not None}
            return  self.update(db, db_obj=existing_setting, obj_in=update_data)
        else:
            # Create new settings
            setting_data["tenant_id"] = tenant_id
            return  self.create(db, obj_in=setting_data)

    def update_theme(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        theme: str
    ) -> Optional[Setting]:
        """
        Update the theme setting for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID
            theme: Theme name (light, dark, etc.)

        Returns:
            Updated setting instance or None if not found
        """
        setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if setting:
            setting.theme = theme
             db.commit()
             db.refresh(setting)

        return setting

    def update_low_stock_threshold(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        threshold: int
    ) -> Optional[Setting]:
        """
        Update the low stock threshold for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID
            threshold: Low stock threshold value

        Returns:
            Updated setting instance or None if not found
        """
        setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if setting:
            setting.low_stock_threshold = threshold
             db.commit()
             db.refresh(setting)

        return setting

    def update_store_info(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        store_name: str,
        store_address: Optional[str] = None,
        store_phone: Optional[str] = None,
        store_email: Optional[str] = None,
        store_logo_url: Optional[str] = None
    ) -> Optional[Setting]:
        """
        Update store information for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID
            store_name: Store name
            store_address: Store address
            store_phone: Store phone
            store_email: Store email
            store_logo_url: Store logo URL

        Returns:
            Updated setting instance or None if not found
        """
        setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if setting:
            setting.store_name = store_name
            if store_address is not None:
                setting.store_address = store_address
            if store_phone is not None:
                setting.store_phone = store_phone
            if store_email is not None:
                setting.store_email = store_email
            if store_logo_url is not None:
                setting.store_logo_url = store_logo_url

             db.commit()
             db.refresh(setting)

        return setting

    def update_payment_settings(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        upi_id: Optional[str] = None,
        currency_symbol: Optional[str] = None,
        currency_code: Optional[str] = None
    ) -> Optional[Setting]:
        """
        Update payment settings for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID
            upi_id: UPI ID
            currency_symbol: Currency symbol
            currency_code: Currency code

        Returns:
            Updated setting instance or None if not found
        """
        setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if setting:
            if upi_id is not None:
                setting.upi_id = upi_id
            if currency_symbol is not None:
                setting.currency_symbol = currency_symbol
            if currency_code is not None:
                setting.currency_code = currency_code

             db.commit()
             db.refresh(setting)

        return setting

    def update_tax_rate(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        tax_rate: float
    ) -> Optional[Setting]:
        """
        Update the tax rate for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID
            tax_rate: Tax rate as percentage

        Returns:
            Updated setting instance or None if not found
        """
        setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if setting:
            setting.tax_rate = tax_rate
             db.commit()
             db.refresh(setting)

        return setting

    def get_tenant_currency_info(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> dict:
        """
        Get currency information for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Dictionary with currency information
        """
        setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if setting:
            return {
                "currency_symbol": setting.currency_symbol or "Rs.",
                "currency_code": setting.currency_code or "INR",
                "tax_rate": float(setting.tax_rate or 0),
            }
        else:
            # Return default values
            return {
                "currency_symbol": "Rs.",
                "currency_code": "INR",
                "tax_rate": 0.0,
            }

    def get_tenant_low_stock_threshold(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> int:
        """
        Get low stock threshold for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Low stock threshold value (default: 5)
        """
        setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if setting and setting.low_stock_threshold is not None:
            return setting.low_stock_threshold

        return 5  # Default threshold

    def get_tenant_theme(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> str:
        """
        Get theme for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Theme name (default: "light")
        """
        setting =  self.get_by_tenant(db, tenant_id=tenant_id)

        if setting and setting.theme:
            return setting.theme

        return "light"  # Default theme


# Create a singleton instance
crud_setting = CRUDSetting(Setting)
