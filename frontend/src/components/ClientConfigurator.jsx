import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Building2, Plus, Sparkles, Key, Check, Copy, Wrench, ListFilter, 
  Trash2, Globe, ShieldCheck, ArrowRight, RefreshCw, Zap
} from 'lucide-react';
import { fetchClients, createClient } from '../services/api';

const PRESETS = [
  {
    name: 'Apollo Dental Care',
    language_code: 'hi',
    system_prompt: 'You are a warm, helpful dental clinic assistant for Apollo Dental. Help patients book dental cleanings, check root canal pricing, and answer questions. Be concise and professional.',
    tools: [
      { name: 'book_dental_slot', description: 'Books an appointment slot with dentist', parameters: { doctor_type: 'dentist/orthodontist', preferred_date: 'date string' }, api_url: 'mock://' },
      { name: 'check_procedure_price', description: 'Checks pricing for dental treatments', parameters: { procedure: 'root canal/cleaning/whitening' }, api_url: 'mock://' }
    ],
    intent_examples: {
      book_dental_slot: ['I want to book a teeth cleaning', 'Schedule an appointment for tomorrow', 'Need to see dentist'],
      check_procedure_price: ['How much does root canal cost?', 'What is the price of tooth extraction?', 'Cost for whitening']
    }
  },
  {
    name: 'FreshMart Organic Groceries',
    language_code: 'en',
    system_prompt: 'You are a friendly grocery delivery voice assistant for FreshMart. Confirm customer items, quantities, and delivery slots rapidly.',
    tools: [
      { name: 'order_groceries', description: 'Places organic grocery order', parameters: { items: 'list of items', slot: 'morning/evening' }, api_url: 'mock://' },
      { name: 'check_stock', description: 'Checks stock availability of products', parameters: { product_name: 'name of fruit/veg' }, api_url: 'mock://' }
    ],
    intent_examples: {
      order_groceries: ['I want 2kg organic apples and 1 carton milk', 'Order tomatoes and potatoes', 'Send groceries to my address'],
      check_stock: ['Do you have organic strawberries?', 'Is almond milk available?']
    }
  },
  {
    name: 'PizzaHub Express',
    language_code: 'ta',
    system_prompt: 'You are PizzaHub express order bot. Help customers place pizza orders, choose crusts, and track delivery status.',
    tools: [
      { name: 'order_pizza', description: 'Places pizza order', parameters: { size: 'regular/medium/large', crust: 'cheese burst/pan', toppings: 'list' }, api_url: 'mock://' },
      { name: 'track_order', description: 'Tracks live pizza delivery rider', parameters: { order_id: 'order id' }, api_url: 'mock://' }
    ],
    intent_examples: {
      order_pizza: ['One large farmhouse pizza with cheese burst', 'I want pepperoni pizza', 'Order 2 medium pizzas'],
      track_order: ['Where is my pizza?', 'Track delivery rider', 'When will my order reach?']
    }
  }
];

export default function ClientConfigurator({ activeClient, onSelectClient }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [newKeyGenerated, setNewKeyGenerated] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [languageCode, setLanguageCode] = useState('en');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tools, setTools] = useState([]);
  const [intentInput, setIntentInput] = useState('');
  const [phrasesInput, setPhrasesInput] = useState('');
  const [intentExamples, setIntentExamples] = useState({});

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const list = await fetchClients();
      setClients(list);
      if (list.length > 0 && !activeClient) {
        onSelectClient(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset) {
    setName(preset.name);
    setLanguageCode(preset.language_code);
    setSystemPrompt(preset.system_prompt);
    setTools(preset.tools);
    setIntentExamples(preset.intent_examples);
  }

  function addTool() {
    setTools([...tools, { name: 'custom_action', description: 'Executes action', parameters: { item: 'string' }, api_url: 'mock://' }]);
  }

  function removeTool(index) {
    setTools(tools.filter((_, i) => i !== index));
  }

  function updateTool(index, field, value) {
    const updated = [...tools];
    updated[index][field] = value;
    setTools(updated);
  }

  function addIntentExample() {
    if (!intentInput.trim() || !phrasesInput.trim()) return;
    const phrases = phrasesInput.split(',').map(p => p.trim()).filter(Boolean);
    setIntentExamples({
      ...intentExamples,
      [intentInput.trim().toLowerCase()]: phrases,
    });
    setIntentInput('');
    setPhrasesInput('');
  }

  function removeIntent(intentKey) {
    const copy = { ...intentExamples };
    delete copy[intentKey];
    setIntentExamples(copy);
  }

  async function handleCreateClient(e) {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;

    setCreating(true);
    try {
      const payload = {
        name,
        system_prompt: systemPrompt,
        language_code: languageCode,
        tools,
        intent_examples: intentExamples,
      };
      const created = await createClient(payload);
      
      // Celebrate
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      
      setNewKeyGenerated({ id: created.id, key: created.api_key, name: created.name });
      await loadClients();
      onSelectClient(created);
      
      // Reset form
      setName('');
      setSystemPrompt('');
      setTools([]);
      setIntentExamples({});
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', minHeight: 'calc(100vh - 120px)' }}>
      {/* Left Column: Registered Client Tenants */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={18} color="#6366f1" />
            <h2 className="font-display" style={{ fontSize: '1.1rem', fontWeight: '700' }}>Active Clients</h2>
          </div>
          <button 
            onClick={loadClients} 
            className="btn-secondary" 
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
            title="Refresh Client Tenants"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Each client is an isolated multi-tenant voice bot with custom system prompts, vector namespace & tools.
        </p>

        {/* Client List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', overflowY: 'auto', flex: 1, maxHeight: '480px' }}>
          {clients.map(client => {
            const isSelected = activeClient?.id === client.id;
            return (
              <div 
                key={client.id}
                onClick={() => onSelectClient(client)}
                className="glass-card"
                style={{
                  cursor: 'pointer',
                  borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(19, 25, 38, 0.45)',
                  boxShadow: isSelected ? 'var(--shadow-glow-indigo)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {client.name}
                  </span>
                  <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                    {client.language_code}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem', wordBreak: 'break-all' }}>
                  ns: {client.embedding_namespace}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {client.tools?.length || 0} tools • {Object.keys(client.intent_examples || {}).length} intents
                  </span>
                  {isSelected && (
                    <span style={{ color: '#818cf8', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '600' }}>
                      Active <ArrowRight size={12} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* New API Key Alert Modal/Card if just generated */}
        {newKeyGenerated && (
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--accent-emerald)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.3rem' }}>
              <ShieldCheck size={14} /> New API Key for {newKeyGenerated.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#07090e', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
              <span className="font-mono" style={{ fontSize: '0.7rem', color: '#f8fafc', flex: 1, wordBreak: 'break-all' }}>
                {newKeyGenerated.key}
              </span>
              <button onClick={() => copyToClipboard(newKeyGenerated.key, 'new')} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}>
                {copiedKey === 'new' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Dynamic Client Builder */}
      <div className="glass-panel" style={{ padding: '1.75rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={22} color="#6366f1" /> Dynamic Multi-Tenant Builder
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Configure a unique AI Voice Agent without writing code. Every parameter adapts at runtime.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Presets:</span>
            {PRESETS.map(preset => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                {preset.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Row 1: Name & Language */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Business / Client Name *
              </label>
              <input
                type="text"
                className="glass-input"
                placeholder="e.g. City Care Clinic, Metro Pizza"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Primary Language
              </label>
              <select
                className="glass-input"
                value={languageCode}
                onChange={e => setLanguageCode(e.target.value)}
              >
                <option value="en">English (en)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="ta">Tamil (ta)</option>
                <option value="te">Telugu (te)</option>
                <option value="kn">Kannada (kn)</option>
                <option value="bn">Bengali (bn)</option>
                <option value="mr">Marathi (mr)</option>
              </select>
            </div>
          </div>

          {/* Row 2: System Prompt */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                System Prompt (Personality & Instruction) *
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Defines tone, role boundaries & speaking style
              </span>
            </div>
            <textarea
              className="glass-input font-mono"
              rows={4}
              placeholder="You are a warm, professional assistant. Help patients book appointments concisely..."
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              style={{ fontSize: '0.85rem', lineHeight: '1.5' }}
              required
            />
          </div>

          {/* Row 3: Dynamic Tools Section */}
          <div style={{ background: 'rgba(13, 17, 26, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Wrench size={16} color="#06b6d4" />
                <span style={{ fontSize: '0.875rem', fontWeight: '700' }}>Custom Tools & APIs ({tools.length})</span>
              </div>
              <button
                type="button"
                onClick={addTool}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                <Plus size={14} /> Add Tool
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {tools.map((t, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr auto', gap: '0.5rem', alignItems: 'center', background: 'rgba(19, 25, 38, 0.7)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="tool_name"
                    value={t.name}
                    onChange={e => updateTool(idx, 'name', e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="Description of tool action"
                    value={t.description}
                    onChange={e => updateTool(idx, 'description', e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                  <input
                    type="text"
                    className="glass-input"
                    placeholder="mock:// or https://..."
                    value={t.api_url}
                    onChange={e => updateTool(idx, 'api_url', e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeTool(idx)}
                    style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '0.3rem' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {tools.length === 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem' }}>
                  No tools added. Click "+ Add Tool" to register custom API endpoints for booking, ordering, or lookups.
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Few-Shot Intent Classifier Examples */}
          <div style={{ background: 'rgba(13, 17, 26, 0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
              <ListFilter size={16} color="#a855f7" />
              <span style={{ fontSize: '0.875rem', fontWeight: '700' }}>Few-Shot Intent Examples</span>
            </div>

            {/* Existing Intents Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {Object.entries(intentExamples).map(([intentKey, phrases]) => (
                <div key={intentKey} className="badge badge-indigo" style={{ padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: '700' }}>{intentKey}:</span>
                  <span style={{ color: 'var(--text-secondary)', textTransform: 'none' }}>{phrases.slice(0, 2).join(', ')}...</span>
                  <button type="button" onClick={() => removeIntent(intentKey)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>

            {/* Add Intent Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: '0.5rem' }}>
              <input
                type="text"
                className="glass-input"
                placeholder="Intent (e.g. book_slot)"
                value={intentInput}
                onChange={e => setIntentInput(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
              <input
                type="text"
                className="glass-input"
                placeholder="Comma-separated training phrases (e.g. I want to book, Schedule appointment)"
                value={phrasesInput}
                onChange={e => setPhrasesInput(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
              <button
                type="button"
                onClick={addIntentExample}
                className="btn-secondary"
                style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              disabled={creating || !name || !systemPrompt}
              className="btn-primary"
              style={{ padding: '0.8rem 1.8rem', fontSize: '0.95rem' }}
            >
              {creating ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Provisioning Client Tenant...
                </>
              ) : (
                <>
                  <Zap size={16} /> Deploy Dynamic Client
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
