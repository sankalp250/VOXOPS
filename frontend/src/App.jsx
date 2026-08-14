import React, { useState, useEffect } from 'react';
import { 
  Radio, Mic, Building2, Database, BarChart3, 
  ShieldCheck, Cpu, ChevronDown, Sparkles, Layers, Activity 
} from 'lucide-react';
import ClientConfigurator from './components/ClientConfigurator';
import VoicePlayground from './components/VoicePlayground';
import VectorMemoryInspector from './components/VectorMemoryInspector';
import TelemetryDashboard from './components/TelemetryDashboard';
import { fetchClients, checkSystemHealth } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('playground');
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [systemHealth, setSystemHealth] = useState({ status: 'operational' });

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      const health = await checkSystemHealth();
      setSystemHealth(health);
      const clientList = await fetchClients();
      setClients(clientList);
      if (clientList.length > 0) {
        setActiveClient(clientList[0]);
      }
    } catch (err) {
      console.error('App init error:', err);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Mission-Control Navigation Header */}
      <header 
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(7, 9, 14, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand & System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)',
              }}
            >
              <Radio size={18} color="white" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="font-display" style={{ fontWeight: '900', fontSize: '1.15rem', letterSpacing: '-0.03em' }}>
                  VOX<span style={{ color: '#818cf8' }}>OPS</span>
                </span>
                <span className="badge badge-indigo" style={{ fontSize: '0.6rem', padding: '0.15rem 0.45rem' }}>
                  VoxGuard v2.0
                </span>
              </div>
            </div>
          </div>

          {/* System Health Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <div className="status-dot online" />
              <span>Supabase PgVector</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <Cpu size={12} color="#06b6d4" />
              <span>Groq DeepSeek-R1</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={12} color="#10b981" />
              <span>Guardrails Active</span>
            </div>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(19, 25, 38, 0.6)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('playground')}
            className={activeTab === 'playground' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
          >
            <Mic size={14} /> Voice Playground
          </button>
          <button
            onClick={() => setActiveTab('configurator')}
            className={activeTab === 'configurator' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
          >
            <Building2 size={14} /> Dynamic Builder
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={activeTab === 'memory' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
          >
            <Database size={14} /> Vector Memory (RAG)
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={activeTab === 'telemetry' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '0.45rem 1rem', fontSize: '0.8rem' }}
          >
            <BarChart3 size={14} /> Telemetry & Recovery
          </button>
        </nav>

        {/* Right: Active Client Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Active Tenant</span>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#818cf8' }}>
              {activeClient ? activeClient.name : 'None Selected'}
            </span>
          </div>

          <select
            className="glass-input"
            style={{ width: 'auto', padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: '600' }}
            value={activeClient?.id || ''}
            onChange={(e) => {
              const selected = clients.find(c => c.id === e.target.value);
              if (selected) setActiveClient(selected);
            }}
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.language_code})
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Dynamic View Area */}
      <main style={{ flex: 1, padding: '1.5rem 2rem' }}>
        {activeTab === 'playground' && (
          <VoicePlayground activeClient={activeClient} />
        )}
        {activeTab === 'configurator' && (
          <ClientConfigurator 
            activeClient={activeClient} 
            onSelectClient={(c) => {
              setActiveClient(c);
              setClients(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c]);
            }} 
          />
        )}
        {activeTab === 'memory' && (
          <VectorMemoryInspector activeClient={activeClient} />
        )}
        {activeTab === 'telemetry' && (
          <TelemetryDashboard activeClient={activeClient} />
        )}
      </main>
    </div>
  );
}
