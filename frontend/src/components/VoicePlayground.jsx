import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, Trash2, Bot, User, Loader2, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { runAgentTurn, transcribeAudio, synthesizeSpeech } from '../services/api';

/* ─── helpers ─── */
function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function VoicePlayground({ activeClient }) {
  const [messages, setMessages] = useState([]);          // { id, role, text, time, latency, intent }
  const [input, setInput]       = useState('');
  const [recording, setRecording] = useState(false);
  const [thinking, setThinking]  = useState(false);
  const [muted, setMuted]        = useState(false);
  const [error, setError]        = useState(null);

  const bottomRef    = useRef(null);
  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const audioRef     = useRef(null);  // currently playing TTS audio element

  /* seed greeting when client changes */
  useEffect(() => {
    if (!activeClient) return;
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      text: `Hi! I'm ${activeClient.name}. How can I help you today?`,
      time: formatTime(),
    }]);
    setError(null);
  }, [activeClient?.id]);

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  /* send a text turn */
  async function send(text) {
    if (!text.trim() || !activeClient || thinking) return;
    const userMsg = { id: Date.now(), role: 'user', text, time: formatTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setError(null);
    try {
      const res = await runAgentTurn({
        transcript: text,
        clientId: activeClient.id,
        languageCode: activeClient.language_code,
      });
      const asstMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: res.response_text,
        time: formatTime(),
        latency: res.turn_latency_ms,
        intent: res.intent,
      };
      setMessages(prev => [...prev, asstMsg]);

      /* speak via backend TTS (Deepgram Aura / Sarvam Bulbul) */
      if (!muted && res.response_text) {
        // Stop any currently playing audio before starting new
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        const lang = activeClient?.language_code || 'en';
        audioRef.current = await synthesizeSpeech(res.response_text, lang);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setThinking(false);
    }
  }

  /* mic recording */
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setThinking(true);
        try {
          const { transcript } = await transcribeAudio(blob, activeClient?.language_code || 'en');
          if (transcript?.trim() && !transcript.startsWith('[Transcription unavailable')) {
            await send(transcript);
          } else {
            setError('Could not clearly transcribe speech. Please try speaking again.');
          }
        } catch (e) {
          setError(e.message);
        } finally {
          setThinking(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('Microphone access denied. Please enable mic permissions.');
    }
  }

  function stopRec() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function clearConversation() {
    if (!activeClient) return;
    setMessages([{
      id: Date.now(),
      role: 'assistant',
      text: `Hi! I'm ${activeClient.name}. How can I help you today?`,
      time: formatTime(),
    }]);
    setError(null);
    // Stop any ongoing TTS audio on conversation clear
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  /* ─── empty state ─── */
  if (!activeClient) {
    return (
      <div style={styles.emptyState}>
        <Bot size={40} color="var(--ink-light)" />
        <p style={{ color: 'var(--ink-muted)', fontWeight: '600', marginTop: '0.75rem' }}>No agent selected</p>
        <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem' }}>Create an agent in the Builder tab first.</p>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      {/* ── Header bar ─────────────────────────────────── */}
      <div style={styles.chatHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={styles.agentAvatar}>
            <Bot size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{activeClient.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-light)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="dot-live" />
              Live · {activeClient.language_code?.toUpperCase()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setMuted(m => {
                const next = !m;
                if (next && audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current = null;
                }
                return next;
              });
            }}
            title={muted ? 'Unmute agent voice' : 'Mute agent voice'}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            {muted ? 'Unmuted' : 'Voice On'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={clearConversation} title="Clear conversation">
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      {/* ── Chat Messages ───────────────────────────────── */}
      <div style={styles.messageList}>
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              {/* Avatar */}
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'var(--ink)' : 'var(--lavender)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {msg.role === 'user' ? <User size={14} color="#fff" /> : <Bot size={14} color="#6B4FBB" />}
              </div>
              {/* Bubble */}
              <div style={{
                maxWidth: '70%',
                background: msg.role === 'user' ? 'var(--ink)' : 'var(--cream-card)',
                color: msg.role === 'user' ? '#fff' : 'var(--ink)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding: '0.75rem 1rem',
                fontSize: '0.92rem',
                lineHeight: '1.55',
                boxShadow: 'var(--shadow-card)',
              }}>
                {msg.text}
              </div>
            </div>
            {/* Meta */}
            <div style={{ paddingLeft: msg.role === 'user' ? 0 : '36px', paddingRight: msg.role === 'user' ? '36px' : 0, display: 'flex', gap: '0.6rem', fontSize: '0.68rem', color: 'var(--ink-light)' }}>
              <span>{msg.time}</span>
              {msg.latency && <span>· {msg.latency}ms</span>}
              {msg.intent && msg.intent !== 'unknown' && <span>· {msg.intent}</span>}
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {thinking && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--lavender)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={14} color="#6B4FBB" />
            </div>
            <div style={{ background: 'var(--cream-card)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px', padding: '0.75rem 1.1rem', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 150, 300].map(d => (
                <div key={d} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ink-light)', animation: `pulse-dot 1.2s ease-in-out ${d}ms infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'var(--peach-bg)', border: '1px solid var(--peach)', borderRadius: 'var(--r-md)', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#B04A37', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚠ {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#B04A37', fontSize: '1rem' }}>×</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar ───────────────────────────────────── */}
      <div style={styles.inputBar}>
        {/* Mic button */}
        <button
          onMouseDown={startRec}
          onMouseUp={stopRec}
          onTouchStart={startRec}
          onTouchEnd={stopRec}
          disabled={thinking}
          title="Hold to speak"
          style={{
            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
            background: recording ? '#E53E3E' : 'var(--ink)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
            boxShadow: recording ? '0 0 0 6px rgba(229,62,62,0.2)' : 'none',
          }}
        >
          {recording ? <MicOff size={18} color="#fff" /> : <Mic size={18} color="#fff" />}
        </button>

        {/* Text input */}
        <form
          onSubmit={e => { e.preventDefault(); send(input); }}
          style={{ flex: 1, display: 'flex', gap: '0.5rem' }}
        >
          <input
            className="input"
            placeholder={recording ? '🎤 Listening...' : `Message ${activeClient.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={thinking || recording}
            style={{ borderRadius: 'var(--r-pill)', paddingLeft: '1.25rem' }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !thinking ? 'var(--ink)' : 'var(--cream-dark)',
              border: '1.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {thinking
              ? <Loader2 size={16} color="var(--ink-muted)" style={{ animation: 'spin 1s linear infinite' }} />
              : <Send size={16} color={input.trim() ? '#fff' : 'var(--ink-light)'} />
            }
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 61px)',  /* full height minus header */
    background: 'var(--cream-soft)',
    borderRadius: 'var(--r-xl)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    maxWidth: '800px',
    margin: '0 auto',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    background: 'var(--cream-card)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  agentAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--ink)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    background: 'var(--cream-card)',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  emptyState: {
    height: 'calc(100vh - 61px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    color: 'var(--ink-light)',
  },
};
