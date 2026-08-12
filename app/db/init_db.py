import logging
from app.db.session import engine
from app.models.base import Base
# Import all models to ensure SQLAlchemy registers them before create_all
from app.models.user import User
from app.models.session import VoiceSession
from app.models.execution import AgentExecution
from app.models.embedding import EmbeddingMemory

logger = logging.getLogger(__name__)


async def init_db():
    """
    Initializes database tables asynchronously using SQLAlchemy 2.0 metadata.
    """
    try:
        async with engine.begin() as conn:
            logger.info("Initializing database tables...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables successfully created.")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        raise
