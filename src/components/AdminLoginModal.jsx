import React, { useState, useEffect, useRef } from 'react';

export default function AdminLoginModal({ isOpen, onClose, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const usernameRef = useRef(null);

  // Focus username field when opened
  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError('');
      setTimeout(() => usernameRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Small artificial delay to prevent brute-force timing attacks
    await new Promise(r => setTimeout(r, 600));

    const validUser = import.meta.env.VITE_ADMIN_USER || 'admin';
    const validPass = import.meta.env.VITE_ADMIN_PASS || 'testnetsim2024';

    if (username === validUser && password === validPass) {
      setIsLoading(false);
      onLogin();
      onClose();
    } else {
      setIsLoading(false);
      setError('Invalid credentials.');
      setPassword('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      {/* Backdrop — extra dark, no blur (stealth) */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.82)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0d1220 0%, #080b14 100%)',
          border: '1px solid rgba(180,195,220,0.09)',
          boxShadow: '0 0 0 1px rgba(99,102,241,0.12), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(99,102,241,0.05)',
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.6) 40%, rgba(139,92,246,0.6) 60%, transparent)',
          }}
        />

        {/* Header */}
        <div className="px-6 pt-7 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                border: '1px solid rgba(99,102,241,0.25)',
                boxShadow: '0 0 16px rgba(99,102,241,0.15)',
              }}
            >
              🔑
            </div>
            <div>
              <h2
                className="text-sm font-bold tracking-wide"
                style={{ color: '#dde4f0', fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Admin Access
              </h2>
              <p className="text-[10px] font-mono" style={{ color: '#44567a' }}>
                Restricted — Authorized Personnel Only
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150"
            style={{ color: '#44567a', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.color = '#dde4f0'}
            onMouseLeave={e => e.currentTarget.style.color = '#44567a'}
          >
            ✕
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px" style={{ background: 'rgba(180,195,220,0.06)' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Username */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: '#44567a' }}
            >
              Username
            </label>
            <input
              ref={usernameRef}
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full rounded-xl px-4 py-2.5 text-sm font-mono outline-none transition-all duration-200"
              style={{
                background: 'rgba(10,16,30,0.7)',
                border: '1px solid rgba(148,163,184,0.10)',
                color: '#dde4f0',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)';
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(148,163,184,0.10)';
                e.target.style.boxShadow = 'none';
              }}
              spellCheck={false}
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-1.5"
              style={{ color: '#44567a' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl px-4 py-2.5 text-sm font-mono outline-none transition-all duration-200 pr-10"
                style={{
                  background: 'rgba(10,16,30,0.7)',
                  border: '1px solid rgba(148,163,184,0.10)',
                  color: '#dde4f0',
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(99,102,241,0.5)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.10)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(148,163,184,0.10)';
                  e.target.style.boxShadow = 'none';
                }}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm transition-colors duration-150"
                style={{ color: '#44567a' }}
                onMouseEnter={e => e.currentTarget.style.color = '#8496b4'}
                onMouseLeave={e => e.currentTarget.style.color = '#44567a'}
                tabIndex={-1}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.20)',
                color: '#f87171',
              }}
            >
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !username || !password}
            className="w-full py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
            style={
              isLoading || !username || !password
                ? {
                    background: 'rgba(99,102,241,0.12)',
                    color: '#44567a',
                    border: '1px solid rgba(99,102,241,0.10)',
                    cursor: 'not-allowed',
                  }
                : {
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    border: '1px solid rgba(99,102,241,0.4)',
                    boxShadow: '0 0 20px rgba(99,102,241,0.25)',
                    cursor: 'pointer',
                  }
            }
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span
                  className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }}
                />
                Authenticating…
              </span>
            ) : (
              'Authenticate'
            )}
          </button>
        </form>

        {/* Footer hint */}
        <div
          className="px-6 pb-5 text-center text-[10px] font-mono"
          style={{ color: '#2a3550' }}
        >
          TestnetSim Admin Panel · v1.0
        </div>
      </div>
    </div>
  );
}
