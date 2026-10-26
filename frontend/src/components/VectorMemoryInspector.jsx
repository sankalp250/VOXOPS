import React, { useState } from 'react';
import { Upload, Search, BookOpen, CheckCircle2, Loader2, X } from 'lucide-react';
import { ingestMemory, searchMemory } from '../services/api';

export default function VectorMemoryInspector({ activeClient }) {
  const [docText, setDocText]     = useState('');
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState(null);
  const [ingesting, setIngesting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [ingestDone, setIngestDone] = useState(false);
  const [error, setError]         = useState(null);

  if (!activeClient) return (
    <EmptyState icon={<BookOpen size={36} color="var(--ink-light)" />} title="No agent selected" desc="Select an agent first to manage its knowledge base." />
  );

  async function handleIngest(e) {
    e.preventDefault();
    if (!docText.trim()) return;
    setIngesting(true); setError(null);
    try {
      await ingestMemory({ content: docText, clientId: activeClient.id });
      setIngestDone(true);
      setTimeout(() => setIngestDone(false), 3000);
      setDocText('');
    } catch (err) { setError(err.message); }
    finally { setIngesting(false); }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setError(null);
    try {
      const res = await searchMemory({ query, clientId: activeClient.id, topK: 4 });
      setResults(res);
    } catch (err) { setError(err.message); }
    finally { setSearching(false); }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* ── Left: Ingest ───────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h2 style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Knowledge Base</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Add information that <strong>{activeClient.name}</strong> should know. Paste FAQs, pricing, policies, or any text.
          </p>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.9rem', background: 'var(--lavender-bg)', border: '1px solid var(--lavender)', borderRadius: 'var(--r-md)', fontSize: '0.78rem', fontWeight: '600', color: '#5B3BAB' }}>
            <BookOpen size={14} />
            Active knowledge space: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{activeClient.namespace || activeClient.id.slice(0, 12)}</code>
          </div>

          <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={lbl}>Paste Document or Text</label>
              <textarea
                className="input"
                rows={10}
                placeholder="e.g. Root canal treatment costs ₹5000 and takes 45 minutes. Dr. Sharma specializes in dental implants. We are open Monday–Saturday 9am to 7pm."
                value={docText}
                onChange={e => setDocText(e.target.value)}
                disabled={ingesting}
                style={{ resize: 'vertical', lineHeight: '1.55', fontSize: '0.88rem' }}
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--ink-light)', marginTop: '0.3rem' }}>
                {docText.length} characters · This will be embedded into the agent's vector memory.
              </p>
            </div>

            {error && <ErrorBanner msg={error} onClose={() => setError(null)} />}

            <button type="submit" disabled={ingesting || !docText.trim()} className="btn btn-dark">
              {ingesting
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Embedding...</>
                : ingestDone
                ? <><CheckCircle2 size={15} /> Added to Knowledge Base!</>
                : <><Upload size={15} /> Add to Knowledge Base</>
              }
            </button>
          </form>
        </div>

        {/* Tips */}
        <div style={{ background: 'var(--gold-bg)', border: '1px solid var(--gold)', borderRadius: 'var(--r-md)', padding: '1rem', fontSize: '0.82rem', color: '#7A6205', lineHeight: '1.55' }}>
          <strong>💡 Tips for great knowledge:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <li>Write in complete sentences the way customers ask questions.</li>
            <li>Include prices, hours, FAQs, and common objections.</li>
            <li>Add multiple documents separately for better search precision.</li>
          </ul>
        </div>
      </div>

      {/* ── Right: Search ───────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h2 style={{ fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>Test Knowledge Search</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Ask a question the way a customer would. See what the agent retrieves from memory.
          </p>
        </div>

        <div className="card" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="e.g. How much does a root canal cost?"
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={searching}
            />
            <button type="submit" disabled={searching || !query.trim()} className="btn btn-dark" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              {searching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
              Search
            </button>
          </form>

          {/* Results */}
          {results === null && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-light)', gap: '0.5rem', paddingTop: '3rem' }}>
              <Search size={32} />
              <p style={{ fontSize: '0.85rem' }}>Search results will appear here</p>
            </div>
          )}

          {results !== null && results.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-light)', gap: '0.5rem', paddingTop: '3rem' }}>
              <p style={{ fontSize: '0.85rem' }}>No matching knowledge found. Try adding content to the knowledge base first.</p>
            </div>
          )}

          {results !== null && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {results.length} result{results.length !== 1 ? 's' : ''} retrieved
              </p>
              {results.map((r, i) => (
                <div key={i} style={{ background: 'var(--cream-soft)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-muted)', textTransform: 'uppercase' }}>Match #{i + 1}</span>
                    {r.similarity !== undefined && (
                      <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#3E9E5B' }}>
                        {(r.similarity * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--ink)', lineHeight: '1.55' }}>
                    {r.content || r.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: 'var(--ink-light)' }}>
      {icon}
      <p style={{ fontWeight: '600', color: 'var(--ink-muted)' }}>{title}</p>
      <p style={{ fontSize: '0.85rem' }}>{desc}</p>
    </div>
  );
}

function ErrorBanner({ msg, onClose }) {
  return (
    <div style={{ background: 'var(--peach-bg)', border: '1px solid var(--peach)', borderRadius: 'var(--r-md)', padding: '0.7rem 1rem', fontSize: '0.85rem', color: '#B04A37', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      ⚠ {msg}
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#B04A37', fontSize: '1rem' }}>×</button>
    </div>
  );
}

const lbl = { fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-muted)', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' };
