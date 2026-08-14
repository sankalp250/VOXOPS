import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.repository import VoiceSessionRepository
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_sse_streaming_session_events(db_session: AsyncSession):
    # 1. Create a session in DB
    session = await VoiceSessionRepository.create_session(
        db=db_session,
        title="Streaming SSE Telemetry Test",
        language_code="en",
    )
    
    # 2. Query SSE endpoint
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(f"/api/v1/stream/session/{session.id}")
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_sse_streaming_non_existent_session():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Random non-existent UUID
        response = await ac.get("/api/v1/stream/session/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404
