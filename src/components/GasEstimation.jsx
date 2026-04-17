import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NETWORKS } from '../config/networks.js';
import { fetchGasPrice, estimateSimCost } from '../utils/gasUtils.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function GasEstimation({ network, addLog }) {
  const net = NETWORKS[network];
  const [gasData, setGasData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [numTxs, setNumTxs] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);

  const fetchGas = useCallback(async () => {
    if (!net) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGasPrice(net);
      setGasData(data);
      setHistory(prev => {
        const next = [...prev, {
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          baseFee: data.baseFee,
          priorityFee: data.priorityFee,
        }];
        return next.slice(-20); // keep last 20 data points
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch gas data');
      addLog?.(`Gas fetch failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [net, addLog]);

  // Auto-refresh every 15s
  useEffect(() => {
    fetchGas();
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchGas, 15000);
    }
    return () => clearInterval(intervalRef.current);
  }, [fetchGas, autoRefresh]);

  // Reset on network change
  useEffect(() => {
    setHistory([]);
    setGasData(null);
  }, [network]);

  const cost = estimateSimCost(numTxs, gasData, net);

  return (
    <div className="space-y-5">

      {/* ── Live Gas Price ─────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-theme-primary transition-colors flex items-center gap-2">
            Live Gas Price
            {loading && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-indigo-400 font-bold">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full pulse-dot" /> Fetching...
              </span>
            )}
            {!loading && gasData && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full pulse-dot shadow-[0_0_8px_rgba(52,211,153,0.8)]" /> Live
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setAutoRefresh(v => !v)}
                className="w-10 h-5 rounded-full transition-colors relative cursor-pointer"
                style={{ backgroundColor: autoRefresh ? '#4f46e5' : '#334163' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                  style={{ transform: autoRefresh ? 'translateX(1.25rem)' : 'translateX(0.125rem)' }}
                />
              </div>
              <span className="text-xs text-theme-secondary transition-colors">Auto (15s)</span>
            </label>
            <button onClick={fetchGas} disabled={loading} className="btn-secondary text-xs py-1.5">
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg text-xs bg-red-900/20 border border-red-500/30 text-red-400 mb-4">
            {error}
          </div>
        )}

        {gasData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="stat-card shadow-inner">
              <div className="stat-label text-[10px]">Base Fee</div>
              <div className="stat-value text-lg text-glow" style={{ color: '#6366f1' }}>
                {net?.isSolana ? `${gasData.baseFee.toLocaleString()} lam` : `${gasData.baseFee} Gwei`}
              </div>
            </div>
            <div className="stat-card shadow-inner">
              <div className="stat-label text-[10px]">Priority Fee</div>
              <div className="stat-value text-lg text-glow" style={{ color: '#8b5cf6' }}>
                {gasData.priorityFee} {gasData.unit}
              </div>
            </div>
            <div className="stat-card shadow-inner">
              <div className="stat-label text-[10px]">Max Fee</div>
              <div className="stat-value text-lg" style={{ color: gasData.maxFee > gasData.baseFee * 3 ? '#ef4444' : '#f59e0b' }}>
                {gasData.maxFee} {gasData.unit}
              </div>
            </div>
            <div className="stat-card shadow-inner">
              <div className="stat-label text-[10px]">Network</div>
              <div className="stat-value text-lg" style={{ color: net?.color || '#94a3b8' }}>
                {net?.currency}
              </div>
              <div className="text-[10px] uppercase tracking-widest opacity-60 mt-1">{net?.name}</div>
            </div>
          </div>
        ) : !error ? (
          <div className="text-xs text-theme-secondary text-center py-8 transition-colors">Loading gas data...</div>
        ) : null}
      </div>

      {/* ── Gas Price History Chart ────────────────────────────── */}
      {history.length > 1 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Gas Price History</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="time" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text-primary)',
                }}
              />
              <Line
                type="monotone"
                dataKey="baseFee"
                name="Base Fee"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="priorityFee"
                name="Priority Fee"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#8b5cf6' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Cost Estimator ─────────────────────────────────────── */}
      <div className="card">
        <h3 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Simulation Cost Estimator</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="label">Number of Transactions</label>
            <input
              type="number"
              className="input-field"
              min={1}
              max={10000}
              value={numTxs}
              onChange={e => setNumTxs(Math.min(10000, Math.max(1, +e.target.value)))}
            />
          </div>
          <div className="stat-card shadow-inner">
            <div className="stat-label text-[10px]">Est. Cost Per TX</div>
            <div className="stat-value text-lg" style={{ color: '#10b981' }}>
              {cost ? `${cost.perTx} ${cost.currency}` : '—'}
            </div>
          </div>
          <div className="stat-card shadow-inner">
            <div className="stat-label text-[10px]">Est. Total Cost</div>
            <div className="stat-value text-lg text-glow" style={{ color: '#f59e0b' }}>
              {cost ? `${cost.total} ${cost.currency}` : '—'}
            </div>
            <div className="text-[10px] uppercase tracking-widest opacity-60 mt-1">
              {numTxs.toLocaleString()} TXs
            </div>
          </div>
        </div>
        {!gasData && (
          <div className="text-xs text-theme-secondary mt-3 transition-colors">
            Waiting for live gas data to calculate estimates...
          </div>
        )}
      </div>

      {/* ── Empty/Info State ───────────────────────────────────── */}
      {!gasData && !loading && !error && (
        <div className="glass-panel text-center py-20 text-theme-secondary shadow-inner">
          <div className="text-5xl mb-4 opacity-20 text-theme-primary text-glow">⛽</div>
          <p className="text-sm font-semibold text-theme-primary">Connecting to {net?.name}...</p>
          <p className="text-[11px] mt-1.5 uppercase tracking-widest opacity-80">
            Fetching live gas prices from the network RPC.
          </p>
        </div>
      )}
    </div>
  );
}

