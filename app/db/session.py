import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

import socket
from urllib.parse import urlparse

# Format Database URL with resilient DNS check and SQLite fallback
def get_db_url() -> str:
    url = settings.DATABASE_URL
    if not url or "sqlite" in url:
        return "sqlite+aiosqlite:///./voxops.db"

    # Convert postgresql:// to postgresql+asyncpg:// if not specified
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Validate remote hostname DNS resolution to avoid crashing on dead/paused Supabase projects
    try:
        clean_url = url.replace("+asyncpg", "")
        parsed = urlparse(clean_url)
        if parsed.hostname and not parsed.hostname.startswith("localhost") and parsed.hostname != "127.0.0.1":
            socket.getaddrinfo(parsed.hostname, parsed.port or 5432)
    except socket.gaierror as dns_err:
        logger.warning(
            f"Configured database host '{parsed.hostname}' is unreachable ({dns_err}). "
            f"Falling back to local persistent SQLite 'sqlite+aiosqlite:///./voxops.db' for seamless operation."
        )
        return "sqlite+aiosqlite:///./voxops.db"
    except Exception as e:
        logger.debug(f"Database URL check exception: {e}")

    return url


# Create Async SQLAlchemy Engine
_db_url = get_db_url()
_engine_kwargs = {
    "echo": settings.DEBUG,
    "future": True,
}
if "sqlite" in _db_url:
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs["pool_pre_ping"] = True

engine = create_async_engine(_db_url, **_engine_kwargs)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Supabase Native Client Singleton
_supabase_client: Client | None = None


def get_supabase_client() -> Client | None:
    """
    Returns configured Supabase native client for Auth, Storage, and REST API access.
    """
    global _supabase_client
    if _supabase_client is None:
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            try:
                _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Supabase client successfully initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
        else:
            logger.warning("Supabase URL or Key not set in environment.")
    return _supabase_client


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency injection for FastAPI endpoints providing an Async SQLAlchemy session.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
