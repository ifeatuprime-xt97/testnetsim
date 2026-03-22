import React from 'react';
import { NETWORKS } from '../config/networks.js';

export default function Header({ network, onNetworkChange, isDarkMode, toggleTheme }) {
  const net = NETWORKS[network];

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            TS
          </div>
          <div>
            <h1 className="text-sm font-bold text-theme-primary leading-none tracking-tight">TestnetSim</h1>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-theme-secondary opacity-80 leading-none mt-1.5">Liquidity & Load Simulator</p>
          </div>
        </div>

        {/* Center — Testnet Warning */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <span className="text-amber-500 text-[10px] font-bold tracking-widest uppercase">⚠ Testnet Only</span>
          <span className="text-amber-500/60 text-[10px] uppercase font-semibold tracking-wider">— No mainnet support. Pre-launch testing only.</span>
        </div>

        {/* Network Selector & Theme */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated border border-transparent hover:border-theme-subtle transition-all duration-300"
            title="Toggle Theme"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden drop-shadow-md"
            >
              <img src={`/${net?.iconId}-logo.svg`} alt={net?.name} className="w-full h-full object-contain" />
            </div>
            <select
              value={network}
              onChange={e => onNetworkChange(e.target.value)}
              className="input-field py-1.5 text-xs w-52 bg-theme-surface hover:bg-theme-elevated cursor-pointer"
            >
              <optgroup label="⚠ Testnets Only">
                {Object.values(NETWORKS).map(n => {
                  return (
                    <option key={n.id} value={n.id} className="bg-theme-surface text-theme-primary">
                      {n.name}
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile warning */}
      <div className="md:hidden border-t border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-center">
        <span className="text-amber-500 text-[10px] font-bold tracking-widest uppercase">⚠ TESTNET ONLY — Developer testing use only</span>
      </div>
    </header>
  );
}
