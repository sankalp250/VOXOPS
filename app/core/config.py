from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application Settings powered by Pydantic Settings.
    Automatically loads variables from environment or .env file.
    """
    PROJECT_NAME: str = "VOXOPS"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # CORS Origins allowed to talk to backend
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    # External LLM & Tracing API Keys
    GROQ_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    LANGSMITH_API_KEY: str = ""

    # Speech Synthesis & Transcription API Keys (TTS / STT)
    SARVAM_API_KEY: str = ""
    ELEVENLABS_API_KEY: str = ""
    DEEPGRAM_API_KEY: str = ""

    # Supabase Credentials
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    DATABASE_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Single instance shared across the application
settings = Settings()
