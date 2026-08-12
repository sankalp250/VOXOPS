# VOXOPS — Free Prerequisites & Account Setup Guide

> **Mentor Guide for Students & Developers**  
> *Everything you need to get production-grade AI, Speech, and Database services completely FREE.*

---

## 1. Summary of Free Services & Providers

As a student, you do **NOT** need to spend a single penny. We will assemble the best-in-class free tier & open-source services across Speech-to-Text (STT), Text-to-Speech (TTS), LLMs, and Database storage:

| Layer | Provider / Model | Free Plan / Allowance | Use Case |
| :--- | :--- | :--- | :--- |
| **Speech-to-Text (STT)** | **Groq Whisper Large v3** | **100% Free** (Unlimited ultra-fast) | English & global language transcription |
| **Speech-to-Text (STT)** | **Sarvam AI (Saarika)** | **₹100 Free Credits** (Never expires) | Indian regional languages & Hinglish/Tanglish code-mixing |
| **Speech-to-Text (STT)** | **Deepgram (Nova-2)** | **\$200 Free Credit** (Never expires) | Enterprise streaming audio transcription |
| **Text-to-Speech (TTS)** | **Kokoro-82M** | **100% Free Open Source** (Apache 2.0) | Zero-cost, high-quality local/API English TTS |
| **Text-to-Speech (TTS)** | **ElevenLabs** | **10,000 Free Chars/month** | Premium ultra-realistic English voice synthesis |
| **Text-to-Speech (TTS)** | **Sarvam AI (Bulbul)** | **₹100 Free Credits** | 11+ Indian languages (Hindi, Tamil, Telugu, etc.) |
| **Text-to-Speech (TTS)** | **Deepgram (Aura)** | **\$200 Free Credit** | Ultra-low latency voice agent synthesis |
| **LLM & Reasoning** | **Groq (DeepSeek-R1, Qwen 2.5 72B)** | **100% Free** (>500 tokens/sec) | Agentic decision making & tool execution |
| **Multimodal LLM** | **Google AI Studio (Gemini 2.5 Flash)**| **100% Free** (1M Token Context) | Audio, document & fallback analysis |
| **Database & Vectors** | **Supabase PostgreSQL + pgvector** | **100% Free Tier** (500MB DB, Auth, Storage) | Session persistence & semantic AI memory |

---

## 2. Step-by-Step Instructions

### Step A: How to Get Your FREE Groq API Key (Under 2 Minutes)
1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up / Log in using GitHub or Google account.
3. Click **API Keys** -> **Create API Key**.
4. Copy the key (starts with `gsk_...`).

### Step B: How to Get Your FREE Google AI Studio Key (Under 2 Minutes)
1. Go to [https://aistudio.google.com/](https://aistudio.google.com/)
2. Sign in with your Google account.
3. Click **Get API key** -> **Create API key**.
4. Copy your key (starts with `AIzaSy...`).

### Step C: How to Get Your FREE Sarvam AI Key (Indian Languages)
1. Go to [https://sarvam.ai/](https://sarvam.ai/) or [https://dashboard.sarvam.ai/](https://dashboard.sarvam.ai/)
2. Sign up with your email / Google account.
3. You immediately get **₹100 worth of free credits** (never expires!).
4. Go to **API Keys** section -> **Create API Key**.
5. Copy your Sarvam API Key.

### Step D: How to Get Your FREE ElevenLabs Key (Premium English TTS)
1. Go to [https://elevenlabs.io/](https://elevenlabs.io/)
2. Sign up for a free account.
3. You get **10,000 free characters per month** (~10-15 minutes of speech synthesis).
4. Click your Profile icon -> **API Keys** / **Profile** -> Copy API Key.

### Step E: How to Get Your FREE Deepgram Key (\$200 Credit)
1. Go to [https://console.deepgram.com/](https://console.deepgram.com/)
2. Sign up for a free account.
3. You automatically receive **\$200 in free credits** (no expiration date!).
4. Create an API key and copy it.

### Step F: How to Setup Your FREE Supabase PostgreSQL Database
1. Go to [https://supabase.com/](https://supabase.com/) -> Sign in with GitHub.
2. Click **New Project** (`voxops-db`). Set a strong password.
3. Under **Project Settings** -> **API**, copy:
   - **Project URL** (`https://<project-id>.supabase.co`)
   - **anon / public key**
   - **service_role key**
4. Under **Project Settings** -> **Database**, copy the PostgreSQL connection string.

---

## 3. Master Environment Variables Configuration (`.env`)

```env
# APP CONFIGURATION
PROJECT_NAME="VOXOPS"
ENVIRONMENT="development"
DEBUG=True
API_V1_STR="/api/v1"

# GROQ API KEY (Speech-to-Text & Reasoning LLM)
GROQ_API_KEY="gsk_your_groq_api_key_here"

# GOOGLE AI STUDIO API KEY (Multimodal & Fallback LLM)
GOOGLE_API_KEY="AIzaSy_your_google_api_key_here"

# SARVAM AI API KEY (Indian Languages STT & TTS)
SARVAM_API_KEY="your_sarvam_api_key_here"

# ELEVENLABS API KEY (Premium English TTS)
ELEVENLABS_API_KEY="your_elevenlabs_api_key_here"

# DEEPGRAM API KEY ($200 Free Credit STT & TTS)
DEEPGRAM_API_KEY="your_deepgram_api_key_here"

# SUPABASE DATABASE & CREDENTIALS
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# POSTGRES DIRECT DATABASE URI (Async SQLAlchemy)
DATABASE_URL="postgresql+asyncpg://postgres:YOUR_DB_PASSWORD@db.YOUR_PROJECT_ID.supabase.co:5432/postgres"
```
