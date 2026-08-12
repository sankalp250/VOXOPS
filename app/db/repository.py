from typing import List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.models.session import VoiceSession
from app.models.execution import AgentExecution
from app.models.embedding import EmbeddingMemory


class VoiceSessionRepository:
    """
    Async Repository layer handling database transactions for voice sessions and agent executions.
    """

    @staticmethod
    async def create_session(
        db: AsyncSession,
        title: str,
        user_id: Optional[uuid.UUID] = None,
        language_code: str = "en",
    ) -> VoiceSession:
        session = VoiceSession(
            title=title,
            user_id=user_id,
            language_code=language_code,
            status="in_progress",
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_session(db: AsyncSession, session_id: uuid.UUID) -> Optional[VoiceSession]:
        result = await db.execute(select(VoiceSession).where(VoiceSession.id == session_id))
        return result.scalars().first()

    @staticmethod
    async def update_session_telemetry(
        db: AsyncSession,
        session_id: uuid.UUID,
        transcript: str,
        duration_seconds: float,
        interruption_count: int = 0,
        filler_count: int = 0,
        risk_score: float = 0.0,
        status: str = "completed",
    ) -> Optional[VoiceSession]:
        session = await VoiceSessionRepository.get_session(db, session_id)
        if session:
            session.transcript = transcript
            session.duration_seconds = duration_seconds
            session.interruption_count += interruption_count
            session.filler_count += filler_count
            session.risk_score = risk_score
            session.status = status
            await db.commit()
            await db.refresh(session)
        return session

    @staticmethod
    async def log_agent_execution(
        db: AsyncSession,
        session_id: uuid.UUID,
        agent_name: str,
        stt_provider: str,
        tts_provider: str,
        llm_model: str,
        thought_process: dict,
        turn_latency_ms: int,
        guardrail_verdict: str = "approved",
        execution_result: Optional[dict] = None,
        loaded_cost_usd: float = 0.0,
    ) -> AgentExecution:
        execution = AgentExecution(
            session_id=session_id,
            agent_name=agent_name,
            stt_provider=stt_provider,
            tts_provider=tts_provider,
            llm_model=llm_model,
            thought_process=thought_process,
            turn_latency_ms=turn_latency_ms,
            guardrail_verdict=guardrail_verdict,
            execution_result=execution_result or {},
            loaded_cost_usd=loaded_cost_usd,
        )
        db.add(execution)
        await db.commit()
        await db.refresh(execution)
        return execution

    @staticmethod
    async def list_recent_sessions(db: AsyncSession, limit: int = 20) -> List[VoiceSession]:
        result = await db.execute(
            select(VoiceSession).order_by(VoiceSession.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())
