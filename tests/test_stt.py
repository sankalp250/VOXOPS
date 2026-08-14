import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_transcribe_audio_endpoint():
    mock_audio_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    files = {"file": ("test_speech.wav", mock_audio_bytes, "audio/wav")}
    data = {"language_code": "en", "preferred_provider": "auto"}

    with patch("app.api.v1.endpoints.audio.stt_service.transcribe_with_fallback", new=AsyncMock(return_value=("I want to order groceries", "groq", 120))):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/v1/audio/transcribe", files=files, data=data)

    assert response.status_code == 200
    res_data = response.json()
    assert "session_id" in res_data
    assert res_data["transcript"] == "I want to order groceries"
    assert res_data["provider_used"] == "groq"
    assert res_data["language_code"] == "en"
    assert res_data["word_count"] == 5


@pytest.mark.asyncio
async def test_transcribe_invalid_extension():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        files = {"file": ("test_file.txt", b"text payload", "text/plain")}
        response = await ac.post("/api/v1/audio/transcribe", files=files)

    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]
