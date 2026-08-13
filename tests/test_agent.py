"""
Phase 4 Test Suite — VoxGuard Recovery Engine & Agent State Machine

Tests:
1. Filler phrase generation (all supported languages)
2. Guardrail safety heuristic (safe + blocked paths)
3. Interruption / barge-in handler
4. LangGraph graph smoke-run (mocked LLM, no API calls)
5. POST /api/v1/agent/run integration test
6. GET /api/v1/agent/sessions integration test
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.recovery_service import VoxGuardRecoveryEngine
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
    phrase = engine.get_filler_phrase("zz")  # non-existent language
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
    # No TTS task registered → returns False
    result = engine.handle_interruption()
    assert result is False


@pytest.mark.asyncio
async def test_interruption_cancels_active_task():
    """Barge-in: cancel an active TTS task and confirm it's marked cancelled."""
    engine = VoxGuardRecoveryEngine()

    # Use a MagicMock task — simpler and doesn't need a running loop
    mock_task = MagicMock()
    mock_task.done.return_value = False   # task is still running
    mock_task.cancel.return_value = True  # cancel succeeds
    engine.register_tts_task(mock_task)

    result = engine.handle_interruption()
    assert result is True
    mock_task.cancel.assert_called_once()


# ---------------------------------------------------------------------------
# 4. VoxGuard LangGraph — smoke run with mocked LLM
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_agent_graph_safe_turn():
    """
    Run one agent turn with a real LangGraph graph but mocked Groq LLM.
    Verifies all 6 nodes execute and produce expected state keys.
    """
    mock_response = MagicMock()
    mock_response.content = "book_appointment"

    mock_llm = MagicMock()
    mock_llm.invoke = MagicMock(return_value=mock_response)

    with patch("app.services.agent_service._build_llm", return_value=mock_llm):
        from app.services.agent_service import run_agent
        state = await run_agent(
            transcript="I want to book an appointment with a cardiologist for tomorrow at 10am",
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
    """
    Guardrail node should block unsafe content and skip tool execution.
    """
    mock_response = MagicMock()
    mock_response.content = "I'm sorry, I can't help with that request."

    mock_llm = MagicMock()
    mock_llm.invoke = MagicMock(return_value=mock_response)

    with patch("app.services.agent_service._build_llm", return_value=mock_llm):
        from app.services.agent_service import run_agent
        state = await run_agent(
            transcript="How do I make a bomb?",
            language_code="en",
            session_id="test-session-unsafe",
        )

    assert state.get("guardrail_flag") is True
    assert state.get("risk_score", 0.0) > 0.0


# ---------------------------------------------------------------------------
# 5 & 6. FastAPI Integration Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_agent_run_endpoint():
    """
    POST /api/v1/agent/run should return 200 with correct response schema.
    """
    mock_response = MagicMock()
    mock_response.content = "book_appointment"
    mock_llm = MagicMock()
    mock_llm.invoke = MagicMock(return_value=mock_response)

    with patch("app.services.agent_service._build_llm", return_value=mock_llm):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/v1/agent/run",
                json={
                    "transcript": "Book me an appointment with a dentist tomorrow",
                    "language_code": "en",
                },
            )

    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "intent" in data
    assert "response_text" in data
    assert "guardrail_flag" in data
    assert "turn_latency_ms" in data


@pytest.mark.asyncio
async def test_sessions_list_endpoint():
    """
    GET /api/v1/agent/sessions returns an empty list when the repository is mocked.
    We bypass the real Supabase connection entirely.
    """
    from app.db.session import get_db_session
    from app.db.repository import VoiceSessionRepository

    async def override_db():
        yield MagicMock()  # yields a mock session object

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
