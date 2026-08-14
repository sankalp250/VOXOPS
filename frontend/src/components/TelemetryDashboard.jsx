import React, { useState, useEffect } from "react";
import { Activity, Clock, ShieldCheck, RefreshCw, Layers } from "lucide-react";
import { api } from "../services/api";

/**
 * MENTOR LESSON: Polling & Cleanup in React
 *
 * ❓ Common Interview Question: "How do you fetch real-time telemetry updates without memory leaks?"
 *
 * 💡 Answer:
 * Inside `useEffect`, we start a `setInterval`.
 * We MUST return a cleanup function `clearInterval(timer)` so when the user navigates away,
 * the background timer is immediately cleared and does not leak memory or cause crashes on unmounted components!
 */
export default function TelemetryDashboard() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api.listSessions();
      setSessions(data);
    } catch (e) {
      console.error("Failed to load telemetry sessions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    // Auto-refresh telemetry every 5 seconds
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalSessions = sessions.length;
  const totalFillers = sessions.reduce((acc, s) => acc + (s.filler_count || 0), 0);
  const totalInterruptions = sessions.reduce((acc, s) => acc + (s.interruption_count || 0), 0);
  const avgDuration =
    totalSessions > 0
      ? (sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / totalSessions).toFixed(2)
      : 0;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Metric Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-cyan)", marginBottom: 4 }}>
            <Layers size={18} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Total Sessions</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{totalSessions}</div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-purple)", marginBottom: 4 }}>
            <Activity size={18} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>VoxGuard Fillers Emitted</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{totalFillers}</div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-rose)", marginBottom: 4 }}>
            <ShieldCheck size={18} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Barge-Ins Handled</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{totalInterruptions}</div>
        </div>

        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-emerald)", marginBottom: 4 }}>
            <Clock size={18} />
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Avg Turn Duration</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{avgDuration}s</div>
        </div>
      </div>

      {/* Live Session Log Table */}
      <div className="glass-card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Recent Conversation Sessions</h3>
          <button
            onClick={fetchSessions}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "1px solid var(--border-color)",
              padding: "0.4rem 0.8rem",
              borderRadius: 8,
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            <RefreshCw size={14} className={loading ? "pulsing-glow" : ""} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                <th style={{ padding: "0.75rem 0.5rem" }}>Session ID</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Title / Transcript</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Language</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Status</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Duration</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Fillers</th>
                <th style={{ padding: "0.75rem 0.5rem" }}>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "0.75rem 0.5rem", fontFamily: "monospace", color: "var(--accent-cyan)" }}>
                    {s.id.slice(0, 8)}…
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", maxWidth: "260px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.title}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem", textTransform: "uppercase", fontSize: "0.75rem" }}>
                    {s.language_code}
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background:
                          s.status === "completed"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                        color:
                          s.status === "completed"
                            ? "var(--accent-emerald)"
                            : "var(--accent-amber)",
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>{s.duration_seconds.toFixed(2)}s</td>
                  <td style={{ padding: "0.75rem 0.5rem" }}>{s.filler_count}</td>
                  <td style={{ padding: "0.75rem 0.5rem", color: s.risk_score > 0 ? "var(--accent-rose)" : "var(--text-muted)" }}>
                    {s.risk_score.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
