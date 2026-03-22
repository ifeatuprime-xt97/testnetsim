import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { exportJSON, exportCSV } from '../utils/exportUtils.js';

const COLORS = { success: '#10b981', fail: '#ef4444', buy: '#6366f1', sell: '#f59e0b' };

function StatCard({ label, value, sub, color }) {
  return (
    <div className="stat-card shadow-inner">
      <div className="stat-label text-[10px] uppercase tracking-widest">{label}</div>
      <div className="stat-value text-glow" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="text-[10px] uppercase tracking-widest opacity-60 mt-2 transition-colors">{sub}</div>}
    </div>
  );
}

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

export default function Dashboard({ results, stats, config, tokenAddress }) {
  const [showGuide, setShowGuide] = useState(false);

  const timelineData = useMemo(() => {
    if (!results?.length) return [];
    const bucketSize = Math.max(1, Math.ceil(results.length / 40));
    const buckets = [];
    for (let i = 0; i < results.length; i += bucketSize) {
      const slice = results.slice(i, i + bucketSize);
      const successes = slice.filter(r => r.success).length;
      const failures = slice.length - successes;
      const avgImpact = slice.reduce((a, r) => a + r.priceImpact, 0) / slice.length;
      buckets.push({ tx: i + 1, successes, failures, avgImpact: +avgImpact.toFixed(3) });
    }
    return buckets;
  }, [results]);

  const gasDistData = useMemo(() => {
    if (!results?.length) return [];
    const gasValues = results.filter(r => r.success).map(r => r.gasPriceGwei);
    if (!gasValues.length) return [];
    const min = Math.min(...gasValues);
    const max = Math.max(...gasValues);
    const numBuckets = 8;
    const bucketWidth = (max - min) / numBuckets || 1;
    const buckets = Array.from({ length: numBuckets }, (_, i) => ({
      range: `${(min + i * bucketWidth).toFixed(0)}`,
      count: 0,
    }));
    gasValues.forEach(g => {
      const idx = Math.min(numBuckets - 1, Math.floor((g - min) / bucketWidth));
      buckets[idx].count++;
    });
    return buckets;
  }, [results]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Success', value: stats.successCount },
      { name: 'Failed', value: stats.failCount },
    ];
  }, [stats]);

  const buySellData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Buys', value: stats.buyCount },
      { name: 'Sells', value: stats.sellCount },
    ];
  }, [stats]);

  const hasData = results?.length > 0 && stats;

  if (!hasData) {
    return (
      <div className="space-y-5">
        {/* Guide even without data */}
        <div
          className="rounded-xl border border-theme-subtle bg-theme-base overflow-hidden transition-colors"
        >
          <button
            className="w-full px-5 py-3.5 flex items-center justify-between text-left"
            onClick={() => setShowGuide(v => !v)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-theme-primary tracking-wide transition-colors">HOW TO USE — Dashboard</span>
              <span className="text-xs text-theme-secondary hidden sm:block transition-colors">analyze simulation results and export data</span>
            </div>
            <span className="text-slate-600 text-xs font-mono ml-4 flex-shrink-0">
              {showGuide ? '▲ hide' : '▼ show'}
            </span>
          </button>
          {showGuide && (
            <div className="px-5 pb-5" style={{ borderTop: '1px solid #1e1e2e' }}>
              <ol className="space-y-3 mt-4">
                <GuideStep n={1} title="Run a simulation first" desc="Go to TX Simulator or Liquidity Stress Test and run a session. The Dashboard auto-populates when results are available." />
                <GuideStep n={2} title="Top stats overview" desc="Success Rate, Slippage Range, Gas Used, and TX counts give an instant health summary. Red = critical, yellow = warning, green = healthy." />
                <GuideStep n={3} title="Activity Timeline" desc="Shows successful vs failed transactions across the session in buckets. A spike in failures at a particular point may indicate pool depletion." />
                <GuideStep n={4} title="Gas Distribution" desc="Bar chart showing the spread of gas prices across the session. A wide spread indicates network congestion simulation is working correctly." />
                <GuideStep n={5} title="Pie charts" desc="Success/Failed ratio and Buy/Sell ratio at a glance. High failure rates with maxTx/maxWallet set indicates your limits are being hit frequently." />
                <GuideStep n={6} title="Failure Breakdown" desc="If failures exist, this shows which constraint triggered them (maxTx, maxWallet, etc.) and what proportion each caused." />
                <GuideStep n={7} title="Gas Cost Summary" desc="Total estimated gas cost in ETH helps plan real testnet funding requirements before doing live testing." />
                <GuideStep n={8} title="Export" desc="CSV for raw TX data in spreadsheet tools. JSON for the full dataset including stats and simulation config — useful for comparing runs." />
              </ol>
            </div>
          )}
        </div>

        <div className="glass-panel text-center py-20 text-theme-secondary shadow-inner">
          <div className="text-5xl mb-4 opacity-20 text-theme-primary text-glow">◎</div>
          <p className="text-sm font-semibold text-theme-primary">No simulation data yet</p>
          <p className="text-[11px] mt-1.5 uppercase tracking-widest opacity-80 max-w-sm mx-auto">
            Run a Transaction Simulation or Liquidity Stress Test to populate this dashboard.
          </p>
        </div>
      </div>
    );
  }

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
            <span className="text-xs font-bold text-theme-primary tracking-wide transition-colors">HOW TO USE — Dashboard</span>
            <span className="text-xs text-theme-secondary hidden sm:block transition-colors">analyze simulation results and export data</span>
          </div>
          <span className="text-theme-secondary opacity-60 text-[10px] font-mono ml-4 flex-shrink-0 uppercase tracking-widest">
            {showGuide ? '▲ hide' : '▼ show'}
          </span>
        </button>
        {showGuide && (
          <div className="px-5 pb-5 border-t border-theme-subtle transition-all duration-300">
            <ol className="space-y-3 mt-4">
              <GuideStep n={1} title="Top stats overview" desc="Success Rate, Slippage Range, Gas Used, and TX counts give an instant health summary. Red = critical, yellow = warning, green = healthy." />
              <GuideStep n={2} title="Activity Timeline" desc="Shows successful vs failed TXs bucketed across the session. Spikes in failures may indicate pool depletion or limit triggers late in the run." />
              <GuideStep n={3} title="Gas Distribution" desc="Bar chart of gas price spread. A wide distribution confirms that gas spike simulation is working — look for outliers on the right tail." />
              <GuideStep n={4} title="Failure Breakdown" desc="If failures exist, the proportion chart shows which constraint caused them. Heavy maxTx/maxWallet failures = adjust your limits." />
              <GuideStep n={5} title="Gas Cost Summary" desc="Total estimated ETH gas spend — use this to calculate how much testnet ETH you need to fund wallets for live testing." />
              <GuideStep n={6} title="Export data" desc="CSV gives raw TX rows (id, type, wallet, amount, gas, success). JSON includes the full stats object and simulation config for comparison across runs." />
            </ol>
          </div>
        )}
      </div>

      {/* ── Export Controls ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-theme-primary transition-colors">Simulation Report</h2>
          <p className="text-xs text-theme-secondary mt-0.5 transition-colors">
            {results.length} transactions analyzed
            {tokenAddress && (
              <span className="ml-2 font-mono text-theme-secondary opacity-70">
                · {tokenAddress.slice(0, 10)}…{tokenAddress.slice(-6)}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(results)} className="btn-secondary text-xs py-1.5">
            Export CSV
          </button>
          <button onClick={() => exportJSON(results, stats, config)} className="btn-secondary text-xs py-1.5">
            Export JSON
          </button>
        </div>
      </div>

      {/* ── Top Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Simulated TXs"
          value={stats.totalTxs.toLocaleString()}
          sub={`${stats.buyCount} buys · ${stats.sellCount} sells`}
        />
        <StatCard
          label="Success Rate"
          value={`${stats.successRate}%`}
          sub={`${stats.successCount} ok · ${stats.failCount} failed`}
          color={stats.successRate > 90 ? '#10b981' : stats.successRate > 70 ? '#f59e0b' : '#ef4444'}
        />
        <StatCard
          label="Avg Gas Used"
          value={stats.avgGas.toLocaleString()}
          sub={`${stats.minGas.toLocaleString()} – ${stats.maxGas.toLocaleString()} range`}
        />
        <StatCard
          label="Slippage Range"
          value={`${stats.minSlippage}–${stats.maxSlippage}%`}
          sub={`avg ${stats.avgSlippage}%`}
          color={stats.maxSlippage > 10 ? '#ef4444' : stats.maxSlippage > 5 ? '#f59e0b' : '#10b981'}
        />
      </div>

      {/* ── Activity Timeline ────────────────────────────────────── */}
      <div className="card">
        <h3 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Transaction Activity Timeline</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="tx" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} label={{ value: 'Transaction #', position: 'insideBottom', fill: 'var(--text-secondary)', fontSize: 10, dy: 10 }} />
            <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
              labelFormatter={v => `TX #${v}`}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
            <Area type="monotone" dataKey="successes" name="Successful" stroke="#10b981" fill="url(#successGrad)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="failures" name="Failed" stroke="#ef4444" fill="url(#failGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-2">
          <h3 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Gas Price Distribution (Gwei)</h3>
          {gasDistData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={gasDistData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="range" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} label={{ value: 'Gwei', position: 'insideBottom', fill: 'var(--text-secondary)', fontSize: 10, dy: 10 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                  formatter={(v) => [v, 'Transactions']}
                />
                <Bar dataKey="count" name="Transactions" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-theme-secondary text-sm transition-colors">No data</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card py-3">
            <h3 className="text-xs font-semibold text-theme-secondary mb-3 uppercase tracking-wider transition-colors">Success vs Failed</h3>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value" strokeWidth={0}>
                  <Cell fill={COLORS.success} />
                  <Cell fill={COLORS.fail} />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card py-3">
            <h3 className="text-xs font-semibold text-theme-secondary mb-3 uppercase tracking-wider transition-colors">Buys vs Sells</h3>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={buySellData} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value" strokeWidth={0}>
                  <Cell fill={COLORS.buy} />
                  <Cell fill={COLORS.sell} />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Failure Breakdown ────────────────────────────────────── */}
      {stats.failCount > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-theme-primary mb-3 transition-colors">Failure Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(stats.failureReasons).map(([reason, count]) => (
              <div key={reason} className="flex items-center gap-3">
                <div className="text-xs text-red-500 w-8 flex-shrink-0 text-right font-mono">{count}×</div>
                <div className="flex-1 rounded-full h-1.5 bg-theme-elevated transition-colors">
                  <div
                    className="bg-red-500 h-1.5 rounded-full"
                    style={{ width: `${(count / stats.failCount) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-theme-secondary flex-1 truncate transition-colors">{reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Gas Cost Summary ─────────────────────────────────────── */}
      <div className="card">
        <h3 className="text-sm font-semibold text-theme-primary mb-3 transition-colors">Gas Cost Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-theme-secondary mb-1 transition-colors">Total Gas Cost (ETH)</div>
            <div className="text-lg font-bold text-theme-primary transition-colors">{stats.totalGasCostEth}</div>
          </div>
          <div>
            <div className="text-xs text-theme-secondary mb-1 transition-colors">Avg Gas Units</div>
            <div className="text-lg font-bold text-theme-primary transition-colors">{stats.avgGas.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-theme-secondary mb-1 transition-colors">Min Gas Units</div>
            <div className="text-lg font-bold text-theme-primary transition-colors">{stats.minGas.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-theme-secondary mb-1 transition-colors">Max Gas Units</div>
            <div className="text-lg font-bold text-theme-primary transition-colors">{stats.maxGas.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
