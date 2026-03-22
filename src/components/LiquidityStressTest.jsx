import React, { useState, useRef } from 'react';
import { generateWallets, exportWalletsAsCSV } from '../utils/walletUtils.js';
import { simulateBuy, simulateSell, estimateFee, checkConstraints } from '../utils/ammSimulator.js';
import { executeBuy, executeSell, fundWallet, getProvider, sweepFunds } from '../utils/onChainEngine.js';
import { NETWORKS } from '../config/networks.js';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const DEFAULT_POOL = {
  reserveToken: 1000000,
  reserveEth: 20,
  maxTxEth: 0,
  maxWalletToken: 0,
  slippageTolerance: 5,
  totalTrades: 100,
  minTrade: 0.05,
  maxTrade: 2.0,
  sellRatio: 30,
  baseGasPriceGwei: 30,
};

const SEVERITY = {
  ok: { color: '#10b981', label: 'OK' },
  warn: { color: '#f59e0b', label: 'WARNING' },
  fail: { color: '#ef4444', label: 'CRITICAL' },
};

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

export default function LiquidityStressTest({ network, onResultsChange, addLog, tokenAddress, masterKey }) {
  const [pool, setPool] = useState(DEFAULT_POOL);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [showGuide, setShowGuide] = useState(false);
  const [showTradeLog, setShowTradeLog] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [isSweeping, setIsSweeping] = useState(false);
  const [sweepProgress, setSweepProgress] = useState('');
  const abortRef = useRef(false);
  const net = NETWORKS[network];

  const cfg = v => setPool(prev => ({ ...prev, ...v }));

  async function runStressTest() {
    if (running) return;
    setRunning(true);
    abortRef.current = false;
    setResults(null);
    setChartData([]);

    addLog?.(
      `Stress test started — ${pool.totalTrades} trades · ${pool.reserveToken.toLocaleString()} tokens / ${pool.reserveEth} ${net?.currency ?? 'ETH'} · ${net?.name}${tokenAddress ? ` · token: ${tokenAddress.slice(0, 8)}…${tokenAddress.slice(-4)}` : ''}`,
      'info'
    );

    const simWallets = generateWallets(Math.min(10000, pool.totalTrades), net);
    setWallets(simWallets);
    const walletTokenBalances = {};
    simWallets.forEach(w => (walletTokenBalances[w.address] = 0));

    let poolToken = pool.reserveToken;
    let poolEth = pool.reserveEth;

    const txLog = [];
    const issues = {
      slippageExceeded: 0,
      maxTxViolations: 0,
      maxWalletViolations: 0,
      gasSpikes: 0,
      failedTxs: 0,
    };

    const chart = [];

    for (let i = 0; i < pool.totalTrades; i++) {
      if (abortRef.current) break;

      const wallet = simWallets[i % simWallets.length];
      const isSell = Math.random() * 100 < pool.sellRatio && walletTokenBalances[wallet.address] > 0;
      const amountEth = pool.minTrade + Math.random() * (pool.maxTrade - pool.minTrade);

      const congestionRoll = Math.random();
      const congestion = congestionRoll > 0.95 ? 'spike' : congestionRoll > 0.8 ? 'high' : 'normal';
      const gas = estimateFee(net, congestion);

      let ammResult;
      let txType;

      if (isSell) {
        const tokenAmount = walletTokenBalances[wallet.address] * (0.3 + Math.random() * 0.4);
        ammResult = simulateSell(tokenAmount, poolToken, poolEth);
        txType = 'sell';
      } else {
        ammResult = simulateBuy(amountEth, poolToken, poolEth);
        txType = 'buy';
      }

      const constraint = checkConstraints({
        amountEth,
        amountToken: ammResult.amountOut,
        maxTxEth: pool.maxTxEth,
        maxWalletToken: pool.maxWalletToken,
        walletTokenBalance: walletTokenBalances[wallet.address],
      });

      let success = constraint.passes;
      let failReason = constraint.reason;
      let isGasSpike = congestion === 'spike';

      const isLive = Boolean(tokenAddress && masterKey);

      if (isLive) {
        try {
          if (txType === 'sell') {
            await executeSell(wallet.privateKey, tokenAddress, network);
          } else {
            await fundWallet(masterKey, wallet.address, amountEth + 0.005, network);
            await executeBuy(wallet.privateKey, amountEth, tokenAddress, network);
          }
          success = true;
        } catch (err) {
          success = false;
          failReason = err.message || "EVM Revert";
        }
      }

      if (slippageExceeded) issues.slippageExceeded++;
      if (!success) {
        if (!isLive && failReason?.includes('maxTx')) issues.maxTxViolations++;
        else if (!isLive && failReason?.includes('maxWallet')) issues.maxWalletViolations++;
        issues.failedTxs++;
      }
      if (isGasSpike) issues.gasSpikes++;

      if (success || !isLive) { // Update pool visually slightly differently if onchain fails vs local
        if (success) {
          poolToken = ammResult.newReserveToken;
          poolEth = ammResult.newReserveEth;
          if (txType === 'buy') walletTokenBalances[wallet.address] += ammResult.amountOut;
        }
      }

      const entry = {
        id: i + 1,
        type: txType,
        amountEth: +amountEth.toFixed(4),
        amountToken: +ammResult.amountOut.toFixed(2),
        priceImpact: +ammResult.priceImpact.toFixed(3),
        gasUsed: gas.gasUsed,
        gasPriceGwei: gas.gasPriceGwei,
        success,
        slippageExceeded,
        isGasSpike,
        failReason,
        congestion,
        poolEth: +poolEth.toFixed(4),
        poolToken: +poolToken.toFixed(0),
      };

      txLog.push(entry);
      chart.push({
        tx: i + 1,
        impact: +ammResult.priceImpact.toFixed(3),
        gas: gas.gasPriceGwei,
        poolEth: +poolEth.toFixed(4),
        success: success ? 1 : 0,
      });

      if (!pool.fastMode && !isLive) {
        if (i % 5 === 0) setChartData([...chart]);
        await new Promise(r => setTimeout(r, 16));
      } else if (isLive && i % 2 === 0) {
        setChartData([...chart]);
      }
    }

    const successes = txLog.filter(t => t.success);
    const gasPrices = txLog.map(t => t.gasPriceGwei);
    const impacts = successes.map(t => t.priceImpact);

    const finalResults = {
      totalTrades: txLog.length,
      successCount: successes.length,
      failCount: txLog.filter(t => !t.success).length,
      successRate: +((successes.length / txLog.length) * 100).toFixed(1),
      issues,
      avgGasPrice: +(gasPrices.reduce((a, b) => a + b, 0) / gasPrices.length).toFixed(2),
      maxGasPrice: Math.max(...gasPrices),
      minSlippage: impacts.length ? +Math.min(...impacts).toFixed(3) : 0,
      maxSlippage: impacts.length ? +Math.max(...impacts).toFixed(3) : 0,
      avgSlippage: impacts.length ? +(impacts.reduce((a, b) => a + b, 0) / impacts.length).toFixed(3) : 0,
      finalPoolEth: +poolEth.toFixed(4),
      finalPoolToken: +poolToken.toFixed(0),
      initialPoolEth: pool.reserveEth,
      initialPoolToken: pool.reserveToken,
      txLog,
    };

    setChartData(chart);
    setResults(finalResults);
    onResultsChange?.(txLog, finalResults, pool);

    const totalIssues = Object.values(issues).reduce((a, b) => a + b, 0);
    const level = totalIssues === 0 ? 'success' : finalResults.successRate < 70 ? 'error' : 'warn';
    addLog?.(
      `Stress test complete — ${finalResults.successRate}% success · ${issues.slippageExceeded} slippage events · ${issues.gasSpikes} gas spikes · ${issues.failedTxs} failed TXs`,
      level
    );

    setRunning(false);
  }

  function getSeverity(value, warnThreshold, failThreshold) {
    if (value >= failThreshold) return SEVERITY.fail;
    if (value >= warnThreshold) return SEVERITY.warn;
    return SEVERITY.ok;
  }

  const handleExport = () => {
    exportWalletsAsCSV(wallets);
    addLog?.('Exported bot wallets to CSV', 'info');
  };

  const handleSweep = async () => {
    if (!masterKey || !wallets.length) return;
    setIsSweeping(true);
    setSweepProgress('Starting sweep...');
    addLog?.(`Initiating sweep for ${wallets.length} wallets...`, 'warn');

    try {
      await sweepFunds(wallets, masterKey, tokenAddress, network, (msg) => setSweepProgress(msg));
      addLog?.('Successfully swept remaining funds to master wallet.', 'success');
      setSweepProgress('');
    } catch (err) {
      console.error(err);
      addLog?.(`Sweep encountered an error: ${err.message}`, 'error');
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
            <span className="text-xs font-bold text-theme-primary tracking-wide transition-colors">HOW TO USE — Liquidity Stress Test</span>
            <span className="text-xs text-theme-secondary hidden sm:block transition-colors">detect slippage, gas spikes, and limit violations</span>
          </div>
          <span className="text-theme-secondary opacity-60 text-[10px] font-mono ml-4 flex-shrink-0 uppercase tracking-widest">
            {showGuide ? '▲ hide' : '▼ show'}
          </span>
        </button>
        {showGuide && (
          <div className="px-5 pb-5 border-t border-theme-subtle transition-all duration-300">
            <ol className="space-y-3 mt-4">
              <GuideStep n={1} title="Set pool reserves" desc="Token Reserve and ETH Reserve define your pool's initial liquidity. Smaller pools produce more slippage per trade — use your token's actual launch figures for realistic results." />
              <GuideStep n={2} title="Set contract limits" desc="maxTx = maximum single-TX value in ETH (0 = off). maxWallet = maximum token balance per wallet (0 = off). Any trade exceeding these is counted as a violation and marked as failed." />
              <GuideStep n={3} title="Set slippage tolerance" desc="Trades where price impact exceeds this % are flagged in the Slippage Exceeded counter. This does NOT block trades — use it to understand how much movement typical trades cause." />
              <GuideStep n={4} title="Configure trade volume" desc="Total Trades = how many random buy/sell events to simulate. Trade Range sets the per-trade ETH amount. Sell Ratio controls the buy/sell mix." />
              <GuideStep n={5} title="Run the stress test" desc="The engine runs all trades synchronously. ~5% of trades randomly receive a gas spike (3x normal gas) to simulate network congestion events." />
              <GuideStep n={6} title="Review issue cards" desc="Green = none detected. Yellow = warning level. Red = critical. Focus on Slippage Exceeded and Failed TXs for pool health assessment." />
              <GuideStep n={7} title="Pool Drain Analysis" desc="Check the net buy vs sell pressure. If the ETH reserve dropped significantly, your pool experienced heavy sell-side pressure. Use this to size your initial liquidity." />
              <GuideStep n={8} title="Trade Log" desc="After the test completes, expand the Trade Log below the charts to see every individual trade with price impact, gas, and pass/fail status." />
            </ol>
            <div
              className="mt-4 px-3 py-2.5 rounded-lg text-xs bg-amber-900/10 border-l-2 border-amber-600 text-amber-600 dark:bg-amber-900/20 dark:border-amber-700/80 dark:text-amber-500 transition-colors"
            >
              Tip: Run multiple tests with increasing total trades (100 → 500) to see how pool depth degrades under sustained pressure. Compare pool ETH before vs after.
            </div>
          </div>
        )}
      </div>

      {/* ── Configuration ───────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Pool Configuration</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="label">Token Reserve</label>
            <input type="number" className="input-field" min={1000} value={pool.reserveToken}
              onChange={e => cfg({ reserveToken: +e.target.value })} />
          </div>
          <div>
            <label className="label">{net?.currency ?? 'Native'} Reserve</label>
            <input type="number" className="input-field" min={0.1} step={0.5} value={pool.reserveEth}
              onChange={e => cfg({ reserveEth: +e.target.value })} />
          </div>
          <div>
            <label className="label">maxTx ({net?.currency ?? 'native'}) — 0=off</label>
            <input type="number" className="input-field" min={0} step={0.1} value={pool.maxTxEth}
              onChange={e => cfg({ maxTxEth: +e.target.value })} />
          </div>
          <div>
            <label className="label">maxWallet (tokens) — 0=off</label>
            <input type="number" className="input-field" min={0} value={pool.maxWalletToken}
              onChange={e => cfg({ maxWalletToken: +e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Slippage Tolerance (%)</label>
            <input type="number" className="input-field" min={0.1} max={100} step={0.5} value={pool.slippageTolerance}
              onChange={e => cfg({ slippageTolerance: +e.target.value })} />
          </div>
          <div>
            <label className="label">Total Trades</label>
            <input type="number" className="input-field" min={10} max={500} value={pool.totalTrades}
              onChange={e => cfg({ totalTrades: Math.min(500, +e.target.value) })} />
          </div>
          <div>
            <label className="label">Trade Range ({net?.currency ?? 'native'})</label>
            <div className="flex gap-2">
              <input type="number" className="input-field" min={0.001} step={0.01} value={pool.minTrade}
                onChange={e => cfg({ minTrade: +e.target.value })} placeholder="Min" />
              <input type="number" className="input-field" min={0.01} step={0.1} value={pool.maxTrade}
                onChange={e => cfg({ maxTrade: +e.target.value })} placeholder="Max" />
            </div>
          </div>
          <div>
            <label className="label">Sell Ratio (%)</label>
            <input type="number" className="input-field" min={0} max={100} value={pool.sellRatio}
              onChange={e => cfg({ sellRatio: +e.target.value })} />
            <p className="text-xs text-theme-secondary mt-1 transition-colors">{pool.sellRatio}% of trades are sells</p>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={runStressTest} disabled={running} className={tokenAddress && masterKey ? "btn-danger" : "btn-primary"}>
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-400 rounded-full pulse-dot" /> Running Stress Test...
              </span>
            ) : tokenAddress && masterKey ? "Run LIVE On-Chain Stress Test" : 'Run Stress Test'}
          </button>
          {running && (
            <button onClick={() => { abortRef.current = true; addLog?.('Stress test stopped by user', 'warn'); }} className="btn-danger">
              Stop
            </button>
          )}

          {wallets.length > 0 && !running && (
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

      {/* ── Results ──────────────────────────────────────────────── */}
      {results && (
        <>
          {/* Issue Cards */}
          <div>
            <h3 className="text-xs text-theme-secondary uppercase tracking-wider mb-3 transition-colors">Detected Issues</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Slippage Exceeded', value: results.issues.slippageExceeded, warn: 5, fail: 20, desc: `>${pool.slippageTolerance}% tolerance` },
                { label: 'maxTx Violations', value: results.issues.maxTxViolations, warn: 1, fail: 10, desc: pool.maxTxEth > 0 ? `limit: ${pool.maxTxEth} ${net?.currency}` : 'No limit set' },
                { label: 'maxWallet Violations', value: results.issues.maxWalletViolations, warn: 1, fail: 10, desc: pool.maxWalletToken > 0 ? `limit: ${pool.maxWalletToken.toLocaleString()}` : 'No limit set' },
                { label: 'Gas Spikes', value: results.issues.gasSpikes, warn: 3, fail: 15, desc: '>3x base gas' },
                { label: 'Failed TXs', value: results.issues.failedTxs, warn: 5, fail: 25, desc: `${results.failCount} / ${results.totalTrades}` },
              ].map(item => {
                const sev = getSeverity(item.value, item.warn, item.fail);
                return (
                  <div
                    key={item.label}
                    className="card text-center"
                    style={{ borderColor: item.value > 0 ? sev.color + '40' : undefined }}
                  >
                    <div className="text-xs text-theme-secondary mb-1 transition-colors">{item.label}</div>
                    <div className="text-2xl font-bold transition-colors" style={{ color: item.value > 0 ? sev.color : 'var(--text-muted)' }}>
                      {item.value}
                    </div>
                    <div className="text-xs mt-1 transition-colors" style={{ color: item.value > 0 ? sev.color + 'cc' : 'var(--text-secondary)' }}>
                      {item.value > 0 ? sev.label : 'NONE'}
                    </div>
                    <div className="text-xs text-theme-secondary mt-0.5 transition-colors">{item.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card">
              <div className="stat-label">Success Rate</div>
              <div className="stat-value" style={{ color: results.successRate > 90 ? '#10b981' : results.successRate > 70 ? '#f59e0b' : '#ef4444' }}>
                {results.successRate}%
              </div>
              <div className="text-xs text-theme-secondary mt-1 transition-colors">{results.successCount} ok · {results.failCount} failed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Slippage</div>
              <div className="stat-value" style={{ color: results.avgSlippage > pool.slippageTolerance ? '#ef4444' : results.avgSlippage > pool.slippageTolerance * 0.7 ? '#f59e0b' : '#10b981' }}>
                {results.avgSlippage}%
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Max Fee ({net?.feeUnit ?? 'Gwei'})</div>
              <div className="stat-value">{results.maxGasPrice}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Slippage Range</div>
              <div className="stat-value text-lg">{results.minSlippage}–{results.maxSlippage}%</div>
            </div>
          </div>

          {/* Pool Drain Analysis */}
          <div className="card">
            <h3 className="text-sm font-semibold text-theme-primary mb-3 transition-colors">Pool Drain Analysis</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-theme-elevated border border-theme-subtle transition-colors">
                <div className="text-xs text-theme-secondary mb-1 transition-colors">{net?.currency ?? 'Native'} Reserve Change</div>
                <div className="flex items-end gap-2">
                  <span className="text-lg font-bold text-theme-primary transition-colors">{results.finalPoolEth}</span>
                  <span className="text-sm text-theme-secondary transition-colors">from {results.initialPoolEth}</span>
                </div>
                <div className="mt-1 text-xs">
                  {results.finalPoolEth > results.initialPoolEth
                    ? <span className="text-emerald-400">+{(results.finalPoolEth - results.initialPoolEth).toFixed(4)} {net?.currency ?? ''} (net buy pressure)</span>
                    : <span className="text-red-400">{(results.finalPoolEth - results.initialPoolEth).toFixed(4)} {net?.currency ?? ''} (net sell pressure)</span>
                  }
                </div>
              </div>
              <div className="p-3 rounded-lg bg-theme-elevated border border-theme-subtle transition-colors">
                <div className="text-xs text-theme-secondary mb-1 transition-colors">Token Reserve Change</div>
                <div className="flex items-end gap-2">
                  <span className="text-lg font-bold text-theme-primary transition-colors">{results.finalPoolToken.toLocaleString()}</span>
                  <span className="text-sm text-theme-secondary transition-colors">from {results.initialPoolToken.toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs">
                  {results.finalPoolToken < results.initialPoolToken
                    ? <span className="text-emerald-400">↓ {(results.initialPoolToken - results.finalPoolToken).toLocaleString()} tokens bought</span>
                    : <span className="text-red-400">↑ {(results.finalPoolToken - results.initialPoolToken).toLocaleString()} tokens sold back</span>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          {chartData.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Price Impact Over Trades</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="impactGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tx" tick={{ fill: '#4b5563', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2d2d3d', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                    formatter={(v, n) => [v + (n === 'impact' ? '%' : ' gwei'), n === 'impact' ? 'Price Impact' : 'Gas Price']}
                  />
                  <ReferenceLine
                    y={pool.slippageTolerance}
                    stroke="#f59e0b"
                    strokeDasharray="4 2"
                    label={{ value: `Tolerance (${pool.slippageTolerance}%)`, fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }}
                  />
                  <Area type="monotone" dataKey="impact" stroke="#6366f1" fill="url(#impactGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>

              <h3 className="text-sm font-semibold text-theme-primary mt-5 mb-4 transition-colors">Gas Price Spikes</h3>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="tx" tick={{ fill: '#4b5563', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a24', border: '1px solid #2d2d3d', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [v + ' gwei', 'Gas Price']}
                  />
                  <Area type="monotone" dataKey="gas" stroke="#f59e0b" fill="url(#gasGrad)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Trade Log ─────────────────────────────────────── */}
          {results.txLog && results.txLog.length > 0 && (
            <div className="card">
              <button
                className="w-full flex items-center justify-between text-left"
                onClick={() => setShowTradeLog(v => !v)}
              >
                <h3 className="text-sm font-semibold text-theme-primary flex items-center gap-2 transition-colors">
                  Trade Log
                  <span className="text-xs text-theme-secondary font-normal">({results.txLog.length} trades)</span>
                </h3>
                <span className="text-theme-secondary opacity-80 text-[10px] uppercase font-mono tracking-widest transition-colors">{showTradeLog ? '▲ collapse' : '▼ expand'}</span>
              </button>

              {showTradeLog && (
                <div className="mt-3">
                  {/* Progress summary bar */}
                  <div className="flex gap-4 mb-3 text-xs text-theme-secondary transition-colors">
                    <span>
                      <span className="text-emerald-400 font-bold">{results.successCount}</span> passed
                    </span>
                    <span>
                      <span className="text-red-400 font-bold">{results.failCount}</span> failed
                    </span>
                    <span>
                      <span className="text-amber-400 font-bold">{results.issues.slippageExceeded}</span> slippage events
                    </span>
                    <span>
                      <span className="text-orange-400 font-bold">{results.issues.gasSpikes}</span> gas spikes
                    </span>
                  </div>

                  <div className="overflow-y-auto space-y-0.5 pr-1 border-t border-theme-subtle pt-2 mt-2 transition-colors" style={{ height: '20rem' }}>
                    {results.txLog.map(r => (
                      <div key={r.id} className="log-entry">
                        <span className="text-theme-secondary w-8 flex-shrink-0 tabular-nums transition-colors">#{r.id}</span>
                        <span className={`w-8 flex-shrink-0 font-bold ${r.type === 'buy' ? 'text-emerald-500' : 'text-red-500'}`}>
                          {r.type === 'buy' ? 'BUY' : 'SELL'}
                        </span>
                        <span className="text-theme-secondary w-20 flex-shrink-0 transition-colors">
                          {r.amountEth} {net?.currency ?? ''}
                        </span>
                        <span className="w-28 flex-shrink-0 text-xs">
                          impact: <span className={r.priceImpact > pool.slippageTolerance ? 'text-amber-500' : 'text-theme-secondary'}>{r.priceImpact}%</span>
                        </span>
                        <span className="text-theme-secondary w-28 flex-shrink-0 text-xs transition-colors">
                          {net?.gasUnit ?? 'gas'}: {r.gasPriceGwei} {net?.feeUnit ?? 'Gwei'}
                        </span>
                        <span className={`flex-shrink-0 ${r.success ? 'badge-success' : 'badge-fail'}`}>
                          {r.success ? '✓ OK' : '✗ FAIL'}
                        </span>
                        {r.slippageExceeded && r.success && (
                          <span className="text-xs text-amber-500 flex-shrink-0">slippage!</span>
                        )}
                        {r.isGasSpike && (
                          <span className="text-xs text-orange-400 flex-shrink-0">gas spike</span>
                        )}
                        {!r.success && r.failReason && (
                          <span className="text-red-400 text-xs truncate">{r.failReason}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Empty State ──────────────────────────────────────────── */}
      {!results && !running && (
        <div className="glass-panel text-center py-20 text-theme-secondary shadow-inner">
          <div className="text-5xl mb-4 opacity-20 text-theme-primary text-glow">⬡</div>
          <p className="text-sm font-semibold text-theme-primary">Configure pool parameters and run the stress test.</p>
          <p className="text-[11px] mt-1.5 uppercase tracking-widest opacity-80">
            {tokenAddress && masterKey
              ? <span className="text-amber-500 font-bold">⚠ LIVE MODE ENABLED ⚠ — Real testnet transactions will be sent to the DEX router.</span>
              : "Detects slippage, gas spikes, maxTx / maxWallet violations using simulation."}
          </p>
          <p className="text-[11px] mt-6 opacity-60">
            Expand <strong className="text-theme-primary">HOW TO USE</strong> above for step-by-step instructions.
          </p>
        </div>
      )}
    </div>
  );
}
