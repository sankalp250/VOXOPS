import asyncio
import logging
from app.core.config import settings
from app.db.session import get_supabase_client, engine
from app.models.base import Base
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Checking Supabase connection and tables...")
    
    # 1. Check Supabase Native Client
    client = get_supabase_client()
    if client:
        try:
            res = client.table("voice_sessions").select("id").limit(1).execute()
            logger.info("Table 'voice_sessions' exists in Supabase REST API!")
        except Exception as e:
            logger.warning(f"REST API check for 'voice_sessions': {e}")
            
    # 2. Check direct PostgreSQL Connection Engine
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
            tables = [row[0] for row in result.fetchall()]
            logger.info(f"Existing public tables in PostgreSQL: {tables}")
            
            # Create all tables if missing
            logger.info("Creating missing tables via SQLAlchemy Base.metadata.create_all...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Tables successfully initialized!")
    except Exception as e:
        logger.error(f"PostgreSQL direct connection error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
