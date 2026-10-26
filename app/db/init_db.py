import logging
from app.db.session import engine
from app.models.base import Base
# Import all models to ensure SQLAlchemy registers them before create_all
from app.models.user import User
from app.models.session import VoiceSession
from app.models.execution import AgentExecution
from app.models.embedding import EmbeddingMemory
from app.models.client import Client
from app.db.session import AsyncSessionLocal
from sqlalchemy.future import select

logger = logging.getLogger(__name__)


async def init_db():
    """
    Initializes database tables asynchronously using SQLAlchemy 2.0 metadata
    and ensures at least one default client tenant exists.
    """
    try:
        async with engine.begin() as conn:
            logger.info("Initializing database tables...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables successfully created.")

        # Seed initial demo client if table is empty
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Client).limit(1))
            existing = result.scalars().first()
            if not existing:
                logger.info("Seeding default VoxOps Demo Client tenant...")
                import uuid
                demo_client = Client(
                    id=uuid.uuid4(),
                    name="VoxOps AI Assistant",
                    system_prompt="You are VoxOps, an enterprise-grade voice AI operations assistant. You are concise, helpful, and professional.",
                    tools_config=[
                        {
                            "name": "check_status",
                            "description": "Checks system operational status or customer order status",
                            "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
                            "api_url": "mock://status_check"
                        }
                    ],
                    intent_examples={
                        "check_status": ["what is the status", "check system health", "track my order", "how are operations"],
                        "general_faq": ["hello", "who are you", "what can you do", "help me"]
                    },
                    language_code="en",
                    embedding_namespace="voxops_demo_default",
                    is_active=True,
                    api_key="vox_demo_default_key_12345"
                )
                db.add(demo_client)
                await db.commit()
                logger.info(f"Default tenant seeded: {demo_client.name} (id: {demo_client.id})")
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        raise
