"""
VoxGuard Agent State Schema — Phase 5 Vector Memory Integration

The `client_config` and `memory_context` fields flow through the graph.
All LangGraph nodes read from them for dynamic RAG and personalised context.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class AgentState(TypedDict, total=False):
    """
    Shared state flowing through every LangGraph node.
    """
    # Identity
    session_id: Optional[str]
    client_config: Optional[Any]   # ClientConfig object

    # Input
    transcript: Optional[str]
    language_code: Optional[str]

    # Semantic Vector Memory (Phase 5 RAG Context)
    memory_context: Optional[List[Dict[str, Any]]]

    # Agent outputs
    intent: Optional[str]
    slots: Optional[Dict[str, Any]]
    tool_result: Optional[Dict[str, Any]]

    # Recovery & safety
    filler_needed: Optional[bool]
    interruption: Optional[bool]
    guardrail_flag: Optional[bool]
    risk_score: Optional[float]

    # Telemetry
    turn_latency_ms: Optional[int]
    error: Optional[str]

    # Conversation history
    messages: Optional[List[Dict[str, str]]]
