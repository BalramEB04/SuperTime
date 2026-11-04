from typing import AsyncGenerator
import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

# Critical for Supabase and Neon connection poolers (PgBouncer in transaction mode):
# asyncpg's statement cache MUST be set to 0. Otherwise subsequent queries
# routed across PgBouncer pool connections will fail intermittently with:
# 'prepared statement __asyncpg_stmt_X__ does not exist' (causing random 500 errors).
connect_args = {
    "statement_cache_size": 0,
    "prepared_statement_cache_size": 0,
    "command_timeout": 30,
    "server_settings": {
        "application_name": "supertime_serverless" if is_serverless else "supertime_local",
    },
}

# In serverless environments (Vercel / Lambda), use NullPool so that connections
# are closed immediately after each request instead of lingering open and hitting
# Supabase's max connection limits (EMAXCONNSESSION).
# Note: pool_pre_ping is omitted under NullPool to avoid an extra SELECT 1 round-trip
# on every fresh connection handshake.
if is_serverless:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        future=True,
        poolclass=NullPool,
        connect_args=connect_args,
    )
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        future=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=300,        # Recycle connections every 5 min
        pool_pre_ping=True,       # Detect disconnected connections before using them
        pool_timeout=30,
        connect_args=connect_args,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
