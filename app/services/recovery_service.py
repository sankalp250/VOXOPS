"""
VoxGuard Recovery Engine — Phase 4

Handles the two most common production voice-agent failure patterns:
1. Tool Latency Silence  — when a backend API takes >1.5 s to respond
2. User Interruption     — when user speaks while TTS is still playing

Both are diagnosed, logged, and recovered automatically so the call
never drops into awkward silence or crashes.
"""
from __future__ import annotations

import asyncio
import logging
import random
import time
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Filler Phrase Bank
# ---------------------------------------------------------------------------

_FILLERS_EN: List[str] = [
    "Let me check that for you…",
    "Give me just a moment…",
    "I'm looking into that now…",
    "One second while I pull that up…",
    "Bear with me for a moment…",
]

_FILLERS_HI: List[str] = [
    "एक मिनट, मैं देख रहा हूँ…",
    "बस एक पल…",
    "मैं अभी जाँच कर रहा हूँ…",
]

_FILLERS_TA: List[str] = [
    "ஒரு நிமிடம்…",
    "நான் இப்போது பார்க்கிறேன்…",
]

_FILLER_BANK: Dict[str, List[str]] = {
    "en": _FILLERS_EN,
    "hi": _FILLERS_HI,
    "ta": _FILLERS_TA,
}


class VoxGuardRecoveryEngine:
    """
    Runtime Reliability Engine for production voice-agent conversations.

    Responsibilities:
    - Detect when a tool call will take >1.5 s and emit a natural filler phrase
      so there is no dead air on the phone line.
    - Detect when a user interrupts mid-TTS and cleanly cancel the current
      speech synthesis turn before resuming at the correct conversation point.
    - Record all recovery events with structured telemetry for LangSmith tracing.
    """

    # Threshold (seconds) after which a filler phrase is emitted
    TOOL_LATENCY_THRESHOLD_S: float = 1.5

    def __init__(self) -> None:
        self._active_tts_task: Optional[asyncio.Task] = None  # type: ignore[type-arg]
        self._recovery_log: List[Dict[str, object]] = []

    # ------------------------------------------------------------------
    # Filler Phrase Generation
    # ------------------------------------------------------------------

    def get_filler_phrase(self, language_code: str = "en") -> str:
        """
        Returns a random natural filler phrase in the correct language.
        Falls back to English if the language is not in the phrase bank.
        """
        lang = language_code.split("-")[0].lower()
        phrases = _FILLER_BANK.get(lang, _FILLER_BANK["en"])
        return random.choice(phrases)

    async def emit_filler_if_slow(
        self,
        tool_coroutine,  # type: ignore[type-arg]
        language_code: str = "en",
        threshold_s: Optional[float] = None,
    ):
        """
        Race a tool coroutine against a latency threshold.

        If the tool takes longer than `threshold_s` seconds, immediately
        emit a filler phrase and continue waiting for the actual result.
        The filler is *yielded* so callers can stream it to TTS in real time.

        Usage:
            async for event in engine.emit_filler_if_slow(my_tool_call(), "hi"):
                if event["type"] == "filler":
                    await send_to_tts(event["text"])
                elif event["type"] == "result":
                    process(event["data"])
        """
        deadline = threshold_s or self.TOOL_LATENCY_THRESHOLD_S
        t0 = time.monotonic()

        task = asyncio.ensure_future(tool_coroutine)
        filler_emitted = False

        try:
            # Wait for threshold — if tool not done, emit a filler
            done, _ = await asyncio.wait({task}, timeout=deadline)
            if not done:
                filler_text = self.get_filler_phrase(language_code)
                filler_emitted = True
                logger.info("VoxGuard ▶ Filler emitted (tool slow): '%s'", filler_text)
                self._record_event("filler_emitted", {"text": filler_text, "lang": language_code})
                yield {"type": "filler", "text": filler_text}

            # Await actual result
            result = await task
            elapsed_ms = int((time.monotonic() - t0) * 1000)
            logger.info("VoxGuard ✓ Tool completed in %dms (filler=%s)", elapsed_ms, filler_emitted)
            yield {"type": "result", "data": result, "latency_ms": elapsed_ms}

        except Exception as exc:
            logger.error("VoxGuard tool error: %s", exc)
            yield {"type": "error", "message": str(exc)}

    # ------------------------------------------------------------------
    # Interruption (Barge-In) Handling
    # ------------------------------------------------------------------

    def register_tts_task(self, task: asyncio.Task) -> None:  # type: ignore[type-arg]
        """
        Register the currently running TTS streaming task so it can be
        cancelled if the user interrupts.
        """
        self._active_tts_task = task
        logger.debug("VoxGuard: TTS task registered.")

    def handle_interruption(self) -> bool:
        """
        Cancel the active TTS task when the user starts speaking mid-playback.

        Returns True if a task was cancelled, False if nothing was running.
        """
        if self._active_tts_task and not self._active_tts_task.done():
            self._active_tts_task.cancel()
            self._active_tts_task = None
            logger.info("VoxGuard ▶ Barge-in detected → TTS cancelled, resuming turn.")
            self._record_event("interruption_handled", {})
            return True
        return False

    # ------------------------------------------------------------------
    # Guardrail Safety Check
    # ------------------------------------------------------------------

    def evaluate_safety(self, text: str) -> Dict[str, object]:
        """
        Lightweight content safety heuristic.

        In production this would call a Gemini content-safety model or
        a LangChain guardrails library. For now it uses a keyword deny-list
        so the engine is testable without any API calls.

        Returns:
            {
                "safe": bool,
                "risk_score": float (0.0 = safe, 1.0 = definitely unsafe),
                "reason": str
            }
        """
        _deny_keywords = [
            "kill", "bomb", "weapon", "illegal",
            "fraud", "scam", "hack", "attack",
        ]
        text_lower = text.lower()
        hits = [kw for kw in _deny_keywords if kw in text_lower]
        if hits:
            risk = min(0.3 * len(hits), 1.0)
            self._record_event("guardrail_blocked", {"hits": hits, "risk": risk})
            return {"safe": False, "risk_score": risk, "reason": f"Deny-list match: {hits}"}
        return {"safe": True, "risk_score": 0.0, "reason": "pass"}

    # ------------------------------------------------------------------
    # Telemetry Log
    # ------------------------------------------------------------------

    def _record_event(self, event_type: str, data: Dict[str, object]) -> None:
        entry = {"event": event_type, "ts": time.monotonic(), **data}
        self._recovery_log.append(entry)

    def get_recovery_log(self) -> List[Dict[str, object]]:
        """Return a copy of all recovery events recorded this session."""
        return list(self._recovery_log)


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
recovery_engine = VoxGuardRecoveryEngine()
