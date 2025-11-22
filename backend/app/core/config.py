from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    project_name: str = "FA POS Backend"
    api_prefix: str = "/api/v1"
    frontend_origins: List[str] = ["http://localhost:5173"]

    supabase_db_url: str
    supabase_service_role_key: str
    supabase_project_url: str
    supabase_products_bucket: str = "products"
    supabase_invoices_bucket: str = "invoices"
    supabase_branding_bucket: str = "branding"

    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    def cors_origins_for_fastapi(self) -> List[str]:
        return self.frontend_origins


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
