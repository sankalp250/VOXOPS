from fastapi import APIRouter
from app.api.v1.endpoints import health, audio, agent

api_router = APIRouter()

# Include sub-routers for different modules
api_router.include_router(health.router, tags=["System Health"])
api_router.include_router(audio.router, prefix="/audio", tags=["Audio & STT Engine"])
api_router.include_router(agent.router, prefix="/agent", tags=["VoxGuard Agent Engine"])
