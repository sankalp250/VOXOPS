-- =====================================================================
-- VOXOPS & VOXGUARD — SUPABASE POSTGRESQL SCHEMA INITIALIZATION SCRIPT
-- =====================================================================
-- Copy and paste this script into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bfnuywnumwtuptcggacq/sql
-- =====================================================================

-- 1. Enable PgVector Extension for AI Vector Search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Users Table (Platform Operators)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'operator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Voice Sessions Table (Call Telemetry & Interruptions)
CREATE TABLE IF NOT EXISTS public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    audio_file_url TEXT,
    duration_seconds FLOAT DEFAULT 0.0,
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

-- 4. Create Agent Executions Table (Turn Latency & Guardrails Log)
CREATE TABLE IF NOT EXISTS public.agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    agent_name TEXT DEFAULT 'VoxGuard-Agent',
    stt_provider TEXT DEFAULT 'groq_whisper',
    tts_provider TEXT DEFAULT 'elevenlabs',
    llm_model TEXT DEFAULT 'deepseek-r1-distill-llama-70b',
    thought_process JSONB,
    turn_latency_ms INT DEFAULT 0,
    guardrail_verdict TEXT DEFAULT 'approved',
    execution_result JSONB,
    loaded_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Embeddings Memory Table (Vector Search Memory)
CREATE TABLE IF NOT EXISTS public.embeddings_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.voice_sessions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON public.voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON public.agent_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_memory_session_id ON public.embeddings_memory(session_id);

-- 7. Grant Permissions to Public & Authenticated Roles
GRANT ALL ON TABLE public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.voice_sessions TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.agent_executions TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.embeddings_memory TO postgres, anon, authenticated, service_role;
