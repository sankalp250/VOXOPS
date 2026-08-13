"""
VoxGuard Agent API Endpoint — Phase 4

POST /api/v1/agent/run
    Accepts a transcript + language code, runs the full LangGraph state machine,
    logs every turn to Supabase, and returns a structured JSON response.

GET /api/v1/agent/sessions
    Returns the 20 most recent voice sessions with basic metadata.
"""
from __future__ import annotations

import uuid as _uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.db.repository import VoiceSessionRepository
from app.services.agent_service import run_agent

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class AgentRunRequest(BaseModel):
    transcript: str = Field(..., min_length=1, description="Transcribed user speech text")
    language_code: str = Field("en", description="ISO language code (e.g. en, hi, ta)")
    session_id: Optional[str] = Field(None, description="Existing session UUID to continue; omit to start new")


class AgentRunResponse(BaseModel):
    session_id: str
    intent: Optional[str]
    slots: Optional[dict]
    response_text: Optional[str]
    guardrail_flag: bool
    risk_score: float
    turn_latency_ms: int
    provider: str = "VoxGuard-LangGraph"


class SessionSummary(BaseModel):
    id: str
    title: str
    status: str
    language_code: str
    duration_seconds: float
    interruption_count: int
    filler_count: int
    risk_score: float


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/run", response_model=AgentRunResponse, summary="Run VoxGuard Agent Turn")
async def agent_run(
    body: AgentRunRequest,
    db: AsyncSession = Depends(get_db_session),
) -> AgentRunResponse:
    """
    Executes one full turn of the VoxGuard LangGraph state machine:
    Language Detect → Guardrail → Intent → Slots → Tool Execute → Respond.

    Logs session telemetry (latency, risk score, guardrail verdict) to Supabase.
    """
    # 1. Create or reuse voice session
    session_id_str = body.session_id or str(_uuid.uuid4())
    voice_session = await VoiceSessionRepository.create_session(
        db=db,
        title=f"Agent Turn — {body.transcript[:40]}",
        language_code=body.language_code,
    )

    # 2. Run the full VoxGuard LangGraph state machine
    try:
        final_state = await run_agent(
            transcript=body.transcript,
            language_code=body.language_code,
            session_id=session_id_str,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"VoxGuard agent error: {exc}",
        ) from exc

    # 3. Persist telemetry to Supabase
    latency = final_state.get("turn_latency_ms") or 0
    risk = float(final_state.get("risk_score") or 0.0)
    guardrail = bool(final_state.get("guardrail_flag"))
    tool_result = final_state.get("tool_result") or {}
    response_text = str(tool_result.get("response_text", ""))

    await VoiceSessionRepository.update_session_telemetry(
        db=db,
        session_id=voice_session.id,
        transcript=body.transcript,
        duration_seconds=latency / 1000.0,
        risk_score=risk,
        status="blocked" if guardrail else "completed",
    )

    await VoiceSessionRepository.log_agent_execution(
        db=db,
        session_id=voice_session.id,
        agent_name="VoxGuard-LangGraph",
        stt_provider="upstream",
        tts_provider="pending",
        llm_model="deepseek-r1-distill-llama-70b",
        thought_process={
            "intent": final_state.get("intent"),
            "slots": final_state.get("slots"),
        },
        turn_latency_ms=latency,
        guardrail_verdict="blocked" if guardrail else "approved",
        execution_result=tool_result,
        loaded_cost_usd=0.0,
    )

    return AgentRunResponse(
        session_id=str(voice_session.id),
        intent=final_state.get("intent"),
        slots=final_state.get("slots"),
        response_text=response_text,
        guardrail_flag=guardrail,
        risk_score=risk,
        turn_latency_ms=latency,
    )


@router.get("/sessions", response_model=List[SessionSummary], summary="List Recent Voice Sessions")
async def list_sessions(
    db: AsyncSession = Depends(get_db_session),
) -> List[SessionSummary]:
    """
    Returns the 20 most recent VoiceSession records from Supabase,
    including telemetry fields (interruption_count, filler_count, risk_score).
    """
    sessions = await VoiceSessionRepository.list_recent_sessions(db, limit=20)
    return [
        SessionSummary(
            id=str(s.id),
            title=s.title,
            status=s.status,
            language_code=s.language_code,
            duration_seconds=s.duration_seconds,
            interruption_count=s.interruption_count,
            filler_count=s.filler_count,
            risk_score=s.risk_score,
        )
        for s in sessions
    ]
