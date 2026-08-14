import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.db.repository import VoiceSessionRepository
from app.db.client_repository import ClientRepository
from app.services.memory_service import memory_service
from app.schemas.memory import (
    MemoryIngestRequest,
    MemoryIngestResponse,
    MemorySearchRequest,
    MemorySearchResponse,
    MemorySearchResultItem,
)

router = APIRouter()


async def _resolve_client_id(
    db: AsyncSession,
    api_key: Optional[str],
    client_id_param: Optional[str],
) -> str:
    if api_key:
        client = await ClientRepository.get_by_api_key(db, api_key)
        if not client:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key.")
        return str(client.id)
    if client_id_param:
        try:
            cid = uuid.UUID(client_id_param)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid client_id format.")
        client = await ClientRepository.get_by_id(db, cid)
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found.")
        return str(client.id)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Provide either 'X-Client-API-Key' header or 'client_id' in body.",
    )


@router.post("/ingest", response_model=MemoryIngestResponse, summary="Ingest Snippet into Client Vector Memory")
async def ingest_memory_endpoint(
    body: MemoryIngestRequest,
    db: AsyncSession = Depends(get_db_session),
    x_client_api_key: Optional[str] = Header(None, alias="X-Client-API-Key"),
):
    """
    Ingests text into the client's isolated semantic vector memory.
    """
    client_id = await _resolve_client_id(db, x_client_api_key, body.client_id)

    # Ensure a voice session exists or create a default container session
    session_id = body.session_id
    if not session_id:
        new_session = await VoiceSessionRepository.create_session(
            db=db,
            title="Knowledge Memory Ingestion",
            language_code="en",
        )
        session_id = new_session.id

    record = await memory_service.ingest_memory(
        db=db,
        session_id=session_id,
        content=body.content,
        client_id=client_id,
        metadata_info=body.metadata_info,
    )

    return MemoryIngestResponse(
        id=str(record.id),
        session_id=str(record.session_id),
        client_id=client_id,
        content_preview=record.content[:80],
        created_at=record.created_at.isoformat() if record.created_at else None,
    )


@router.post("/search", response_model=MemorySearchResponse, summary="Semantic Vector Search within Client Memory")
async def search_memory_endpoint(
    body: MemorySearchRequest,
    db: AsyncSession = Depends(get_db_session),
    x_client_api_key: Optional[str] = Header(None, alias="X-Client-API-Key"),
):
    """
    Performs semantic vector search over past conversations and documents, strictly isolated by client_id.
    """
    client_id = await _resolve_client_id(db, x_client_api_key, body.client_id)

    results = await memory_service.search_memory(
        db=db,
        query=body.query,
        client_id=client_id,
        top_k=body.top_k,
    )

    items = [
        MemorySearchResultItem(
            id=r["id"],
            session_id=r["session_id"],
            content=r["content"],
            similarity_score=r["similarity_score"],
            metadata=r["metadata"],
            created_at=r["created_at"],
        )
        for r in results
    ]

    return MemorySearchResponse(
        client_id=client_id,
        query=body.query,
        results_count=len(items),
        results=items,
    )
