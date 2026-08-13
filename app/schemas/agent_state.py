"""
VoxGuard Agent State Schema — Phase 4

Defines the TypedDict that flows through every node of the LangGraph state machine.
Every field is Optional so each node only fills what it knows.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class AgentState(TypedDict, total=False):
    """
    Shared conversation state that passes between LangGraph nodes.

    Fields:
        session_id      : Unique UUID for this voice session (string form for JSON-safety).
        transcript      : Raw text from the STT engine.
        language_code   : ISO code detected / requested (e.g. 'en', 'hi', 'ta').
        intent          : Detected user intent (e.g. 'book_appointment', 'check_status').
        slots           : Key-value dict of extracted slot values (e.g. {'doctor': 'cardiologist'}).
        tool_result     : JSON-serialisable result returned by the executed tool.
        filler_needed   : True when tool latency >1.5 s → VoxGuard emits a filler phrase.
        interruption    : True when user barged-in mid-TTS → agent must restart gracefully.
        guardrail_flag  : True when content policy is violated.
        risk_score      : Float 0–1 safety score from the guardrail node.
        turn_latency_ms : Wall-clock ms from STT output to TTS input ready.
        error           : Human-readable error message if any node failed.
        messages        : Full conversation message history for LLM context window.
    """
    session_id: Optional[str]
    transcript: Optional[str]
    language_code: Optional[str]
    intent: Optional[str]
    slots: Optional[Dict[str, Any]]
    tool_result: Optional[Dict[str, Any]]
    filler_needed: Optional[bool]
    interruption: Optional[bool]
    guardrail_flag: Optional[bool]
    risk_score: Optional[float]
    turn_latency_ms: Optional[int]
    error: Optional[str]
    messages: Optional[List[Dict[str, str]]]
