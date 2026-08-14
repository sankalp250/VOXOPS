"""
Client Configuration Pydantic Schemas — Phase 4.5

Validation models for:
- Creating a new client tenant
- Defining tool schemas (what tools the agent can call)
- The runtime ClientConfig object loaded per-request
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Tool Definition Schema
# ---------------------------------------------------------------------------

class ToolSchema(BaseModel):
    """
    Defines one tool the agent can call.

    When the LLM decides to call this tool, VoxGuard will:
    1. Extract the required parameters using slot-filling.
    2. Make an HTTP POST to `api_url` with the extracted params as JSON body.
    3. Return the response to the LLM as the tool result.

    For Phase 4/5, `api_url` can be `mock://` to use the built-in mock engine.
    """
    name: str = Field(..., description="Unique snake_case tool name, e.g. 'book_appointment'")
    description: str = Field(..., description="1-2 sentence description of what this tool does")
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="JSON Schema object describing the tool's input parameters"
    )
    api_url: str = Field(
        default="mock://",
        description="HTTP endpoint to call. Use 'mock://' to return a test response."
    )


# ---------------------------------------------------------------------------
# Client Create / Update Schemas
# ---------------------------------------------------------------------------

class ClientCreate(BaseModel):
    """
    Payload for registering a new client tenant.
    The client writes their own system_prompt which defines the agent's entire personality.
    """
    name: str = Field(..., min_length=2, max_length=255, description="Display name of this client/business")
    system_prompt: str = Field(
        ...,
        min_length=10,
        description=(
            "The LLM instruction that defines this agent. Write it as if training a human employee. "
            "Example: 'You are a helpful booking assistant for City Clinic. "
            "Help patients schedule, cancel, or inquire about appointments. "
            "Be warm, professional, and concise — responses will be read aloud over a phone call.'"
        )
    )
    tools: List[ToolSchema] = Field(
        default_factory=list,
        description="List of tools this agent can call during a conversation"
    )
    intent_examples: Dict[str, List[str]] = Field(
        default_factory=dict,
        description=(
            "Few-shot examples for intent classification. "
            "Keys are intent labels, values are example phrases. "
            "Example: {'book_appointment': ['I want to book a slot', 'Schedule me an appointment']}"
        )
    )
    language_code: str = Field("en", description="Primary language ISO code: en, hi, ta, te, kn, bn...")


class ClientUpdate(BaseModel):
    """Partial update — all fields optional."""
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    tools: Optional[List[ToolSchema]] = None
    intent_examples: Optional[Dict[str, List[str]]] = None
    language_code: Optional[str] = None
    is_active: Optional[bool] = None


class ClientResponse(BaseModel):
    """Serialised client object returned by the API."""
    id: str
    name: str
    system_prompt: str
    tools: List[ToolSchema]
    intent_examples: Dict[str, List[str]]
    language_code: str
    embedding_namespace: str
    is_active: bool
    api_key: Optional[str] = Field(None, description="Only shown on creation — save this immediately!")


# ---------------------------------------------------------------------------
# Runtime Config (loaded from DB and cached per-request)
# ---------------------------------------------------------------------------

class ClientConfig(BaseModel):
    """
    Runtime configuration object injected into every LangGraph node.
    Loaded from the database once per request and passed through the AgentState.
    This is what makes the agent fully dynamic — no hardcoded anything.
    """
    client_id: str
    name: str
    system_prompt: str
    tools: List[ToolSchema]
    intent_labels: List[str]            # derived from intent_examples keys
    intent_examples: Dict[str, List[str]]
    language_code: str
    embedding_namespace: str

    @classmethod
    def from_db_model(cls, db_client: Any) -> "ClientConfig":
        """Build a ClientConfig from a database Client ORM object."""
        tools_raw = db_client.tools_config or []
        intent_ex = db_client.intent_examples or {}
        tools = [ToolSchema(**t) if isinstance(t, dict) else t for t in tools_raw]
        return cls(
            client_id=str(db_client.id),
            name=db_client.name,
            system_prompt=db_client.system_prompt,
            tools=tools,
            intent_labels=list(intent_ex.keys()),
            intent_examples=intent_ex,
            language_code=db_client.language_code,
            embedding_namespace=db_client.embedding_namespace,
        )
