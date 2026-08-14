import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.repository import VoiceSessionRepository


@pytest.mark.asyncio
async def test_create_and_get_voice_session(db_session: AsyncSession):
    # Create new session
    voice_session = await VoiceSessionRepository.create_session(
        db=db_session,
        title="Dental Appointment Booking Test",
        language_code="hi",
    )
    assert voice_session.id is not None
    assert voice_session.title == "Dental Appointment Booking Test"
    assert voice_session.status == "in_progress"

    # Update telemetry (fillers, interruptions)
    updated_session = await VoiceSessionRepository.update_session_telemetry(
        db=db_session,
        session_id=voice_session.id,
        transcript="I want to book an appointment for tomorrow.",
        duration_seconds=42.5,
        interruption_count=2,
        filler_count=1,
        risk_score=0.05,
        status="completed",
    )
    assert updated_session is not None
    assert updated_session.interruption_count == 2
    assert updated_session.filler_count == 1
    assert updated_session.duration_seconds == 42.5
    assert updated_session.status == "completed"


@pytest.mark.asyncio
async def test_log_agent_execution(db_session: AsyncSession):
    voice_session = await VoiceSessionRepository.create_session(
        db=db_session,
        title="Cardiologist Availability Check",
    )

    execution = await VoiceSessionRepository.log_agent_execution(
        db=db_session,
        session_id=voice_session.id,
        agent_name="VoxGuard-Dental-Bot",
        stt_provider="groq_whisper",
        tts_provider="elevenlabs",
        llm_model="deepseek-r1-distill-llama-70b",
        thought_process={"intent": "book_appointment", "slot": "cardiologist"},
        turn_latency_ms=450,
        guardrail_verdict="approved",
        execution_result={"status": "slot_found", "slot_time": "14:00"},
        loaded_cost_usd=0.0012,
    )
    assert execution.id is not None
    assert execution.session_id == voice_session.id
    assert execution.turn_latency_ms == 450
    assert execution.guardrail_verdict == "approved"
    assert execution.loaded_cost_usd == 0.0012
