import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Send, Volume2, ShieldAlert, ShieldCheck, Clock, 
  Activity, Sparkles, AlertTriangle, Play, Pause, RotateCcw, Hand
} from 'lucide-react';
import { runAgentTurn, transcribeAudio } from '../services/api';

export default function VoicePlayground({ activeClient }) {
  const [transcriptInput, setTranscriptInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: activeClient ? `Hello! I am ${activeClient.name}'s voice assistant. How can I help you today?` : 'Please select or create a client tenant to begin voice testing.',
      turn_latency_ms: 120,
      guardrail_flag: false,
      intent: 'welcome',
      slots: {},
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [fillerActive, setFillerActive] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [lastExecutionState, setLastExecutionState] = useState(null);

  // Audio Recording Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, fillerActive]);

  useEffect(() => {
    if (activeClient) {
      setMessages([
        {
          role: 'assistant',
          text: `Connected to ${activeClient.name} (${activeClient.language_code}). How can I help?`,
          turn_latency_ms: 80,
          guardrail_flag: false,
          intent: 'welcome',
          slots: {},
        }
      ]);
    }
  }, [activeClient]);

  // Handle Text Submission
  async function handleSend(textToSend) {
    const text = (textToSend || transcriptInput).trim();
    if (!text || !activeClient) return;

    // 1. Append User Message
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setTranscriptInput('');
    setLoading(true);

    // Simulate VoxGuard Filler Phrase if response takes > 1.2s
    const fillerTimer = setTimeout(() => {
      setFillerActive(true);
    }, 1200);

    try {
      const response = await runAgentTurn({
        transcript: text,
        clientId: activeClient.id,
        languageCode: activeClient.language_code,
      });

      clearTimeout(fillerTimer);
      setFillerActive(false);

      const assistantMsg = {
        role: 'assistant',
        text: response.response_text || 'No response generated.',
        turn_latency_ms: response.turn_latency_ms,
        guardrail_flag: response.guardrail_flag,
        risk_score: response.risk_score,
        intent: response.intent,
        slots: response.slots,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setLastExecutionState(response);

      // Play synthesized audio response (using browser SpeechSynthesis for instant zero-latency test playback)
      speakBrowserTTS(response.response_text, activeClient.language_code);

    } catch (err) {
      clearTimeout(fillerTimer);
      setFillerActive(false);
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  }

  function speakBrowserTTS(text, lang = 'en') {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'ta' ? 'ta-IN' : 'en-US';
    utterance.onstart = () => setAudioPlaying(true);
    utterance.onend = () => setAudioPlaying(false);
    utterance.onerror = () => setAudioPlaying(false);
    window.speechSynthesis.speak(utterance);
  }

  // Handle Barge-In Interruption
  function handleBargeIn() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setAudioPlaying(false);
    }
    setMessages(prev => [
      ...prev,
      { role: 'system', text: '✋ Barge-in Interruption Detected: TTS playback cancelled instantly by VoxGuard.' }
    ]);
  }

  // Handle Real Microphone Recording
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        try {
          setLoading(true);
          const sttResult = await transcribeAudio(audioBlob, activeClient?.language_code || 'en');
          if (sttResult.transcript) {
            handleSend(sttResult.transcript);
          }
        } catch (err) {
          alert('STT failed: ' + err.message);
        } finally {
          setLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied: ' + err.message);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all audio tracks
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', height: 'calc(100vh - 120px)' }}>
      {/* Left: Chat & Voice Interaction Area */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header Bar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`status-dot ${isRecording ? 'recording' : 'online'}`} />
            <div>
              <h2 className="font-display" style={{ fontSize: '1.05rem', fontWeight: '700' }}>
                {activeClient ? activeClient.name : 'Select a Client'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {activeClient ? `Language: ${activeClient.language_code.toUpperCase()} • Live LangGraph State Active` : 'No tenant selected'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {audioPlaying && (
              <button onClick={handleBargeIn} className="btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                <Hand size={14} /> Interrupt (Barge-in)
              </button>
            )}
            <button onClick={() => setMessages([])} className="btn-secondary" style={{ padding: '0.4rem 0.65rem' }} title="Clear Chat">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Chat Stream History */}
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            if (isSystem) {
              return (
                <div key={idx} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--accent-amber)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  {msg.text}
                </div>
              );
            }

            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>{isUser ? 'Caller' : activeClient?.name || 'Assistant'}</span>
                  {msg.turn_latency_ms && (
                    <span className="badge badge-indigo" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      <Clock size={10} /> {msg.turn_latency_ms}ms
                    </span>
                  )}
                  {msg.guardrail_flag && (
                    <span className="badge badge-rose" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                      <AlertTriangle size={10} /> Guardrail Blocked
                    </span>
                  )}
                </div>

                <div 
                  style={{
                    maxWidth: '80%',
                    padding: '0.85rem 1.15rem',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isUser 
                      ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' 
                      : 'rgba(19, 25, 38, 0.75)',
                    color: 'white',
                    border: isUser ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {/* VoxGuard Real-Time Filler Phrase Notification */}
          {fillerActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid var(--accent-amber)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.9rem', color: '#fbbf24', fontSize: '0.82rem' }}>
              <div className="waveform-container" style={{ height: '18px' }}>
                <div className="waveform-bar" style={{ background: 'var(--accent-amber)', height: '12px' }} />
                <div className="waveform-bar" style={{ background: 'var(--accent-amber)', height: '16px' }} />
                <div className="waveform-bar" style={{ background: 'var(--accent-amber)', height: '10px' }} />
              </div>
              <span>VoxGuard Filler: <em>"Give me just a moment while I check that for you…"</em></span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(13, 17, 26, 0.85)', borderTop: '1px solid var(--border-subtle)' }}>
          <form 
            onSubmit={e => { e.preventDefault(); handleSend(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={isRecording ? 'btn-danger' : 'btn-secondary'}
              style={{ padding: '0.75rem', borderRadius: '50%', width: '44px', height: '44px' }}
              title={isRecording ? 'Stop Recording' : 'Start Microphone'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Real-Time Waveform visualizer during recording */}
            {isRecording ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#fb7185', fontWeight: '600' }}>Listening to voice stream...</span>
                <div className="waveform-container">
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                  <div className="waveform-bar" />
                </div>
              </div>
            ) : (
              <input
                type="text"
                className="glass-input"
                placeholder={activeClient ? `Speak or type a query for ${activeClient.name}...` : 'Select a client first...'}
                value={transcriptInput}
                onChange={e => setTranscriptInput(e.target.value)}
                disabled={!activeClient || loading}
              />
            )}

            <button
              type="submit"
              disabled={!activeClient || loading || (!transcriptInput.trim() && !isRecording)}
              className="btn-primary"
              style={{ padding: '0.75rem 1.25rem' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Real-Time LangGraph State Inspector */}
      <div className="glass-panel" style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <Activity size={18} color="#6366f1" />
          <h3 className="font-display" style={{ fontSize: '1rem', fontWeight: '700' }}>LangGraph State Inspector</h3>
        </div>

        {lastExecutionState ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Metric Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div className="glass-card" style={{ padding: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Turn Latency</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                  {lastExecutionState.turn_latency_ms}ms
                </div>
              </div>

              <div className="glass-card" style={{ padding: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Safety Score</span>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: lastExecutionState.guardrail_flag ? '#fb7185' : '#34d399', fontFamily: 'var(--font-mono)' }}>
                  {lastExecutionState.guardrail_flag ? 'BLOCKED' : '100% SAFE'}
                </div>
              </div>
            </div>

            {/* Classified Intent */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Classified Intent:
              </span>
              <span className="badge badge-indigo" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                {lastExecutionState.intent || 'unknown'}
              </span>
            </div>

            {/* Extracted Slots */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>
                Extracted Parameters / Slots:
              </span>
              <pre className="font-mono" style={{ background: '#07090e', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.65rem', fontSize: '0.75rem', color: '#22d3ee', overflowX: 'auto' }}>
                {JSON.stringify(lastExecutionState.slots || {}, null, 2)}
              </pre>
            </div>

            {/* Client Context Info */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <div>Tenant ID: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{lastExecutionState.client_id}</span></div>
              <div>State Machine: <span style={{ color: '#34d399', fontWeight: '600' }}>6-Node Graph Online</span></div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
            Send a query or record voice to inspect real-time state machine transitions and telemetry.
          </div>
        )}
      </div>
    </div>
  );
}
