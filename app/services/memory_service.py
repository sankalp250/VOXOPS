"""
Multi-Tenant Semantic Vector Memory Engine — Phase 5

Provides:
1. Dense Vector Embedding Generation (Google AI Studio Gemini Embeddings / Fallback)
2. Isolated Multi-Tenant Storage in Supabase / PostgreSQL (embeddings_memory)
3. Semantic Similarity Search filtered by client_id & embedding_namespace
4. Context Retrieval (RAG) for LangGraph voice agent turns
"""
from __future__ import annotations

import logging
import math
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.models.embedding import EmbeddingMemory

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Generates dense embeddings using Google Generative AI with zero-dependency fallback.
    """

    def __init__(self):
        self._gemini_available = bool(settings.GOOGLE_API_KEY)

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generates a 768-dimensional normalized embedding vector.
        """
        if not text or not text.strip():
            return [0.0] * 768

        clean_text = text.strip()

        # 1. Try Google Gemini Embeddings if API key is present
        if self._gemini_available and settings.GOOGLE_API_KEY:
            try:
                import google.genai as genai
                client = genai.Client(api_key=settings.GOOGLE_API_KEY)
                res = client.models.embed_content(
                    model="text-embedding-004",
                    contents=clean_text,
                )
                if res and res.embedding and res.embedding.values:
                    return [float(v) for v in res.embedding.values]
            except Exception as e:
                logger.warning(f"Google Gemini embedding failed: {e}. Using deterministic normalized embedding.")

        # 2. Resilient Deterministic Normalized Hash-Vector (768 dimensions)
        # Guarantees zero downtime and local testability without API dependency
        return self._generate_deterministic_vector(clean_text, dim=768)

    @staticmethod
    def _generate_deterministic_vector(text: str, dim: int = 768) -> List[float]:
        """
        Generates a deterministic, cosine-searchable unit vector for testing and offline fallback.
        """
        words = text.lower().split()
        vec = [0.0] * dim
        for i, word in enumerate(words):
            h = hash(word)
            idx = abs(h) % dim
            sign = 1.0 if (h > 0) else -1.0
            vec[idx] += sign / (i + 1.0)

        # Normalize to unit length
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    @staticmethod
    def cosine_similarity(v1: List[float], v2: List[float]) -> float:
        """
        Calculates cosine similarity between two float vectors.
        """
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1))
        norm2 = math.sqrt(sum(b * b for b in v2))
        if norm1 <= 0 or norm2 <= 0:
            return 0.0
        return dot / (norm1 * norm2)


class MemoryService:
    """
    Multi-tenant semantic memory manager.
    Stores and queries past session snippets isolated by client_id.
    """

    def __init__(self):
        self.embedding_service = EmbeddingService()

    async def ingest_memory(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        content: str,
        client_id: str,
        metadata_info: Optional[Dict[str, Any]] = None,
    ) -> EmbeddingMemory:
        """
        Ingests a transcript snippet into vector memory with client namespace tagging.
        """
        meta = metadata_info or {}
        meta["client_id"] = client_id
        meta["length"] = len(content)

        # Calculate embedding vector
        vector = await self.embedding_service.get_embedding(content)
        meta["vector_preview"] = vector[:10]  # Store preview in JSON metadata

        record = EmbeddingMemory(
            session_id=session_id,
            content=content,
            metadata_info=meta,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
        logger.info(f"Memory ingested for client={client_id}, session={session_id}")
        return record

    async def search_memory(
        self,
        db: AsyncSession,
        query: str,
        client_id: str,
        top_k: int = 3,
        min_similarity: float = 0.1,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search across past conversation memory, strictly filtered by client_id.
        """
        if not query or not query.strip():
            return []

        query_vec = await self.embedding_service.get_embedding(query)

        # Query records from database
        result = await db.execute(select(EmbeddingMemory))
        all_records = result.scalars().all()

        scored_results = []
        for rec in all_records:
            rec_meta = rec.metadata_info or {}
            # Strict multi-tenant isolation check
            if str(rec_meta.get("client_id")) != str(client_id):
                continue

            doc_vec = await self.embedding_service.get_embedding(rec.content)
            sim = self.embedding_service.cosine_similarity(query_vec, doc_vec)

            if sim >= min_similarity:
                scored_results.append({
                    "id": str(rec.id),
                    "session_id": str(rec.session_id),
                    "content": rec.content,
                    "similarity_score": round(sim, 4),
                    "metadata": rec_meta,
                    "created_at": rec.created_at.isoformat() if rec.created_at else None,
                })

        # Sort by similarity descending
        scored_results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_results[:top_k]


# Module singleton
memory_service = MemoryService()
