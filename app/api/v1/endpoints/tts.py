"""
TTS Endpoint — Returns real audio bytes from Sarvam / Deepgram / ElevenLabs.

GET/POST /api/v1/audio/synthesize
Returns: audio/mpeg or audio/wav stream that the browser can play directly.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

from app.services.tts_service import tts_service

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    language_code: str = "en"
    preferred_provider: str = "auto"


@router.post(
    "/synthesize",
    summary="Synthesize Speech (TTS)",
    response_description="Audio bytes (mp3 or wav)",
)
async def synthesize_speech(body: TTSRequest):
    """
    Converts text to speech using Deepgram Aura / Sarvam Bulbul / ElevenLabs
    with automatic provider fallback.

    Returns a streaming audio/mpeg or audio/wav response the browser can play directly.
    """
    if not body.text or not body.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="'text' field must not be empty.",
        )

    audio_bytes, provider_used, latency_ms = await tts_service.synthesize_with_fallback(
        text=body.text.strip(),
        language_code=body.language_code,
        preferred_provider=body.preferred_provider,
    )

    if not audio_bytes or len(audio_bytes) < 44:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="All TTS providers failed to synthesize audio.",
        )

    # Detect content type from magic bytes
    if audio_bytes[:3] == b"ID3" or audio_bytes[:2] == b"\xff\xfb":
        media_type = "audio/mpeg"
    elif audio_bytes[:4] == b"RIFF":
        media_type = "audio/wav"
    else:
        # Deepgram returns mp3 by default
        media_type = "audio/mpeg"

    headers = {
        "X-TTS-Provider": provider_used,
        "X-TTS-Latency-Ms": str(latency_ms),
        "Cache-Control": "no-store",
    }

    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type=media_type,
        headers=headers,
    )
