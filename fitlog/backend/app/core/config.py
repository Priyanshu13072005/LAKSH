"""
LAKSH Backend - Core Configuration
Loads settings from environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings
from typing import List
import urllib.parse


class Settings(BaseSettings):
    # App
    APP_NAME: str = "LAKSH"
    APP_ENV: str = "development"

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "laksh_db"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""

    # Direct database connection string (from Render, Supabase, Neon, Railway, etc.)
    DATABASE_URL: str | None = None
    DATABASE_URL_OVERRIDE: str | None = None

    # JWT (Default 30 days retention so athlete sessions do not constantly expire)
    JWT_SECRET_KEY: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # Google Fit / OAuth Settings
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5173/activity"

    @property
    def effective_database_url(self) -> str:
        url = self.DATABASE_URL or self.DATABASE_URL_OVERRIDE
        if url:
            # SQLAlchemy 1.4/2.0 requires postgresql:// instead of legacy postgres://
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            return url
        escaped_password = urllib.parse.quote_plus(self.DB_PASSWORD)
        return (
            f"mysql+pymysql://{self.DB_USER}:{escaped_password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
