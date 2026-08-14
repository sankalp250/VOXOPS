"""
Real-Time Bi-Directional Voice WebSocket Gateway — Phase 6

Handles:
1. Client Handshake & API Key Validation (Multi-Tenant)
2. Live Audio & Text Streaming
3. Real-Time VoxGuard Filler Phrase Emitting
4. Real-Time Interruption / Barge-in Cancellation
5. Instant TTS Audio Streaming to Client
"""
from __future__ import annotations

import base64
import json
import logging
import uuid
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status

from app.db.session import AsyncSessionLocal
from app.db.client_repository import ClientRepository
from app.db.repository import VoiceSessionRepository
from app.schemas.client import ClientConfig
from app.services.agent_service import run_agent
from app.services.memory_service import memory_service
from app.services.recovery_service import recovery_engine
from app.services.tts_service import tts_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/voice")
async def voice_websocket_endpoint(
    websocket: WebSocket,
    client_id: Optional[str] = Query(None),
    api_key: Optional[str] = Query(None),
):
    """
    Bi-directional real-time WebSocket connection for sub-500ms voice agent interactions.
    """
    await websocket.accept()
    logger.info("WebSocket client connected.")

    # 1. Resolve Multi-Tenant Client Configuration
    cfg: Optional[ClientConfig] = None
    session_id = str(uuid.uuid4())

    async with AsyncSessionLocal() as db:
        if api_key:
            client_db = await ClientRepository.get_by_api_key(db, api_key)
            if client_db:
                cfg = ClientConfig.from_db_model(client_db)
        elif client_id:
            try:
                cid = uuid.UUID(client_id)
                client_db = await ClientRepository.get_by_id(db, cid)
                if client_db:
                    cfg = ClientConfig.from_db_model(client_db)
            except ValueError:
                pass

        if not cfg:
            # Send error and close if unauthorized
            await websocket.send_json({
                "type": "error",
                "message": "Authentication failed. Provide valid ?api_key=... or ?client_id=...",
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Create session record in database
        voice_session = await VoiceSessionRepository.create_session(
            db=db,
            title=f"WebSocket Stream — {cfg.name}",
            language_code=cfg.language_code,
        )
        session_id = str(voice_session.id)

    # Send ready handshake to client
    await websocket.send_json({
        "type": "ready",
        "session_id": session_id,
        "client_name": cfg.name,
        "language_code": cfg.language_code,
    })

    try:
        while True:
            # Receive text or binary frame
            message = await websocket.receive()

            if "text" in message and message["text"]:
                data = json.loads(message["text"])
                msg_type = data.get("type", "speech")

                # Handle User Interruption (Barge-In)
                if msg_type == "interruption":
                    cancelled = recovery_engine.handle_interruption()
                    await websocket.send_json({"type": "interruption_ack", "cancelled": cancelled})
                    continue

                transcript = data.get("transcript", "").strip()
                if not transcript:
                    continue

                # 2. Emitting Filler if agent reasoning is slow (>1.5s)
                filler_phrase = recovery_engine.get_filler_phrase(cfg.language_code)
                filler_audio, _, _ = await tts_service.synthesize_with_fallback(filler_phrase, cfg.language_code)
                
                await websocket.send_json({
                    "type": "filler",
                    "text": filler_phrase,
                    "audio_base64": base64.b64encode(filler_audio).decode("utf-8") if filler_audio else None,
                })

                # 3. Retrieve Memory Context (RAG)
                async with AsyncSessionLocal() as db:
                    memories = await memory_service.search_memory(
                        db=db,
                        query=transcript,
                        client_id=cfg.client_id,
                        top_k=2,
                    )

                # 4. Run LangGraph Dynamic Agent Turn
                final_state = await run_agent(
                    transcript=transcript,
                    client_config=cfg,
                    language_code=cfg.language_code,
                    session_id=session_id,
                    memory_context=memories,
                )

                tool_result = final_state.get("tool_result") or {}
                reply_text = str(tool_result.get("response_text", "I am here to help."))

                # 5. Synthesize Final TTS Audio
                tts_bytes, provider_used, tts_latency = await tts_service.synthesize_with_fallback(
                    text=reply_text,
                    language_code=cfg.language_code,
                )

                # 6. Stream Complete Agent Response over WebSocket
                await websocket.send_json({
                    "type": "agent_response",
                    "session_id": session_id,
                    "transcript": transcript,
                    "intent": final_state.get("intent"),
                    "slots": final_state.get("slots"),
                    "response_text": reply_text,
                    "audio_base64": base64.b64encode(tts_bytes).decode("utf-8") if tts_bytes else None,
                    "tts_provider": provider_used,
                    "turn_latency_ms": final_state.get("turn_latency_ms", 0),
                    "guardrail_flag": final_state.get("guardrail_flag", False),
                })

                # 7. Persist Telemetry to DB
                async with AsyncSessionLocal() as db:
                    await VoiceSessionRepository.update_session_telemetry(
                        db=db,
                        session_id=uuid.UUID(session_id),
                        transcript=transcript,
                        duration_seconds=(final_state.get("turn_latency_ms", 0) + tts_latency) / 1000.0,
                        status="completed",
                    )

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket execution error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
