"""
TTS Endpoint — Returns real audio bytes from Sarvam / Deepgram / ElevenLabs.

Endpoints:
- POST /api/v1/audio/synthesize
- GET  /api/v1/audio/voices
- POST /api/v1/audio/voices/preview
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

from app.services.tts_service import tts_service

router = APIRouter()


VOICE_CATALOG: List[Dict[str, Any]] = [
    # --- ElevenLabs Ultra-Realistic Voices ---
    {
        "id": "elevenlabs:cgSgspJ2msm6clMCkdW9",
        "name": "Jessica",
        "provider": "elevenlabs",
        "raw_id": "cgSgspJ2msm6clMCkdW9",
        "gender": "female",
        "language": "en",
        "accent": "American",
        "tone": "Warm, bright & conversational",
        "description": "Ultra-realistic natural female voice. Perfect for friendly customer engagement.",
        "sample_text": "Hello! I am Jessica, your AI voice assistant. How can I help you today?",
        "is_default": True,
        "is_recommended": True,
        "badge": "Top Pick",
    },
    {
        "id": "elevenlabs:EXAVITQu4vr4xnSDxMaL",
        "name": "Sarah",
        "provider": "elevenlabs",
        "raw_id": "EXAVITQu4vr4xnSDxMaL",
        "gender": "female",
        "language": "en",
        "accent": "American",
        "tone": "Mature, reassuring & confident",
        "description": "Professional executive tone. Great for healthcare, clinics, and advisory.",
        "sample_text": "Good day. I am Sarah, your dedicated voice assistant. How may I assist you?",
        "is_default": False,
        "is_recommended": True,
        "badge": "Professional",
    },
    {
        "id": "elevenlabs:Xb7hH8MSUJpSbSDYk0k2",
        "name": "Alice",
        "provider": "elevenlabs",
        "raw_id": "Xb7hH8MSUJpSbSDYk0k2",
        "gender": "female",
        "language": "en",
        "accent": "British",
        "tone": "Clear, engaging & articulate",
        "description": "Polite British accent with impeccable clarity.",
        "sample_text": "Hello! I am Alice. I am delighted to help you navigate through your queries today.",
        "is_default": False,
        "is_recommended": False,
        "badge": "British",
    },
    {
        "id": "elevenlabs:FGY2WhTYpPnrIDTdsKH5",
        "name": "Laura",
        "provider": "elevenlabs",
        "raw_id": "FGY2WhTYpPnrIDTdsKH5",
        "gender": "female",
        "language": "en",
        "accent": "American",
        "tone": "Energetic, quirky & upbeat",
        "description": "High-energy conversational voice ideal for retail and hospitality.",
        "sample_text": "Hey there! I am Laura. What can we get started on together today?",
        "is_default": False,
        "is_recommended": False,
        "badge": "Upbeat",
    },

    # --- Deepgram Aura Voices ---
    {
        "id": "deepgram:aura-asteria-en",
        "name": "Asteria",
        "provider": "deepgram",
        "raw_id": "aura-asteria-en",
        "gender": "female",
        "language": "en",
        "accent": "American",
        "tone": "Ultra-fast, fluid & conversational",
        "description": "Sub-200ms latency female voice engineered for real-time speech dialogue.",
        "sample_text": "Hi! I am Asteria from Deepgram Aura. Ready to respond in milliseconds.",
        "is_default": False,
        "is_recommended": True,
        "badge": "Ultra Fast",
    },
    {
        "id": "deepgram:aura-luna-en",
        "name": "Luna",
        "provider": "deepgram",
        "raw_id": "aura-luna-en",
        "gender": "female",
        "language": "en",
        "accent": "American",
        "tone": "Gentle, calming & pleasant",
        "description": "Soothing tone well suited for calm support and wellness interactions.",
        "sample_text": "Hello, I am Luna. Take your time, and tell me how I can help.",
        "is_default": False,
        "is_recommended": False,
        "badge": "Calming",
    },
    {
        "id": "deepgram:aura-stella-en",
        "name": "Stella",
        "provider": "deepgram",
        "raw_id": "aura-stella-en",
        "gender": "female",
        "language": "en",
        "accent": "American",
        "tone": "Crisp, dynamic & cheerful",
        "description": "Bright and responsive customer service voice.",
        "sample_text": "Hi! I'm Stella. Let's solve your questions quickly and easily.",
        "is_default": False,
        "is_recommended": False,
        "badge": "Crisp",
    },
    {
        "id": "deepgram:aura-athena-en",
        "name": "Athena",
        "provider": "deepgram",
        "raw_id": "aura-athena-en",
        "gender": "female",
        "language": "en",
        "accent": "British",
        "tone": "Articulate, calm & authoritative",
        "description": "British female voice with high clarity.",
        "sample_text": "Greetings. I am Athena. Please let me know what assistance you require.",
        "is_default": False,
        "is_recommended": False,
        "badge": "British",
    },
    {
        "id": "deepgram:aura-orion-en",
        "name": "Orion",
        "provider": "deepgram",
        "raw_id": "aura-orion-en",
        "gender": "male",
        "language": "en",
        "accent": "American",
        "tone": "Deep, calm & professional male",
        "description": "Deep male voice option for callers who prefer male tones.",
        "sample_text": "Hello, this is Orion. How can I assist you today?",
        "is_default": False,
        "is_recommended": False,
        "badge": "Male Voice",
    },

    # --- Sarvam Bulbul v3 Voices ---
    {
        "id": "sarvam:ritu",
        "name": "Ritu",
        "provider": "sarvam",
        "raw_id": "ritu",
        "gender": "female",
        "language": "hi",
        "accent": "Hindi / Indian",
        "tone": "Warm, natural conversational Hindi",
        "description": "Premier Sarvam Bulbul v3 female voice with authentic Indian cadence.",
        "sample_text": "नमस्ते! मैं रितु हूँ। आज मैं आपकी क्या सहायता कर सकती हूँ?",
        "is_default": False,
        "is_recommended": True,
        "badge": "Hindi Premier",
    },
    {
        "id": "sarvam:simran",
        "name": "Simran",
        "provider": "sarvam",
        "raw_id": "simran",
        "gender": "female",
        "language": "en",
        "accent": "Indian English",
        "tone": "Friendly, cheerful Indian English",
        "description": "Authentic Indian English female voice for bilingual callers.",
        "sample_text": "Hello! I am Simran. I am very happy to assist you today.",
        "is_default": False,
        "is_recommended": True,
        "badge": "Indian English",
    },
    {
        "id": "sarvam:priya",
        "name": "Priya",
        "provider": "sarvam",
        "raw_id": "priya",
        "gender": "female",
        "language": "hi",
        "accent": "Hindi / Indian",
        "tone": "Polite, crisp Hindi customer support",
        "description": "Courteous support agent tone in modern Hindi.",
        "sample_text": "नमस्ते, आपकी सेवा में प्रिया। कृपया बताइए मैं आपके लिए क्या कर सकती हूँ?",
        "is_default": False,
        "is_recommended": False,
        "badge": "Hindi Support",
    },
    {
        "id": "sarvam:aditya",
        "name": "Aditya",
        "provider": "sarvam",
        "raw_id": "aditya",
        "gender": "male",
        "language": "hi",
        "accent": "Hindi / Indian",
        "tone": "Confident, clear Hindi male",
        "description": "Articulate Hindi male voice option on Sarvam Bulbul v3.",
        "sample_text": "नमस्ते! मैं आदित्य हूँ। आपका स्वागत है।",
        "is_default": False,
        "is_recommended": False,
        "badge": "Hindi Male",
    },
]


class TTSRequest(BaseModel):
    text: str
    language_code: str = "en"
    preferred_provider: str = "auto"
    voice_id: Optional[str] = None


class VoicePreviewRequest(BaseModel):
    voice_id: str
    provider: Optional[str] = "auto"
    text: Optional[str] = None


@router.get(
    "/voices",
    summary="List Available Agent Voices",
    response_model=List[Dict[str, Any]],
)
async def list_voices():
    """
    Returns the curated catalog of agent voices across ElevenLabs, Deepgram, and Sarvam.
    Includes gender, language, accent, and audio preview metadata.
    """
    return VOICE_CATALOG


@router.post(
    "/voices/preview",
    summary="Audition / Preview Voice Sample",
    response_description="Audio bytes (mp3 or wav)",
)
async def preview_voice(body: VoicePreviewRequest):
    """
    Synthesizes a short audition sample for a specified voice so the user
    can listen to it before assigning it to the agent.
    """
    found = next((v for v in VOICE_CATALOG if v["id"] == body.voice_id or v["raw_id"] == body.voice_id), None)
    sample_text = body.text or (found["sample_text"] if found else "Hello! This is a voice sample preview.")
    lang = found["language"] if found else "en"
    prov = body.provider or (found["provider"] if found else "auto")
    raw_voice = found["raw_id"] if found else body.voice_id

    audio_bytes, provider_used, latency_ms = await tts_service.synthesize_with_fallback(
        text=sample_text,
        language_code=lang,
        preferred_provider=prov,
        voice_id=raw_voice,
    )

    if not audio_bytes or len(audio_bytes) < 44:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to generate voice preview.",
        )

    media_type = "audio/mpeg" if (audio_bytes[:3] == b"ID3" or audio_bytes[:2] == b"\xff\xfb") else "audio/wav"

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


@router.post(
    "/synthesize",
    summary="Synthesize Speech (TTS)",
    response_description="Audio bytes (mp3 or wav)",
)
async def synthesize_speech(body: TTSRequest):
    """
    Converts text to speech using ElevenLabs / Deepgram Aura / Sarvam Bulbul
    with automatic provider fallback or explicit voice selection.
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
        voice_id=body.voice_id,
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

