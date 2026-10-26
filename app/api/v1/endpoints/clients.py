"""
Client Management API Endpoints — Phase 4.5

CRUD for client tenants:
  POST   /api/v1/clients/           → Register a new client
  GET    /api/v1/clients/           → List all active clients
  GET    /api/v1/clients/{id}       → Get one client
  PUT    /api/v1/clients/{id}       → Update client configuration
  DELETE /api/v1/clients/{id}       → Soft-delete a client

Agent Run (now multi-tenant):
  POST   /api/v1/agent/run          → Run agent with X-Client-API-Key header or client_id in body
  GET    /api/v1/agent/sessions     → List recent sessions
"""
from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.db.client_repository import ClientRepository
from app.db.repository import VoiceSessionRepository
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate, ClientConfig, ToolSchema
from app.services.agent_service import run_agent

router = APIRouter()


# ---------------------------------------------------------------------------
# Helper: resolve ClientConfig from API key or client_id
# ---------------------------------------------------------------------------

async def _resolve_client(
    db: AsyncSession,
    api_key: str | None = None,
    client_id: str | None = None,
) -> ClientConfig:
    """
    Resolves a ClientConfig from either an API key or a client UUID.
    Raises 401 / 404 on failure.
    """
    client_db = None

    if api_key:
        client_db = await ClientRepository.get_by_api_key(db, api_key)
        if not client_db:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key.")

    elif client_id:
        try:
            cid = uuid.UUID(client_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid client_id format.")
        client_db = await ClientRepository.get_by_id(db, cid)
        if not client_db:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either 'X-Client-API-Key' header or 'client_id' in the request body.",
        )

    return ClientConfig.from_db_model(client_db)


# ---------------------------------------------------------------------------
# Client CRUD
# ---------------------------------------------------------------------------

@router.post("/clients", response_model=ClientResponse, status_code=201, summary="Register New Client Tenant")
async def create_client(
    body: ClientCreate,
    db: AsyncSession = Depends(get_db_session),
) -> ClientResponse:
    """
    Register a new client (tenant) on the VoxOps platform.
    Returns the client record including the API key — **save the API key immediately**, it won't be shown again.
    """
    client_db, raw_api_key = await ClientRepository.create_client(db, body)
    tools = [ToolSchema(**t) if isinstance(t, dict) else t for t in (client_db.tools_config or [])]
    return ClientResponse(
        id=str(client_db.id),
        name=client_db.name,
        system_prompt=client_db.system_prompt,
        tools=tools,
        intent_examples=client_db.intent_examples or {},
        language_code=client_db.language_code,
        embedding_namespace=client_db.embedding_namespace,
        is_active=client_db.is_active,
        api_key=raw_api_key,  # shown only once
    )


@router.get("/clients", response_model=List[ClientResponse], summary="List All Active Clients")
async def list_clients(db: AsyncSession = Depends(get_db_session)) -> List[ClientResponse]:
    clients = await ClientRepository.list_clients(db)
    result = []
    for c in clients:
        tools = [ToolSchema(**t) if isinstance(t, dict) else t for t in (c.tools_config or [])]
        result.append(ClientResponse(
            id=str(c.id), name=c.name, system_prompt=c.system_prompt,
            tools=tools, intent_examples=c.intent_examples or {},
            language_code=c.language_code, embedding_namespace=c.embedding_namespace,
            is_active=c.is_active, api_key=None,  # never expose key in list
        ))
    return result


@router.get("/clients/{client_id}", response_model=ClientResponse, summary="Get Client by ID")
async def get_client(client_id: str, db: AsyncSession = Depends(get_db_session)) -> ClientResponse:
    try:
        cid = uuid.UUID(client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid client_id.")
    client = await ClientRepository.get_by_id(db, cid)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    tools = [ToolSchema(**t) if isinstance(t, dict) else t for t in (client.tools_config or [])]
    return ClientResponse(
        id=str(client.id), name=client.name, system_prompt=client.system_prompt,
        tools=tools, intent_examples=client.intent_examples or {},
        language_code=client.language_code, embedding_namespace=client.embedding_namespace,
        is_active=client.is_active, api_key=None,
    )


@router.put("/clients/{client_id}", response_model=ClientResponse, summary="Update Client Configuration")
async def update_client(
    client_id: str,
    body: ClientUpdate,
    db: AsyncSession = Depends(get_db_session),
) -> ClientResponse:
    try:
        cid = uuid.UUID(client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid client_id.")
    client = await ClientRepository.update_client(db, cid, body)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    tools = [ToolSchema(**t) if isinstance(t, dict) else t for t in (client.tools_config or [])]
    return ClientResponse(
        id=str(client.id), name=client.name, system_prompt=client.system_prompt,
        tools=tools, intent_examples=client.intent_examples or {},
        language_code=client.language_code, embedding_namespace=client.embedding_namespace,
        is_active=client.is_active, api_key=None,
    )


@router.delete("/clients/{client_id}", status_code=204, summary="Delete (Soft) a Client", response_class=__import__('fastapi').Response)
async def delete_client(client_id: str, db: AsyncSession = Depends(get_db_session)):
    try:
        cid = uuid.UUID(client_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid client_id.")
    deleted = await ClientRepository.delete_client(db, cid)
    if not deleted:
        raise HTTPException(status_code=404, detail="Client not found.")


# ---------------------------------------------------------------------------
# Agent Run — now multi-tenant
# ---------------------------------------------------------------------------

class AgentRunRequest:
    """See agent.py for the Pydantic model."""
    pass


from pydantic import BaseModel
from typing import Optional

class AgentRunBody(BaseModel):
    transcript: str
    language_code: Optional[str] = None
    client_id: Optional[str] = None   # alternative to API key header


class AgentRunResponse(BaseModel):
    session_id: str
    client_id: str
    client_name: str
    intent: Optional[str] = None
    slots: Optional[dict] = None
    response_text: Optional[str] = None
    guardrail_flag: bool = False
    risk_score: float = 0.0
    turn_latency_ms: int = 0


class SessionSummary(BaseModel):
    id: str
    title: str
    status: str
    language_code: str
    duration_seconds: float
    interruption_count: int
    filler_count: int
    risk_score: float


@router.post("/agent/run", response_model=AgentRunResponse, summary="Run VoxGuard Agent (Multi-Tenant)")
async def agent_run(
    body: AgentRunBody,
    db: AsyncSession = Depends(get_db_session),
    x_client_api_key: Optional[str] = Header(None, alias="X-Client-API-Key"),
) -> AgentRunResponse:
    """
    Execute one full conversation turn using the authenticated client's configuration.

    Authentication: Pass `X-Client-API-Key: vox_<your_key>` in the header,
    OR include `client_id` in the request body.

    The agent's personality, intents, slots, and tools are entirely defined
    by the client's registered configuration — nothing is hardcoded.
    """
    # 1. Resolve client config
    cfg = await _resolve_client(db, api_key=x_client_api_key, client_id=body.client_id)

    # 2. Create voice session
    voice_session = await VoiceSessionRepository.create_session(
        db=db,
        title=f"Agent Turn — {body.transcript[:40]}",
        language_code=body.language_code or cfg.language_code,
    )

    # 3. Retrieve relevant client vector memory (RAG)
    from app.services.memory_service import memory_service
    retrieved_memory = await memory_service.search_memory(
        db=db,
        query=body.transcript,
        client_id=cfg.client_id,
        top_k=2,
    )

    # 4. Run the dynamic VoxGuard graph with injected memory
    try:
        final_state = await run_agent(
            transcript=body.transcript,
            client_config=cfg,
            language_code=body.language_code,
            session_id=str(voice_session.id),
            memory_context=retrieved_memory,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agent error: {exc}") from exc

    # 4. Persist telemetry
    latency = final_state.get("turn_latency_ms") or 0
    risk = float(final_state.get("risk_score") or 0.0)
    guardrail = bool(final_state.get("guardrail_flag"))
    tool_result = final_state.get("tool_result") or {}
    response_text = str(tool_result.get("response_text", ""))

    await VoiceSessionRepository.update_session_telemetry(
        db=db, session_id=voice_session.id, transcript=body.transcript,
        duration_seconds=latency / 1000.0, risk_score=risk,
        status="blocked" if guardrail else "completed",
    )
    await VoiceSessionRepository.log_agent_execution(
        db=db, session_id=voice_session.id, agent_name="VoxGuard-Dynamic",
        stt_provider="upstream", tts_provider="pending",
        llm_model="llama-3.3-70b-versatile",
        thought_process={"intent": final_state.get("intent"), "slots": final_state.get("slots")},
        turn_latency_ms=latency,
        guardrail_verdict="blocked" if guardrail else "approved",
        execution_result=tool_result,
    )

    return AgentRunResponse(
        session_id=str(voice_session.id),
        client_id=cfg.client_id,
        client_name=cfg.name,
        intent=final_state.get("intent"),
        slots=final_state.get("slots"),
        response_text=response_text,
        guardrail_flag=guardrail,
        risk_score=risk,
        turn_latency_ms=latency,
    )


@router.get("/agent/sessions", response_model=List[SessionSummary], summary="List Recent Sessions")
async def list_sessions(db: AsyncSession = Depends(get_db_session)) -> List[SessionSummary]:
    sessions = await VoiceSessionRepository.list_recent_sessions(db, limit=20)
    return [
        SessionSummary(
            id=str(s.id), title=s.title, status=s.status,
            language_code=s.language_code, duration_seconds=s.duration_seconds,
            interruption_count=s.interruption_count, filler_count=s.filler_count,
            risk_score=s.risk_score,
        )
        for s in sessions
    ]
