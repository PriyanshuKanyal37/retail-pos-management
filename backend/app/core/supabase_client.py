"""
Supabase Client Configuration
Handles Supabase client initialization and configuration for storage operations.
"""

from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class SupabaseManager:
    """Singleton manager for Supabase client"""

    _instance = None
    _client: Client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize_client()
        return cls._instance

    def _initialize_client(self):
        """Initialize Supabase client"""
        try:
            self._client = create_client(
                supabase_url=settings.supabase_project_url,
                supabase_key=settings.supabase_service_role_key
            )
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise

    @property
    def client(self) -> Client:
        """Get Supabase client instance"""
        if self._client is None:
            self._initialize_client()
        return self._client

    @property
    def products_bucket(self) -> str:
        """Get products bucket name"""
        return settings.supabase_products_bucket

    @property
    def invoices_bucket(self) -> str:
        """Get invoices bucket name"""
        return settings.supabase_invoices_bucket

    @property
    def branding_bucket(self) -> str:
        """Get branding bucket name"""
        return settings.supabase_branding_bucket


# Global instance for easy access
supabase_manager = SupabaseManager()

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    return supabase_manager.client