"""
Server-Sent Events (SSE) Live Session Streaming Endpoint — Phase 6

Streams real-time metrics, risk scores, and telemetry updates to live web dashboards.
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import AsyncGenerator
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.db.repository import VoiceSessionRepository

logger = logging.getLogger(__name__)

router = APIRouter()


async def event_generator(
    session_id: uuid.UUID,
    db: AsyncSession,
    iterations: int = 3,
    interval: float = 0.1,
) -> AsyncGenerator[str, None]:
    """
    Yields real-time Server-Sent Events (SSE) for a given voice session.
    """
    for _ in range(iterations):
        session = await VoiceSessionRepository.get_session(db, session_id)
        if not session:
            yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
            break

        data = {
            "session_id": str(session.id),
            "status": session.status,
            "duration_seconds": session.duration_seconds,
            "interruption_count": session.interruption_count,
            "filler_count": session.filler_count,
            "risk_score": session.risk_score,
            "transcript": session.transcript,
        }
        yield f"data: {json.dumps(data)}\n\n"
        await asyncio.sleep(interval)


@router.get("/session/{session_id}", summary="Stream Real-Time Session Telemetry (SSE)")
async def stream_session_events(
    session_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Server-Sent Events (SSE) endpoint to monitor a live voice session in real-time.
    """
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session_id format.")

    session = await VoiceSessionRepository.get_session(db, sid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    return StreamingResponse(
        event_generator(sid, db),
        media_type="text/event-stream",
    )
