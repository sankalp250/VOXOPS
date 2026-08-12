from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
from sqlalchemy import Text, JSON, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


def now_utc() -> datetime:
    """Returns current UTC timestamp with timezone information."""
    return datetime.now(timezone.utc)


class EmbeddingMemory(Base):
    """
    EmbeddingMemory ORM Model storing transcript chunks
    and metadata for pgvector similarity search across voice sessions.
    """
    __tablename__ = "embeddings_memory"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("voice_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_info: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
