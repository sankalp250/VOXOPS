# VOXOPS — Senior AI Engineering Learning Log

> **Concept, Architecture & Git Learning Journal**  
> *Recording key learnings, commands, and senior engineering insights across development milestones.*

---

## Milestone 0: Initialization & Architecture Blueprinting

### 💡 Core Concepts Learned
1. **VoxGuard Paradigm Shift**: Understanding why voice AI applications fail in production (tool latency silences, interruptions, context drift, unverified tool calls) and how VoxGuard acts as a **Runtime Reliability & Recovery Engine**.
2. **LangGraph & LangSmith Tracing**: Managing turn-by-turn conversation state graphs (`Greeting` -> `Intent` -> `Slot Filling` -> `Tool Execution`) and logging node transitions into LangSmith.
3. **Environment & API Key Resilience**: Securely storing credentials for Groq, Gemini, LangSmith, Sarvam, ElevenLabs, Deepgram, and Supabase inside git-ignored `.env`.

### 🛠️ Git & GitHub Learning

#### Git CLI Commands Executed
```bash
# Check working directory status
git status

# Stage all project blueprint and application files
git add .

# Create a conventional commit
git commit -m "feat: complete VoxGuard architecture blueprint, API configuration, and baseline test suite"

# Push to main branch on GitHub
git push origin main
```

#### Equivalent VS Code Source Control UI Workflow
1. Open **Source Control** view (`Ctrl+Shift+G`).
2. Click **`+` (Stage All Changes)** above the file tree.
3. Type `"feat: complete VoxGuard architecture blueprint..."` in the commit input box.
4. Press **`Ctrl+Enter`** or click **Commit**.
5. Click **Sync Changes** or ellipsis **`...` -> Push**.
