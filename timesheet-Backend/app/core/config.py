from typing import List, Optional, Any
import urllib.parse
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


def _clean_asyncpg_url(v: str | None) -> str:
    if not v or not isinstance(v, str):
        return "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/timesheet_db"
    
    url = v.strip().strip('"').strip("'")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urllib.parse.urlsplit(url)
    query_params = urllib.parse.parse_qs(parsed.query)

    # asyncpg doesn't accept libpq's channel_binding parameter
    query_params.pop("channel_binding", None)

    # Convert sslmode to ssl for asyncpg
    if "sslmode" in query_params:
        ssl_val = query_params.pop("sslmode")
        if "ssl" not in query_params:
            query_params["ssl"] = ssl_val

    clean_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, clean_query, parsed.fragment)
    )


class Settings(BaseSettings):
    PROJECT_NAME: str = "Timesheet Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/timesheet_db"
    DATABASE_URL_UNPOOLED: Optional[str] = None
    
    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str | None) -> str:
        import os
        v = os.getenv("DATABASE_URL", v)
        return _clean_asyncpg_url(v)

    @field_validator("DATABASE_URL_UNPOOLED", mode="before")
    @classmethod
    def assemble_unpooled_db_url(cls, v: str | None) -> Optional[str]:
        import os
        val = os.getenv("DATABASE_URL_UNPOOLED", v)
        if val:
            return _clean_asyncpg_url(val)
        return None

    SECRET_KEY: str = "super_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    GOOGLE_CLIENT_ID: str = ""

    # Default admin account seeded into the database on first run.
    ADMIN_EMAIL: str = "admin@yourcompany.com"

    # CORS
    FRONTEND_URLS: List[str] = [
        "https://super-time.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:80",
        "http://localhost",
    ]

    @field_validator("FRONTEND_URLS", mode="before")
    @classmethod
    def assemble_frontend_urls(cls, v: Any) -> List[str]:
        if not v:
            return [
                "https://super-time.vercel.app",
                "http://localhost:3000",
                "http://localhost:5173",
                "http://localhost",
            ]
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    urls = json.loads(v)
                except Exception:
                    urls = [u.strip().strip('"').strip("'") for u in v.strip("[]").split(",") if u.strip()]
            else:
                urls = [u.strip().strip('"').strip("'") for u in v.split(",") if u.strip()]
        elif isinstance(v, (list, tuple)):
            urls = list(v)
        else:
            urls = []

        cleaned = [str(u).rstrip("/") for u in urls if u]
        if "https://super-time.vercel.app" not in cleaned:
            cleaned.append("https://super-time.vercel.app")
        return cleaned

    # SMTP Email Settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # Slack Integration Settings
    SLACK_BOT_TOKEN: str = ""
    SLACK_ACCESS_TOKEN: str = ""
    SLACK_REFRESH_TOKEN: str = ""
    SLACK_WEBHOOK_URL: str = ""
    SLACK_CHANNEL_ID: str = ""

    # Neon Services
    NEON_BRANCH: str = "production"
    NEON_AUTH_BASE_URL: str = ""
    NEON_AUTH_JWKS_URL: str = ""
    NEON_REALTIME_URL: str = ""
    NEON_REALTIME_SECRET: str = ""
    NEON_FUNCTION_HELLO_BASE_URL: str = ""

    # Neon Object Storage (S3-compatible)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_ENDPOINT_URL_S3: str = ""
    AWS_REGION: str = "us-east-2"
    NEON_STORAGE_BUCKET: str = "assets"

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
