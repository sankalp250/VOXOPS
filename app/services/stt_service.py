import time
import logging
from typing import Tuple, Optional
import httpx
from groq import AsyncGroq
from app.core.config import settings

logger = logging.getLogger(__name__)


class STTProviderError(Exception):
    """Custom exception raised when an STT provider fails."""
    pass


class MultiProviderSTTService:
    """
    Enterprise Multi-Provider Resilient Speech-to-Text (STT) Engine.
    Handles automatic zero-downtime failover between Groq Whisper, Sarvam Saarika, and Deepgram Nova-2.
    """

    def __init__(self):
        self.groq_client: Optional[AsyncGroq] = None
        if settings.GROQ_API_KEY:
            try:
                self.groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")

    async def transcribe_groq(self, file_bytes: bytes, filename: str, language: str = "en") -> str:
        """
        Transcribes audio using Groq Whisper Large v3 (Ultra-fast & 100% Free).
        """
        if not self.groq_client:
            raise STTProviderError("Groq API Key not configured")

        try:
            logger.info("Executing STT via Groq Whisper Large v3...")
            transcription = await self.groq_client.audio.transcriptions.create(
                file=(filename, file_bytes),
                model="whisper-large-v3",
                response_format="json",
                language=language if language != "auto" else None,
            )
            return transcription.text
        except Exception as e:
            logger.warning(f"Groq STT failed: {e}")
            raise STTProviderError(f"Groq STT error: {e}")

    async def transcribe_sarvam(self, file_bytes: bytes, filename: str, language: str = "hi-IN") -> str:
        """
        Transcribes audio using Sarvam Saarika (Specialized for Indian Languages & Code-Mixing).
        """
        if not settings.SARVAM_API_KEY:
            raise STTProviderError("Sarvam API Key not configured")

        url = "https://api.sarvam.ai/speech-to-text"
        headers = {"api-subscription-key": settings.SARVAM_API_KEY}
        files = {"file": (filename, file_bytes, "audio/wav")}
        data = {"model": "saarika:v1", "language_code": language}

        try:
            logger.info("Executing STT via Sarvam Saarika...")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, files=files, data=data)
                if response.status_code == 200:
                    res_data = response.json()
                    return res_data.get("transcript", "")
                else:
                    raise STTProviderError(f"Sarvam API returned {response.status_code}: {response.text}")
        except Exception as e:
            logger.warning(f"Sarvam STT failed: {e}")
            raise STTProviderError(f"Sarvam STT error: {e}")

    async def transcribe_deepgram(self, file_bytes: bytes, filename: str, language: str = "en") -> str:
        """
        Transcribes audio using Deepgram Nova-2 ($200 Free Credit Enterprise STT).
        """
        if not settings.DEEPGRAM_API_KEY:
            raise STTProviderError("Deepgram API Key not configured")

        url = f"https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language={language}"
        headers = {
            "Authorization": f"Token {settings.DEEPGRAM_API_KEY}",
            "Content-Type": "audio/wav",
        }

        try:
            logger.info("Executing STT via Deepgram Nova-2...")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, content=file_bytes)
                if response.status_code == 200:
                    res_data = response.json()
                    channels = res_data.get("results", {}).get("channels", [])
                    if channels and channels[0].get("alternatives"):
                        return channels[0]["alternatives"][0].get("transcript", "")
                    return ""
                else:
                    raise STTProviderError(f"Deepgram API returned {response.status_code}: {response.text}")
        except Exception as e:
            logger.warning(f"Deepgram STT failed: {e}")
            raise STTProviderError(f"Deepgram STT error: {e}")

    async def transcribe_with_fallback(
        self,
        file_bytes: bytes,
        filename: str,
        preferred_provider: str = "auto",
        language_code: str = "en",
    ) -> Tuple[str, str, int]:
        """
        Executes transcription using preferred provider with automatic failover chain.
        Returns: (transcript_text, provider_used, latency_ms)
        """
        start_time = time.time()
        indian_languages = ["hi", "ta", "te", "kn", "bn", "mr", "gu", "pa", "ml"]

        # Provider execution order determination
        providers = []
        if preferred_provider == "sarvam" or (preferred_provider == "auto" and language_code in indian_languages):
            providers = [("sarvam", self.transcribe_sarvam), ("groq", self.transcribe_groq), ("deepgram", self.transcribe_deepgram)]
        elif preferred_provider == "deepgram":
            providers = [("deepgram", self.transcribe_deepgram), ("groq", self.transcribe_groq), ("sarvam", self.transcribe_sarvam)]
        elif preferred_provider == "groq":
            providers = [("groq", self.transcribe_groq), ("sarvam", self.transcribe_sarvam), ("deepgram", self.transcribe_deepgram)]
        else:
            # Default auto routing for English and other languages
            providers = [("groq", self.transcribe_groq), ("sarvam", self.transcribe_sarvam), ("deepgram", self.transcribe_deepgram)]

        last_error = None
        for name, func in providers:
            try:
                transcript = await func(file_bytes, filename, language=language_code)
                if transcript and transcript.strip():
                    latency_ms = int((time.time() - start_time) * 1000)
                    logger.info(f"STT succeeded using '{name}' in {latency_ms}ms.")
                    return transcript.strip(), name, latency_ms
            except STTProviderError as e:
                last_error = e
                logger.warning(f"STT provider '{name}' failed, trying next fallback...")
                continue

        # If all providers fail or are unconfigured, return mock/fallback notice for testing resiliency
        latency_ms = int((time.time() - start_time) * 1000)
        logger.error(f"All STT providers failed. Last error: {last_error}")
        return "Audio received. (STT Fallback: No active key responded)", "mock_fallback", latency_ms


# Global singleton instance
stt_service = MultiProviderSTTService()
