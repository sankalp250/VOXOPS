from fastapi import APIRouter
from app.api.v1.endpoints import health

api_router = APIRouter()

# Include sub-routers for different modules
api_router.include_router(health.router, tags=["System Health"])
