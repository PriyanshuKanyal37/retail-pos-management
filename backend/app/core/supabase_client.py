"""
Supabase Client Configuration
Handles Supabase client initialization and configuration for storage operations.
"""

from supabase import create_client, Client
from app.core.config import settings
import logging
import os

logger = logging.getLogger(__name__)

class SupabaseManager:
    """Singleton manager for Supabase client"""

    _instance = None
    _client: Client = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _initialize_client(self):
        """Initialize Supabase client with better error handling"""
        if self._initialized:
            return

        try:
            # Check if environment variables are set
            supabase_url = getattr(settings, 'supabase_project_url', None) or os.getenv('SUPABASE_PROJECT_URL')
            supabase_key = getattr(settings, 'supabase_service_role_key', None) or os.getenv('SUPABASE_SERVICE_ROLE_KEY')

            if not supabase_url or not supabase_key:
                logger.warning("Supabase environment variables not found. Client will be disabled.")
                self._client = None
                self._initialized = True
                return

            # Initialize client with minimal options to avoid proxy issues
            self._client = create_client(
                supabase_url=supabase_url,
                supabase_key=supabase_key
            )
            logger.info("Supabase client initialized successfully")
            self._initialized = True

        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            self._client = None
            self._initialized = True

    @property
    def client(self) -> Client:
        """Get Supabase client instance"""
        if not self._initialized:
            self._initialize_client()
        return self._client

    @property
    def is_available(self) -> bool:
        """Check if Supabase client is available"""
        return self._client is not None

    @property
    def products_bucket(self) -> str:
        """Get products bucket name"""
        return getattr(settings, 'supabase_products_bucket', 'products') or os.getenv('SUPABASE_PRODUCTS_BUCKET', 'products')

    @property
    def invoices_bucket(self) -> str:
        """Get invoices bucket name"""
        return getattr(settings, 'supabase_invoices_bucket', 'invoices') or os.getenv('SUPABASE_INVOICES_BUCKET', 'invoices')

    @property
    def branding_bucket(self) -> str:
        """Get branding bucket name"""
        return getattr(settings, 'supabase_branding_bucket', 'branding') or os.getenv('SUPABASE_BRANDING_BUCKET', 'branding')


# Global instance for easy access
supabase_manager = SupabaseManager()

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    return supabase_manager.client

def is_supabase_available() -> bool:
    """Check if Supabase is available"""
    return supabase_manager.is_available