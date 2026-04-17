import React, { useState } from 'react';
import { generateWallets, shortAddress } from '../utils/walletUtils.js';
import { exportWalletsCSV, exportWalletsJSON } from '../utils/exportUtils.js';
import { NETWORKS } from '../config/networks.js';
import { fundWallet } from '../utils/onChainEngine.js';

// ── Collapsible guide section ──────────────────────────────────────────────
function GuideStep({ n, title, desc }) {
  return (
    <li className="flex gap-3 text-xs">
      <span
        className="flex-shrink-0 w-5 h-5 rounded text-xs flex items-center justify-center font-bold bg-theme-elevated text-indigo-500 border border-theme-subtle"
      >
        {n}
      </span>
      <div className="pt-0.5 leading-relaxed">
        <span className="text-theme-primary font-semibold transition-colors">{title}</span>
        {desc && <span className="text-theme-secondary transition-colors"> — {desc}</span>}
      </div>
    </li>
  );
}

export default function WalletGenerator({ 
  network, 
  addLog, 
  masterKey,
  currentTier,
  activeUntil,
  getWalletLimit,
  openPricingModal,
}) {
  const [count, setCount] = useState(10);
  const [wallets, setWallets] = useState([]);
  const [revealedKeys, setRevealedKeys] = useState({});
  const [generating, setGenerating] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [funding, setFunding] = useState(false);
  const [fundProgress, setFundProgress] = useState('');
  const [fundAmount, setFundAmount] = useState(0.01);

  const net = NETWORKS[network];
  const keyType = net?.isSolana ? 'ed25519' : 'secp256k1';
  const keyLabel = net?.isSolana ? 'Private Key (base58, Phantom-compatible)' : 'Private Key';
  
  // Get wallet limit from pricing tier
  const walletLimit = getWalletLimit?.() || 5;
  const exceedsLimit = count > walletLimit;

  // Show at most this many rows in the table — full list always available via export
  const TABLE_DISPLAY_LIMIT = 200;

  function handleGenerate() {
    // Check wallet limit before generating
    if (exceedsLimit) {
      addLog?.(`Wallet limit exceeded: ${count} > ${walletLimit}. Please upgrade your plan.`, 'error');
      openPricingModal?.();
      return;
    }

    if (count > 10000 && navigator.deviceMemory && navigator.deviceMemory < 8) {
       const confirmed = window.confirm(`WARNING: Your device appears to have ~${navigator.deviceMemory}GB of RAM. Generating ${count} cryptographic wallets in the browser simultaneously may cause a memory crash. Do you wish to proceed at your own risk?`);
       if (!confirmed) return;
    }
    
    setGenerating(true);
    setRevealedKeys({});
    setTimeout(() => {
      const generated = generateWallets(count, net);
      setWallets(generated);
      setGenerating(false);
      addLog?.(`Generated ${count} ${keyType} wallet${count !== 1 ? 's' : ''} on ${net?.name}`, 'success');
    }, 100);
  }

  function toggleReveal(address) {
    setRevealedKeys(prev => ({ ...prev, [address]: !prev[address] }));
  }

  function handleClear() {
    if (wallets.length === 0) return;
    if (window.confirm("Clear all generated wallets from memory? This cannot be undone if you haven't exported them.")) {
      addLog?.(`Cleared ${wallets.length} wallets from memory`, 'warn');
      setWallets([]);
      setRevealedKeys({});
    }
  }

  function handleExportCSV() {
    exportWalletsCSV(wallets);
    addLog?.(`Exported ${wallets.length} wallets to CSV`, 'info');
  }

  function handleExportJSON() {
    exportWalletsJSON(wallets);
    addLog?.(`Exported ${wallets.length} wallets to JSON`, 'info');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => { });
  }

  function explorerUrl(address) {
    if (net?.isSolana) {
      return `${net.explorer}/account/${address}${net.explorerParams ?? ''}`;
    }
    return `${net?.explorer}/address/${address}`;
  }

  async function handleFundAll() {
    if (!masterKey || wallets.length === 0 || funding) return;
    setFunding(true);
    addLog?.(`Funding ${wallets.length} wallets with ${fundAmount} ${net?.currency} each...`, 'info');

    let funded = 0;
    for (const w of wallets) {
      setFundProgress(`Funding wallet ${funded + 1}/${wallets.length}...`);
      try {
        await fundWallet(masterKey, w.address, fundAmount, net);
        funded++;
      } catch (err) {
        addLog?.(`Failed to fund ${shortAddress(w.address)}: ${err.message}`, 'error');
      }
    }

    setFunding(false);
    setFundProgress('');
    addLog?.(`Funded ${funded}/${wallets.length} wallets with ${fundAmount} ${net?.currency} each`, funded === wallets.length ? 'success' : 'warn');
  }

  return (
    <div className="space-y-5">

      {/* ── How to Use ───────────────────────────────────────────── */}
      <div
        className="glass-panel p-0 overflow-hidden"
      >
        <button
          className="w-full px-5 py-3.5 flex items-center justify-between text-left"
          onClick={() => setShowGuide(v => !v)}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-theme-primary tracking-wide transition-colors">HOW TO USE — Wallet Generator</span>
            <span className="text-xs text-theme-secondary hidden sm:block transition-colors">generate ephemeral testnet keypairs</span>
          </div>
          <span className="text-theme-secondary opacity-60 text-[10px] font-mono ml-4 flex-shrink-0 uppercase tracking-widest">
            {showGuide ? '▲ hide' : '▼ show'}
          </span>
        </button>
        {showGuide && (
          <div className="px-5 pb-5 border-t border-theme-subtle transition-all duration-300">
            <ol className="space-y-3 mt-4">
              <GuideStep n={1} title="Select a network" desc="Use the network dropdown in the header. Each network uses different key types — EVM chains use secp256k1 (ethers.js), Solana uses ed25519 (tweetnacl)." />
              <GuideStep n={2} title="Set wallet count" desc="Enter 1–50,000. More wallets give wider address spread when simulating distributed trading. For counts above 200, the table preview is limited to the first 200 rows — use Export to get all keys." />
              <GuideStep n={3} title="Click Generate" desc="Keypairs are created instantly in browser memory — no RPC calls, no external requests. Nothing is stored or transmitted." />
              <GuideStep n={4} title="Export immediately" desc="Click Export CSV or Export JSON before closing or refreshing. Wallet keys exist only in your browser's JS memory — they are permanently lost on page reload." />
              <GuideStep n={5} title="Fund from faucet" desc="Use the faucet link below to get testnet tokens. Funding is required for live testnet TX simulation, but not needed for simulation-mode analysis." />
              <GuideStep n={6} title="Reveal private keys" desc="Click the blurred key row to reveal. Use the copy button to copy to clipboard. Never import these keys into mainnet wallets." />
            </ol>
            <div
              className="mt-4 px-3 py-2.5 rounded-lg text-xs bg-amber-900/10 border-l-2 border-amber-600 text-amber-600 dark:bg-amber-900/20 dark:border-amber-700/80 dark:text-amber-500"
            >
              Solana wallets: the exported private key is the full 64-byte base58-encoded secret (seed + public key). This format is directly importable into Phantom wallet's developer/devnet mode.
            </div>
          </div>
        )}
      </div>

      {/* ── Info Banner ──────────────────────────────────────────── */}
      <div
        className="glass-panel p-4 text-xs bg-indigo-500/5 border-indigo-500/20 text-indigo-900 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-200"
      >
        <strong className="text-indigo-600 dark:text-indigo-400">Ephemeral by default.</strong>
        {' '}Private keys exist in browser memory only. Export before closing or refreshing.
        Fund wallets from testnet faucets before live testing.
        {net?.isSolana && (
          <span className="text-purple-600 dark:text-purple-400">
            {' '}· Solana wallets use ed25519 keypairs compatible with Phantom wallet (devnet mode).
          </span>
        )}
      </div>

      {/* ── Controls ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-theme-primary transition-colors">Wallet Generator</h2>
          <span className="text-xs text-theme-secondary font-mono transition-colors">{keyType} · max 50,000</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="label">Number of Wallets</label>
            <input
              type="number"
              className="input-field"
              min={1}
              max={50000}
              value={count}
              onChange={e => setCount(Math.min(50000, Math.max(1, +e.target.value)))}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-theme-secondary transition-colors">
                {exceedsLimit ? (
                  <span className="text-amber-400">
                    ⚠ Your plan limit: {walletLimit === Infinity ? 'Unlimited' : walletLimit} wallets
                  </span>
                ) : (
                  `1–50,000 (your limit: ${walletLimit === Infinity ? 'Unlimited' : walletLimit})`
                )}
              </p>
              {exceedsLimit && (
                <button 
                  onClick={openPricingModal}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors font-medium"
                >
                  Upgrade →
                </button>
              )}
            </div>
            {count > 10000 && navigator.deviceMemory && navigator.deviceMemory < 8 && (
                <div className="mt-2 text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-1.5 rounded font-mono shadow-inner">
                   ⚠ <b>RAM WARNING:</b> Your device (~{navigator.deviceMemory}GB RAM) may struggle to generate {count.toLocaleString()} wallets. Proceed with caution.
                </div>
            )}
          </div>

          <div>
            <label className="label">Target Network</label>
            <div className="input-field flex items-center gap-2 cursor-default">
              <div className="w-4 h-4 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center">
                <img src={`/${net?.iconId}-logo.svg`} alt={net?.name} className="w-full h-full object-contain" />
              </div>
              <span className="text-theme-secondary">{net?.name}</span>
              {net?.isSolana && (
                <span className="ml-auto text-xs font-medium text-purple-500">Solana</span>
              )}
            </div>
          </div>

          <div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary w-full"
            >
              {generating ? 'Generating...' : `Generate ${count} Wallet${count !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {net && (
          <p className="mt-3 text-xs text-slate-500">
            Fund wallets with testnet {net.currency} at{' '}
            <a
              href={net.faucet}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:underline"
            >
              {net.faucet.replace('https://', '')}
            </a>
          </p>
        )}

        {/* Fund All Wallets (visible when master key is set and wallets exist) */}
        {masterKey && wallets.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-theme-base border border-theme-subtle transition-colors">
            <h3 className="text-xs font-semibold text-theme-secondary uppercase tracking-wider mb-3 transition-colors">Fund All Wallets from Master</h3>
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-[10rem]">
                <label className="label">Amount per wallet ({net?.currency})</label>
                <input
                  type="number"
                  className="input-field"
                  min={0.001}
                  step={0.005}
                  value={fundAmount}
                  onChange={e => setFundAmount(+e.target.value)}
                  disabled={funding}
                />
              </div>
              <button onClick={handleFundAll} disabled={funding} className="btn-primary text-xs">
                {funding ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-300 rounded-full pulse-dot" />
                    {fundProgress}
                  </span>
                ) : `Fund ${wallets.length} Wallets`}
              </button>
            </div>
            <p className="text-xs text-theme-secondary mt-2 opacity-80 transition-colors">
              Total: ~{(fundAmount * wallets.length).toFixed(4)} {net?.currency} (+ gas)
            </p>
          </div>
        )}
      </div>

      {/* ── Wallet Table ─────────────────────────────────────────── */}
      {wallets.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-theme-primary transition-colors">
              Generated Wallets
              <span className="ml-2 text-xs text-theme-secondary font-normal transition-colors">
                ({wallets.length.toLocaleString()} · {net?.name})
              </span>
            </h3>
            <div className="flex gap-2">
              <button onClick={handleExportCSV} className="btn-secondary text-xs py-1">Export CSV</button>
              <button onClick={handleExportJSON} className="btn-secondary text-xs py-1">Export JSON</button>
              <button onClick={handleClear} className="btn-danger text-xs py-1">Clear</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr
                  className="text-theme-secondary uppercase tracking-wider border-b border-theme-subtle transition-colors"
                >
                  <th className="text-left py-2 pr-4 font-medium w-8">#</th>
                  <th className="text-left py-2 pr-4 font-medium">Address</th>
                  <th className="text-left py-2 font-medium">{keyLabel}</th>
                </tr>
              </thead>
              <tbody>
                {wallets.slice(0, TABLE_DISPLAY_LIMIT).map(w => (
                  <tr
                    key={w.address}
                    className="hover:bg-theme-elevated transition-colors border-b border-theme-subtle"
                  >
                    <td className="py-2 pr-4 text-slate-500">{w.id}</td>
                    <td className="py-2 pr-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-300">{shortAddress(w.address)}</span>
                        <button
                          onClick={() => copyToClipboard(w.address)}
                          className="text-slate-600 hover:text-indigo-400 transition-colors"
                          title="Copy address"
                        >⧉</button>
                        <a
                          href={explorerUrl(w.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-600 hover:text-indigo-400 transition-colors"
                          title="View on explorer"
                        >↗</a>
                      </div>
                    </td>
                    <td className="py-2 font-mono">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            revealedKeys[w.address]
                              ? 'text-amber-400 break-all'
                              : 'text-slate-600 select-none blur-sm hover:blur-none cursor-pointer transition-all'
                          }
                          onClick={() => toggleReveal(w.address)}
                          title={revealedKeys[w.address] ? 'Click to hide' : 'Click to reveal'}
                        >
                          {revealedKeys[w.address]
                            ? w.privateKey
                            : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                        </span>
                        {revealedKeys[w.address] && (
                          <button
                            onClick={() => copyToClipboard(w.privateKey)}
                            className="text-slate-600 hover:text-amber-400 transition-colors flex-shrink-0"
                            title="Copy private key"
                          >⧉</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {wallets.length > TABLE_DISPLAY_LIMIT && (
            <div
              className="mt-3 px-3 py-2 rounded text-xs flex items-center justify-between bg-indigo-900/10 border border-indigo-500/30 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-500/40 dark:text-indigo-300"
            >
              <span>
                Showing <strong>{TABLE_DISPLAY_LIMIT}</strong> of <strong>{wallets.length.toLocaleString()}</strong> wallets.
                Export to access all keys.
              </span>
              <span className="text-slate-600">Table limited to {TABLE_DISPLAY_LIMIT} rows for performance.</span>
            </div>
          )}

          <div
            className="mt-3 px-4 py-3 rounded-xl text-xs"
            style={{
              background: 'rgba(248,113,113,0.05)',
              borderLeft: '3px solid rgba(248,113,113,0.5)',
              color: '#f87171',
            }}
          >
            <strong>Security:</strong> Never use these private keys on mainnet. Testnet-only wallets for simulation and stress testing. Keys exist only in browser memory.
          </div>
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────── */}
      {wallets.length === 0 && !generating && (
        <div
          className="glass-panel text-center py-24"
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          {/* Atmospheric glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(99,102,241,0.07), transparent)' }}
          />
          <div
            className="text-6xl mb-6 opacity-20"
            style={{ animation: 'float 4s ease-in-out infinite', color: '#818cf8' }}
          >⬡</div>
          <p
            className="text-base font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}
          >No wallets generated yet.</p>
          <p className="text-[11px] uppercase tracking-widest opacity-60 mt-2" style={{ color: 'var(--text-secondary)' }}>Set the count above and click Generate.</p>
          <p className="text-[11px] mt-6 opacity-40" style={{ color: 'var(--text-muted)' }}>
            Expand <strong style={{ color: 'var(--text-primary)', opacity: 0.7 }}>HOW TO USE</strong> above for step-by-step instructions.
          </p>
        </div>
      )}
    </div>
  );
}

