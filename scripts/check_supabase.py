import asyncio
import logging
from app.db.session import get_supabase_client, engine
from app.models.base import Base
from sqlalchemy import text

# Import all models to ensure complete metadata registration
from app.models.user import User
from app.models.session import VoiceSession
from app.models.execution import AgentExecution
from app.models.embedding import EmbeddingMemory
from app.models.client import Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    logger.info("Checking Supabase connection and tables...")
    
    client = get_supabase_client()
    if client:
        try:
            res = client.table("voice_sessions").select("id").limit(1).execute()
            logger.info("Table 'voice_sessions' exists in Supabase REST API!")
        except Exception as e:
            logger.warning(f"REST API check for 'voice_sessions': {e}")
            
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
            tables = [row[0] for row in result.fetchall()]
            logger.info(f"Existing public tables in PostgreSQL: {tables}")
            
            logger.info("Creating missing tables via SQLAlchemy Base.metadata.create_all...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Tables successfully initialized!")
    except Exception as e:
        logger.error(f"PostgreSQL direct connection error: {e}")


if __name__ == "__main__":
    asyncio.run(main())
