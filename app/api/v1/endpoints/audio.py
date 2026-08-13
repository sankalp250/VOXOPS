from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db_session
from app.db.repository import VoiceSessionRepository
from app.services.stt_service import stt_service
from app.schemas.audio import TranscriptionResponse

router = APIRouter()

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"}


@router.post("/transcribe", response_model=TranscriptionResponse, summary="Transcribe Uploaded Audio File")
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file binary payload (.wav, .mp3, .webm, etc.)"),
    language_code: str = Form("en", description="Target ISO language code (e.g. en, hi, ta, te)"),
    preferred_provider: str = Form("auto", description="Preferred provider: auto, groq, sarvam, deepgram"),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Ingests an audio file, transcribes it using Groq Whisper / Sarvam / Deepgram with zero-downtime failover,
    calculates word count and latency telemetry, and logs the voice session to Supabase PostgreSQL.
    """
    # 1. Extension Validation
    filename = file.filename or "uploaded_audio.wav"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ".wav"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # 2. Read File Bytes
    file_bytes = await file.read()
    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty.",
        )

    # 3. Execute Multi-Provider STT Engine
    transcript, provider_used, latency_ms = await stt_service.transcribe_with_fallback(
        file_bytes=file_bytes,
        filename=filename,
        preferred_provider=preferred_provider,
        language_code=language_code,
    )

    # 4. Telemetry Calculation
    words = transcript.split()
    word_count = len(words)
    # Estimate audio duration (~150 words per minute average speaking rate if duration metadata absent)
    estimated_duration = round(max(1.0, (word_count / 150.0) * 60.0), 2)

    # 5. Persist Session & Execution Log to Supabase PostgreSQL
    voice_session = await VoiceSessionRepository.create_session(
        db=db,
        title=f"Audio Session - {filename}",
        language_code=language_code,
    )

    await VoiceSessionRepository.update_session_telemetry(
        db=db,
        session_id=voice_session.id,
        transcript=transcript,
        duration_seconds=estimated_duration,
        status="completed",
    )

    await VoiceSessionRepository.log_agent_execution(
        db=db,
        session_id=voice_session.id,
        agent_name="VoxGuard-STT-Engine",
        stt_provider=provider_used,
        tts_provider="none",
        llm_model="none",
        thought_process={"filename": filename, "file_size_bytes": len(file_bytes)},
        turn_latency_ms=latency_ms,
        execution_result={"word_count": word_count, "transcript": transcript},
    )

    # 6. Return Structured Response
    return TranscriptionResponse(
        session_id=voice_session.id,
        transcript=transcript,
        language_code=language_code,
        duration_seconds=estimated_duration,
        word_count=word_count,
        provider_used=provider_used,
        latency_ms=latency_ms,
    )
