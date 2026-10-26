import React, { useState, useEffect } from 'react';
import { Mic, Building2, Database, BarChart3, ArrowLeft, LogOut, Volume2 } from 'lucide-react';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import ClientConfigurator from './components/ClientConfigurator';
import VoicePlayground from './components/VoicePlayground';
import AgentVoices from './components/AgentVoices';
import VectorMemoryInspector from './components/VectorMemoryInspector';
import TelemetryDashboard from './components/TelemetryDashboard';
import { fetchClients } from './services/api';

const TABS = [
  { id: 'playground',    label: 'Voice Playground', icon: <Mic size={14} /> },
  { id: 'voices',        label: 'Agent Voices',     icon: <Volume2 size={14} /> },
  { id: 'configurator',  label: 'Dynamic Builder',  icon: <Building2 size={14} /> },
  { id: 'memory',        label: 'Vector Memory',    icon: <Database size={14} /> },
  { id: 'telemetry',     label: 'Telemetry',        icon: <BarChart3 size={14} /> },
];

export default function App() {
  const [view, setView] = useState('landing');
  const [activeTab, setActiveTab] = useState('playground');
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [activeVoice, setActiveVoice] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('voxops_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    fetchClients()
      .then(list => {
        setClients(list);
        if (list.length > 0) setActiveClient(list[0]);
      })
      .catch(console.error);
  }, []);

  // Update active voice when activeClient changes
  useEffect(() => {
    if (!activeClient) return;
    const key = `voxops_voice_${activeClient.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setActiveVoice(JSON.parse(saved));
        return;
      } catch {
        // fallback below
      }
    }
    // High quality female defaults (Jessica for EN, Ritu for HI)
    const isHindi = activeClient.language_code?.toLowerCase().startsWith('hi');
    setActiveVoice({
      id: isHindi ? 'sarvam:ritu' : 'elevenlabs:cgSgspJ2msm6clMCkdW9',
      name: isHindi ? 'Ritu' : 'Jessica',
      provider: isHindi ? 'sarvam' : 'elevenlabs',
      gender: 'female',
    });
  }, [activeClient?.id]);

  function handleLogout() {
    localStorage.removeItem('voxops_user');
    setCurrentUser(null);
    setView('landing');
  }

  function handleClientSaved(c) {
    setActiveClient(c);
    setClients(prev => prev.some(x => x.id === c.id) ? prev : [...prev, c]);
  }

  function handleVoiceSelected(voice) {
    setActiveVoice(voice);
    if (activeClient) {
      localStorage.setItem(`voxops_voice_${activeClient.id}`, JSON.stringify(voice));
    }
  }

  return (
    <div>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLoginSuccess={user => { setCurrentUser(user); setView('console'); }} />

      {view === 'landing' && (
        <LandingPage
          onLaunchConsole={() => setView('console')}
          onOpenAuth={() => setIsAuthOpen(true)}
          currentUser={currentUser}
          activeClient={activeClient}
        />
      )}

      {view === 'console' && (
        <div className="console-shell">
          {/* Header */}
          <header className="console-header">
            {/* Brand + Back */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={() => setView('landing')} className="btn btn-outline btn-sm">
                <ArrowLeft size={13} /> Home
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="var(--ink)" strokeWidth="1.5"/>
                  <path d="M6 10 Q10 6 14 10 Q10 14 6 10Z" fill="var(--ink)"/>
                </svg>
                <span style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.02em' }}>VoxOps</span>
                <span className="tag tag-lavender" style={{ fontSize: '0.65rem' }}>Studio</span>
              </div>
            </div>

            {/* Tabs */}
            <nav className="tab-group hide-mobile">
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`tab-item ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </nav>

            {/* Right: tenant switcher + user */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {clients.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ink-light)', fontWeight: '500' }}>Tenant</span>
                  <select
                    className="input"
                    style={{ width: 'auto', padding: '0.35rem 0.7rem', fontSize: '0.78rem', fontWeight: '600' }}
                    value={activeClient?.id || ''}
                    onChange={e => {
                      const found = clients.find(c => c.id === e.target.value);
                      if (found) setActiveClient(found);
                    }}
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.language_code})</option>
                    ))}
                  </select>
                </div>
              )}

              {currentUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <img src={currentUser.avatar} alt="" style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid var(--border)' }} />
                  <span style={{ fontSize: '0.8rem', fontWeight: '600' }} className="hide-mobile">{currentUser.name.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="btn btn-outline btn-sm" title="Sign out">
                    <LogOut size={13} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsAuthOpen(true)} className="btn btn-dark btn-sm">Sign In</button>
              )}
            </div>
          </header>

          {/* Main content */}
          <main className="console-main">
            {activeTab === 'playground'   && (
              <VoicePlayground
                activeClient={activeClient}
                activeVoice={activeVoice}
                onNavigateToVoices={() => setActiveTab('voices')}
              />
            )}
            {activeTab === 'voices'       && (
              <AgentVoices
                activeClient={activeClient}
                activeVoice={activeVoice}
                onSelectVoice={handleVoiceSelected}
              />
            )}
            {activeTab === 'configurator' && <ClientConfigurator activeClient={activeClient} onSelectClient={handleClientSaved} />}
            {activeTab === 'memory'       && <VectorMemoryInspector activeClient={activeClient} />}
            {activeTab === 'telemetry'    && <TelemetryDashboard activeClient={activeClient} />}
          </main>
        </div>
      )}
    </div>
  );
}
