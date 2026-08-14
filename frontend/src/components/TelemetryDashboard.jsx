import React, { useState, useEffect } from 'react';
import { 
  Activity, Clock, ShieldAlert, Zap, Radio, RefreshCw, 
  CheckCircle, AlertTriangle, Eye, ArrowUpRight, BarChart3, Hand
} from 'lucide-react';
import { fetchRecentSessions } from '../services/api';

export default function TelemetryDashboard({ activeClient }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sseLogs, setSseLogs] = useState([]);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const list = await fetchRecentSessions();
      setSessions(list || []);
      if (list && list.length > 0 && !selectedSession) {
        setSelectedSession(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Connect to live SSE stream when a session is selected
  useEffect(() => {
    if (!selectedSession?.id) return;
    setSseLogs([]);

    const eventSource = new EventSource(`/api/v1/stream/session/${selectedSession.id}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setSseLogs(prev => [...prev.slice(-15), data]);
      } catch (err) {
        console.error(err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [selectedSession]);

  // Aggregate Metrics
  const totalSessions = sessions.length;
  const avgDuration = totalSessions > 0 ? (sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / totalSessions).toFixed(1) : 0;
  const totalFillers = sessions.reduce((acc, s) => acc + (s.filler_count || 0), 0);
  const totalInterruptions = sessions.reduce((acc, s) => acc + (s.interruption_count || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: 'calc(100vh - 120px)' }}>
      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {/* Metric 1: Total Calls */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Total Voice Sessions</span>
            <Activity size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {totalSessions}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '0.25rem' }}>
            <ArrowUpRight size={12} /> Supabase Live Telemetry
          </span>
        </div>

        {/* Metric 2: Avg Turn Latency */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Avg Turn Duration</span>
            <Clock size={18} color="#06b6d4" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#22d3ee' }}>
            {avgDuration}s
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
            Sub-500ms Groq Inference
          </span>
        </div>

        {/* Metric 3: VoxGuard Fillers */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Fillers Generated</span>
            <Zap size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#fbbf24' }}>
            {totalFillers}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
            Prevented Dead Air on &gt;1.5s Calls
          </span>
        </div>

        {/* Metric 4: Interruption Barge-ins */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Barge-In Recoveries</span>
            <Hand size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', fontFamily: 'var(--font-mono)', color: '#fb7185' }}>
            {totalInterruptions}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
            Instant TTS Cancellation
          </span>
        </div>
      </div>

      {/* Bottom Grid: Live Session Table & SSE Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', flex: 1 }}>
        {/* Left: Recent Session Records Table */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="#6366f1" />
              <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: '700' }}>Recent Voice Sessions</h3>
            </div>
            <button onClick={loadSessions} className="btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Session Title</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Duration</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Fillers</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Risk Score</th>
                  <th style={{ padding: '0.6rem 0.5rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const isSelected = selectedSession?.id === s.id;
                  const isBlocked = s.status === 'blocked';
                  return (
                    <tr 
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {s.title}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <span className={`badge ${isBlocked ? 'badge-rose' : 'badge-emerald'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                        {s.duration_seconds?.toFixed(1)}s
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)', color: s.filler_count > 0 ? '#fbbf24' : 'inherit' }}>
                        {s.filler_count}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', fontFamily: 'var(--font-mono)', color: s.risk_score > 0 ? '#fb7185' : '#34d399' }}>
                        {s.risk_score?.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>
                        <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Live SSE Heartbeat Inspector */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Radio size={18} color="#10b981" />
              <h3 className="font-display" style={{ fontSize: '1.1rem', fontWeight: '700' }}>Live SSE Telemetry Stream</h3>
            </div>
            <span className="badge badge-emerald">Live Stream</span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Selected Session: <span className="font-mono" style={{ color: '#818cf8' }}>{selectedSession?.id || 'None'}</span>
          </div>

          {/* SSE Stream Logs Frame */}
          <div className="font-mono" style={{ background: '#07090e', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', flex: 1, overflowY: 'auto', maxHeight: '380px', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {sseLogs.map((log, idx) => (
              <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.3rem' }}>
                <span style={{ color: '#06b6d4' }}>[SSE #{idx + 1}]</span> status=<span style={{ color: '#34d399' }}>{log.status}</span> duration={log.duration_seconds}s fillers={log.filler_count} risk={log.risk_score}
              </div>
            ))}
            {sseLogs.length === 0 && (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem' }}>
                Listening for real-time Server-Sent Events (SSE) telemetry updates...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
