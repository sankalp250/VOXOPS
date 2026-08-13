from typing import Optional
import uuid
from pydantic import BaseModel, Field


class TranscriptionRequest(BaseModel):
    """
    Schema for optional transcription request parameters.
    """
    language_code: Optional[str] = Field(default="en", description="Target ISO language code (e.g. en, hi, ta, te)")
    preferred_provider: Optional[str] = Field(default="auto", description="Preferred STT provider: auto, groq, sarvam, deepgram")


class TranscriptionResponse(BaseModel):
    """
    Schema for Speech-to-Text transcription output.
    """
    session_id: uuid.UUID = Field(description="Unique ID of the created voice session")
    transcript: str = Field(description="Transcribed text output")
    language_code: str = Field(default="en", description="Detected or specified language code")
    duration_seconds: float = Field(default=0.0, description="Audio duration in seconds")
    word_count: int = Field(default=0, description="Total word count in transcript")
    provider_used: str = Field(description="Actual STT provider that performed the transcription")
    latency_ms: int = Field(default=0, description="Transcription processing latency in milliseconds")
