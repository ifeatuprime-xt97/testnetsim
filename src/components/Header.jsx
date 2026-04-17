import React from 'react';
import { NETWORKS } from '../config/networks.js';

export default function Header({ network, onNetworkChange, isDarkMode, toggleTheme }) {
  const net = NETWORKS[network];

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* ── Logo + Brand ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Real TestnetSim logo */}
          <div
            className="relative w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1a1f2e, #0d1220)',
              border: '1px solid rgba(200,210,230,0.15)',
              boxShadow: '0 0 18px rgba(180,190,220,0.12), 0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <img
              src="/testnetsim logo.png"
              alt="TestnetSim Logo"
              className="w-9 h-9 object-contain"
              style={{ mixBlendMode: 'screen', filter: 'brightness(1.1) contrast(1.05)' }}
            />
          </div>

          <div>
            <h1
              className="text-base font-bold leading-none tracking-tight"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: isDarkMode ? '#dde4f0' : '#0f172a',
                letterSpacing: '-0.01em',
              }}
            >
              TestnetSim
            </h1>
            <p className="text-[9px] font-semibold tracking-[0.18em] uppercase mt-1 leading-none hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              Liquidity &amp; Load Simulator
            </p>
          </div>
        </div>

        {/* ── Centre — Testnet Warning Badge ───────────────────────── */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full border"
          style={{
            background: 'rgba(245, 158, 11, 0.06)',
            borderColor: 'rgba(245, 158, 11, 0.22)',
            boxShadow: '0 0 16px rgba(245,158,11,0.07)',
          }}
        >
          {/* Pulsing dot */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ background: '#f59e0b' }}
            />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#f59e0b' }} />
          </span>
          <span className="text-amber-400 text-[10px] font-bold tracking-[0.15em] uppercase">Testnet Only</span>
          <span className="text-amber-500/50 text-[10px] font-medium">— No mainnet support · Pre-launch testing only</span>
        </div>

        {/* ── Right Controls ────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-base transition-all duration-300 hover:-translate-y-px"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span
              className="transition-all duration-300"
              style={{ display: 'inline-block', transform: isDarkMode ? 'rotate(0deg)' : 'rotate(180deg)' }}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </span>
          </button>

          {/* Network Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* Network colour dot / icon */}
            <div className="w-5 h-5 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src={`/${net?.iconId}-logo.svg`}
                alt={net?.name}
                className="w-full h-full object-contain"
              />
            </div>

            <select
              value={network}
              onChange={e => onNetworkChange(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-semibold pr-1 cursor-pointer"
              style={{ color: 'var(--text-primary)', minWidth: '7rem', maxWidth: '40vw' }}
            >
              <optgroup label="⚠ Testnets Only">
                {Object.values(NETWORKS).map(n => (
                  <option key={n.id} value={n.id} className="bg-[#0d1425] text-white">
                    {n.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile warning strip */}
      <div className="md:hidden px-4 py-1.5 text-center border-t"
        style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.18)' }}
      >
        <span className="text-amber-400 text-[10px] font-bold tracking-widest uppercase">
          ⚠ TESTNET ONLY — Developer &amp; Testing Use Only
        </span>
      </div>

      {/* Bottom gradient border accent — silver chrome */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(180,195,230,0.3) 20%, rgba(140,160,220,0.5) 50%, rgba(180,195,230,0.3) 80%, transparent)',
        }}
      />
    </header>
  );
}

