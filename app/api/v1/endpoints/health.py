from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health", summary="Perform System Health Check")
async def health_check():
    """
    Returns operational health status and active service integrations.
    Exposes configured status for external LLM, TTS, STT, Tracing & Supabase integrations without revealing raw keys.
    """
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "integrations": {
            "groq_configured": bool(settings.GROQ_API_KEY),
            "google_configured": bool(settings.GOOGLE_API_KEY),
            "langsmith_configured": bool(settings.LANGSMITH_API_KEY),
            "sarvam_configured": bool(settings.SARVAM_API_KEY),
            "elevenlabs_configured": bool(settings.ELEVENLABS_API_KEY),
            "deepgram_configured": bool(settings.DEEPGRAM_API_KEY),
            "supabase_configured": bool(settings.SUPABASE_URL and settings.SUPABASE_KEY),
        },
    }
