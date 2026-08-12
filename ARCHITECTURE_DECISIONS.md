# VOXOPS — Architecture Decision Records (ADR)

> **Architectural Decisions & Engineering Trade-Offs Log**

---

## ADR 001: Selection of FastAPI as Primary Backend Framework
- **Decision**: Python 3.11+ with FastAPI & Pydantic v2.
- **Why**: Asynchronous I/O support, strict schema validation, fast OpenAPI auto-docs.

---

## ADR 002: LLM & STT Provider Strategy (Groq + Google AI Studio)
- **Decision**: Groq API (Whisper v3, DeepSeek-R1, Qwen 2.5 72B) as primary, with Google AI Studio (Gemini 2.5 Flash) as fallback.
- **Why**: 100% free tier, high-speed inference (>500 tokens/sec).

---

## ADR 003: Database Engine Strategy (Supabase PostgreSQL + PgVector)
- **Decision**: Supabase PostgreSQL with `pgvector` HNSW indexes.
- **Why**: Unified relational persistence, session history, and semantic vector memory in a single ACID-compliant database.

---

## ADR 004: Multi-Provider Resilient Fallback Engine (STT, LLM & TTS)

### Context
Proprietary single-vendor platforms (e.g., Sarvam-only or ElevenLabs-only integrations) suffer from single point of failure (SPOF) risks, quota rate-limits, and vendor lock-in.

### Decision
Implement a **Multi-Provider Fallback Chain Pattern** for STT, LLM, and TTS pipelines:
1. **STT Chain**: Groq Whisper v3 (Free primary) -> Sarvam Saarika (Indian regional fallback) -> Deepgram Nova-2 (Enterprise fallback).
2. **LLM Chain**: Groq DeepSeek-R1 / Qwen 2.5 72B (Free primary) -> Google Gemini 2.5 Flash (Free high-context fallback).
3. **TTS Chain**: ElevenLabs (Premium English primary) -> Kokoro-82M (Free open-source fallback) -> Sarvam Bulbul (Indian regional TTS fallback) -> Deepgram Aura.

### Trade-offs
- *Pros*: Zero downtime, automatic rate-limit mitigation, cost optimization (routes to free models first), no single vendor lock-in.
- *Cons*: Requires maintaining unified interface wrappers for multiple provider APIs.
