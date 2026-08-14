import React, { useState } from 'react';
import { Database, Search, UploadCloud, CheckCircle2, FileText, Layers, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { ingestMemory, searchMemory } from '../services/api';

export default function VectorMemoryInspector({ activeClient }) {
  const [contentToIngest, setContentToIngest] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [ingesting, setIngesting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState(false);

  async function handleIngest(e) {
    e.preventDefault();
    if (!contentToIngest.trim() || !activeClient) return;

    setIngesting(true);
    setIngestSuccess(false);
    try {
      await ingestMemory({
        content: contentToIngest,
        clientId: activeClient.id,
        metadata: { source: 'dashboard_ingest', title: 'Knowledge Base Article' },
      });
      setContentToIngest('');
      setIngestSuccess(true);
      setTimeout(() => setIngestSuccess(false), 3000);
    } catch (err) {
      alert('Ingest error: ' + err.message);
    } finally {
      setIngesting(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim() || !activeClient) return;

    setSearching(true);
    try {
      const res = await searchMemory({
        query: searchQuery,
        clientId: activeClient.id,
        topK: 4,
      });
      setSearchResults(res.results || []);
    } catch (err) {
      alert('Search error: ' + err.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', minHeight: 'calc(100vh - 120px)' }}>
      {/* Left Column: Knowledge Document Ingestor */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={22} color="#6366f1" /> Vector Memory Ingestion (PgVector)
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Ingest custom business policies, pricing tiers, FAQs, or past conversation transcripts into {activeClient ? activeClient.name : 'your client'}'s isolated vector namespace.
          </p>
        </div>

        {/* Namespace Badge */}
        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} color="#818cf8" />
            <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Active Vector Namespace:</span>
          </div>
          <span className="badge badge-indigo font-mono" style={{ fontSize: '0.75rem' }}>
            {activeClient?.embedding_namespace || 'no_namespace'}
          </span>
        </div>

        {/* Ingest Form */}
        <form onSubmit={handleIngest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
            Knowledge Base Content / Document Text:
          </label>
          <textarea
            className="glass-input font-mono"
            rows={8}
            placeholder="e.g. Root canal treatment costs 5000 INR and takes 45 minutes with Dr. Sharma. We provide 2 years warranty on dental crowns."
            value={contentToIngest}
            onChange={e => setContentToIngest(e.target.value)}
            disabled={!activeClient || ingesting}
            style={{ fontSize: '0.85rem', lineHeight: '1.5', flex: 1 }}
            required
          />

          {ingestSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.85rem', fontWeight: '600' }}>
              <CheckCircle2 size={16} /> 768-dim Embedding Vector generated and stored in Supabase PgVector!
            </div>
          )}

          <button
            type="submit"
            disabled={!activeClient || ingesting || !contentToIngest.trim()}
            className="btn-primary"
            style={{ alignSelf: 'flex-end', padding: '0.75rem 1.5rem' }}
          >
            {ingesting ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Ingesting Vector...
              </>
            ) : (
              <>
                <Database size={16} /> Ingest into Vector Space
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Semantic Vector Search Tester */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem' }}>
          <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={22} color="#06b6d4" /> Semantic Similarity Search & RAG Test
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Query your vector space using natural language. Tests cosine similarity distance in real time.
          </p>
        </div>

        {/* Search Query Input */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            className="glass-input"
            placeholder="e.g. How much does a root canal cost?"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            disabled={!activeClient || searching}
          />
          <button
            type="submit"
            disabled={!activeClient || searching || !searchQuery.trim()}
            className="btn-primary"
            style={{ padding: '0.75rem 1.25rem' }}
          >
            <Search size={16} />
          </button>
        </form>

        {/* Search Results List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
          {searchResults.map((item, idx) => {
            const similarityPercent = Math.round(item.similarity_score * 100);
            return (
              <div key={item.id || idx} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FileText size={14} color="#818cf8" /> Rank #{idx + 1} Match
                  </span>
                  <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                    {similarityPercent}% Match ({item.similarity_score})
                  </span>
                </div>

                {/* Similarity Progress Bar */}
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${similarityPercent}%`, background: 'linear-gradient(to right, #06b6d4, #10b981)' }} />
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  "{item.content}"
                </p>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  ID: {item.id} • Session: {item.session_id?.slice(0, 8)}...
                </div>
              </div>
            );
          })}

          {searchResults.length === 0 && !searching && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
              No search results yet. Enter a query above to run cosine similarity vector matching against {activeClient ? activeClient.name : 'this client'}.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
