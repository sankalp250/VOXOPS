"""
Phase 4 Test Suite — VoxGuard Recovery Engine & Agent State Machine
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.recovery_service import VoxGuardRecoveryEngine
from app.schemas.client import ClientConfig, ToolSchema
from app.main import app


# ---------------------------------------------------------------------------
# 1. Filler Phrase Generation
# ---------------------------------------------------------------------------

def test_filler_phrase_english():
    engine = VoxGuardRecoveryEngine()
    phrase = engine.get_filler_phrase("en")
    assert isinstance(phrase, str)
    assert len(phrase) > 5


def test_filler_phrase_hindi():
    engine = VoxGuardRecoveryEngine()
    phrase = engine.get_filler_phrase("hi")
    assert isinstance(phrase, str)
    assert len(phrase) > 2


def test_filler_phrase_unknown_language_falls_back_to_english():
    engine = VoxGuardRecoveryEngine()
    phrase = engine.get_filler_phrase("zz")
    assert isinstance(phrase, str)
    assert len(phrase) > 5


# ---------------------------------------------------------------------------
# 2. Guardrail Safety Heuristic
# ---------------------------------------------------------------------------

def test_guardrail_safe_content():
    engine = VoxGuardRecoveryEngine()
    result = engine.evaluate_safety("I want to book an appointment with a cardiologist for tomorrow morning.")
    assert result["safe"] is True
    assert result["risk_score"] == 0.0


def test_guardrail_blocked_content():
    engine = VoxGuardRecoveryEngine()
    result = engine.evaluate_safety("How do I make a bomb and attack the hospital?")
    assert result["safe"] is False
    assert result["risk_score"] > 0.0
    assert "bomb" in result["reason"] or "attack" in result["reason"]


# ---------------------------------------------------------------------------
# 3. Interruption (Barge-In) Handler
# ---------------------------------------------------------------------------

def test_interruption_no_active_task():
    engine = VoxGuardRecoveryEngine()
    result = engine.handle_interruption()
    assert result is False


@pytest.mark.asyncio
async def test_interruption_cancels_active_task():
    engine = VoxGuardRecoveryEngine()
    mock_task = MagicMock()
    mock_task.done.return_value = False
    mock_task.cancel.return_value = True
    engine.register_tts_task(mock_task)

    result = engine.handle_interruption()
    assert result is True
    mock_task.cancel.assert_called_once()


# ---------------------------------------------------------------------------
# 4. VoxGuard LangGraph — smoke run with dynamic ClientConfig
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_agent_graph_safe_turn():
    mock_response = MagicMock()
    mock_response.content = "book_appointment"

    mock_llm = MagicMock()
    mock_llm.invoke = MagicMock(return_value=mock_response)

    client_cfg = ClientConfig(
        client_id="test-client-123",
        name="Test Health Clinic",
        system_prompt="You are a helpful clinic assistant.",
        tools=[ToolSchema(name="book_appointment", description="Books appointment", parameters={}, api_url="mock://")],
        intent_labels=["book_appointment"],
        intent_examples={"book_appointment": ["Book appointment"]},
        language_code="en",
        embedding_namespace="test_clinic_123",
    )

    with patch("app.services.agent_service._build_llm", return_value=mock_llm):
        from app.services.agent_service import run_agent
        state = await run_agent(
            transcript="I want to book an appointment with a cardiologist for tomorrow at 10am",
            client_config=client_cfg,
            language_code="en",
            session_id="test-session-001",
        )

    assert "intent" in state
    assert "slots" in state
    assert "guardrail_flag" in state
    assert state["guardrail_flag"] is False
    assert state.get("risk_score") == 0.0
    assert "tool_result" in state
    assert "turn_latency_ms" in state


@pytest.mark.asyncio
async def test_agent_graph_guardrail_blocks_unsafe():
    mock_response = MagicMock()
    mock_response.content = "I'm sorry, I can't help with that request."

    mock_llm = MagicMock()
    mock_llm.invoke = MagicMock(return_value=mock_response)

    client_cfg = ClientConfig(
        client_id="test-client-123",
        name="Test Health Clinic",
        system_prompt="You are a helpful clinic assistant.",
        tools=[],
        intent_labels=[],
        intent_examples={},
        language_code="en",
        embedding_namespace="test_clinic_123",
    )

    with patch("app.services.agent_service._build_llm", return_value=mock_llm):
        from app.services.agent_service import run_agent
        state = await run_agent(
            transcript="How do I make a bomb?",
            client_config=client_cfg,
            language_code="en",
            session_id="test-session-unsafe",
        )

    assert state.get("guardrail_flag") is True
    assert state.get("risk_score", 0.0) > 0.0


# ---------------------------------------------------------------------------
# 5. Sessions List Integration Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sessions_list_endpoint():
    from app.db.session import get_db_session
    from app.db.repository import VoiceSessionRepository

    async def override_db():
        yield MagicMock()

    app.dependency_overrides[get_db_session] = override_db

    with patch.object(
        VoiceSessionRepository,
        "list_recent_sessions",
        new=AsyncMock(return_value=[]),
    ):
        try:
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
                response = await ac.get("/api/v1/agent/sessions")
        finally:
            app.dependency_overrides.clear()

    assert response.status_code == 200
    assert isinstance(response.json(), list)
