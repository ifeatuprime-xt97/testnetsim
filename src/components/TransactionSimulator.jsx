import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateWallets } from '../utils/walletUtils.js';
import { runSimulation, computeStats } from '../utils/txEngine.js';
import { NETWORKS, TIMING_PATTERNS } from '../config/networks.js';
import { shortAddress } from '../utils/walletUtils.js';

const DEFAULT_CONFIG = {
  numWallets: 20,
  totalTxs: 50,
  minAmountEth: 0.01,
  maxAmountEth: 0.5,
  sellRatio: 25,
  pattern: 'random',
  reserveToken: 500000,
  reserveEth: 10,
  maxTxEth: 0,
  maxWalletToken: 0,
  baseGasPriceGwei: 20,
  fastMode: false,
};

// ── Collapsible guide step ────────────────────────────────────────────────
function GuideStep({ n, title, desc }) {
  return (
    <li className="flex gap-3 text-xs">
      <span
        className="flex-shrink-0 w-5 h-5 rounded text-xs flex items-center justify-center font-bold bg-indigo-900/40 text-indigo-400 border border-indigo-500/20"
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

export default function TransactionSimulator({ 
  network, 
  onResultsChange, 
  addLog, 
  tokenAddress, 
  masterKey, 
  replayConfig, 
  onReplayConsumed,
  currentTier,
  activeUntil,
  getWalletLimit,
  canUseWallets,
  openPricingModal,
  allowedPatterns,
}) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [wallets, setWallets] = useState([]);
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const logRef = useRef(null);
  const abortRef = useRef(false);
  const net = NETWORKS[network];

  // Handle replay: override config and auto-run
  const replayTriggered = useRef(false);
  useEffect(() => {
    if (replayConfig && !replayTriggered.current && !isRunning) {
      replayTriggered.current = true;
      setConfig({ ...DEFAULT_CONFIG, ...replayConfig });
      onReplayConsumed?.();
      // Auto-trigger run after a tick so config state is set
      setTimeout(() => {
        replayTriggered.current = false;
      }, 100);
    }
  }, [replayConfig, isRunning, onReplayConsumed]);

  const cfg = v => setConfig(prev => ({ ...prev, ...v }));

  // Check wallet limit and prompt upgrade if needed
  const walletLimit = getWalletLimit?.() || 5;
  const exceedsLimit = config.numWallets > walletLimit;
  const isPaidTierActive = currentTier?.tier?.price > 0 && activeUntil && activeUntil > Date.now();

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    
    // Check wallet limit before running
    if (!canUseWallets?.(config.numWallets)) {
      addLog?.(`Wallet limit exceeded: ${config.numWallets} > ${walletLimit}. Please upgrade your plan.`, 'error');
      openPricingModal?.();
      return;
    }
    
    setIsRunning(true);
    abortRef.current = false;

    const simWallets = generateWallets(config.numWallets, net);
    setWallets(simWallets);
    setResults([]);
    setStats(null);

    addLog?.(
      `Simulation started — ${config.totalTxs} TXs · ${config.numWallets} wallets · ${TIMING_PATTERNS[config.pattern]?.label ?? config.pattern} · ${net?.name}${tokenAddress ? ` · token: ${tokenAddress.slice(0, 8)}…${tokenAddress.slice(-4)}` : ''}`,
      'info'
    );

    const simConfig = { ...config, network, tokenAddress, masterKey };
    const collected = [];

    try {
      for await (const result of runSimulation(simConfig, simWallets)) {
        if (abortRef.current) break;
        collected.push(result);
        setResults(prev => {
          const next = [...prev, result];
          requestAnimationFrame(() => {
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          });
          return next;
        });
      }
    } finally {
      const finalStats = computeStats(collected);
      setStats(finalStats);
      onResultsChange?.(collected, finalStats, config);

      if (abortRef.current) {
        addLog?.(`Simulation stopped — ${collected.length} of ${config.totalTxs} TXs processed`, 'warn');
      } else {
        const sr = finalStats.successRate;
        const level = sr >= 80 ? 'success' : sr >= 50 ? 'warn' : 'error';
        addLog?.(
          `Simulation complete — ${finalStats.totalTxs} TXs · ${sr}% success · slippage ${finalStats.minSlippage}–${finalStats.maxSlippage}%`,
          level
        );
      }

      setIsRunning(false);
    }
  }, [config, net, isRunning, onResultsChange, addLog, tokenAddress, masterKey, canUseWallets, walletLimit, openPricingModal]);

  const handleStop = () => {
    abortRef.current = true;
  };

  const handleReset = () => {
    if (isRunning) return;
    addLog?.('Simulation results cleared', 'info');
    setResults([]);
    setStats(null);
    setWallets([]);
  };

  const handleExport = () => {
    exportWalletsAsCSV(wallets);
    addLog('Exported bot wallets to CSV', 'info');
  };

  const handleSweep = async () => {
    if (!masterKey || !wallets.length) return;
    setIsSweeping(true);
    setSweepProgress('Starting sweep...');
    addLog(`Initiating sweep for ${wallets.length} wallets...`, 'warn');

    try {
      await sweepFunds(wallets, masterKey, tokenAddress, network, (msg) => setSweepProgress(msg));
      addLog('Successfully swept remaining funds to master wallet.', 'success');
      setSweepProgress('');
    } catch (err) {
      console.error(err);
      addLog(`Sweep encountered an error: ${err.message}`, 'error');
      setSweepProgress('');
    } finally {
      setIsSweeping(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* ── How to Use ──────────────────────────────────────────── */}
      <div
        className="glass-panel p-0 overflow-hidden"
      >
        <button
          className="w-full px-5 py-3.5 flex items-center justify-between text-left"
          onClick={() => setShowGuide(v => !v)}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-theme-primary tracking-wide transition-colors">HOW TO USE — TX Simulator</span>
            <span className="text-xs text-theme-secondary hidden sm:block transition-colors">simulate buy/sell pressure with AMM math</span>
          </div>
          <span className="text-theme-secondary opacity-60 text-[10px] font-mono ml-4 flex-shrink-0 uppercase tracking-widest">
            {showGuide ? '▲ hide' : '▼ show'}
          </span>
        </button>
        {showGuide && (
          <div className="px-5 pb-5 border-t border-theme-subtle transition-all duration-300">
            <ol className="space-y-3 mt-4">
              <GuideStep n={1} title="Set pool reserves" desc="Token Reserve and ETH Reserve define the starting state of your simulated AMM pool. Use your token's actual launch liquidity figures for realistic results." />
              <GuideStep n={2} title="Configure wallets and TXs" desc="Wallets = number of unique addresses trading (up to 10,000). Total Transactions = how many buy/sell events to simulate. More wallets = more address spread across TXs." />
              <GuideStep n={3} title="Choose a timing pattern" desc="Random = organic spread. Burst = rapid-fire bot-like activity. Slow Drip = gradual accumulation. Spike = stress test with random pauses." />
              <GuideStep n={4} title="Set sell ratio" desc="Percentage of transactions that are sells. 25% means 3 in 4 TXs are buys. Wallets must have bought first before they can sell." />
              <GuideStep n={5} title="Set contract limits (optional)" desc="maxTx = max single-TX size in ETH (0 = disabled). maxWallet = max token holdings per wallet (0 = disabled). Used to test anti-whale restrictions." />
              <GuideStep n={6} title="Fast Mode" desc="Skips animation delays and processes all TXs instantly. Use this for large simulations (500+ TXs) where you want results immediately." />
              <GuideStep n={7} title="Run and review" desc="Watch the live TX log as transactions process. Green = successful. Red = failed (maxTx/maxWallet violation). When complete, go to the Dashboard tab for charts." />
            </ol>
            <div
              className="mt-4 px-3 py-2.5 rounded-lg text-xs bg-emerald-900/10 border-l-2 border-emerald-600 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-700/80 dark:text-emerald-500"
            >
              The simulator uses the Uniswap V2 constant-product formula (x·y=k). No RPC calls are made — all math runs locally in your browser.
            </div>
          </div>
        )}
      </div>

      {/* ── Config Panel ─────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Simulation Configuration</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">Wallets</label>
            <input 
              type="number" 
              className="input-field" 
              min={1} 
              max={10000} 
              value={config.numWallets}
              onChange={e => cfg({ numWallets: Math.min(10000, +e.target.value) })} 
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-theme-secondary transition-colors">
                {exceedsLimit ? (
                  <span className="text-amber-400">
                    ⚠ Your plan limit: {walletLimit === Infinity ? 'Unlimited' : walletLimit} wallets
                  </span>
                ) : (
                  `up to 10,000 (your limit: ${walletLimit === Infinity ? 'Unlimited' : walletLimit})`
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
          </div>
          <div>
            <label className="label">Total Transactions</label>
            <input type="number" className="input-field" min={1} max={1000} value={config.totalTxs}
              onChange={e => cfg({ totalTxs: Math.min(1000, +e.target.value) })} />
            <p className="text-xs text-theme-secondary mt-1 transition-colors">max 1000</p>
          </div>
          <div>
            <label className="label">Min Amount ({net?.currency ?? 'native'})</label>
            <input type="number" className="input-field" min={0.0001} step={0.001} value={config.minAmountEth}
              onChange={e => cfg({ minAmountEth: +e.target.value })} />
          </div>
          <div>
            <label className="label">Max Amount ({net?.currency ?? 'native'})</label>
            <input type="number" className="input-field" min={0.001} step={0.01} value={config.maxAmountEth}
              onChange={e => cfg({ maxAmountEth: +e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">Timing Pattern</label>
            <select className="input-field" value={config.pattern} onChange={e => cfg({ pattern: e.target.value })}>
              {Object.entries(TIMING_PATTERNS).map(([k, v]) => {
                const isAllowed = !allowedPatterns || allowedPatterns().includes(k);
                return (
                  <option key={k} value={k} disabled={!isAllowed}>
                    {v.label} {!isAllowed ? '(Pro/Paid)' : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-theme-secondary mt-1 transition-colors">{TIMING_PATTERNS[config.pattern]?.description}</p>
          </div>
          <div>
            <label className="label">Sell Ratio (%)</label>
            <input type="number" className="input-field" min={0} max={100} value={config.sellRatio}
              onChange={e => cfg({ sellRatio: Math.min(100, +e.target.value) })} />
            <p className="text-xs text-theme-secondary mt-1 transition-colors">{config.sellRatio}% of TXs are sells</p>
          </div>
          <div>
            <label className="label">Base Fee ({net?.feeUnit ?? 'Gwei'})</label>
            <input type="number" className="input-field" min={1} max={500} value={config.baseGasPriceGwei}
              onChange={e => cfg({ baseGasPriceGwei: +e.target.value })} />
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => cfg({ fastMode: !config.fastMode })}
                className="w-10 h-5 rounded-full transition-colors relative cursor-pointer"
                style={{ backgroundColor: config.fastMode ? '#4f46e5' : '#2d2d3d' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                  style={{ transform: config.fastMode ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }}
                />
              </div>
              <span className="text-xs text-theme-secondary transition-colors">Fast Mode</span>
            </label>
            <p className="text-xs text-theme-secondary mt-1 transition-colors">Skip animation delays</p>
          </div>
        </div>

        {/* Pool State */}
        <div className="rounded-lg p-4 mt-1 bg-theme-base border border-theme-subtle transition-colors">
          <h3 className="text-xs text-theme-secondary uppercase tracking-wider mb-3 transition-colors">
            Liquidity Pool — Simulation State
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Token Reserve</label>
              <input type="number" className="input-field" min={1000} value={config.reserveToken}
                onChange={e => cfg({ reserveToken: +e.target.value })} />
            </div>
            <div>
              <label className="label">{net?.currency ?? 'Native'} Reserve</label>
              <input type="number" className="input-field" min={0.1} step={0.1} value={config.reserveEth}
                onChange={e => cfg({ reserveEth: +e.target.value })} />
            </div>
            <div>
              <label className="label">maxTx ({net?.currency ?? 'native'}) — 0=off</label>
              <input type="number" className="input-field" min={0} step={0.01} value={config.maxTxEth}
                onChange={e => cfg({ maxTxEth: +e.target.value })} />
            </div>
            <div>
              <label className="label">maxWallet (tokens) — 0=off</label>
              <input type="number" className="input-field" min={0} value={config.maxWalletToken}
                onChange={e => cfg({ maxWalletToken: +e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={handleRun} disabled={isRunning} className={tokenAddress && masterKey ? "btn-danger" : "btn-success"}>
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full pulse-dot" /> Running...
              </span>
            ) : tokenAddress && masterKey ? 'Run LIVE Pre-Launch Test' : 'Run Pre-Launch Test'}
          </button>
          {isRunning && (
            <button onClick={handleStop} className="btn-danger">Stop</button>
          )}
          {!isRunning && results.length > 0 && (
            <button onClick={handleReset} className="btn-secondary">Reset</button>
          )}

          {wallets.length > 0 && !isRunning && (
            <>
              <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
                ⬇ Export Bots (CSV)
              </button>
              {tokenAddress && masterKey && (
                <button onClick={handleSweep} disabled={isSweeping} className="btn-secondary text-amber-500 border-amber-500/30 hover:bg-amber-500/10 flex items-center gap-2">
                  {isSweeping ? (
                    <><span className="w-2 h-2 bg-amber-400 rounded-full pulse-dot" /> {sweepProgress}</>
                  ) : "🧹 Sweep Funds"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Stats Summary ────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card">
            <div className="stat-label">Total TXs</div>
            <div className="stat-value">{stats.totalTxs}</div>
            <div className="text-xs text-theme-secondary mt-1 transition-colors">{stats.buyCount} buys · {stats.sellCount} sells</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Success Rate</div>
            <div
              className="stat-value"
              style={{ color: stats.successRate > 80 ? '#10b981' : stats.successRate > 50 ? '#f59e0b' : '#ef4444' }}
            >
              {stats.successRate}%
            </div>
            <div className="text-xs text-theme-secondary mt-1 transition-colors">{stats.successCount} ok · {stats.failCount} failed</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Gas</div>
            <div className="stat-value text-lg">{stats.avgGas.toLocaleString()}</div>
            <div className="text-xs text-theme-secondary mt-1 transition-colors">{stats.minGas.toLocaleString()}–{stats.maxGas.toLocaleString()} range</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Slippage Range</div>
            <div
              className="stat-value text-lg"
              style={{ color: stats.maxSlippage > 10 ? '#ef4444' : stats.maxSlippage > 5 ? '#f59e0b' : '#10b981' }}
            >
              {stats.minSlippage}–{stats.maxSlippage}%
            </div>
            <div className="text-xs text-theme-secondary mt-1 transition-colors">avg {stats.avgSlippage}%</div>
          </div>
        </div>
      )}

      {/* ── Live Transaction Log ─────────────────────────────────── */}
      {(isRunning || results.length > 0) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-theme-primary transition-colors flex items-center gap-2">
              Transaction Log
              {isRunning && (
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400 font-bold ml-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Live
                </span>
              )}
            </h3>
            <span className="text-xs text-theme-secondary font-mono bg-theme-base px-2 py-0.5 rounded-md border border-theme-subtle transition-colors">{results.length} / {config.totalTxs}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full rounded-full mb-4 overflow-hidden bg-theme-base border border-theme-subtle shadow-inner" style={{ height: '4px' }}>
            <div
              className="h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              style={{
                width: `${(results.length / config.totalTxs) * 100}%`,
                backgroundImage: isRunning ? 'linear-gradient(to right, #4f46e5, #8b5cf6)' : 'linear-gradient(to right, #059669, #10b981)',
              }}
            />
          </div>

          <div ref={logRef} className="overflow-y-auto space-y-0 pr-2" style={{ height: '18rem' }}>
            {results.map(r => (
              <div key={r.id} className="log-entry">
                <span className="text-theme-secondary w-8 flex-shrink-0 tabular-nums transition-colors">#{r.id}</span>
                <span className={`w-8 flex-shrink-0 font-bold ${r.type === 'buy' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {r.type === 'buy' ? 'BUY' : 'SELL'}
                </span>
                <span className="text-theme-secondary w-20 flex-shrink-0 transition-colors">{shortAddress(r.wallet)}</span>
                <span className="text-theme-primary w-24 flex-shrink-0 transition-colors">
                  {r.amountEth} {net?.currency ?? ''}
                </span>
                <span className="w-24 flex-shrink-0 text-xs">
                  impact: <span className={r.priceImpact > 5 ? 'text-amber-500' : 'text-theme-secondary'}>{r.priceImpact}%</span>
                </span>
                <span className="text-theme-secondary w-28 flex-shrink-0 text-xs transition-colors">
                  {net?.gasUnit ?? 'gas'}: {r.gasPriceGwei} {net?.feeUnit ?? 'Gwei'}
                </span>
                <span className={`flex-shrink-0 ${r.success ? 'badge-success' : 'badge-fail'}`}>
                  {r.success ? '✓ OK' : '✗ FAIL'}
                </span>
                {r.txHash ? (
                  <a href={`${net?.explorer}/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline text-xs truncate ml-2" title={r.txHash}>
                    {r.txHash.slice(0, 8)}…{r.txHash.slice(-6)} ({r.confirmationMs}ms)
                  </a>
                ) : !r.success && (
                  <span className="text-red-500 text-xs truncate ml-2">{r.failReason}</span>
                )}
              </div>
            ))}
            {isRunning && (
              <div className="log-entry text-theme-secondary text-xs transition-colors">
                <span className="pulse-dot">Processing next transaction...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────────── */}
      {!isRunning && results.length === 0 && (
        <div className="glass-panel text-center py-20 text-theme-secondary shadow-inner">
          <div className="text-5xl mb-4 opacity-20 text-theme-primary text-glow">◈</div>
          <p className="text-sm font-semibold text-theme-primary">Configure parameters and run a simulation.</p>
          <p className="text-[11px] mt-1.5 uppercase tracking-widest opacity-80">
            {tokenAddress && masterKey
              ? <span className="text-amber-500 font-bold">⚠ LIVE MODE ENABLED ⚠ — Real testnet transactions will be sent and real gas will be consumed.</span>
              : "Uses Uniswap V2 constant-product AMM math — no RPC calls required."}
          </p>
          <p className="text-[11px] mt-6 opacity-60">
            Expand <strong className="text-theme-primary">HOW TO USE</strong> above for step-by-step instructions.
          </p>
        </div>
      )}
    </div>
  );
}

