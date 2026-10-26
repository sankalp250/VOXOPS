from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router
from app.db.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and initial tenant is seeded
    try:
        await init_db()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Lifespan DB init warning: {e}")
    yield
    # Shutdown logic (if any)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-grade Voice & AI Agentic Operations Platform Backend API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware for frontend UI integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", summary="Root API Gateway Welcome")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API Gateway",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
