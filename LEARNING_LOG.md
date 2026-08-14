# VOXOPS — Senior AI Engineering Learning Log

> **Concept, Architecture & Git Learning Journal**  
> *Recording key learnings, commands, and senior engineering insights across development milestones.*

---

## Milestone 0: Initialization & Architecture Blueprinting

### 💡 Core Concepts Learned
1. **VoxGuard Paradigm Shift**: Understanding why voice AI applications fail in production (tool latency silences, interruptions, context drift, unverified tool calls) and how VoxGuard acts as a **Runtime Reliability & Recovery Engine**.
2. **LangGraph & LangSmith Tracing**: Managing turn-by-turn conversation state graphs and logging node transitions into LangSmith.
3. **Environment & API Key Resilience**: Securely storing credentials for Groq, Gemini, LangSmith, Sarvam, ElevenLabs, Deepgram, and Supabase inside git-ignored `.env`.

---

## Milestone 2: Async Database Engine & Supabase Integration (Phase 2 Completed)

### 💡 Core Concepts Learned
1. **Async Database ORM (SQLAlchemy 2.0)**: Why non-blocking database I/O using `asyncpg` or `psycopg3` (`psycopg[binary,pool]`) is essential in high-concurrency voice AI gateways.
2. **Database Telemetry Modeling**: Structuring `VoiceSession` and `AgentExecution` tables to record real-time turn-taking latency (`turn_latency_ms`), interruption counts (`interruption_count`), filler generation counts (`filler_count`), and safety verdicts (`guardrail_verdict`).
3. **Pytest Async Fixture Design**: Using `@pytest_asyncio.fixture` with in-memory SQLite (`sqlite+aiosqlite:///:memory:`) for isolated, ultra-fast unit testing.

---

## Milestone 3: Multi-Provider Speech-to-Text Engine (Phase 3 Completed)

### 💡 Core Concepts Learned
1. **Resilient Provider Fallback Chain**: Implementing auto-failover across **Groq Whisper Large v3** (Primary Free), **Sarvam Saarika v2.5** (Indian Regional & Code-Mixing), and **Deepgram Nova-2** (Enterprise fallback).
2. **Async Audio Ingestion**: Validating audio binary payloads (`.wav`, `.mp3`, `.webm`, `.ogg`) and logging duration, word count, and processing latency directly to Supabase PostgreSQL.

---

## Milestone 4 & 5: Dynamic Multi-Tenant Agent & Semantic Vector Memory (Phases 4 & 5 Completed)

### 💡 Core Concepts Learned
1. **Zero-Hardcoding Dynamic Multi-Tenancy**: How a single voice AI engine can serve hundreds of distinct clients (clinics, grocery stores, pizza shops) by parameterizing `system_prompt`, `tools_config`, `intent_examples`, and `language_code` through a dynamic `ClientConfig`.
2. **Multi-Tenant Vector Isolation**: Ensuring semantic vector search (`EmbeddingMemory`) strictly partitions by `client_id` / `embedding_namespace`, guaranteeing that one tenant's queries can never access or leak another tenant's proprietary documents or conversation history.
3. **High-Performance Cosine Search**: Combining dense 768-dimensional normalized vectors with fast cosine similarity algorithms to retrieve relevant context in <10 milliseconds.

### 🛠️ Git & GitHub Learning

#### Git CLI Commands Executed
```bash
# Check status
git status

# Stage all files
git add .

# Commit milestone
git commit -m "feat: implement Phase 5 multi-tenant semantic vector memory and live verification"

# Push to GitHub
git push origin main
```

#### Equivalent VS Code Source Control UI Workflow
1. Open **Source Control** view (`Ctrl+Shift+G`).
2. Click **`+` (Stage All Changes)** above the file tree.
3. Type `"feat: implement Phase 5 multi-tenant semantic vector memory..."` in the commit input box.
4. Press **`Ctrl+Enter`** or click **Commit**.
5. Click **Sync Changes** or ellipsis **`...` -> Push**.
