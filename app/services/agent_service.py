"""
VoxGuard Dynamic Agent Service — Phase 5 Vector Memory Integration

The LangGraph state machine is 100% dynamic and multi-tenant.
Every node reads instructions and isolated vector memory from ClientConfig.

Graph topology:
    START → language_detect → guardrail
                                 ├─(blocked)─► respond → END
                                 └─(safe)────► memory_retrieve → intent_detect → slot_fill → tool_execute → respond → END
"""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph

from app.schemas.agent_state import AgentState
from app.schemas.client import ClientConfig, ToolSchema
from app.services.recovery_service import recovery_engine
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LangSmith Tracing Setup
# ---------------------------------------------------------------------------
if settings.LANGSMITH_API_KEY:
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.LANGSMITH_API_KEY)
    os.environ.setdefault("LANGCHAIN_PROJECT", "VOXOPS-VoxGuard")
    logger.info("LangSmith tracing enabled → project 'VOXOPS-VoxGuard'")


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# LLM Factory & Shared Client Cache
# ---------------------------------------------------------------------------
_llm_cache: Dict[float, ChatGroq] = {}

def _build_llm(temperature: float = 0.0) -> ChatGroq:
    if temperature not in _llm_cache:
        _llm_cache[temperature] = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY or "sk-placeholder",
            temperature=temperature,
            max_tokens=512,
        )
    return _llm_cache[temperature]


def _get_client_config(state: AgentState) -> ClientConfig:
    """Extract ClientConfig from state."""
    cfg = state.get("client_config")
    if not cfg:
        raise RuntimeError("client_config not found in AgentState.")
    return cfg  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Node 1: Language Detection
# ---------------------------------------------------------------------------
def node_language_detect(state: AgentState) -> AgentState:
    cfg = _get_client_config(state)
    lang = state.get("language_code") or cfg.language_code
    lang = lang.split("-")[0].lower()
    logger.info("[language_detect] client=%s lang=%s", cfg.client_id, lang)
    return {**state, "language_code": lang}


# ---------------------------------------------------------------------------
# Node 2: Guardrail Safety Check
# ---------------------------------------------------------------------------
def node_guardrail(state: AgentState) -> AgentState:
    transcript = state.get("transcript", "") or ""
    result = recovery_engine.evaluate_safety(transcript)
    logger.info("[guardrail] safe=%s risk=%.2f", result["safe"], result["risk_score"])
    return {
        **state,
        "guardrail_flag": not result["safe"],
        "risk_score": float(result["risk_score"]),
        "error": None if result["safe"] else f"Blocked: {result['reason']}",
    }


# ---------------------------------------------------------------------------
# Node 3: Semantic Vector Memory Retrieval (Phase 5)
# ---------------------------------------------------------------------------
def node_memory_retrieve(state: AgentState) -> AgentState:
    """
    Passes through or enriches memory_context for this client's namespace.
    """
    cfg = _get_client_config(state)
    memories = state.get("memory_context") or []
    logger.info("[memory_retrieve] client=%s existing_memories=%d", cfg.client_id, len(memories))
    return {**state, "memory_context": memories}


# ---------------------------------------------------------------------------
# Node 4: Dynamic Intent Detection (Async Non-Blocking)
# ---------------------------------------------------------------------------
async def node_intent_detect(state: AgentState) -> AgentState:
    cfg = _get_client_config(state)
    transcript = state.get("transcript", "") or ""
    lang = state.get("language_code", "en")

    if not cfg.intent_labels:
        logger.info("[intent_detect] no intent labels defined — using 'unknown'")
        return {**state, "intent": "unknown"}

    examples_text = ""
    for intent, phrases in cfg.intent_examples.items():
        examples_text += f"\n- Intent '{intent}': {', '.join(f'\"{p}\"' for p in phrases[:3])}"

    system_prompt = (
        f"{cfg.system_prompt}\n\n"
        f"TASK: Classify user intent. Return ONLY one label from this list:\n"
        f"{', '.join(cfg.intent_labels)}\n\n"
        f"Examples:{examples_text}\n\n"
        f"Language context: {lang}. Return ONLY the intent label. No explanation."
    )

    intent = "unknown"
    try:
        llm = _build_llm()
        resp = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=transcript)])
        candidate = str(resp.content).strip().lower().split()[0].strip(".,")
        if candidate in cfg.intent_labels:
            intent = candidate
    except Exception as exc:
        logger.warning("[intent_detect] LLM failed: %s", exc)

    logger.info("[intent_detect] client=%s intent=%s", cfg.client_id, intent)
    return {**state, "intent": intent}


# ---------------------------------------------------------------------------
# Node 5: Dynamic Slot Filling (Async Non-Blocking)
# ---------------------------------------------------------------------------
async def node_slot_fill(state: AgentState) -> AgentState:
    cfg = _get_client_config(state)
    transcript = state.get("transcript", "") or ""
    intent = state.get("intent", "unknown")

    if not cfg.tools:
        return {**state, "slots": {}}

    tool_params_text = ""
    for tool in cfg.tools:
        if tool.parameters:
            tool_params_text += f"\nTool '{tool.name}': {json.dumps(tool.parameters)}"

    if not tool_params_text:
        return {**state, "slots": {}}

    system_prompt = (
        f"{cfg.system_prompt}\n\n"
        f"TASK: Extract parameter values from the user's message.\n"
        f"User intent: '{intent}'\n"
        f"Available tool parameters:{tool_params_text}\n\n"
        f"Return ONLY valid JSON. Keys should be parameter names. "
        f"Use null for missing values. Return {{}} if nothing found."
    )

    slots: Dict[str, Any] = {}
    try:
        llm = _build_llm()
        resp = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=transcript)])
        raw = str(resp.content).strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        slots = json.loads(raw)
    except Exception as exc:
        logger.warning("[slot_fill] failed: %s", exc)

    logger.info("[slot_fill] client=%s slots=%s", cfg.client_id, slots)
    return {**state, "slots": slots}


# ---------------------------------------------------------------------------
# Node 6: Dynamic Tool Execution (Native Async)
# ---------------------------------------------------------------------------
async def _call_real_api(api_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(api_url, json=payload)
        resp.raise_for_status()
        return dict(resp.json())


async def node_tool_execute(state: AgentState) -> AgentState:
    cfg = _get_client_config(state)
    intent = state.get("intent", "unknown")
    slots = state.get("slots") or {}

    if not cfg.tools:
        return {**state, "tool_result": {"status": "conversational", "message": "Conversational reply."}}

    matched_tool: ToolSchema = cfg.tools[0]
    for tool in cfg.tools:
        if tool.name == intent:
            matched_tool = tool
            break

    payload = {**slots, "intent": intent, "client_id": cfg.client_id}

    if matched_tool.api_url.startswith("mock://"):
        result: Dict[str, Any] = {
            "status": "success",
            "tool": matched_tool.name,
            "message": f"Action '{matched_tool.name}' completed successfully.",
            "data": slots,
        }
    else:
        try:
            result = await _call_real_api(matched_tool.api_url, payload)
        except Exception as exc:
            logger.error("[tool_execute] API call failed for '%s': %s", matched_tool.name, exc)
            result = {"status": "error", "message": str(exc)}

    logger.info("[tool_execute] client=%s tool=%s status=%s", cfg.client_id, matched_tool.name, result.get("status"))
    return {**state, "tool_result": result}


# ---------------------------------------------------------------------------
# Node 7: Dynamic Response Generation (with Memory Context, Async)
# ---------------------------------------------------------------------------
async def node_respond(state: AgentState) -> AgentState:
    cfg = _get_client_config(state)
    tool_result = state.get("tool_result") or {}
    intent = state.get("intent", "unknown")
    lang = state.get("language_code", cfg.language_code)
    transcript = state.get("transcript", "")
    memory_context = state.get("memory_context") or []

    if state.get("guardrail_flag"):
        return {**state, "tool_result": {**tool_result, "response_text": "I'm sorry, I can't help with that."}}

    memory_text = ""
    if memory_context:
        snippets = [m.get("content", "") for m in memory_context if m.get("content")]
        if snippets:
            memory_text = "\n\nRetrieved Client Knowledge / Past History:\n" + "\n".join(f"- {s}" for s in snippets)

    system_prompt = (
        f"{cfg.system_prompt}\n\n"
        f"TASK: Generate a brief, natural spoken response (1-2 sentences max).\n"
        f"This response will be READ ALOUD via text-to-speech — keep it conversational.\n"
        f"Language: {lang}.{memory_text}"
    )

    user_content = (
        f"User said: \"{transcript}\"\n"
        f"Detected intent: {intent}\n"
        f"Tool result: {json.dumps(tool_result, ensure_ascii=False)}"
    )

    # Friendly conversational default in case tool output is purely internal or LLM unreachable
    fallback_response = f"Hi! I am {cfg.name}. How can I help you today?"
    if tool_result.get("status") == "success" and tool_result.get("message"):
        fallback_response = str(tool_result.get("message"))

    response_text = fallback_response
    try:
        llm = _build_llm(temperature=0.3)
        resp = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=user_content)])
        response_text = str(resp.content).strip()
    except Exception as exc:
        logger.warning("[respond] LLM failed: %s", exc)

    logger.info("[respond] client=%s text='%s...'", cfg.client_id, response_text[:60])
    return {**state, "tool_result": {**tool_result, "response_text": response_text}}


# ---------------------------------------------------------------------------
# Conditional Edge
# ---------------------------------------------------------------------------
def _route_after_guardrail(state: AgentState) -> str:
    return "respond" if state.get("guardrail_flag") else "memory_retrieve"


# ---------------------------------------------------------------------------
# Graph Builder
# ---------------------------------------------------------------------------
def build_voxguard_graph() -> Any:
    graph = StateGraph(AgentState)

    graph.add_node("language_detect", node_language_detect)
    graph.add_node("guardrail", node_guardrail)
    graph.add_node("memory_retrieve", node_memory_retrieve)
    graph.add_node("intent_detect", node_intent_detect)
    graph.add_node("slot_fill", node_slot_fill)
    graph.add_node("tool_execute", node_tool_execute)
    graph.add_node("respond", node_respond)

    graph.add_edge(START, "language_detect")
    graph.add_edge("language_detect", "guardrail")
    graph.add_conditional_edges(
        "guardrail",
        _route_after_guardrail,
        {"memory_retrieve": "memory_retrieve", "respond": "respond"},
    )
    graph.add_edge("memory_retrieve", "intent_detect")
    graph.add_edge("intent_detect", "slot_fill")
    graph.add_edge("slot_fill", "tool_execute")
    graph.add_edge("tool_execute", "respond")
    graph.add_edge("respond", END)

    return graph.compile()


# Module-level compiled graph
voxguard_graph = build_voxguard_graph()


async def run_agent(
    transcript: str,
    client_config: ClientConfig,
    language_code: str | None = None,
    session_id: str = "",
    memory_context: Optional[List[Dict[str, Any]]] = None,
) -> AgentState:
    t0 = time.monotonic()
    initial_state: AgentState = {
        "transcript": transcript,
        "language_code": language_code or client_config.language_code,
        "session_id": session_id,
        "client_config": client_config,  # type: ignore[typeddict-item]
        "memory_context": memory_context or [],
        "messages": [{"role": "user", "content": transcript}],
    }
    final_state: AgentState = await voxguard_graph.ainvoke(initial_state)
    final_state["turn_latency_ms"] = int((time.monotonic() - t0) * 1000)
    return final_state
