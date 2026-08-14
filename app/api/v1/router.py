from fastapi import APIRouter
from app.api.v1.endpoints import health, audio, clients, memory, websockets, stream

api_router = APIRouter()

# System
api_router.include_router(health.router, tags=["System Health"])

# Audio & STT
api_router.include_router(audio.router, prefix="/audio", tags=["Audio & STT Engine"])

# Vector Memory & Semantic Search (Phase 5)
api_router.include_router(memory.router, prefix="/memory", tags=["Vector Memory & RAG"])

# Live Session SSE Streaming (Phase 6)
api_router.include_router(stream.router, prefix="/stream", tags=["Telemetry Stream (SSE)"])

# Real-Time Voice WebSockets (Phase 6)
api_router.include_router(websockets.router, prefix="", tags=["Real-Time Voice WebSockets"])

# Multi-tenant client management + agent run
api_router.include_router(clients.router, prefix="", tags=["Clients & Agent Engine"])
