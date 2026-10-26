"""
Multi-Provider Resilient Speech-to-Text (STT) Engine.

Handles automatic zero-downtime failover between:
1. Groq Whisper Large v3  (Primary - Free & Ultra-fast)
2. Sarvam Saarika         (Primary for Indian languages & code-mixing)
3. Deepgram Nova-2        (Enterprise fallback - $200 free credit)
"""
import time
import logging
from typing import Tuple, Optional

import httpx

logger = logging.getLogger(__name__)

# Lazy import guard so Pyrefly / Pylance never complain about missing stubs
try:
    from groq import AsyncGroq as _AsyncGroq
    _GROQ_AVAILABLE = True
except ImportError:
    _AsyncGroq = None  # type: ignore[assignment, misc]
    _GROQ_AVAILABLE = False

from app.core.config import settings


class STTProviderError(Exception):
    """Custom exception raised when an STT provider fails or is unavailable."""
    pass


class MultiProviderSTTService:
    """
    Enterprise Multi-Provider Resilient Speech-to-Text Engine.

    Provider priority is determined at call time based on language_code and
    preferred_provider, with automatic sequential fallback to the next provider
    on any error so the caller never sees a hard failure.
    """

    def __init__(self) -> None:
        self._groq_client: Optional[object] = None
        if _GROQ_AVAILABLE and settings.GROQ_API_KEY:
            try:
                self._groq_client = _AsyncGroq(api_key=settings.GROQ_API_KEY)  # type: ignore[call-arg]
            except Exception as exc:
                logger.warning("Groq client init failed: %s", exc)

    # ------------------------------------------------------------------
    # Provider Implementations
    # ------------------------------------------------------------------

    async def transcribe_groq(
        self,
        file_bytes: bytes,
        filename: str,
        language: str = "en",
    ) -> str:
        """
        Transcribes audio using Groq Whisper Large v3.
        Free tier — up to 7200 audio-minutes / day.
        """
        if not settings.GROQ_API_KEY:
            raise STTProviderError("GROQ_API_KEY not set in .env")
        if not _GROQ_AVAILABLE:
            raise STTProviderError("groq package not installed (pip install groq)")

        # Re-initialise client lazily in case __init__ failed
        if self._groq_client is None:
            try:
                self._groq_client = _AsyncGroq(api_key=settings.GROQ_API_KEY)  # type: ignore[call-arg]
            except Exception as exc:
                raise STTProviderError(f"Cannot create Groq client: {exc}") from exc

        # Sniff audio magic bytes so Whisper gets the true container format (WebM/WAV/Ogg)
        actual_name = filename or "audio.webm"
        if file_bytes.startswith(b"\x1a\x45\xdf\xa3"):  # WebM / Matroska EBML
            actual_name = "recording.webm"
        elif file_bytes.startswith(b"OggS"):  # Ogg / Opus
            actual_name = "recording.ogg"
        elif file_bytes.startswith(b"RIFF"):  # RIFF WAV
            actual_name = "recording.wav"
        elif file_bytes.startswith(b"ID3") or file_bytes.startswith(b"\xff\xfb"):  # MP3
            actual_name = "recording.mp3"

        try:
            logger.info("STT → Groq Whisper Large v3 (container: %s)", actual_name)
            transcription = await self._groq_client.audio.transcriptions.create(  # type: ignore[union-attr]
                file=(actual_name, file_bytes),
                model="whisper-large-v3",
                response_format="json",
                language=language if language not in ("auto", "en") else None,
            )
            return str(transcription.text)
        except Exception as exc:
            logger.warning("Groq STT failed: %s", exc)
            raise STTProviderError(f"Groq STT error: {exc}") from exc

    async def transcribe_sarvam(
        self,
        file_bytes: bytes,
        filename: str,
        language: str = "hi-IN",
    ) -> str:
        """
        Transcribes audio using Sarvam Saarika v1.
        Best for Indian regional languages, Hinglish, Tanglish, code-mixing.
        """
        if not settings.SARVAM_API_KEY:
            raise STTProviderError("SARVAM_API_KEY not set in .env")

        # Sarvam expects BCP-47 codes like hi-IN; normalise short codes
        lang_code = language if "-" in language else f"{language}-IN"
        headers = {"api-subscription-key": settings.SARVAM_API_KEY}
        files = {"file": (filename, file_bytes, "audio/wav")}
        data = {"model": "saarika:v2.5", "language_code": lang_code}

        try:
            logger.info("STT → Sarvam Saarika (%s)", lang_code)
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.sarvam.ai/speech-to-text",
                    headers=headers,
                    files=files,
                    data=data,
                )
            if resp.status_code == 200:
                return str(resp.json().get("transcript", ""))
            raise STTProviderError(f"Sarvam HTTP {resp.status_code}: {resp.text}")
        except STTProviderError:
            raise
        except Exception as exc:
            logger.warning("Sarvam STT failed: %s", exc)
            raise STTProviderError(f"Sarvam STT error: {exc}") from exc

    async def transcribe_deepgram(
        self,
        file_bytes: bytes,
        filename: str,  # noqa: ARG002
        language: str = "en",
    ) -> str:
        """
        Transcribes audio using Deepgram Nova-2.
        Enterprise-grade accuracy; $200 free credit on sign-up.
        """
        if not settings.DEEPGRAM_API_KEY:
            raise STTProviderError("DEEPGRAM_API_KEY not set in .env")

        url = (
            f"https://api.deepgram.com/v1/listen"
            f"?model=nova-2&smart_format=true&language={language}"
        )
        headers = {
            "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
            "Content-Type": "audio/wav",
        }

        try:
            logger.info("STT → Deepgram Nova-2 (%s)", language)
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, content=file_bytes)
            if resp.status_code == 200:
                channels = resp.json().get("results", {}).get("channels", [])
                if channels and channels[0].get("alternatives"):
                    return str(channels[0]["alternatives"][0].get("transcript", ""))
                return ""
            raise STTProviderError(f"Deepgram HTTP {resp.status_code}: {resp.text}")
        except STTProviderError:
            raise
        except Exception as exc:
            logger.warning("Deepgram STT failed: %s", exc)
            raise STTProviderError(f"Deepgram STT error: {exc}") from exc

    # ------------------------------------------------------------------
    # Fallback Orchestrator
    # ------------------------------------------------------------------

    async def transcribe_with_fallback(
        self,
        file_bytes: bytes,
        filename: str,
        preferred_provider: str = "auto",
        language_code: str = "en",
    ) -> Tuple[str, str, int]:
        """
        Execute transcription with automatic zero-downtime provider failover.

        Returns:
            Tuple of (transcript_text, provider_used, latency_ms)
        """
        t0 = time.monotonic()

        # Languages where Sarvam outperforms Groq
        _indian_codes = {"hi", "ta", "te", "kn", "bn", "mr", "gu", "pa", "ml", "or", "as"}
        _is_indian = language_code.split("-")[0] in _indian_codes

        # Build ordered provider chain
        _all = [
            ("groq", self.transcribe_groq),
            ("sarvam", self.transcribe_sarvam),
            ("deepgram", self.transcribe_deepgram),
        ]

        if preferred_provider == "sarvam" or (preferred_provider == "auto" and _is_indian):
            providers = [("sarvam", self.transcribe_sarvam), ("groq", self.transcribe_groq), ("deepgram", self.transcribe_deepgram)]
        elif preferred_provider == "deepgram":
            providers = [("deepgram", self.transcribe_deepgram), ("groq", self.transcribe_groq), ("sarvam", self.transcribe_sarvam)]
        elif preferred_provider == "groq":
            providers = [("groq", self.transcribe_groq), ("sarvam", self.transcribe_sarvam), ("deepgram", self.transcribe_deepgram)]
        else:
            # Default: Groq first for English, Sarvam first for Indian
            providers = _all

        last_error: Optional[Exception] = None
        for name, fn in providers:
            try:
                transcript = await fn(file_bytes, filename, language=language_code)
                if transcript and transcript.strip():
                    ms = int((time.monotonic() - t0) * 1000)
                    logger.info("STT ✓ '%s' in %dms", name, ms)
                    return transcript.strip(), name, ms
            except STTProviderError as exc:
                last_error = exc
                logger.warning("Provider '%s' failed → trying next. Reason: %s", name, exc)

        # All providers failed — return graceful degradation response
        ms = int((time.monotonic() - t0) * 1000)
        logger.error("All STT providers failed. Last: %s", last_error)
        return "[Transcription unavailable — all STT providers failed]", "none", ms


# ---------------------------------------------------------------------------
# Module-level singleton (import this anywhere in the app)
# ---------------------------------------------------------------------------
stt_service = MultiProviderSTTService()
