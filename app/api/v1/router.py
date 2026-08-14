from fastapi import APIRouter
from app.api.v1.endpoints import health, audio, clients, memory

api_router = APIRouter()

# System
api_router.include_router(health.router, tags=["System Health"])

# Audio & STT
api_router.include_router(audio.router, prefix="/audio", tags=["Audio & STT Engine"])

# Vector Memory & Semantic Search (Phase 5)
api_router.include_router(memory.router, prefix="/memory", tags=["Vector Memory & RAG"])

# Multi-tenant client management + agent run
api_router.include_router(clients.router, prefix="", tags=["Clients & Agent Engine"])
