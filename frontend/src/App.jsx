import React, { useState, useEffect } from "react";
import { Mic, Building2, Activity, Cpu, Radio, Sparkles } from "lucide-react";
import ClientConfigurator from "./components/ClientConfigurator";
import VoicePlayground from "./components/VoicePlayground";
import TelemetryDashboard from "./components/TelemetryDashboard";
import { api } from "./services/api";

/**
 * MENTOR LESSON: App Architecture & Global State Lifting
 *
 * In React, when multiple sibling components (Playground, Configurator) need access
 * to the same data (e.g. `activeClient` or `clients`), we "lift the state up" to the
 * common parent (`App.jsx`) and pass it down via `props`.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState("playground");
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);

  const loadClients = async () => {
    try {
      const list = await api.listClients();
      setClients(list);
      if (list.length > 0 && !activeClient) {
        setActiveClient(list[0]);
      }
    } catch (e) {
      console.error("Error loading clients:", e);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleClientCreated = (newClient) => {
    setClients((prev) => [newClient, ...prev]);
    setActiveClient(newClient);
    setActiveTab("playground");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          background: "rgba(10, 13, 20, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-color)",
          padding: "1rem 2rem",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 15px rgba(56, 189, 248, 0.5)",
              }}
            >
              <Cpu size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                VOX<span style={{ color: "var(--accent-cyan)" }}>OPS</span> & VoxGuard
              </h1>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Autonomous Voice AI Gateway
              </span>
            </div>
          </div>

          {/* Client Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {clients.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Tenant:</span>
                <select
                  value={activeClient ? activeClient.id : ""}
                  onChange={(e) => {
                    const found = clients.find((c) => c.id === e.target.value);
                    if (found) setActiveClient(found);
                  }}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: 8,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    color: "var(--accent-cyan)",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.language_code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: "flex", background: "var(--bg-secondary)", borderRadius: 10, padding: 4, border: "1px solid var(--border-color)" }}>
              <button
                onClick={() => setActiveTab("playground")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.4rem 0.9rem",
                  borderRadius: 6,
                  border: "none",
                  background: activeTab === "playground" ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: activeTab === "playground" ? "var(--accent-cyan)" : "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Mic size={16} /> Playground
              </button>

              <button
                onClick={() => setActiveTab("clients")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.4rem 0.9rem",
                  borderRadius: 6,
                  border: "none",
                  background: activeTab === "clients" ? "rgba(168, 85, 247, 0.2)" : "transparent",
                  color: activeTab === "clients" ? "var(--accent-purple)" : "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Building2 size={16} /> Onboard Tenant
              </button>

              <button
                onClick={() => setActiveTab("telemetry")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0.4rem 0.9rem",
                  borderRadius: 6,
                  border: "none",
                  background: activeTab === "telemetry" ? "rgba(16, 185, 129, 0.2)" : "transparent",
                  color: activeTab === "telemetry" ? "var(--accent-emerald)" : "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <Activity size={16} /> Telemetry
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "2rem 1.5rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        {activeTab === "playground" && <VoicePlayground activeClient={activeClient} />}
        {activeTab === "clients" && <ClientConfigurator onClientCreated={handleClientCreated} />}
        {activeTab === "telemetry" && <TelemetryDashboard />}
      </main>

      {/* Footer */}
      <footer style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", borderTop: "1px solid var(--border-color)" }}>
        VOXOPS Autonomous Voice Reliability Gateway & Runtime Multi-Tenant Engine • Phase 7 React Interface
      </footer>
    </div>
  );
}
