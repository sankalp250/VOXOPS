from typing import Optional, Dict, Any, List
import uuid
from pydantic import BaseModel, Field


class MemoryIngestRequest(BaseModel):
    session_id: Optional[uuid.UUID] = Field(default=None, description="Related voice session ID")
    content: str = Field(..., min_length=3, description="Transcript snippet or business document text to store")
    client_id: Optional[str] = Field(default=None, description="Client ID (or use X-Client-API-Key header)")
    metadata_info: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom metadata tags")


class MemoryIngestResponse(BaseModel):
    id: str
    session_id: str
    client_id: str
    content_preview: str
    created_at: Optional[str]


class MemorySearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Semantic search query text")
    client_id: Optional[str] = Field(default=None, description="Client ID (or use X-Client-API-Key header)")
    top_k: int = Field(default=3, ge=1, le=20, description="Max results to return")


class MemorySearchResultItem(BaseModel):
    id: str
    session_id: str
    content: str
    similarity_score: float
    metadata: Dict[str, Any]
    created_at: Optional[str]


class MemorySearchResponse(BaseModel):
    client_id: str
    query: str
    results_count: int
    results: List[MemorySearchResultItem]
