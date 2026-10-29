import asyncio
import os
import urllib.parse
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

import app.core.models  # noqa: F401
from alembic import context
from app.core.config import settings
from app.core.database import Base


def clean_db_url(url: str) -> str:
    """Sanitizes connection URL for asyncpg, stripping libpq-only parameters like channel_binding."""
    if not url:
        return url
    url = url.strip().strip('"').strip("'")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    parsed = urllib.parse.urlsplit(url)
    query_params = urllib.parse.parse_qs(parsed.query)

    # asyncpg does not accept libpq's channel_binding parameter
    query_params.pop("channel_binding", None)

    # Convert sslmode to ssl
    if "sslmode" in query_params:
        ssl_val = query_params.pop("sslmode")
        if "ssl" not in query_params:
            query_params["ssl"] = ssl_val

    clean_query = urllib.parse.urlencode(query_params, doseq=True)
    return urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, clean_query, parsed.fragment)
    )


config = context.config

raw_migration_url = (
    os.getenv("DATABASE_URL_UNPOOLED")
    or os.getenv("DATABASE_URL")
    or settings.DATABASE_URL_UNPOOLED
    or settings.DATABASE_URL
)
migration_url = clean_db_url(raw_migration_url)

config.set_main_option("sqlalchemy.url", migration_url.replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in async mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = migration_url
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
