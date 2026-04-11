import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { exportJSON, exportCSV, exportPDFReport } from '../utils/exportUtils.js';
import { NETWORKS } from '../config/networks.js';

const COLORS = { success: '#10b981', fail: '#ef4444', buy: '#6366f1', sell: '#f59e0b' };

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card shadow-inner group">
      {icon && (
        <div className="text-2xl mb-1 opacity-60 group-hover:opacity-90 transition-opacity duration-300">{icon}</div>
      )}
      <div className="stat-label">{label}</div>
      <div
        className="stat-value text-glow"
        style={{ color: color || 'var(--text-primary)', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="text-[10px] uppercase tracking-wider opacity-50 mt-2 transition-colors"
          style={{ color: color || 'var(--text-muted)' }}
        >
          {sub}
        </div>
      )}
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

export default function Dashboard({ results, stats, config, tokenAddress, network }) {
  const net = NETWORKS[network];
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

  // TPS over time data
  const tpsData = useMemo(() => {
    if (!results?.length) return [];
    const windowMs = 1000; // 1 second buckets
    const buckets = [];
    let bucketStart = results[0].virtualTime || 0;
    let count = 0;
    results.forEach(r => {
      const t = r.virtualTime || 0;
      if (t - bucketStart > windowMs) {
        buckets.push({ time: +(bucketStart / 1000).toFixed(1), tps: count });
        bucketStart = t;
        count = 0;
      }
      count++;
    });
    if (count > 0) buckets.push({ time: +(bucketStart / 1000).toFixed(1), tps: count });
    return buckets;
  }, [results]);

  // Latency heatmap data — scatter of virtual time vs price impact
  const heatmapData = useMemo(() => {
    if (!results?.length) return [];
    return results.filter(r => r.success).map(r => ({
      id: r.id,
      time: +((r.virtualTime || 0) / 1000).toFixed(1),
      impact: +r.priceImpact.toFixed(3),
      gas: r.gasPriceGwei,
    }));
  }, [results]);

  // Price impact progression
  const priceImpactData = useMemo(() => {
    if (!results?.length) return [];
    return results.filter(r => r.success).map(r => ({
      tx: r.id,
      impact: +r.priceImpact.toFixed(3),
    }));
  }, [results]);

  const hasData = results?.length > 0 && stats;

  if (!hasData) {
    return (
      <div className="space-y-5">
        {/* Guide even without data */}
        <div className="rounded-2xl border overflow-hidden transition-colors"
          style={{ background: 'rgba(14,21,38,0.6)', borderColor: 'rgba(148,163,184,0.08)' }}
        >
          <button
            className="w-full px-5 py-4 flex items-center justify-between text-left"
            onClick={() => setShowGuide(v => !v)}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center text-indigo-400 text-sm"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}
              >?</span>
              <span className="text-xs font-bold text-theme-primary tracking-wide transition-colors">HOW TO USE — Dashboard</span>
              <span className="text-xs text-theme-secondary hidden sm:block transition-colors">analyze simulation results and export data</span>
            </div>
            <span className="text-theme-muted text-[10px] font-mono ml-4 flex-shrink-0 uppercase tracking-widest">
              {showGuide ? '▲ hide' : '▼ show'}
            </span>
          </button>
          {showGuide && (
            <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(148,163,184,0.06)' }}>
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

        {/* Empty hero */}
        <div
          className="glass-panel text-center py-24"
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          {/* Atmospheric glow behind icon */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.07), transparent)' }}
          />
          <div
            className="text-6xl mb-6 opacity-20 text-glow"
            style={{ animation: 'float 4s ease-in-out infinite', color: '#818cf8' }}
          >◎</div>
          <p className="text-base font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-primary)' }}>No simulation data yet</p>
          <p className="text-[11px] mt-2 uppercase tracking-widest opacity-60 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
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
          <button onClick={() => exportPDFReport(results, stats, config, net?.name)} className="btn-primary text-xs py-1.5">
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Top Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Simulated TXs"
          value={stats.totalTxs.toLocaleString()}
          sub={`${stats.buyCount} buys · ${stats.sellCount} sells`}
          icon="📊"
        />
        <StatCard
          label="Success Rate"
          value={`${stats.successRate}%`}
          sub={`${stats.successCount} ok · ${stats.failCount} failed`}
          color={stats.successRate > 90 ? '#34d399' : stats.successRate > 70 ? '#fbbf24' : '#f87171'}
          icon="✓"
        />
        <StatCard
          label="Avg Gas Used"
          value={stats.avgGas.toLocaleString()}
          sub={`${stats.minGas.toLocaleString()} – ${stats.maxGas.toLocaleString()} range`}
          icon="⛽"
        />
        <StatCard
          label="Slippage Range"
          value={`${stats.minSlippage}–${stats.maxSlippage}%`}
          sub={`avg ${stats.avgSlippage}%`}
          color={stats.maxSlippage > 10 ? '#f87171' : stats.maxSlippage > 5 ? '#fbbf24' : '#34d399'}
          icon="📉"
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

      {/* ── TPS Over Time ─────────────────────────────────────── */}
      {tpsData.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Transactions Per Second (TPS)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={tpsData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tpsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} label={{ value: 'Time (s)', position: 'insideBottom', fill: 'var(--text-secondary)', fontSize: 10, dy: 10 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} />
              <Line type="monotone" dataKey="tps" name="TPS" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Price Impact Progression ──────────────────────────── */}
      {priceImpactData.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Price Impact Progression</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={priceImpactData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="impactProgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="tx" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} label={{ value: 'Transaction #', position: 'insideBottom', fill: 'var(--text-secondary)', fontSize: 10, dy: 10 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }} formatter={(v) => [v + '%', 'Impact']} />
              <Area type="monotone" dataKey="impact" stroke="#f59e0b" fill="url(#impactProgGrad)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

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

      {/* ── Latency Heatmap ──────────────────────────────────────── */}
      {heatmapData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-theme-primary mb-2 transition-colors">Latency Heatmap</h3>
          <p className="text-xs text-theme-secondary mb-4 transition-colors">Each dot = one TX. X = time, Y = price impact, size = gas price. Larger/redder dots indicate higher-cost, higher-impact transactions.</p>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis type="number" dataKey="time" name="Time (s)" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis type="number" dataKey="impact" name="Impact (%)" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <ZAxis type="number" dataKey="gas" range={[20, 200]} name="Gas" />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                formatter={(val, name) => [name === 'Impact (%)' ? val + '%' : name === 'Gas' ? val + ' Gwei' : val + 's', name]}
              />
              <Scatter data={heatmapData} fill="#6366f1" opacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
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
