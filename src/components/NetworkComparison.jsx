import React, { useState, useRef } from 'react';
import { NETWORKS } from '../config/networks.js';
import { generateWallets } from '../utils/walletUtils.js';
import { simulateBuy, simulateSell, estimateFee, checkConstraints } from '../utils/ammSimulator.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

const NET_COLORS = {
  sepolia: '#627EEA',
  arbitrumSepolia: '#28A0F0',
  baseSepolia: '#0052FF',
  avalancheFuji: '#E84142',
  bscTestnet: '#F3BA2F',
  polygonAmoy: '#8247E5',
  solanaDevnet: '#9945FF',
};

const DEFAULT_CONFIG = {
  totalTrades: 50,
  reserveToken: 500000,
  reserveEth: 10,
  minTrade: 0.01,
  maxTrade: 0.5,
  sellRatio: 25,
  maxTxEth: 0,
  maxWalletToken: 0,
};

/**
 * Run a quick local simulation on a single network and return summary metrics.
 */
function runQuickSim(config, network) {
  const net = NETWORKS[network];
  const wallets = generateWallets(Math.min(20, config.totalTrades), net);
  const walletTokenBalances = {};
  wallets.forEach(w => (walletTokenBalances[w.address] = 0));

  let poolToken = config.reserveToken;
  let poolEth = config.reserveEth;
  let successes = 0;
  let totalGas = 0;
  let totalSlippage = 0;
  const startTime = performance.now();

  for (let i = 0; i < config.totalTrades; i++) {
    const wallet = wallets[i % wallets.length];
    const isSell = Math.random() * 100 < config.sellRatio && walletTokenBalances[wallet.address] > 0;
    const amountEth = config.minTrade + Math.random() * (config.maxTrade - config.minTrade);

    const congestionLevels = ['low', 'normal', 'normal', 'normal', 'high', 'spike'];
    const congestion = congestionLevels[Math.floor(Math.random() * congestionLevels.length)];
    const gas = estimateFee(net, congestion);

    let ammResult;
    if (isSell) {
      const tokenAmount = walletTokenBalances[wallet.address] * (0.3 + Math.random() * 0.4);
      ammResult = simulateSell(tokenAmount, poolToken, poolEth);
    } else {
      ammResult = simulateBuy(amountEth, poolToken, poolEth);
    }

    const constraint = checkConstraints({
      amountEth,
      amountToken: ammResult.amountOut,
      maxTxEth: config.maxTxEth,
      maxWalletToken: config.maxWalletToken,
      walletTokenBalance: walletTokenBalances[wallet.address],
    });

    if (constraint.passes) {
      successes++;
      poolToken = ammResult.newReserveToken;
      poolEth = ammResult.newReserveEth;
      if (!isSell) walletTokenBalances[wallet.address] += ammResult.amountOut;
    }

    totalGas += gas.gasPriceGwei;
    totalSlippage += ammResult.priceImpact;
  }

  const elapsed = performance.now() - startTime;

  return {
    network: network,
    networkName: net.name,
    successRate: +((successes / config.totalTrades) * 100).toFixed(1),
    avgGas: +(totalGas / config.totalTrades).toFixed(2),
    avgSlippage: +(totalSlippage / config.totalTrades).toFixed(3),
    tps: +(config.totalTrades / (elapsed / 1000)).toFixed(0),
    totalTrades: config.totalTrades,
    successes,
    color: NET_COLORS[network] || '#6366f1',
  };
}

export default function NetworkComparison({ addLog }) {
  const [selectedNetworks, setSelectedNetworks] = useState(['sepolia', 'baseSepolia']);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  const cfg = v => setConfig(prev => ({ ...prev, ...v }));

  const toggleNetwork = (netId) => {
    setSelectedNetworks(prev =>
      prev.includes(netId) ? prev.filter(n => n !== netId) : [...prev, netId]
    );
  };

  const handleRun = () => {
    if (selectedNetworks.length < 2) return;
    setRunning(true);
    setResults([]);

    addLog?.(`Network comparison started — ${selectedNetworks.length} networks × ${config.totalTrades} trades`, 'info');

    // Run sequentially with setTimeout to keep UI responsive
    setTimeout(() => {
      const allResults = selectedNetworks.map(netId => runQuickSim(config, netId));
      setResults(allResults);
      setRunning(false);
      addLog?.(`Network comparison complete — ${selectedNetworks.length} networks compared`, 'success');
    }, 50);
  };

  // Prepare chart data
  const chartMetrics = ['successRate', 'avgGas', 'avgSlippage'];
  const chartLabels = { successRate: 'Success Rate (%)', avgGas: 'Avg Gas Price', avgSlippage: 'Avg Slippage (%)' };

  return (
    <div className="space-y-5">

      {/* ── Network Selector ─────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Select Networks to Compare</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.values(NETWORKS).map(n => {
            const selected = selectedNetworks.includes(n.id);
            return (
              <button
                key={n.id}
                onClick={() => toggleNetwork(n.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 ${
                  selected
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-theme-primary shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                    : 'border-theme-subtle bg-theme-elevated text-theme-secondary hover:border-theme-default'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: selected ? (NET_COLORS[n.id] || '#6366f1') : 'var(--text-muted)' }}
                />
                {n.name.replace(' Testnet', '')}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-theme-secondary mt-2 transition-colors">
          {selectedNetworks.length} selected · min 2 required
        </p>
      </div>

      {/* ── Configuration ────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Shared Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Total Trades</label>
            <input type="number" className="input-field" min={10} max={500} value={config.totalTrades}
              onChange={e => cfg({ totalTrades: Math.min(500, +e.target.value) })} />
          </div>
          <div>
            <label className="label">Token Reserve</label>
            <input type="number" className="input-field" min={1000} value={config.reserveToken}
              onChange={e => cfg({ reserveToken: +e.target.value })} />
          </div>
          <div>
            <label className="label">Native Reserve</label>
            <input type="number" className="input-field" min={0.1} step={0.5} value={config.reserveEth}
              onChange={e => cfg({ reserveEth: +e.target.value })} />
          </div>
          <div>
            <label className="label">Sell Ratio (%)</label>
            <input type="number" className="input-field" min={0} max={100} value={config.sellRatio}
              onChange={e => cfg({ sellRatio: +e.target.value })} />
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running || selectedNetworks.length < 2}
          className="btn-primary mt-5"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-300 rounded-full pulse-dot" /> Comparing...
            </span>
          ) : `Compare ${selectedNetworks.length} Networks`}
        </button>
      </div>

      {/* ── Results Table ────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-theme-primary mb-4 transition-colors">Comparison Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-theme-secondary uppercase tracking-wider border-b border-theme-subtle">
                  <th className="text-left py-2 pr-4 font-medium">Network</th>
                  <th className="text-right py-2 px-3 font-medium">Success Rate</th>
                  <th className="text-right py-2 px-3 font-medium">Avg Gas</th>
                  <th className="text-right py-2 px-3 font-medium">Avg Slippage</th>
                  <th className="text-right py-2 px-3 font-medium">Sim TPS</th>
                  <th className="text-right py-2 pl-3 font-medium">Trades</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.network} className="border-b border-theme-subtle hover:bg-theme-elevated transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                        <span className="text-theme-primary font-semibold">{r.networkName}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono" style={{ color: r.successRate > 90 ? '#10b981' : r.successRate > 70 ? '#f59e0b' : '#ef4444' }}>
                      {r.successRate}%
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono text-theme-secondary">{r.avgGas}</td>
                    <td className="text-right py-2.5 px-3 font-mono" style={{ color: r.avgSlippage > 5 ? '#ef4444' : r.avgSlippage > 2 ? '#f59e0b' : '#10b981' }}>
                      {r.avgSlippage}%
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono text-theme-secondary">{r.tps}</td>
                    <td className="text-right py-2.5 pl-3 font-mono text-theme-secondary">
                      {r.successes}/{r.totalTrades}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────────── */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {chartMetrics.map(metric => (
            <div key={metric} className="card">
              <h3 className="text-xs font-semibold text-theme-secondary mb-3 uppercase tracking-wider transition-colors">
                {chartLabels[metric]}
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={results} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="networkName"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 9 }}
                    tickFormatter={v => v.replace(' Testnet', '').replace(' Sepolia', '').slice(0, 10)}
                  />
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
                  <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                    {results.map((entry) => (
                      <Cell key={entry.network} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ──────────────────────────────────────── */}
      {results.length === 0 && !running && (
        <div className="glass-panel text-center py-20 text-theme-secondary shadow-inner">
          <div className="text-5xl mb-4 opacity-20 text-theme-primary text-glow">⚖</div>
          <p className="text-sm font-semibold text-theme-primary">Select networks and run a comparison</p>
          <p className="text-[11px] mt-1.5 uppercase tracking-widest opacity-80 max-w-sm mx-auto">
            Same simulation config runs across multiple testnets — compare success rates, gas costs, and slippage side-by-side.
          </p>
        </div>
      )}
    </div>
  );
}
