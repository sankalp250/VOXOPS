import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Play, Mic, Zap, Database, Globe2, Layers,
  Cpu, Shield, RefreshCw, ChevronDown, Check, Star,
  Bot, User, Building2, ShoppingCart, HeadphonesIcon,
  TrendingUp, Phone, Sparkles, ChevronRight
} from 'lucide-react';
import { runAgentTurn } from '../services/api';

/* ─────────────────────────────────────────────────────────
   WISPR-FLOW-STYLE HERO VISUAL
   Dark card · Pulsing voice orb · Animated pipeline nodes
   SVG connecting lines · Floating status cards
───────────────────────────────────────────────────────── */

/* Pipeline steps that animate sequentially */
const PIPELINE_STEPS = [
  { id: 'stt',    label: 'Speech → Text',    sub: 'Groq Whisper',      x: 50,  y: 42,  color: '#a78bfa' },
  { id: 'lang',   label: 'Language Detect',  sub: 'Hindi / EN',        x: 78,  y: 20,  color: '#60a5fa' },
  { id: 'intent', label: 'Intent Detected',  sub: 'book_appointment',  x: 78,  y: 64,  color: '#34d399' },
  { id: 'memory', label: 'RAG Retrieved',    sub: '3 docs · 0.94 sim', x: 50,  y: 86,  color: '#f59e0b' },
  { id: 'tool',   label: 'API Called',       sub: 'Calendar.book()',   x: 22,  y: 64,  color: '#f472b6' },
  { id: 'reply',  label: 'Response Ready',   sub: '342ms total',       x: 22,  y: 20,  color: '#86efac' },
];

/* SVG paths connecting center orb to each step (cx=50%, cy=50%) */
const CONNECTIONS = [
  { from: 'center', to: 'stt',    d: 'M 190,160 L 190,168' },
  { from: 'stt',    to: 'lang',   d: 'M 295,168 L 298,80' },
  { from: 'stt',    to: 'intent', d: 'M 295,168 L 298,252' },
  { from: 'intent', to: 'memory', d: 'M 298,252 L 190,332' },
  { from: 'lang',   to: 'tool',   d: 'M 84,80 L 84,252' },
  { from: 'tool',   to: 'reply',  d: 'M 84,252 L 84,80' },
];

function WisprHeroVisual() {
  const [activeStep, setActiveStep] = useState(-1);
  const [orbPulse, setOrbPulse]    = useState(0);

  /* Cycle through pipeline steps */
  useEffect(() => {
    let idx = -1;
    const tick = () => {
      idx = (idx + 1) % PIPELINE_STEPS.length;
      setActiveStep(idx);
      setOrbPulse(p => p + 1);
    };
    tick();
    const id = setInterval(tick, 1100);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '480px',
      aspectRatio: '1 / 1',
      borderRadius: '28px',
      background: 'linear-gradient(145deg, #0f0d1a 0%, #13101f 60%, #0a0a14 100%)',
      boxShadow: '0 0 0 1px rgba(167,139,250,0.15), 0 32px 80px rgba(0,0,0,0.55), 0 0 80px rgba(139,92,246,0.12)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Ambient gradient glows */}
      <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '220px', height: '220px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.15) 0%, transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '40%', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.12) 0%, transparent 70%)', filter: 'blur(25px)', pointerEvents: 'none' }} />

      {/* Subtle grid lines */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }} viewBox="0 0 480 480" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: 12 }, (_, i) => (
          <g key={i}>
            <line x1={i * 40} y1="0" x2={i * 40} y2="480" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
            <line x1="0" y1={i * 40} x2="480" y2={i * 40} stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
          </g>
        ))}
      </svg>

      {/* SVG Connecting Lines (dashed, animated) */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 480 480">
        {[
          { x1: 240, y1: 240, x2: 240, y2: 200 }, /* center → stt */
          { x1: 240, y1: 200, x2: 374, y2: 96 },  /* stt → lang */
          { x1: 240, y1: 200, x2: 374, y2: 307 }, /* stt → intent */
          { x1: 374, y1: 307, x2: 240, y2: 413 }, /* intent → memory */
          { x1: 374, y1: 96, x2: 106, y2: 307 },  /* lang → tool */
          { x1: 106, y1: 307, x2: 106, y2: 96 },  /* tool → reply */
          { x1: 106, y1: 96, x2: 240, y2: 240 },  /* reply → center */
        ].map((l, i) => (
          <line
            key={i}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="rgba(167,139,250,0.2)"
            strokeWidth="1"
            strokeDasharray="4 6"
            style={{ animation: `dashAnim ${1.5 + i * 0.2}s linear infinite` }}
          />
        ))}
        {/* Animated moving dot on the active path */}
        <circle r="3" fill="#a78bfa" opacity="0.9">
          <animateMotion
            dur="6s"
            repeatCount="indefinite"
            path="M240,240 L240,200 L374,96 L374,307 L240,413 L106,307 L106,96 L240,240"
          />
        </circle>
      </svg>

      {/* Central voice orb */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -55%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Outer pulsing rings */}
        {[56, 44, 32].map((size, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${size * 2}px`, height: `${size * 2}px`,
            borderRadius: '50%',
            border: `1px solid rgba(167,139,250,${0.18 - i * 0.05})`,
            animation: `orbRing ${2 + i * 0.4}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
        ))}
        {/* Inner glow ring */}
        <div style={{
          position: 'absolute',
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
          filter: 'blur(8px)',
          animation: 'glowPulse 2s ease-in-out infinite',
        }} />
        {/* Core orb */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
          boxShadow: '0 0 0 1px rgba(167,139,250,0.4), 0 8px 32px rgba(139,92,246,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 2,
          animation: 'glowPulse 2s ease-in-out infinite',
        }}>
          {/* Waveform bars inside orb */}
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            {[10, 20, 26, 18, 24, 14].map((h, i) => (
              <div key={i} style={{
                width: '3px', height: `${h}px`, borderRadius: '2px',
                background: 'rgba(255,255,255,0.9)',
                animation: `wave ${0.8 + i * 0.1}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.1}s`,
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline step nodes */}
      {PIPELINE_STEPS.map((step, i) => {
        const isActive = activeStep === i;
        return (
          <div key={step.id} style={{
            position: 'absolute',
            left: `${step.x}%`,
            top: `${step.y}%`,
            transform: 'translate(-50%, -50%)',
            background: isActive
              ? `rgba(${hexToRgb(step.color)}, 0.15)`
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${isActive ? step.color + '60' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '10px',
            padding: '0.45rem 0.75rem',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: isActive ? `0 0 20px ${step.color}30, 0 4px 16px rgba(0,0,0,0.4)` : '0 4px 12px rgba(0,0,0,0.3)',
            transform: `translate(-50%, -50%) scale(${isActive ? 1.06 : 1})`,
            zIndex: isActive ? 3 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: isActive ? step.color : 'rgba(255,255,255,0.25)',
                boxShadow: isActive ? `0 0 8px ${step.color}` : 'none',
                transition: 'all 0.3s',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: isActive ? '#fff' : 'rgba(255,255,255,0.55)', letterSpacing: '0.01em' }}>
                {step.label}
              </span>
            </div>
            <div style={{ fontSize: '0.58rem', color: isActive ? step.color : 'rgba(255,255,255,0.3)', marginTop: '0.15rem', paddingLeft: '11px', fontFamily: 'var(--font-mono)', transition: 'color 0.3s' }}>
              {step.sub}
            </div>
          </div>
        );
      })}

      {/* Bottom status bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '0.75rem 1.25rem',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'glowPulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontWeight: '600' }}>VoxOps Runtime · Active</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[['342ms','latency'],['99.8%','accuracy'],['LangGraph','engine']].map(([v,l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: '800', color: 'rgba(255,255,255,0.85)' }}>{v}</div>
              <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes orbRing {
          0%,100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 0.25; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes dashAnim {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </div>
  );
}

/* Helper to convert hex color to rgb string */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

/* Keep old chat mockup removed — replaced by WisprHeroVisual */
function AnimatedChatMockup() {
  return <WisprHeroVisual />;
}

/* ─────────────────────────────────────────────────────────
   FAQ ACCORDION
───────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'How does multi-tenant isolation work?', a: 'Each agent gets a unique namespace. All vector embeddings, system prompts, and tool configurations are cryptographically scoped — no data ever crosses tenant boundaries.' },
  { q: 'Which languages does VoxOps support?', a: 'English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi — and any global language via Groq Whisper Large v3.' },
  { q: 'What happens when external APIs are slow?', a: 'VoxGuard auto-emits contextual filler phrases ("Let me check that for you…") in the user\'s language while tools execute — zero dead-air that causes call drop-offs.' },
  { q: 'Can I build an agent without writing code?', a: 'Yes. The Agent Builder is a step-by-step flow editor. Define steps in plain English — the system builds the prompt and conversation graph automatically.' },
  { q: 'Can I connect it to real phone calls?', a: 'The AI brain is telephony-agnostic. You can plug in SIP, Asterisk, Twilio, or Plivo as an input/output adapter without touching the agent logic.' },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'var(--cream-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', transition: 'box-shadow 0.2s', boxShadow: open ? 'var(--shadow-card)' : 'none' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.1rem 1.4rem', background: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem' }}
      >
        <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>{q}</span>
        <ChevronDown size={18} color="var(--ink-muted)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '0 1.4rem 1.1rem', color: 'var(--ink-muted)', fontSize: '0.9rem', lineHeight: '1.65', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          {a}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LIVE DEMO SECTION
───────────────────────────────────────────────────────── */
function LiveDemoWidget({ activeClient }) {
  const [prompt, setPrompt]   = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleDemo(e) {
    e.preventDefault();
    if (!prompt.trim() || !activeClient) return;
    setLoading(true);
    try {
      const res = await runAgentTurn({ transcript: prompt, clientId: activeClient.id, languageCode: activeClient.language_code });
      setResponse(res);
      if (window.speechSynthesis && res.response_text) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(res.response_text));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
      <form onSubmit={handleDemo} style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          className="input"
          placeholder={activeClient ? `Ask ${activeClient.name} anything...` : 'Create an agent first to test here...'}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={loading || !activeClient}
          style={{ fontSize: '0.95rem' }}
        />
        <button type="submit" disabled={loading || !prompt.trim() || !activeClient} className="btn btn-dark" style={{ whiteSpace: 'nowrap' }}>
          {loading ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Mic size={15} />}
          {loading ? 'Thinking...' : 'Run Turn'}
        </button>
      </form>
      {response && (
        <div style={{ background: 'var(--cream-soft)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#3B6E35', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3E9E5B', display: 'inline-block' }} />
              Replied in {response.turn_latency_ms}ms
            </span>
            {response.intent && <span className="tag tag-lavender">{response.intent}</span>}
          </div>
          <p style={{ fontSize: '1rem', color: 'var(--ink)', lineHeight: '1.55', fontStyle: 'italic' }}>"{response.response_text}"</p>
        </div>
      )}
      {!activeClient && (
        <p style={{ fontSize: '0.82rem', color: 'var(--ink-light)', textAlign: 'center' }}>
          Open the console and create your first agent to run live demos here.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────────────────── */

const USE_CASES = [
  { icon: <Building2 size={22} />, label: 'Healthcare', title: 'Appointment Booking', desc: 'Patients speak naturally to book, reschedule, or cancel with any doctor — in their native language.', color: 'card-lavender', accent: '#6B4FBB' },
  { icon: <ShoppingCart size={22} />, label: 'E-Commerce', title: 'Order & Delivery', desc: 'Handle orders, track deliveries, process returns, and upsell — zero human agents needed.', color: 'card-peach', accent: '#B04A37' },
  { icon: <HeadphonesIcon size={22} />, label: 'Support', title: 'Customer Support', desc: 'Resolve tickets, answer FAQs, and handle escalations across any product category 24/7.', color: 'card-sage', accent: '#3B6E35' },
  { icon: <TrendingUp size={22} />, label: 'Sales', title: 'Lead Qualification', desc: 'Qualify inbound leads, collect data, schedule callbacks — all autonomously via voice.', color: 'card-gold', accent: '#7A6205' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Build Your Agent', desc: 'Define the agent\'s name, language, personality, and conversation flow using plain English. No code required.' },
  { step: '02', title: 'Add Your Knowledge', desc: 'Paste your FAQs, pricing, policies, or product catalog. The agent learns from it semantically — not keyword matching.' },
  { step: '03', title: 'Talk. It Just Works.', desc: 'Click mic, speak naturally. The agent understands intent, fills slots, calls your APIs, and responds in under 500ms.' },
];

const TESTIMONIALS = [
  { name: 'Rohit Sharma', role: 'CTO, CareConnect', quote: 'We reduced missed appointments by 60% in the first month. Patients love that they can book in Hindi at midnight.', stars: 5 },
  { name: 'Priya Mehta', role: 'Operations Lead, QuickMart', quote: 'The zero dead-air thing is real. Our customers don\'t even realize they\'re talking to a bot. Order accuracy is at 98%.', stars: 5 },
  { name: 'Arjun Nair', role: 'Founder, RealState.io', quote: 'Set up a property inquiry agent in 20 minutes. It qualifies leads better than our junior sales team did.', stars: 5 },
];

const TRUSTED = ['Supabase', 'Groq', 'LangGraph', 'Sarvam AI', 'ElevenLabs', 'Gemini'];

export default function LandingPage({ onLaunchConsole, onOpenAuth, currentUser, activeClient }) {
  return (
    <div>
      {/* ══ NAVBAR ═══════════════════════════════════════════ */}
      <header style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)', padding: '0 1.5rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--ink)" strokeWidth="1.8"/>
            <path d="M7.5 12 Q12 7 16.5 12 Q12 17 7.5 12Z" fill="var(--ink)"/>
          </svg>
          <span style={{ fontWeight: '800', fontSize: '1.1rem', letterSpacing: '-0.03em' }}>VoxOps</span>
        </div>

        <nav style={{ display: 'flex', gap: '0.1rem' }}>
          {[['Features','#features'],['How it Works','#how'],['Use Cases','#use-cases'],['Pricing','#pricing'],['FAQ','#faq']].map(([l,h]) => (
            <a key={l} href={h} className="btn btn-ghost btn-sm" style={{ fontSize: '0.83rem' }}>{l}</a>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <img src={currentUser.avatar} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid var(--border)' }} />
              <span style={{ fontSize: '0.83rem', fontWeight: '600' }}>{currentUser.name.split(' ')[0]}</span>
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn btn-outline btn-sm">Sign In</button>
          )}
          <button onClick={onLaunchConsole} className="btn btn-dark btn-sm">
            Open Console <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ══ HERO ═══════════════════════════════════════════════ */}
      <section style={{ background: 'var(--cream)', padding: '5rem 0 4rem' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          {/* Left copy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--lavender-bg)', border: '1px solid var(--lavender)', borderRadius: '9999px', padding: '0.35rem 0.9rem', width: 'fit-content' }}>
              <Sparkles size={13} color="#6B4FBB" />
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6B4FBB' }}>Production-grade · Sub-500ms · Zero dead air</span>
            </div>

            <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: '800', lineHeight: '1.08', letterSpacing: '-0.04em' }}>
              Voice AI agents<br />
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: '700' }}>that actually work</span><br />
              for any business.
            </h1>

            <p style={{ fontSize: '1.05rem', color: 'var(--ink-muted)', lineHeight: '1.65', maxWidth: '460px' }}>
              Build a fully configurable voice agent for clinics, restaurants, e-commerce, or support — in minutes. Every client is isolated, every conversation is dynamic.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={onLaunchConsole} className="btn btn-dark btn-lg">
                Build Your Agent <ArrowRight size={18} />
              </button>
              <a href="#how" className="btn btn-outline btn-lg">
                <Play size={16} fill="currentColor" style={{ opacity: 0.7 }} /> See How It Works
              </a>
            </div>

            {/* Trust line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-light)', fontWeight: '600' }}>BUILT WITH</span>
              {['Groq', 'Supabase', 'LangGraph'].map(t => (
                <span key={t} style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--ink-muted)' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right: Animated product mockup */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <AnimatedChatMockup />
          </div>
        </div>
      </section>

      {/* ══ STATS BENTO ════════════════════════════════════════ */}
      <section style={{ background: 'var(--cream-dark)', padding: '2.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { value: '<500ms', label: 'Avg. response latency', color: '#3E9E5B' },
              { value: '12+', label: 'Languages supported', color: 'var(--ink)' },
              { value: '22/22', label: 'Tests passing', color: '#6B4FBB' },
              { value: '100%', label: 'Dynamic — zero hardcoding', color: 'var(--ink)' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.04em', color: s.color, lineHeight: '1' }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.4rem', fontWeight: '500' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TRUSTED BY ═════════════════════════════════════════ */}
      <section style={{ background: 'var(--cream)', padding: '2rem 0', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--ink-light)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>POWERED BY</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {TRUSTED.map(name => (
              <span key={name} style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--ink-muted)' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════ */}
      <section id="how" style={{ background: 'var(--cream)', padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Simple Process</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: '1.15' }}>
              From idea to live agent in{' '}
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>minutes</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', position: 'relative' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div className="card" style={{ padding: '2rem', height: '100%' }}>
                  <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--cream-dark)', letterSpacing: '-0.05em', lineHeight: '1', marginBottom: '1rem', fontFamily: 'var(--font-sans)' }}>
                    {step.step}
                  </div>
                  <h3 style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.6rem', letterSpacing: '-0.01em' }}>{step.title}</h3>
                  <p className="body-text" style={{ fontSize: '0.88rem' }}>{step.desc}</p>
                </div>
                {/* Connector arrow */}
                {i < 2 && (
                  <div style={{ position: 'absolute', right: '-0.85rem', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                    <ChevronRight size={20} color="var(--border)" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <button onClick={onLaunchConsole} className="btn btn-dark btn-lg">
              Try It Now <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ══ USE CASES ══════════════════════════════════════════ */}
      <section id="use-cases" style={{ background: 'var(--cream-dark)', padding: '5rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Industries</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: '1.15', maxWidth: '400px' }}>
                One platform for{' '}
                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>all your voice needs</span>
              </h2>
            </div>
            <button onClick={onLaunchConsole} className="btn btn-outline">
              See All Use Cases <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {USE_CASES.map((uc, i) => (
              <div key={i} className={`card ${uc.color}`} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-sm)', background: 'rgba(26,25,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {uc.icon}
                  </div>
                  <span className="tag tag-ink" style={{ fontSize: '0.65rem' }}>{uc.label}</span>
                </div>
                <div>
                  <h3 style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '0.3rem' }}>{uc.title}</h3>
                  <p className="body-text" style={{ fontSize: '0.85rem' }}>{uc.desc}</p>
                </div>
                <button onClick={onLaunchConsole} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: '700', color: uc.accent, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}>
                  Build this agent <ChevronRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ═══════════════════════════════════════════ */}
      <section id="features" style={{ background: 'var(--cream)', padding: '5rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', marginBottom: '3rem' }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Platform</p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: '1.15' }}>
                Engineered for{' '}
                <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>real conversations</span>
              </h2>
            </div>
            <p className="body-text">
              VoxOps solves the 4 catastrophic failure modes of production voice AI: dead-air silence, tool hallucination, barge-in collisions, and cross-tenant memory leakage.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { icon: <Zap size={20} />, title: 'Sub-500ms Groq Inference', desc: 'DeepSeek-R1 on Groq LPUs for instant intent classification and slot extraction.', tag: 'Speed' },
              { icon: <Shield size={20} />, title: 'VoxGuard Recovery', desc: 'Contextual filler phrases auto-emit in the user\'s language when APIs are slow. No dead air.', tag: 'Reliability' },
              { icon: <Database size={20} />, title: 'Isolated PgVector Memory', desc: '768-dim Gemini embeddings with per-tenant namespaces. Zero cross-contamination.', tag: 'Memory' },
              { icon: <Layers size={20} />, title: '100% Dynamic Tenancy', desc: 'Every parameter — prompt, tools, examples, language — is runtime configuration.', tag: 'Flexibility' },
              { icon: <Globe2 size={20} />, title: '12+ Language Support', desc: 'Groq Whisper → Sarvam Saarika → Deepgram fallover. Code-mixed Indian speech supported.', tag: 'Language' },
              { icon: <Cpu size={20} />, title: 'LangGraph State Machine', desc: '7-node async graph: detect → guard → memory → intent → fill → execute → respond.', tag: 'Architecture' },
            ].map((f, i) => (
              <div key={i} className="card" style={{ padding: '1.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--r-sm)', background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {f.icon}
                  </div>
                  <span className="tag tag-lavender">{f.tag}</span>
                </div>
                <h3 style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.4rem' }}>{f.title}</h3>
                <p className="body-text" style={{ fontSize: '0.83rem' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ═══════════════════════════════════════ */}
      <section style={{ background: 'var(--cream-dark)', padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Social Proof</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: '800', letterSpacing: '-0.03em' }}>
              Trusted by{' '}
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>real teams</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {Array(t.stars).fill(0).map((_, j) => <Star key={j} size={14} fill="#E8C547" color="#E8C547" />)}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--ink)', lineHeight: '1.6', fontStyle: 'italic' }}>"{t.quote}"</p>
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ════════════════════════════════════════════ */}
      <section id="pricing" style={{ background: 'var(--cream)', padding: '5rem 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Pricing</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: '800', letterSpacing: '-0.03em' }}>
              Simple, transparent{' '}
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>pricing</span>
            </h2>
            <p className="body-text" style={{ marginTop: '0.5rem' }}>Start free. Scale when you're ready.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { plan: 'Starter', price: '₹0', sub: '/month', tag: null, features: ['3 voice agents', 'Basic knowledge base', '500 conversations/mo', 'English + 2 languages'], cta: 'Start Free', dark: false },
              { plan: 'Growth', price: '₹2,999', sub: '/month', tag: 'Most Popular', features: ['Unlimited agents', 'Full PgVector memory', '10,000 conversations/mo', 'All 12+ languages', 'VoxGuard recovery', 'Analytics dashboard'], cta: 'Start 14-Day Trial', dark: true },
              { plan: 'Enterprise', price: 'Custom', sub: null, tag: null, features: ['Unlimited everything', 'Custom LLM endpoints', 'SIP / telephony ready', 'On-premise deployment', 'Dedicated support', 'SLA guaranteed'], cta: 'Contact Us', dark: false },
            ].map((p, i) => (
              <div key={i} className="card" style={{ padding: '1.75rem', background: p.dark ? 'var(--ink)' : 'var(--cream-card)', border: p.dark ? 'none' : '1px solid var(--border)', color: p.dark ? '#fff' : 'var(--ink)', position: 'relative', overflow: 'visible' }}>
                {p.tag && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--peach)', color: '#8A3020', fontSize: '0.68rem', fontWeight: '800', padding: '0.25rem 0.85rem', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                    {p.tag}
                  </div>
                )}
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: p.dark ? 'rgba(255,255,255,0.7)' : 'var(--ink-muted)', marginBottom: '0.5rem' }}>{p.plan}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '-0.04em' }}>{p.price}</span>
                  {p.sub && <span style={{ fontSize: '0.85rem', color: p.dark ? 'rgba(255,255,255,0.5)' : 'var(--ink-muted)' }}>{p.sub}</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: p.dark ? 'rgba(255,255,255,0.8)' : 'var(--ink-muted)' }}>
                      <Check size={14} color={p.dark ? '#4ade80' : '#3E9E5B'} style={{ flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={onLaunchConsole}
                  className={p.dark ? '' : 'btn btn-dark'}
                  style={p.dark ? { width: '100%', background: '#fff', color: 'var(--ink)', fontWeight: '700', fontSize: '0.88rem', padding: '0.75rem', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer' }
                    : { width: '100%', borderRadius: 'var(--r-md)', padding: '0.75rem', justifyContent: 'center' }}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ LIVE DEMO ══════════════════════════════════════════ */}
      <section style={{ background: 'var(--cream-dark)', padding: '5rem 0' }}>
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Try It Live</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: '800', letterSpacing: '-0.03em' }}>
              Experience{' '}
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>{activeClient ? activeClient.name : 'your agent'}</span>{' '}
              right here
            </h2>
          </div>
          <LiveDemoWidget activeClient={activeClient} />
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════ */}
      <section id="faq" style={{ background: 'var(--cream)', padding: '5rem 0' }}>
        <div className="container" style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: '800', letterSpacing: '-0.03em' }}>
              Frequently asked{' '}
              <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>questions</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {FAQS.map((f, i) => <FAQItem key={i} {...f} />)}
          </div>
        </div>
      </section>

      {/* ══ FINAL CTA ══════════════════════════════════════════ */}
      <section style={{ background: 'var(--ink)', padding: '5rem 0' }}>
        <div className="container" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3.2rem)', fontWeight: '800', letterSpacing: '-0.04em', lineHeight: '1.1', color: '#fff' }}>
            Build your first voice agent<br />
            <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: '700' }}>in under 10 minutes.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', maxWidth: '440px', fontSize: '0.95rem', lineHeight: '1.6' }}>
            No credit card. No phone numbers. No infrastructure knowledge. Just open the console and start talking.
          </p>
          <div style={{ display: 'flex', gap: '0.85rem' }}>
            <button onClick={onLaunchConsole} style={{ background: '#fff', color: 'var(--ink)', fontWeight: '700', fontSize: '0.95rem', padding: '0.9rem 2.25rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(255,255,255,0.15)' }}>
              Open Console <ArrowRight size={17} />
            </button>
            <button onClick={onOpenAuth} style={{ background: 'transparent', color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: '0.95rem', padding: '0.9rem 2rem', borderRadius: '9999px', border: '1.5px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═════════════════════════════════════════════ */}
      <footer style={{ background: 'var(--ink)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '1.75rem 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontWeight: '700' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8"/>
              <path d="M7.5 12 Q12 7 16.5 12 Q12 17 7.5 12Z" fill="rgba(255,255,255,0.6)"/>
            </svg>
            VoxOps
          </div>
          <span>© 2026 Enterprise Voice AI Platform · FastAPI · LangGraph · Supabase · Groq</span>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
