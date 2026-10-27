import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Send, Trash2, Bot, User, Loader2, Volume2, VolumeX, RefreshCw, Radio, Sparkles, CheckCircle2 } from 'lucide-react';
import { runAgentTurn, transcribeAudio, synthesizeSpeech } from '../services/api';

/* ─── helpers ─── */
function formatTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function VoicePlayground({ activeClient, activeVoice, onNavigateToVoices }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100 for visualizer
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).slice(2, 9));

  const bottomRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const recStartTimeRef = useRef(0);

  // AudioContext & VAD (Voice Activity Detection) refs
  const audioContextRef = useRef(null);
  const vadAnimFrameRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const lastSpokenTimeRef = useRef(0);

  // State synchronization refs for event listeners and callbacks
  const continuousRef = useRef(continuousMode);
  continuousRef.current = continuousMode;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const thinkingRef = useRef(thinking);
  thinkingRef.current = thinking;
  const recordingRef = useRef(recording);
  recordingRef.current = recording;

  // Determine effective voice
  const effectiveVoice = activeVoice || {
    id: activeClient?.language_code === 'hi' ? 'sarvam:ritu' : 'elevenlabs:cgSgspJ2msm6clMCkdW9',
    name: activeClient?.language_code === 'hi' ? 'Ritu' : 'Jessica',
    provider: activeClient?.language_code === 'hi' ? 'sarvam' : 'elevenlabs',
    gender: 'female',
  };

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
    setSessionId('sess_' + Math.random().toString(36).slice(2, 9));
  }, [activeClient?.id]);

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking, recording]);

  /* clean up on unmount */
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      if (vadAnimFrameRef.current) cancelAnimationFrame(vadAnimFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /* send a text turn with multi-turn conversation context */
  const send = useCallback(async (text, isVoice = false) => {
    if (!text || !text.trim() || !activeClient) return;
    // Guard against duplicate submission from text box, but allow voice callbacks through
    if (!isVoice && thinkingRef.current) return;

    const userMsg = { id: Date.now(), role: 'user', text, time: formatTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setError(null);

    // Extract last 10 turns as conversational history
    const chatHistory = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.text,
    }));

    try {
      const res = await runAgentTurn({
        transcript: text,
        clientId: activeClient.id,
        languageCode: activeClient.language_code,
        sessionId,
        chatHistory,
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

      /* speak via chosen female voice (ElevenLabs Jessica / Deepgram Asteria / Sarvam Ritu) */
      if (!mutedRef.current && res.response_text) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        const lang = activeClient?.language_code || 'en';
        const audio = await synthesizeSpeech(
          res.response_text,
          lang,
          effectiveVoice.id,
          effectiveVoice.provider,
        );

        if (audio) {
          audioRef.current = audio;
          audio.onended = () => {
            audioRef.current = null;
            // If continuous hands-free mode is ON, automatically re-arm mic for user reply!
            if (continuousRef.current && !mutedRef.current) {
              setTimeout(() => {
                if (!recordingRef.current && !thinkingRef.current) {
                  startRec();
                }
              }, 450);
            }
          };
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setThinking(false);
    }
  }, [activeClient, effectiveVoice, messages, sessionId]);

  /* mic recording start with VAD (auto-stop on silence) */
  async function startRec() {
    if (recordingRef.current || thinkingRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      hasSpokenRef.current = false;
      lastSpokenTimeRef.current = Date.now();

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(timerIntervalRef.current);
        if (vadAnimFrameRef.current) cancelAnimationFrame(vadAnimFrameRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        setAudioLevel(0);

        const duration = Date.now() - recStartTimeRef.current;
        if (duration < 400) {
          setError('Recording was too short. Speak clearly, then click Done or pause speaking.');
          setRecording(false);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setThinking(true);
        try {
          const { transcript } = await transcribeAudio(blob, activeClient?.language_code || 'en');
          if (transcript?.trim() && !transcript.startsWith('[Transcription unavailable')) {
            // Force execution with isVoice=true so thinkingRef doesn't drop it
            await send(transcript, true);
          } else {
            setError('Could not clearly hear speech. Please try speaking again.');
          }
        } catch (e) {
          setError(e.message);
        } finally {
          setThinking(false);
          setRecording(false);
        }
      };

      // Set up Web Audio Analyser for VAD & volume meter
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAudioLevels = () => {
          if (!recordingRef.current) return;
          analyser.getByteFrequencyData(dataArray);

          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));

          // Speech threshold
          if (avg > 12) {
            hasSpokenRef.current = true;
            lastSpokenTimeRef.current = Date.now();
          } else if (hasSpokenRef.current) {
            // If user has spoken and 1.8 seconds of silence has passed, auto-stop!
            const silenceDuration = Date.now() - lastSpokenTimeRef.current;
            if (silenceDuration > 1800) {
              stopRec();
              return;
            }
          }

          vadAnimFrameRef.current = requestAnimationFrame(checkAudioLevels);
        };

        vadAnimFrameRef.current = requestAnimationFrame(checkAudioLevels);
      } catch (err) {
        console.warn('VAD AudioContext not supported:', err);
      }

      recStartTimeRef.current = Date.now();
      setRecordSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setError(null);
    } catch {
      setError('Microphone access denied. Please allow microphone permissions in browser.');
    }
  }

  /* mic recording stop */
  function stopRec() {
    if (vadAnimFrameRef.current) {
      cancelAnimationFrame(vadAnimFrameRef.current);
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    clearInterval(timerIntervalRef.current);
    setRecording(false);
  }

  /* toggle recording (Click-to-Talk) */
  function toggleRecording() {
    if (thinking) return;
    if (recording) {
      stopRec();
    } else {
      startRec();
    }
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
    setSessionId('sess_' + Math.random().toString(36).slice(2, 9));
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  /* empty state */
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: '800', fontSize: '0.98rem' }}>{activeClient.name}</span>
              <button
                onClick={onNavigateToVoices}
                style={styles.voiceBadgeBtn}
                title="Click to audition & change agent voice"
              >
                <Sparkles size={11} color="#6B4FBB" />
                <span>Voice: {effectiveVoice.name} ({effectiveVoice.gender})</span>
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-light)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
              <span className="dot-live" />
              <span>Live · {activeClient.language_code?.toUpperCase()}</span>
              <span>·</span>
              <span>Multi-turn Context Active</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Continuous Voice Loop Toggle */}
          <button
            className={`btn btn-sm ${continuousMode ? 'btn-dark' : 'btn-outline'}`}
            onClick={() => setContinuousMode(c => !c)}
            title="Automatically re-opens microphone when the bot finishes speaking for continuous hands-free dialogue"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Radio size={13} color={continuousMode ? '#4CAF50' : 'currentColor'} />
            <span style={{ fontSize: '0.75rem' }}>{continuousMode ? 'Hands-Free: ON' : 'Hands-Free: OFF'}</span>
          </button>

          {/* Voice Output Mute Toggle */}
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
            {muted ? 'Muted' : 'Voice On'}
          </button>

          {/* Clear Session */}
          <button className="btn btn-outline btn-sm" onClick={clearConversation} title="Clear conversation and reset session context">
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
                maxWidth: '75%',
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
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginLeft: '0.4rem' }}>{activeClient.name} is thinking...</span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div style={styles.errorBanner}>
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} style={styles.closeError}>×</button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Recording Live Status Bar with VAD & Stop Action ── */}
      {recording && (
        <div style={styles.recordingBanner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={styles.recDot} />
            <span style={{ fontWeight: '700', fontSize: '0.86rem' }}>
              Listening... ({formatDuration(recordSeconds)})
            </span>
            {/* Live Audio Visualizer Bars */}
            <div style={styles.waveBarBox}>
              {[0.4, 0.8, 1.2, 0.6, 0.9, 0.3].map((f, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.waveBar,
                    height: `${Math.max(4, Math.min(22, (audioLevel * f) / 3.5))}px`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.9, marginLeft: '0.2rem' }}>
              Pause speaking to auto-send, or click:
            </span>
          </div>

          <button
            type="button"
            onClick={stopRec}
            style={styles.doneSpeakingBtn}
            title="Click to finish speaking and send to agent"
          >
            <CheckCircle2 size={14} /> Done Speaking ➔
          </button>
        </div>
      )}

      {/* ── Input Bar ───────────────────────────────────── */}
      <div style={styles.inputBar}>
        {/* Click-to-Talk Toggle Mic button */}
        <button
          type="button"
          onClick={toggleRecording}
          disabled={thinking}
          title={recording ? 'Click to finish speaking and send' : 'Click to start speaking'}
          style={{
            ...styles.micBtn,
            background: recording ? '#D32F2F' : 'var(--ink)',
            boxShadow: recording ? '0 0 0 6px rgba(211,47,47,0.25)' : 'none',
            transform: recording ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {recording ? <MicOff size={20} color="#fff" /> : <Mic size={20} color="#fff" />}
        </button>

        {/* Text input */}
        <form
          onSubmit={e => { e.preventDefault(); send(input); }}
          style={{ flex: 1, display: 'flex', gap: '0.5rem' }}
        >
          <input
            className="input"
            placeholder={recording ? '🎤 Listening... pause speaking or click "Done Speaking"' : `Message ${activeClient.name}...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={thinking || recording}
            style={{ borderRadius: 'var(--r-pill)', paddingLeft: '1.25rem' }}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking || recording}
            style={{
              width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !thinking && !recording ? 'var(--ink)' : 'var(--cream-dark)',
              border: '1.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !thinking && !recording ? 'pointer' : 'not-allowed',
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
        @keyframes pulse-dot { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes rec-pulse { 0% { transform: scale(0.95); opacity: 0.7; } 50% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.7; } }
      `}</style>
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 61px)',
    background: 'var(--cream-soft)',
    borderRadius: 'var(--r-xl)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    maxWidth: '850px',
    margin: '0 auto',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1.25rem',
    background: 'var(--cream-card)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  agentAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'var(--ink)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBadgeBtn: {
    background: '#F3E5F5',
    border: '1px solid #E1BEE7',
    borderRadius: 'var(--r-pill)',
    padding: '0.15rem 0.6rem',
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#6B4FBB',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.15rem',
  },
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.85rem 1.25rem',
    background: 'var(--cream-card)',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  micBtn: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    flexShrink: 0,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  recordingBanner: {
    background: '#D32F2F',
    color: '#fff',
    padding: '0.5rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.82rem',
    animation: 'fadeIn 0.2s ease',
  },
  recDot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: '#fff',
    animation: 'rec-pulse 1s infinite',
  },
  waveBarBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    height: '24px',
    padding: '0 4px',
  },
  waveBar: {
    width: '3px',
    background: '#fff',
    borderRadius: '2px',
    transition: 'height 0.08s ease',
  },
  doneSpeakingBtn: {
    background: '#fff',
    color: '#D32F2F',
    border: 'none',
    borderRadius: 'var(--r-pill)',
    padding: '0.35rem 0.85rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    transition: 'transform 0.1s ease',
  },
  errorBanner: {
    background: 'var(--peach-bg)',
    border: '1px solid var(--peach)',
    borderRadius: 'var(--r-md)',
    padding: '0.65rem 0.9rem',
    fontSize: '0.84rem',
    color: '#B04A37',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  closeError: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#B04A37',
    fontSize: '1.1rem',
    marginLeft: 'auto',
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
