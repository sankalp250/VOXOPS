import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, Check, Bot, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { createClient, fetchClients } from '../services/api';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
];

const INDUSTRY_PRESETS = [
  {
    label: 'Healthcare Clinic',
    emoji: '🏥',
    systemPrompt: 'You are a helpful assistant for a healthcare clinic. Help patients book appointments, answer queries about services, and provide information about doctors. Be warm, professional, and empathetic.',
    steps: [
      { title: 'Greet patient', description: 'Welcome the patient warmly and ask how you can help them today.' },
      { title: 'Understand need', description: 'Find out if they need an appointment, have a query, or need information.' },
      { title: 'Collect details', description: 'Get the patient name, preferred doctor (if any), and desired date/time.' },
      { title: 'Confirm booking', description: 'Repeat the details back and confirm the appointment.' },
    ],
  },
  {
    label: 'Food Ordering',
    emoji: '🍕',
    systemPrompt: 'You are an order-taking assistant for a restaurant. Help customers browse the menu, place orders, handle modifications, and provide estimated delivery times. Be friendly and efficient.',
    steps: [
      { title: 'Welcome customer', description: 'Greet the customer and let them know you are ready to take their order.' },
      { title: 'Take order', description: 'Ask what they would like to order and note all items with quantities.' },
      { title: 'Confirm address', description: 'Confirm the delivery address and estimated delivery time.' },
      { title: 'Process order', description: 'Confirm the full order, total price, and send a confirmation.' },
    ],
  },
  {
    label: 'Customer Support',
    emoji: '🎧',
    systemPrompt: 'You are a customer support agent. Help customers resolve issues, answer questions about products/services, process refunds or exchanges, and escalate when needed. Be patient and solution-focused.',
    steps: [
      { title: 'Identify customer', description: 'Greet the customer and ask for their order number or registered email.' },
      { title: 'Understand issue', description: 'Listen carefully to their issue and ask clarifying questions.' },
      { title: 'Resolve or escalate', description: 'Attempt to resolve the issue directly. Escalate to a human if needed.' },
      { title: 'Close ticket', description: 'Confirm the resolution and ask if there is anything else you can help with.' },
    ],
  },
];

const EMPTY_STEP = { title: '', description: '' };

export default function ClientConfigurator({ activeClient, onSelectClient }) {
  /* ─ form state ─ */
  const [name, setName]           = useState('');
  const [language, setLanguage]   = useState('en');
  const [systemPrompt, setSP]     = useState('');
  const [steps, setSteps]         = useState([{ ...EMPTY_STEP }]);
  const [namespace, setNamespace] = useState('');

  /* ─ ui state ─ */
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);

  /* load existing clients */
  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoadingClients(true);
    try { setClients(await fetchClients()); }
    catch { /* ignore */ }
    finally { setLoadingClients(false); }
  }

  /* apply preset */
  function applyPreset(preset) {
    setSP(preset.systemPrompt);
    setSteps(preset.steps.map(s => ({ ...s })));
    if (!name) setName(preset.label + ' Agent');
  }

  /* steps management */
  function updateStep(i, field, val) {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }
  function addStep() { setSteps(prev => [...prev, { ...EMPTY_STEP }]); }
  function removeStep(i) { setSteps(prev => prev.filter((_, idx) => idx !== i)); }

  /* build system prompt from steps if SP is blank */
  function buildEffectiveSP() {
    if (systemPrompt.trim()) return systemPrompt;
    if (steps.length === 0) return '';
    const stepsText = steps.map((s, i) => `Step ${i + 1} — ${s.title}: ${s.description}`).join('\n');
    return `You are ${name || 'an assistant'}. Follow these conversation steps:\n\n${stepsText}`;
  }

  /* save */
  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Agent name is required.'); return; }
    if (steps.every(s => !s.title.trim())) { setError('Add at least one conversation step.'); return; }
    setSaving(true); setError(null);
    try {
      const payload = {
        name: name.trim(),
        language_code: language,
        system_prompt: buildEffectiveSP(),
        namespace: namespace.trim() || undefined,
        tools: [],
        few_shot_examples: [],
      };
      const client = await createClient(payload);
      onSelectClient(client);
      setSaved(true);
      await loadClients();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setName(''); setLanguage('en'); setSP(''); setSteps([{ ...EMPTY_STEP }]); setNamespace(''); setError(null); setSaved(false);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', height: 'calc(100vh - 61px)', overflow: 'hidden' }}>

      {/* ── Left: Existing Agents ──────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: '700', fontSize: '0.9rem' }}>Your Agents</h3>
          <button onClick={loadClients} className="btn btn-ghost btn-sm" title="Refresh">
            <RefreshCw size={13} />
          </button>
        </div>

        {loadingClients && <div style={{ color: 'var(--ink-light)', fontSize: '0.82rem' }}>Loading...</div>}

        {!loadingClients && clients.length === 0 && (
          <div style={{ color: 'var(--ink-light)', fontSize: '0.82rem', textAlign: 'center', paddingTop: '2rem' }}>
            No agents yet. Build your first one →
          </div>
        )}

        {clients.map(c => (
          <button
            key={c.id}
            onClick={() => onSelectClient(c)}
            style={{
              background: activeClient?.id === c.id ? 'var(--lavender-bg)' : 'var(--cream-card)',
              border: `1.5px solid ${activeClient?.id === c.id ? 'var(--lavender)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)',
              padding: '0.9rem 1rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              width: '100%',
            }}
          >
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: activeClient?.id === c.id ? '#5B3BAB' : 'var(--ink)' }}>
              {c.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--ink-light)', marginTop: '0.2rem' }}>
              {c.language_code?.toUpperCase()} · {c.namespace || 'default'}
            </div>
          </button>
        ))}

        {/* Industry Presets */}
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
            Start from a template
          </p>
          {INDUSTRY_PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              style={{ width: '100%', textAlign: 'left', background: 'var(--cream-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0.7rem 0.9rem', cursor: 'pointer', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.83rem', fontWeight: '500', transition: 'all 0.15s' }}
            >
              <span style={{ fontSize: '1.1rem' }}>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Builder Form ────────────────────────── */}
      <div style={{ overflowY: 'auto', paddingBottom: '2rem' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Title */}
          <div>
            <h2 style={{ fontWeight: '800', fontSize: '1.4rem', letterSpacing: '-0.03em' }}>
              Build Your Voice Agent
            </h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Define the agent's identity and conversation flow. Every field adapts at runtime — zero hardcoding.
            </p>
          </div>

          {/* Step 1: Identity */}
          <Section step="1" title="Agent Identity">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Agent Name *</label>
                <input
                  className="input"
                  placeholder="e.g. City Dental Receptionist"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Primary Language</label>
                <select className="input" value={language} onChange={e => setLanguage(e.target.value)}>
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Namespace (optional)</label>
              <input
                className="input"
                placeholder="e.g. city_dental_mumbai (auto-generated if blank)"
                value={namespace}
                onChange={e => setNamespace(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--ink-light)', marginTop: '0.3rem' }}>
                Used to isolate this agent's memory in PgVector. Each namespace is completely private.
              </p>
            </div>
          </Section>

          {/* Step 2: Personality */}
          <Section step="2" title="Personality & Tone">
            <label style={labelStyle}>System Prompt</label>
            <textarea
              className="input"
              placeholder="Describe how the agent should speak, what it knows, and how it should behave. Leave blank to auto-generate from conversation steps below."
              value={systemPrompt}
              onChange={e => setSP(e.target.value)}
              rows={4}
              style={{ resize: 'vertical', lineHeight: '1.55' }}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--ink-light)' }}>
              If left blank, the system prompt will be auto-built from your conversation steps below.
            </p>
          </Section>

          {/* Step 3: Conversation Flow */}
          <Section step="3" title="Conversation Steps">
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', marginBottom: '0.75rem' }}>
              Define the steps the agent follows in order. Each step tells the agent what to say or do at that point in the conversation.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {steps.map((step, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--cream-soft)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1rem' }}
                >
                  {/* Step number */}
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800', flexShrink: 0, marginTop: '0.25rem' }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      className="input"
                      placeholder={`Step title (e.g. "Greet user")`}
                      value={step.title}
                      onChange={e => updateStep(i, 'title', e.target.value)}
                      style={{ fontWeight: '600', fontSize: '0.88rem' }}
                    />
                    <textarea
                      className="input"
                      placeholder="What should the agent do/say at this step? Be specific."
                      value={step.description}
                      onChange={e => updateStep(i, 'description', e.target.value)}
                      rows={2}
                      style={{ fontSize: '0.85rem', resize: 'none' }}
                    />
                  </div>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(i)} className="btn btn-ghost btn-sm" style={{ color: 'var(--peach)', flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}

              <button type="button" onClick={addStep} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
                <Plus size={14} /> Add Step
              </button>
            </div>
          </Section>

          {/* Error */}
          {error && (
            <div style={{ background: 'var(--peach-bg)', border: '1px solid var(--peach)', borderRadius: 'var(--r-md)', padding: '0.85rem 1rem', color: '#B04A37', fontSize: '0.85rem' }}>
              ⚠ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button type="submit" disabled={saving} className="btn btn-dark btn-lg">
              {saving
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Deploying...</>
                : saved
                ? <><Check size={16} /> Agent Deployed!</>
                : <>Deploy Agent <ChevronRight size={16} /></>
              }
            </button>
            <button type="button" onClick={reset} className="btn btn-outline btn-sm">
              Reset Form
            </button>
          </div>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* Section wrapper */
function Section({ step, title, children }) {
  return (
    <div style={{ background: 'var(--cream-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--cream-soft)' }}>
        <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--ink)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '800' }}>
          {step}
        </span>
        <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{title}</span>
      </div>
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {children}
      </div>
    </div>
  );
}

const labelStyle = { fontSize: '0.78rem', fontWeight: '600', color: 'var(--ink-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' };
