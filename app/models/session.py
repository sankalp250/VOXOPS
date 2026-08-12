from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import String, Float, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


def now_utc() -> datetime:
    """Returns current UTC timestamp with timezone information."""
    return datetime.now(timezone.utc)


class VoiceSession(Base):
    """
    VoiceSession ORM Model representing real-time voice interactions.
    Tracks session telemetry including interruption counts, tool latency fillers, and risk scores.
    """
    __tablename__ = "voice_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    audio_file_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    language_code: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    loop_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    interruption_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    filler_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="completed", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
