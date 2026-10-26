import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, Check, Sparkles, Filter, Bot, Radio, ShieldCheck, Zap } from 'lucide-react';
import { fetchVoices, previewVoice } from '../services/api';

export default function AgentVoices({ activeClient, activeVoice, onSelectVoice }) {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterGender, setFilterGender] = useState('female'); // Default to female
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterLang, setFilterLang] = useState('all');
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [previewError, setPreviewError] = useState(null);

  const audioRef = useRef(null);

  useEffect(() => {
    fetchVoices()
      .then(list => {
        setVoices(list);
        setLoading(false);
      })
      .catch(err => {
        setPreviewError('Failed to load voices catalog: ' + err.message);
        setLoading(false);
      });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function handlePlayPreview(voice) {
    setPreviewError(null);

    // Stop current audio if playing the same voice
    if (playingVoiceId === voice.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingVoiceId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingVoiceId(voice.id);

    try {
      const audio = await previewVoice({
        voiceId: voice.id,
        provider: voice.provider,
        text: voice.sample_text,
      });

      if (!audio) {
        setPlayingVoiceId(null);
        return;
      }

      audioRef.current = audio;
      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
      audio.onerror = () => {
        setPreviewError(`Could not play sample for ${voice.name}`);
        setPlayingVoiceId(null);
        audioRef.current = null;
      };
    } catch (err) {
      setPreviewError(err.message || 'Preview audio failed to load');
      setPlayingVoiceId(null);
    }
  }

  function handleSelectVoice(voice) {
    if (onSelectVoice) {
      onSelectVoice(voice);
    }
    // Also save to localStorage for persistence
    localStorage.setItem(`voxops_voice_${activeClient?.id || 'default'}`, JSON.stringify(voice));
  }

  const filteredVoices = voices.filter(v => {
    if (filterGender !== 'all' && v.gender !== filterGender) return false;
    if (filterProvider !== 'all' && v.provider !== filterProvider) return false;
    if (filterLang !== 'all') {
      if (filterLang === 'en' && v.language !== 'en') return false;
      if (filterLang === 'hi' && v.language !== 'hi') return false;
    }
    return true;
  });

  return (
    <div style={styles.shell}>
      {/* ── Top Header ────────────────────────────────────── */}
      <div style={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={styles.titleIcon}><Volume2 size={18} color="#fff" /></span>
            <h1 style={styles.title}>Agent Voices Studio</h1>
            <span className="tag tag-lavender" style={{ fontSize: '0.7rem' }}>Multi-Provider TTS</span>
          </div>
          <p style={styles.subtitle}>
            Audition and select high-fidelity female & natural voices for <strong>{activeClient?.name || 'your agent'}</strong>. Listen to real audio previews before choosing.
          </p>
        </div>

        {/* Active Voice Pill */}
        {activeVoice && (
          <div style={styles.currentVoiceCard}>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
              Active Voice for {activeClient?.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
              <span className="dot-live" />
              <strong style={{ fontSize: '0.95rem' }}>{activeVoice.name}</strong>
              <span className="tag" style={{ textTransform: 'capitalize', fontSize: '0.68rem' }}>{activeVoice.provider}</span>
              <span className="tag tag-lavender" style={{ fontSize: '0.68rem' }}>{activeVoice.gender}</span>
            </div>
          </div>
        )}
      </div>

      {previewError && (
        <div style={styles.errorAlert}>
          <span>⚠ {previewError}</span>
          <button onClick={() => setPreviewError(null)} style={styles.closeAlert}>×</button>
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────── */}
      <div style={styles.filterBar}>
        {/* Gender Filter */}
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Gender:</span>
          {['female', 'all', 'male'].map(g => (
            <button
              key={g}
              onClick={() => setFilterGender(g)}
              style={{
                ...styles.filterBtn,
                ...(filterGender === g ? styles.filterBtnActive : {}),
              }}
            >
              {g === 'female' ? '♀ Female (Recommended)' : g === 'male' ? '♂ Male' : 'All Genders'}
            </button>
          ))}
        </div>

        {/* Language Filter */}
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Language:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'en', label: 'English (US/UK/IN)' },
            { id: 'hi', label: 'Hindi / Indic' },
          ].map(l => (
            <button
              key={l.id}
              onClick={() => setFilterLang(l.id)}
              style={{
                ...styles.filterBtn,
                ...(filterLang === l.id ? styles.filterBtnActive : {}),
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Provider Filter */}
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>Engine:</span>
          {[
            { id: 'all', label: 'All Engines' },
            { id: 'elevenlabs', label: 'ElevenLabs' },
            { id: 'deepgram', label: 'Deepgram' },
            { id: 'sarvam', label: 'Sarvam' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilterProvider(p.id)}
              style={{
                ...styles.filterBtn,
                ...(filterProvider === p.id ? styles.filterBtnActive : {}),
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Voices Grid ──────────────────────────────────── */}
      {loading ? (
        <div style={styles.loadingBox}>
          <div className="spinner" />
          <p style={{ marginTop: '0.75rem', color: 'var(--ink-light)', fontSize: '0.9rem' }}>Loading voice catalog...</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredVoices.map(voice => {
            const isSelected = activeVoice?.id === voice.id || activeVoice?.raw_id === voice.raw_id;
            const isPlaying = playingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                style={{
                  ...styles.card,
                  borderColor: isSelected ? 'var(--ink)' : 'var(--border)',
                  boxShadow: isSelected ? '0 0 0 2px var(--ink), var(--shadow-card)' : 'var(--shadow-card)',
                }}
              >
                {/* Card Top: Badges & Name */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.15rem' }}>{voice.name}</span>
                      {voice.is_recommended && (
                        <span style={styles.recBadge}>
                          <Sparkles size={11} /> {voice.badge || 'Recommended'}
                        </span>
                      )}
                      {isSelected && (
                        <span style={styles.activeTag}>
                          <Check size={11} /> Active
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--ink-light)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ textTransform: 'capitalize' }}>{voice.provider}</span>
                      <span>·</span>
                      <span>{voice.accent}</span>
                      <span>·</span>
                      <span style={{ textTransform: 'capitalize', fontWeight: '600', color: voice.gender === 'female' ? '#9C27B0' : '#1976D2' }}>
                        {voice.gender === 'female' ? '♀ Female' : '♂ Male'}
                      </span>
                    </div>
                  </div>

                  {/* Provider Logo / Tag */}
                  <span className="tag" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {voice.provider === 'elevenlabs' ? 'ElevenLabs' : voice.provider === 'deepgram' ? 'Deepgram' : 'Sarvam v3'}
                  </span>
                </div>

                {/* Tone & Description */}
                <p style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: '500', marginBottom: '0.4rem' }}>
                  "{voice.tone}"
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', lineHeight: '1.45', marginBottom: '1rem', minHeight: '36px' }}>
                  {voice.description}
                </p>

                {/* Sample Sentence Quote */}
                <div style={styles.sampleQuoteBox}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--ink-light)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'block', marginBottom: '0.2rem' }}>
                    Preview Sentence
                  </span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ink)', fontStyle: 'italic', margin: 0 }}>
                    "{voice.sample_text}"
                  </p>
                </div>

                {/* Actions: Play Preview & Select */}
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', alignItems: 'center' }}>
                  <button
                    onClick={() => handlePlayPreview(voice)}
                    style={{
                      ...styles.previewBtn,
                      ...(isPlaying ? styles.previewBtnPlaying : {}),
                    }}
                    title={isPlaying ? 'Pause preview' : 'Audition voice sample'}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{isPlaying ? 'Playing...' : 'Play Sample'}</span>
                  </button>

                  <button
                    onClick={() => handleSelectVoice(voice)}
                    disabled={isSelected}
                    style={{
                      ...styles.selectBtn,
                      ...(isSelected ? styles.selectBtnActive : {}),
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check size={14} /> Selected
                      </>
                    ) : (
                      `Use for ${activeClient?.name || 'Agent'}`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  shell: {
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 61px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '1rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid var(--border)',
    marginBottom: '1.25rem',
  },
  titleIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    background: 'var(--ink)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '1.35rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--ink-muted)',
    marginTop: '0.2rem',
    marginBottom: 0,
  },
  currentVoiceCard: {
    background: 'var(--cream-card)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: '0.75rem 1.25rem',
    boxShadow: 'var(--shadow-card)',
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    background: 'var(--cream-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
    alignItems: 'center',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  filterLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--ink-muted)',
    marginRight: '0.25rem',
  },
  filterBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-pill)',
    padding: '0.3rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--ink)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  filterBtnActive: {
    background: 'var(--ink)',
    color: '#fff',
    borderColor: 'var(--ink)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.25rem',
  },
  card: {
    background: 'var(--cream-card)',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  recBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    background: '#FFF3E0',
    color: '#E65100',
    border: '1px solid #FFE0B2',
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '2px 7px',
    borderRadius: 'var(--r-pill)',
  },
  activeTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    background: '#E8F5E9',
    color: '#2E7D32',
    border: '1px solid #C8E6C9',
    fontSize: '0.65rem',
    fontWeight: '700',
    padding: '2px 7px',
    borderRadius: 'var(--r-pill)',
  },
  sampleQuoteBox: {
    background: 'var(--cream-soft)',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--r-md)',
    padding: '0.6rem 0.85rem',
    marginTop: 'auto',
  },
  previewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: 'var(--cream-dark)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: '0.55rem 0.9rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--ink)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  previewBtnPlaying: {
    background: '#6B4FBB',
    color: '#fff',
    borderColor: '#6B4FBB',
  },
  selectBtn: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    background: 'var(--ink)',
    border: '1px solid var(--ink)',
    borderRadius: 'var(--r-md)',
    padding: '0.55rem 1rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  selectBtnActive: {
    background: '#2E7D32',
    borderColor: '#2E7D32',
    cursor: 'default',
  },
  errorAlert: {
    background: 'var(--peach-bg)',
    border: '1px solid var(--peach)',
    borderRadius: 'var(--r-md)',
    padding: '0.75rem 1rem',
    fontSize: '0.85rem',
    color: '#B04A37',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  closeAlert: {
    background: 'none',
    border: 'none',
    color: '#B04A37',
    fontSize: '1.1rem',
    cursor: 'pointer',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '3rem 1rem',
  },
};
