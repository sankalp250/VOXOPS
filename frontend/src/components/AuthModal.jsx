import React, { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  function fireConfetti() {
    confetti({ particleCount: 60, spread: 55, origin: { y: 0.55 }, colors: ['#C9B8F0', '#F0A896', '#E8C547'] });
  }

  function handleGoogle() {
    setLoading(true);
    setTimeout(() => {
      fireConfetti();
      const user = {
        name: 'Sankalp Verma',
        email: 'sankalp@voxops.ai',
        avatar: 'https://i.pravatar.cc/80?img=12',
        provider: 'google',
        role: 'Enterprise Admin',
      };
      localStorage.setItem('voxops_user', JSON.stringify(user));
      onLoginSuccess(user);
      setLoading(false);
      onClose();
    }, 700);
  }

  function handleEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      fireConfetti();
      const user = {
        name: email.split('@')[0],
        email,
        avatar: 'https://i.pravatar.cc/80?img=33',
        provider: 'email',
        role: 'Tenant Admin',
      };
      localStorage.setItem('voxops_user', JSON.stringify(user));
      onLoginSuccess(user);
      setLoading(false);
      onClose();
    }, 700);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(26,25,22,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: '420px', padding: '2.25rem', position: 'relative', borderRadius: 'var(--r-xl)' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <X size={14} color="var(--ink-muted)" />
        </button>

        {/* Title */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="var(--ink)" strokeWidth="1.5"/>
              <path d="M6 10 Q10 6 14 10 Q10 14 6 10Z" fill="var(--ink)"/>
            </svg>
            <span style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.02em' }}>VoxOps</span>
          </div>
          <h2 style={{ fontWeight: '700', fontSize: '1.4rem', letterSpacing: '-0.03em', lineHeight: '1.2' }}>
            Sign in to your <span className="serif-italic">workspace</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: '0.35rem' }}>
            Manage your voice agents, RAG memory, and live telemetry.
          </p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
            background: 'var(--cream-card)',
            border: '1.5px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '0.8rem',
            fontWeight: '600', fontSize: '0.9rem', color: 'var(--ink)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0', color: 'var(--ink-light)', fontSize: '0.78rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          or continue with email
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email"
            className="input"
            placeholder="name@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading || !email.trim()} className="btn btn-dark" style={{ borderRadius: 'var(--r-md)', padding: '0.8rem', width: '100%', justifyContent: 'center' }}>
            {loading ? 'Signing in...' : 'Continue'} <ArrowRight size={16} />
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.72rem', color: 'var(--ink-light)' }}>
          By continuing you agree to the VoxOps Terms of Service.
        </p>
      </div>
    </div>
  );
}
