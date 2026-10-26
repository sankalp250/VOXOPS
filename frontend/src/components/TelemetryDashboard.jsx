import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, Zap, MessageSquare, RefreshCw, Bot, CheckCircle, XCircle } from 'lucide-react';
import { fetchRecentSessions, checkSystemHealth } from '../services/api';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--ink-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.04em', color: accent || 'var(--ink)', lineHeight: '1' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--ink-light)', marginTop: '0.4rem' }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: { bg: 'var(--sage-bg)', color: '#3B6E35', border: 'var(--sage)', label: 'Completed' },
    blocked:   { bg: 'var(--peach-bg)', color: '#B04A37', border: 'var(--peach)', label: 'Blocked' },
    running:   { bg: 'var(--lavender-bg)', color: '#5B3BAB', border: 'var(--lavender)', label: 'Running' },
  };
  const s = map[status] || map.completed;
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '9999px', padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: '700' }}>
      {s.label}
    </span>
  );
}

export default function TelemetryDashboard({ activeClient }) {
  const [sessions, setSessions] = useState([]);
  const [health, setHealth]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeClient?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [sess, h] = await Promise.all([
        fetchRecentSessions().catch(() => []),
        checkSystemHealth().catch(() => null),
      ]);
      const filtered = activeClient
        ? sess.filter(s => s.client_id === activeClient.id || s.client_namespace?.includes(activeClient.namespace || activeClient.id.slice(0, 8)))
        : sess;
      setSessions(filtered);
      setHealth(h);
      setLastUpdated(new Date());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  /* compute stats */
  const total       = sessions.length;
  const completed   = sessions.filter(s => s.status === 'completed').length;
  const blocked     = sessions.filter(s => s.status === 'blocked').length;
  const avgMs       = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.turn_latency_ms || s.duration_seconds * 1000 || 0), 0) / sessions.length)
    : 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Header ───────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontWeight: '800', fontSize: '1.3rem', letterSpacing: '-0.02em' }}>
            {activeClient ? `${activeClient.name} — Analytics` : 'Platform Analytics'}
          </h2>
          {lastUpdated && (
            <p style={{ fontSize: '0.72rem', color: 'var(--ink-light)', marginTop: '0.15rem' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button onClick={loadData} disabled={loading} className="btn btn-outline btn-sm">
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* ── System Health Pills ───────────────────── */}
      {health && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {Object.entries(health).map(([key, val]) => {
            if (typeof val !== 'boolean' && typeof val !== 'string') return null;
            const ok = val === true || val === 'healthy' || val === 'connected';
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: ok ? 'var(--sage-bg)' : 'var(--peach-bg)', border: `1px solid ${ok ? 'var(--sage)' : 'var(--peach)'}`, borderRadius: '9999px', padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: '700', color: ok ? '#3B6E35' : '#B04A37' }}>
                {ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
                {key.replace(/_/g, ' ')}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stats row ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <StatCard label="Total Conversations" value={total} sub="In selected scope" />
        <StatCard label="Completed" value={completed} sub={`${total > 0 ? Math.round(completed / total * 100) : 0}% success rate`} accent="#3E9E5B" />
        <StatCard label="Blocked / Flagged" value={blocked} sub="Guardrail triggered" accent={blocked > 0 ? '#B04A37' : undefined} />
        <StatCard label="Avg Response" value={avgMs > 0 ? `${avgMs}ms` : '—'} sub="Agent turn latency" />
      </div>

      {/* ── Session History ───────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={16} color="var(--ink-muted)" />
            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Conversation History</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-light)' }}>{total} sessions</span>
        </div>

        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-light)', fontSize: '0.85rem' }}>
            Loading sessions...
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={32} />
            <p style={{ fontWeight: '600', color: 'var(--ink-muted)' }}>No conversations yet</p>
            <p style={{ fontSize: '0.82rem' }}>Start chatting in Voice Playground to see analytics here.</p>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream-soft)', borderBottom: '1px solid var(--border)' }}>
                  {['Conversation', 'Status', 'Response Time', 'Intent'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontWeight: '700', fontSize: '0.72rem', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 20).map((s, i) => (
                  <tr key={s.id || i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-soft)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.85rem 1.25rem', maxWidth: '360px' }}>
                      <div style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.title || s.transcript?.slice(0, 60) || `Session ${s.id?.slice(0, 8) || i + 1}`}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <StatusBadge status={s.status || 'completed'} />
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: 'var(--ink-muted)' }}>
                      {s.turn_latency_ms ? `${s.turn_latency_ms}ms` : s.duration_seconds ? `${s.duration_seconds.toFixed(1)}s` : '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      {s.intent && s.intent !== 'unknown' ? (
                        <span className="tag tag-lavender">{s.intent}</span>
                      ) : (
                        <span style={{ color: 'var(--ink-light)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
