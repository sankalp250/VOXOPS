🚀 Project 1 — VoxOps AI (AI Voice Platform)
Goal

Build an AI voice calling platform that is 100% free to develop locally.

Not a Twilio clone.

Not a customer support bot.

Use

A recruiter should see:

"This guy understands production voice systems."

Free Stack
FastAPI
LiveKit (self-hosted)
Ollama
Whisper (local STT)
Piper or Kokoro TTS (local TTS)
Redis
PostgreSQL
RabbitMQ
Docker
WebSockets

You don't even need to make real phone calls initially.

Start with:

Browser
↓

Mic

↓

STT

↓

LLM

↓

TTS

↓

Speaker

Later, if you want, you can integrate SIP or telephony, but your MVP costs ₹0.

Skills it demonstrates
Streaming
WebSockets
Async Python
Voice Pipeline
AI Agents
Production Logging
Conversation Memory
Background Workers
🚀 Project 2 — ChaosFlow

This one doesn't change.

Because every backend interviewer loves these concepts.

It covers

Celery
RabbitMQ
Redis
Retry
Dead Letter Queue
State Machine
Worker Pool
Nginx
Load Balancing
Distributed Locks

No AI.

This project proves

"I know backend."

🚀 Project 3 — This is where we differentiate.

After reading what senior AI engineers build and where the industry is moving, I would not build another agent.

I'd build a tool for AI engineers.

But it has to be something recruiters instantly understand.

My pick:
AgentLab
Tagline

The Postman + GitHub + LangSmith for AI Agents.

Problem

Today AI engineers build agents.

But there is no simple place to:

Create an agent
Version it
Test it
Compare prompts
Compare models
Compare LangGraph flows
Replay failures
Evaluate outputs
See LangSmith traces
Share agents with the team

Every team ends up creating internal scripts and dashboards.

Your platform becomes their internal workspace.

Imagine this workflow

Developer creates:

Resume Screening Agent

↓

Version 1

↓

Run Evaluation Dataset

↓

100 resumes processed

↓

LangSmith captures traces

↓

Dashboard shows

Accuracy
Latency
Cost
Tool Calls
Failure Reasons

↓

Developer changes prompt

↓

Version 2

↓

Runs same dataset

↓

Platform compares V1 vs V2

↓

Developer clicks

Deploy

Features
Agent Registry
Prompt Versioning
LangGraph Builder
LangSmith Integration
Evaluation Dataset Runner
Model Comparison
Replay Execution
Tool Execution Logs
Human Feedback
Team Workspace
API Keys
RBAC
Why I like this

Because it naturally demonstrates:

LangGraph ✅
LangSmith ✅
AI Agents ✅
Evaluation ✅
Production Monitoring ✅
Backend Architecture ✅

without pretending to be another chatbot.

Final Portfolio
🥇 VoxOps

Theme

AI Voice Systems

Shows

AI
Streaming
Voice
Async
WebSockets
🥈 ChaosFlow

Theme

Backend Engineering

Shows

Distributed Systems
Redis
RabbitMQ
Nginx
Docker
Celery
🥉 AgentLab

Theme

AI Engineering Platform

Shows

LangGraph
LangSmith
AI Agents
Evaluation
Tracing
Prompt Versioning
Production AI
If I were mentoring you, I'd also add one rule

Every project must answer this question in one sentence:

VoxOps: "How do we build and operate production-grade voice AI without relying on paid APIs?"
ChaosFlow: "How do we execute long-running business workflows reliably, even when workers fail?"
AgentLab: "How do engineering teams develop, evaluate, debug, and improve AI agents before deploying them?"

Those are real engineering problems, not demo applications.

One thing I would change from what most people do

I would make AgentLab opinionated instead of generic.

Don't make it "supports every framework."

Make it the best development platform for LangGraph agents.

That lets you showcase:

LangGraph state management
LangGraph checkpoints
LangGraph memory
LangGraph interrupts (human-in-the-loop)
LangSmith traces
Agent evaluations
Prompt/version comparisons
Tool-call visualization

When a recruiter sees LangGraph + LangSmith + evaluation + tracing + replay in one polished project, it's immediately clear that you understand the modern agent engineering stack, not just how to call an LLM API. I think that's a stronger signal than building yet another domain-specific AI assistant.

isnt voxops a telecalling like phone ? isnt any free alternative for plivo twilio that i can use because i know every company needs this defenitely and they will actually love this i can show them my call bot can book appointment orders and do multiple things they would be impressed by this i believe 

I actually think you're onto something.

Yes, recruiters would absolutely be impressed by a production-grade AI calling system, because companies in healthcare, insurance, real estate, logistics, banking, and customer support are all adopting voice AI. The challenge isn't the idea—it's how you build it without spending a lot of money.

The good news: You don't need Twilio or Plivo to start.

You have three realistic options.

Option 1 (My recommendation): Build the entire voice brain locally first ⭐⭐⭐⭐⭐
Browser
     ↓
Microphone
     ↓
Whisper (STT)
     ↓
LangGraph Agent
     ↓
FastAPI Tools
     ↓
Kokoro / Piper TTS
     ↓
Speaker

This demonstrates:

Voice pipeline
AI agent
Tool calling
Appointment booking
Order taking
CRM integration
Memory
LangGraph
LangSmith

Everything except the actual phone network.

Then in your README you write:

"Telephony providers (Twilio/Plivo/SIP) can be plugged into the Voice Gateway without changing the AI Brain."

That's exactly how production systems are designed.

Option 2: SIP instead of Twilio ⭐⭐⭐⭐⭐

This is what many companies actually do.

Instead of

Phone
↓

Twilio
↓

Bot

you have

Phone

↓

Asterisk / FreeSWITCH

↓

SIP

↓

Your Voice Gateway

↓

AI Brain

Asterisk and FreeSWITCH are open source PBX systems.

Pros:

Free
Production-grade
Used in enterprises
Teaches real telephony

Cons:

Steeper learning curve than Twilio.
Option 3: LiveKit + SIP ⭐⭐⭐⭐☆

LiveKit is open source.

It supports voice streaming.

Later you can integrate SIP trunks.

Many modern AI voice companies are building around LiveKit because it handles real-time audio well.

What would I do?

I'd build this in three phases.

Phase 1 (100% Free)
Browser
↓

Microphone

↓

Whisper

↓

LangGraph

↓

FastAPI Tools

↓

TTS

↓

Browser

This proves your AI pipeline works.

Phase 2

Add

CRM

Calendar

Database

Order APIs

Email

WhatsApp


Now the agent performs real business actions.

Phase 3

Only after everything works

Replace

Browser

with

Phone

using

SIP
Asterisk
LiveKit SIP
Plivo
Twilio

Your AI Brain remains unchanged.

That's exactly how companies architect these systems.

This is the important part

Don't sell it as

AI Calling Bot

Sell it as

VoxOps — Production AI Voice Platform

Capabilities:

Appointment Booking
Food Ordering
Insurance Verification
Hotel Reservation
FAQ Handling
Lead Qualification
CRM Updates
Email Sending
Calendar Scheduling
Human Transfer
Conversation Analytics

Now it's a platform, not a single bot.

One more thing that will REALLY impress recruiters

Knowing your background (you've already worked on a production voice bot), I would not build "another appointment booking bot."

Instead, I'd build a configurable platform.

Imagine this JSON:

{
  "industry": "Healthcare",
  "goal": "Appointment Booking",
  "language": "Hindi",
  "tools": [
    "Calendar",
    "CRM",
    "Email"
  ]
}

Change it to:

{
  "industry": "Restaurant",
  "goal": "Order Taking",
  "language": "English",
  "tools": [
    "POS",
    "Payments"
  ]
}

The same LangGraph workflow adapts to different industries by changing configuration rather than rewriting code.

When an interviewer asks:

"Can your bot do something besides appointments?"

You don't say, "I'd have to rewrite it."

You open a configuration file and say:

"The core voice engine is generic. Industries, tools, prompts, and business rules are configuration-driven, so the same platform can support healthcare, restaurants, insurance, or real estate with minimal changes."

That answer is much stronger because it shows you think in terms of building platforms, not one-off demos. Given your startup experience, this is exactly the kind of architectural thinking I'd want to see from a backend/AI engineering candidate.

yes this project is selected give me a detail explanation abiut this on how we are going to this  and then letss go for 2,3 projects as well got it 

I think we've finally reached the right direction.

From everything we've discussed over the past few weeks, I think these shouldn't be "resume projects." They should be products. If someone visits your GitHub, they should think:

"If this were polished and deployed, I'd actually use it."

So here's what I'd do.Let's design VoxOps properly.
What is VoxOps?

Most people think an AI calling bot looks like this:

Phone
     ↓
LLM
     ↓
Reply

That's not what companies build.

Companies build something like this:

                      Browser Dashboard
                              │
                              │
                 ┌────────────┴────────────┐
                 │                         │
          Analytics Service        Configuration Service
                 │                         │
                 └────────────┬────────────┘
                              │
                        FastAPI Backend
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
 Voice Gateway          Agent Engine          Worker Queue
(WebRTC/SIP later)      (LangGraph)       (Celery + RabbitMQ)
        │                     │                     │
        └──────────────┬──────┴──────────────┬──────┘
                       │                     │
                  PostgreSQL             Redis
                       │
               Conversation History
                       │
                  LangSmith Traces
The Philosophy

We're not building a bot.

We're building a platform.

Think of it like Shopify.

Shopify isn't "an online store."

It's a platform where people create stores.

Similarly,

VoxOps isn't

Healthcare Bot

It isn't

Restaurant Bot

It isn't

Insurance Bot

Instead,

VoxOps lets you create all of them.

Imagine this

Company logs in.

Clicks

Create Agent

Name

Restaurant Ordering Bot

Choose

English
Hindi
Bengali

Choose Industry

Restaurant

Choose Tools

☑ POS

☑ Email

☑ Inventory

☑ CRM

Save.

Done.

Another customer.

Create

Hospital Appointment Bot

Choose

☑ Calendar

☑ Doctor Database

☑ SMS

☑ CRM

Done.

Same AI engine.

Different configuration.

So how does this actually work?

Every call follows the same pipeline.

Incoming Audio
      │
      ▼
Speech-to-Text
      │
      ▼
Conversation State
      │
      ▼
LangGraph
      │
      ▼
Tool Selection
      │
      ▼
Business APIs
      │
      ▼
Response
      │
      ▼
Text-to-Speech
      │
      ▼
Audio Output
Why LangGraph?

This is where most people misuse it.

Most people use LangGraph like:

Planner

↓

Research

↓

Writer

↓

Reviewer

That's a tutorial.

Instead,

our graph becomes

Greeting

↓

Language Detection

↓

Intent Detection

↓

Collect Slots

↓

Tool Call

↓

Confirmation

↓

Execution

↓

Memory Update

↓

Finish

Now LangGraph is managing the conversation state, not writing essays.

Why LangSmith?

Every conversation becomes a trace.

Imagine someone says

"Your bot booked the wrong appointment."

Instead of guessing, you open the trace and inspect:

Node 1

Greeting

↓

Node 2

Language Detection

↓

Node 3

Intent

↓

Node 4

Slot Extraction

↓

Node 5

Calendar Tool

↓

Node 6

Confirmation

↓

Node 7

Booking

You immediately know where it went wrong.

That's a realistic use of LangSmith.

Free Tech Stack

No paid APIs for the MVP.

Backend: FastAPI
Database: PostgreSQL
Cache: Redis
Workers: Celery + RabbitMQ
Reverse Proxy: Nginx
Containers: Docker
Agent Framework: LangGraph
Tracing: LangSmith
STT: Whisper (local)
TTS: Kokoro or Piper (local)
LLM: Ollama (Qwen/Llama)
Frontend: React or Next.js

The only thing missing is the phone network.

Initially, you'll interact through the browser microphone. The voice pipeline and business logic are the same.

Phase-wise Roadmap
Phase 1 (2 weeks)

Goal: Build a browser-based voice agent.

Browser microphone
Whisper STT
LangGraph workflow
Ollama
Piper/Kokoro TTS
Conversation memory

Result:

You can have a real voice conversation in the browser.

Phase 2 (2 weeks)

Goal: Make it a configurable platform.

Add:

Agent creation
Tool registration
Multi-industry configurations
Prompt management
Conversation history
Authentication

Now it's a product.

Phase 3 (2 weeks)

Goal: Production features.

Add:

LangSmith tracing
Analytics dashboard
Retry handling
Human handoff
Background workers
Redis caching
Monitoring
Docker Compose

Now it feels like something a startup could actually deploy.

Phase 4 (Optional)

Integrate telephony.

At this point you can connect:

SIP
Asterisk
FreeSWITCH
Twilio
Plivo

The AI Brain doesn't change—only the voice gateway does.

Why I think this project is strong

This isn't another "AI appointment bot."

It's an AI Voice Platform.

When you demo it, you don't show one hardcoded flow.

You show:

Creating a Healthcare Agent
Creating a Restaurant Agent
Creating an Insurance Agent

—all from the same platform.

That's a much stronger engineering story because it demonstrates abstraction, configuration, and reusable architecture.

My proposal for how we proceed

I think we should treat these like real startup products.

For each project, we'll produce:

Product Requirements Document (PRD) – what problem it solves and why it exists.
System Architecture (HLD) – services, data flow, deployment.
Low-Level Design (LLD) – modules, APIs, database schema.
Roadmap – broken into weekly milestones.
Production folder structure.
Implementation, one module at a time

I genuinely think that approach will give you a portfolio that's much stronger than rushing to code three disconnected demos.
Yes — this is the right objection. VoxOps as we have described it so far is too close to an existing category: a configurable voice-agent platform. There are already open agent platforms, and LangSmith itself now covers agent building/testing/deployment, so simply wrapping those tools would not be very differentiated.

And I want to correct one thing from earlier: we cannot honestly claim that nobody has ever built a particular project. The internet is too large for that. What we can target is a project with an unusual problem, a non-obvious solution, and very few obvious portfolio implementations.

I think we found a much better direction for VoxOps

Don't make the unique part:

"You can create voice agents."

Make the unique part:

"The system automatically diagnoses why a voice conversation failed and recovers from the failure."

That is a real pain point. People working with production voice agents specifically report interruptions, latency, silence handling, tool latency, and broken handoffs as major problems.

Imagine this call

Customer:

"I want to book a cardiologist tomorrow afternoon."

Agent starts checking availability.

The calendar API takes 4 seconds.

The customer says:

"Hello? Are you there?"

A normal bot might just continue or get confused.

Our system detects:

Event: extended silence + user backchannel
Cause: tool latency
Action: immediately generate a short filler response
Action: continue the existing tool call
Action: resume conversation without losing state

Then another situation:

Customer interrupts:

"Actually, make it Friday."

The system cancels the old response, updates the LangGraph state, discards unnecessary computation, and continues from the correct node.

That's much more interesting.

The actual product
VoxGuard — Voice Agent Reliability & Recovery Engine

Not a voice-agent builder.

Not another telecalling bot.

It is a runtime reliability layer for voice agents.

The voice agent itself can do:

appointment booking → order taking → lead qualification → cancellation → rescheduling

But VoxGuard's job is to make the agent survive real human behavior.

It detects things like:
interruption
silence
backchannel ("hmm", "yeah", "okay")
topic change
duplicate request
tool timeout
partial speech
STT uncertainty
agent talking over the user
failed business API
human handoff requirement
Then it decides what to do.
User Speech
     ↓
STT
     ↓
Turn/Behavior Analyzer
     ↓
LangGraph State
     ↓
Business Agent
     ↓
Tool/API
     ↓
Recovery Engine
     ↓
TTS

And LangSmith traces the entire thing.

Why this is actually interesting

The industry problem isn't:

"How do I make an LLM speak?"

The problem is:

"What happens when a real human behaves unpredictably?"

Production voice practitioners explicitly call out interruption, latency, silence, turn-taking, and cancelled computation as difficult parts of real systems.

That gives you a fantastic interview answer:

"I wasn't interested in building another voice bot. I wanted to solve the gap between a scripted voice-agent demo and a system that can survive real conversations."

That's a much better project story.

And now we can make the telephony part real

You were right earlier: a real phone call makes the demo dramatically stronger.

We can build the entire AI stack locally for ₹0, then add a telephony/SIP adapter later.

The architecture becomes:

                    PHONE / BROWSER
                          │
                          ▼
                    Voice Gateway
                          │
              ┌───────────┴───────────┐
              │                       │
          Audio Stream            Call State
              │                       │
              └───────────┬───────────┘
                          ▼
                    STT (local)
                          │
                          ▼
                Behavior Detection
                          │
                          ▼
                    LangGraph
                          │
            ┌─────────────┼─────────────┐
            │             │             │
         Calendar       Orders         CRM
            │             │             │
            └─────────────┼─────────────┘
                          │
                    Recovery Engine
                          │
                          ▼
                    TTS (local)
                          │
                          ▼
                   User / Caller

                 ─────────────────
                    LangSmith
                 traces everything
                 ─────────────────

Later, the input/output adapter can become:

SIP / Asterisk / FreeSWITCH / LiveKit

instead of your browser.

This also gives you a genuinely strong technical challenge

You can measure:

Turn latency

user stops speaking
        ↓
STT final
        ↓
LangGraph decision
        ↓
tool call
        ↓
LLM
        ↓
TTS first audio

Interruption recovery

Bot speaking
     ↓
User interrupts
     ↓
Stop TTS
     ↓
Cancel unnecessary work
     ↓
Update state
     ↓
Continue from correct node

Tool failure

Calendar API
     ↓
timeout
     ↓
retry
     ↓
fallback
     ↓
inform user

Conversation recovery

User changes intent
     ↓
Old task abandoned
     ↓
New intent detected
     ↓
State updated
     ↓
New branch executed

Now you have something to discuss with a senior engineer that goes far beyond "I made a voice chatbot."

---

# VOXOPS & VOXGUARD — Enterprise Voice Agent Reliability & Recovery Engine

> **Startup MVP Specification & Architecture Blueprint**  
> *Built for high-scale, production-ready AI Voice Engineering featuring VoxGuard (Runtime Reliability & Recovery Engine), LangGraph State Machine, LangSmith Tracing, Self-Healing State Graphs, Deterministic Tool Guardrails, Multi-Provider Resilience, and Visual Time-Travel Debugging.*

---

## 1. Executive Summary: The VoxGuard Paradigm Shift

Most voice AI projects fail in production because they focus only on *"How do I make an LLM speak?"*. In real life, real humans behave unpredictably:
- **Tool Latency & Long Silences**: An API call takes 4 seconds -> User asks *"Hello? Are you there?"* -> Bot breaks or repeats.
- **Barge-in / Interruptions**: User interrupts mid-sentence (*"Actually, make it Friday"*).
- **Backchannels & Speech Uncertainty**: User says *"hmm"*, *"yeah"*, *"wait a second"*.
- **Failed Business APIs**: Database or calendar timeout mid-call.

**VOXGUARD** (The core engine of **VOXOPS**) is **NOT** a simple telecalling bot or generic wrapper. **VoxGuard is a Runtime Reliability & Recovery Engine for Voice Agents.**

### Core Capabilities:
1. **Tool Latency Filler Generator**:
   - Detects extended silences (>1.5s) while executing slow business APIs (e.g. Calendar check, CRM lookup).
   - Immediately streams a context-aware filler (*"Checking available slots for you now..."*) while preserving execution state.
2. **Interruption & Computation Cancellation Engine**:
   - Detects user barge-in in real-time. Immediately stops active TTS audio stream, cancels unnecessary downstream LLM/Tool tasks, updates LangGraph state node, and continues from the new user intent node.
3. **LangGraph State Management & LangSmith Tracing**:
   - Manages turn-by-turn conversation graphs (`Greeting` -> `Language Detection` -> `Intent Extraction` -> `Slot Filling` -> `Tool Execution` -> `Confirmation`).
   - Traces every node transition, tool latency, recovery event, and turn-taking delay inside **LangSmith**.
4. **Deterministic Action Safety Guardrails**:
   - Passes tool inputs through Pydantic policy evaluation engines before executing business logic.
5. **Telephony & SIP Gateway Adaptability**:
   - Decoupled Voice Gateway: Works locally with Browser/WebRTC (₹0 cost), seamlessly adaptable to **LiveKit SIP / Telnyx / Asterisk / FreeSWITCH** for real telephone calls.

---

## 2. Tech Stack & Infrastructure

| Component | Primary Provider | Fallback / Local Edge |
| :--- | :--- | :--- |
| **Backend Gateway** | Python 3.11+ / FastAPI | Async REST + WebSockets + SSE |
| **Agent State Graph** | LangGraph | LangSmith Tracing & Observability |
| **Recovery Engine** | VoxGuard Turn & Interruption Handler | Tool Latency Filler Generator |
| **Database & Memory** | Supabase PostgreSQL + `pgvector` | Async SQLAlchemy + HNSW Vector Search |
| **STT Engine** | Groq Whisper Large v3 | Sarvam Saarika / Deepgram / Local Whisper |
| **LLM Brain** | Groq DeepSeek-R1 / Qwen 2.5 72B | Google AI Studio Gemini 2.5 Flash |
| **TTS Engine** | ElevenLabs (Premium English) | Kokoro-82M (Local/Free) / Sarvam Bulbul |
| **Telephony Adapter** | WebRTC (Browser ₹0) | LiveKit SIP / Telnyx / Asterisk / Plivo |
| **Frontend UI** | React / Next.js + Vanilla CSS | Real-time Waveform & State Replay Debugger |

---

## 3. High-Level System Architecture

```
                    PHONE / BROWSER WEBRTC
                              │
                              ▼
                        Voice Gateway
                              │
                  ┌───────────┴───────────┐
                  │                       │
              Audio Stream            Call State
                  │                       │
                  └───────────┬───────────┘
                              ▼
                        STT Engine
                              │
                              ▼
                  Turn / Behavior Analyzer
                              │
                              ▼
                       LangGraph State
                              │
                ┌─────────────┼─────────────┐
                │             │             │
             Calendar       Orders         CRM
                │             │             │
                └─────────────┼─────────────┘
                              │
                       VoxGuard Engine
              (Filler Generator & Recovery)
                              │
                              ▼
                        TTS Engine
                              │
                              ▼
                       User / Caller

                    ─────────────────
                       LangSmith
                    traces everything
                    ─────────────────
```

---

## 4. Master Database Schema (Supabase PostgreSQL)

### 4.1. `users` Table
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'operator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2. `voice_sessions` Table
```sql
CREATE TABLE public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    audio_file_url TEXT,
    duration_seconds FLOAT,
    transcript TEXT,
    language_code TEXT DEFAULT 'en',
    loop_count INT DEFAULT 0,
    interruption_count INT DEFAULT 0,
    filler_count INT DEFAULT 0,
    risk_score FLOAT DEFAULT 0.0,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3. `agent_executions` Table
```sql
CREATE TABLE public.agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    stt_provider TEXT NOT NULL,
    tts_provider TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    thought_process JSONB,
    turn_latency_ms INT DEFAULT 0,
    guardrail_verdict TEXT DEFAULT 'approved',
    execution_result JSONB,
    loaded_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4. `embeddings_memory` Table (`pgvector` Search)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.embeddings_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_memory_embedding 
ON public.embeddings_memory 
USING hnsw (embedding vector_cosine_ops);
```

---

## 5. Telephony Integration & Free Telephony Alternatives

To make the calling system accessible and free:

1. **Browser / WebRTC (Default MVP - ₹0 Cost)**:
   - Microphone & speaker audio stream connected directly to FastAPI WebSockets.
2. **Telnyx SIP Trunking (Free Trial Credits)**:
   - Offers free developer testing credit to link real phone numbers to our Voice Gateway via SIP.
3. **LiveKit SIP (Self-Hosted Open Source)**:
   - LiveKit provides open-source WebRTC media server + LiveKit SIP trunk bridge.
4. **Softphones (MicroSIP / Zoiper)**:
   - Free desktop softphone clients that call our local FastAPI SIP gateway over localhost.

---

## 6. API Endpoints Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Gateway health check & service integration status |
| `POST` | `/api/v1/agent/run` | Run VoxGuard Voice Session with recovery handling |
| `POST` | `/api/v1/guardrails/validate` | Inspect tool call safety before execution |
| `GET` | `/api/v1/sessions/{id}/replay` | Visual turn-by-turn state replay & Latency breakdown |
| `POST` | `/api/v1/memory/search` | `pgvector` semantic session memory search |