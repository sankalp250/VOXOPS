"""
VoxGuard LangGraph Agent Service — Phase 4

Implements the 6-node conversation state machine:

  [START]
    │
    ▼
  LANGUAGE_DETECT  ──► detects language / normalises language_code
    │
    ▼
  GUARDRAIL        ──► safety check; sets guardrail_flag & risk_score
    │ (safe)
    ▼
  INTENT_DETECT    ──► classifies user intent from transcript
    │
    ▼
  SLOT_FILL        ──► extracts named entities / slots from transcript
    │
    ▼
  TOOL_EXECUTE     ──► calls the domain tool (appointment lookup, FAQ, etc.)
    │
    ▼
  RESPOND          ──► builds final assistant response
    │
    ▼
  [END]

All transitions and node outputs are automatically traced in LangSmith
when LANGCHAIN_TRACING_V2=true is set in the environment.
"""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Dict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph

from app.schemas.agent_state import AgentState
from app.services.recovery_service import recovery_engine
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configure LangSmith tracing environment variables
# ---------------------------------------------------------------------------
if settings.LANGSMITH_API_KEY:
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.LANGSMITH_API_KEY)
    os.environ.setdefault("LANGCHAIN_PROJECT", "VOXOPS-VoxGuard")
    logger.info("LangSmith tracing enabled → project 'VOXOPS-VoxGuard'")


# ---------------------------------------------------------------------------
# LLM Client (Groq — free, fast, sufficient for intent/slot tasks)
# ---------------------------------------------------------------------------
def _build_llm() -> ChatGroq:
    return ChatGroq(
        model="deepseek-r1-distill-llama-70b",
        api_key=settings.GROQ_API_KEY or "sk-placeholder",
        temperature=0.0,
        max_tokens=512,
    )


# ---------------------------------------------------------------------------
# Node: Language Detection
# ---------------------------------------------------------------------------
def node_language_detect(state: AgentState) -> AgentState:
    """
    Detects and normalises the conversation language.
    For now uses a simple heuristic based on script detection;
    production would use langdetect or Sarvam's language API.
    """
    lang = state.get("language_code") or "en"
    # Normalise to base ISO code (e.g. 'hi-IN' → 'hi')
    lang = lang.split("-")[0].lower()
    logger.info("[Node: language_detect] lang=%s", lang)
    return {**state, "language_code": lang}


# ---------------------------------------------------------------------------
# Node: Guardrail Safety
# ---------------------------------------------------------------------------
def node_guardrail(state: AgentState) -> AgentState:
    """
    Runs the VoxGuard safety heuristic on the incoming transcript.
    If the content is flagged, sets guardrail_flag=True and short-circuits.
    """
    transcript = state.get("transcript", "") or ""
    result = recovery_engine.evaluate_safety(transcript)
    logger.info("[Node: guardrail] safe=%s risk=%.2f", result["safe"], result["risk_score"])
    return {
        **state,
        "guardrail_flag": not result["safe"],
        "risk_score": float(result["risk_score"]),
        "error": None if result["safe"] else f"Guardrail blocked: {result['reason']}",
    }


# ---------------------------------------------------------------------------
# Node: Intent Detection
# ---------------------------------------------------------------------------
def node_intent_detect(state: AgentState) -> AgentState:
    """
    Uses Groq DeepSeek-R1 to classify user intent from the transcript.
    Returns a single intent label from a controlled vocabulary.
    """
    transcript = state.get("transcript", "") or ""
    lang = state.get("language_code", "en")

    _intents = [
        "book_appointment", "cancel_appointment", "check_status",
        "find_doctor", "check_availability", "ask_faq",
        "emergency", "unknown",
    ]

    system_prompt = (
        f"You are an intent classifier for a medical voice assistant. "
        f"The user speaks in language code '{lang}'. "
        f"Return ONLY one of these intent labels (no explanation): "
        f"{', '.join(_intents)}"
    )

    try:
        llm = _build_llm()
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=transcript),
        ])
        intent = str(response.content).strip().lower().split()[0]
        if intent not in _intents:
            intent = "unknown"
    except Exception as exc:
        logger.warning("[Node: intent_detect] LLM failed: %s", exc)
        intent = "unknown"

    logger.info("[Node: intent_detect] intent=%s", intent)
    return {**state, "intent": intent}


# ---------------------------------------------------------------------------
# Node: Slot Filling
# ---------------------------------------------------------------------------
def node_slot_fill(state: AgentState) -> AgentState:
    """
    Extracts structured slot values from the transcript using Groq.
    Returns a JSON dict of slot-value pairs relevant to the detected intent.
    """
    transcript = state.get("transcript", "") or ""
    intent = state.get("intent", "unknown")

    system_prompt = (
        f"You are a slot extractor for a voice assistant. "
        f"The user's intent is '{intent}'. "
        f"Extract relevant named entities as a flat JSON object. "
        f"Keys should be slot names (e.g. doctor_type, date, time, patient_name). "
        f"Return ONLY valid JSON, nothing else. "
        f"If no slots found return {{}}."
    )

    slots: Dict[str, Any] = {}
    try:
        llm = _build_llm()
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=transcript),
        ])
        raw = str(response.content).strip()
        # Extract JSON from response (handle markdown code blocks)
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        slots = json.loads(raw)
    except Exception as exc:
        logger.warning("[Node: slot_fill] slot extraction failed: %s", exc)
        slots = {}

    logger.info("[Node: slot_fill] slots=%s", slots)
    return {**state, "slots": slots}


# ---------------------------------------------------------------------------
# Node: Tool Execution (Mock — real tools added per domain)
# ---------------------------------------------------------------------------
def node_tool_execute(state: AgentState) -> AgentState:
    """
    Executes the domain tool corresponding to the detected intent.

    Production: each intent maps to a real async tool (EHR lookup, calendar API, etc.)
    Here we use deterministic mocks so the graph is fully testable without external APIs.
    """
    intent = state.get("intent", "unknown")
    slots = state.get("slots") or {}

    _mock_responses: Dict[str, Dict[str, Any]] = {
        "book_appointment": {
            "status": "confirmed",
            "message": "Appointment booked successfully.",
            "slot_time": "2026-08-14T10:30:00",
            "doctor": slots.get("doctor_type", "General Physician"),
        },
        "cancel_appointment": {
            "status": "cancelled",
            "message": "Your appointment has been cancelled.",
        },
        "check_availability": {
            "status": "available",
            "slots": ["09:00", "11:30", "14:00"],
        },
        "find_doctor": {
            "status": "found",
            "doctors": [f"Dr. Sharma ({slots.get('doctor_type', 'General')})"],
        },
        "check_status": {
            "status": "active",
            "last_appointment": "2026-08-01T09:00:00",
        },
        "ask_faq": {
            "status": "answered",
            "answer": "Our clinic is open Monday–Saturday, 9 AM to 6 PM.",
        },
        "emergency": {
            "status": "emergency",
            "message": "Connecting you to emergency services now.",
        },
        "unknown": {
            "status": "clarify",
            "message": "I didn't quite catch that. Could you please repeat?",
        },
    }

    result = _mock_responses.get(intent, _mock_responses["unknown"])
    logger.info("[Node: tool_execute] intent=%s result_status=%s", intent, result.get("status"))
    return {**state, "tool_result": result}


# ---------------------------------------------------------------------------
# Node: Respond — build final assistant reply
# ---------------------------------------------------------------------------
def node_respond(state: AgentState) -> AgentState:
    """
    Composes the final assistant text response to be sent to TTS.
    Uses Groq to generate a natural, conversational reply from the tool result.
    """
    tool_result = state.get("tool_result") or {}
    intent = state.get("intent", "unknown")
    lang = state.get("language_code", "en")
    transcript = state.get("transcript", "")

    # Blocked by guardrail
    if state.get("guardrail_flag"):
        response_text = "I'm sorry, I can't help with that request."
        logger.info("[Node: respond] guardrail short-circuit")
        return {**state, "tool_result": {**tool_result, "response_text": response_text}}

    system_prompt = (
        f"You are a warm, professional medical voice assistant. "
        f"Respond in language code '{lang}' in 1-2 short sentences. "
        f"Be conversational and natural — this will be read aloud over a phone call. "
        f"Use the tool result to give the user accurate information."
    )

    user_content = (
        f"User said: '{transcript}'\n"
        f"Intent: {intent}\n"
        f"Tool result: {json.dumps(tool_result)}"
    )

    response_text = tool_result.get("message", "Done!")
    try:
        llm = _build_llm()
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content),
        ])
        response_text = str(response.content).strip()
    except Exception as exc:
        logger.warning("[Node: respond] LLM response generation failed: %s", exc)

    logger.info("[Node: respond] response_text='%s'", response_text[:80])
    return {**state, "tool_result": {**tool_result, "response_text": response_text}}


# ---------------------------------------------------------------------------
# Conditional Edge: Route based on guardrail verdict
# ---------------------------------------------------------------------------
def _route_after_guardrail(state: AgentState) -> str:
    """Skip to respond node directly if content was flagged by guardrail."""
    if state.get("guardrail_flag"):
        logger.info("VoxGuard: content blocked → routing to respond (skip tools)")
        return "respond"
    return "intent_detect"


# ---------------------------------------------------------------------------
# Build & Compile the LangGraph State Machine
# ---------------------------------------------------------------------------
def build_voxguard_graph() -> Any:
    """
    Constructs and compiles the VoxGuard conversation state machine.

    Graph topology:
        START → language_detect → guardrail
                                      ├─(blocked)─► respond → END
                                      └─(safe)────► intent_detect → slot_fill → tool_execute → respond → END
    """
    graph = StateGraph(AgentState)

    # Register nodes
    graph.add_node("language_detect", node_language_detect)
    graph.add_node("guardrail", node_guardrail)
    graph.add_node("intent_detect", node_intent_detect)
    graph.add_node("slot_fill", node_slot_fill)
    graph.add_node("tool_execute", node_tool_execute)
    graph.add_node("respond", node_respond)

    # Define edges
    graph.add_edge(START, "language_detect")
    graph.add_edge("language_detect", "guardrail")
    graph.add_conditional_edges(
        "guardrail",
        _route_after_guardrail,
        {"intent_detect": "intent_detect", "respond": "respond"},
    )
    graph.add_edge("intent_detect", "slot_fill")
    graph.add_edge("slot_fill", "tool_execute")
    graph.add_edge("tool_execute", "respond")
    graph.add_edge("respond", END)

    return graph.compile()


# ---------------------------------------------------------------------------
# Module-level compiled graph singleton
# ---------------------------------------------------------------------------
voxguard_graph = build_voxguard_graph()


async def run_agent(
    transcript: str,
    language_code: str = "en",
    session_id: str = "",
) -> AgentState:
    """
    Convenience wrapper: run the full VoxGuard graph for one turn.

    Returns the final AgentState after all nodes have executed.
    """
    t0 = time.monotonic()
    initial_state: AgentState = {
        "transcript": transcript,
        "language_code": language_code,
        "session_id": session_id,
        "messages": [{"role": "user", "content": transcript}],
    }
    final_state: AgentState = await voxguard_graph.ainvoke(initial_state)
    final_state["turn_latency_ms"] = int((time.monotonic() - t0) * 1000)
    return final_state
