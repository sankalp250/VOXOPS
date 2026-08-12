import logging
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

# Format Database URL to use asyncpg or psycopg
def get_db_url() -> str:
    url = settings.DATABASE_URL
    if not url:
        # Fallback in-memory SQLite for testing if DB_URL not provided
        return "sqlite+aiosqlite:///:memory:"
    # Convert postgresql:// to postgresql+asyncpg:// if not specified
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


# Create Async SQLAlchemy Engine
engine = create_async_engine(
    get_db_url(),
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
)

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
