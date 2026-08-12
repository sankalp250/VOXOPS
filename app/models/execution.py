from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid
from sqlalchemy import String, Integer, Float, JSON, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


def now_utc() -> datetime:
    """Returns current UTC timestamp with timezone information."""
    return datetime.now(timezone.utc)


class AgentExecution(Base):
    """
    AgentExecution ORM Model logging turn-by-turn reasoning, STT/TTS provider metrics,
    guardrail verdicts, and loaded minute cost telemetry.
    """
    __tablename__ = "agent_executions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("voice_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name: Mapped[str] = mapped_column(String(100), default="VoxGuard-Agent", nullable=False)
    stt_provider: Mapped[str] = mapped_column(String(50), default="groq_whisper", nullable=False)
    tts_provider: Mapped[str] = mapped_column(String(50), default="elevenlabs", nullable=False)
    llm_model: Mapped[str] = mapped_column(String(100), default="deepseek-r1-distill-llama-70b", nullable=False)
    thought_process: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    turn_latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    guardrail_verdict: Mapped[str] = mapped_column(String(50), default="approved", nullable=False)
    execution_result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    loaded_cost_usd: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, nullable=False)
