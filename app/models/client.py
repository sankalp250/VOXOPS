"""
Client (Tenant) ORM Model — Phase 4.5 Multi-Tenant Refactor

Each row in this table represents one paying client on the VoxOps platform.
The client's configuration (system_prompt, tools, language) fully controls
how the VoxGuard agent behaves for that client's callers — zero hardcoding.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import DateTime, String, Text, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Client(Base):
    """
    Represents one tenant on the VoxOps platform.

    Fields
    ------
    id                  : Unique client UUID (used as client_id everywhere)
    name                : Human-readable client name (e.g. "City Clinic", "FreshMart Grocery")
    system_prompt       : The LLM system prompt that defines this agent's personality & domain
    tools_config        : JSON array of tool definitions the agent can call
                          e.g. [{"name": "book_slot", "description": "...", "api_url": "..."}]
    intent_examples     : JSON object mapping intent labels to example phrases (few-shot)
                          e.g. {"book_appointment": ["I want to book...", "Schedule me..."]}
    language_code       : Default ISO language for this client (e.g. "en", "hi", "ta")
    embedding_namespace : Unique string key isolating this client's vector memory
    is_active           : Soft-delete flag; inactive clients are rejected at the API gateway
    api_key             : Hashed API key the client uses to authenticate requests
    created_at          : UTC creation timestamp
    updated_at          : UTC last-modified timestamp
    """

    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Agent behaviour — fully client-controlled
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False, default="You are a helpful voice assistant.")
    tools_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=list)
    intent_examples: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)
    language_code: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    embedding_namespace: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    # Access control
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    api_key: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)
