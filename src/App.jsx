import { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header.jsx';
import WalletGenerator from './components/WalletGenerator.jsx';
import TransactionSimulator from './components/TransactionSimulator.jsx';
import LiquidityStressTest from './components/LiquidityStressTest.jsx';
import Dashboard from './components/Dashboard.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import GasEstimation from './components/GasEstimation.jsx';
import NetworkComparison from './components/NetworkComparison.jsx';
import TxMonitor from './components/TxMonitor.jsx';
import { DEFAULT_NETWORK } from './config/networks.js';
import { saveSession, getSessions } from './utils/storageUtils.js';

const TABS = [
  { id: 'wallets', label: 'Wallet Generator', icon: '⬡' },
  { id: 'simulator', label: 'TX Simulator', icon: '◈' },
  { id: 'stress', label: 'Stress Test', icon: '⚡' },
  { id: 'dashboard', label: 'Dashboard', icon: '◎' },
  { id: 'gas', label: 'Gas Monitor', icon: '⛽' },
  { id: 'compare', label: 'Compare', icon: '⚖' },
];

const LOG_LEVEL_META = {
  success: { label: '[ OK ]', textClass: 'text-emerald-400', dimClass: 'text-emerald-300/70' },
  warn: { label: '[WARN]', textClass: 'text-amber-400', dimClass: 'text-amber-300/70' },
  error: { label: '[ERR ]', textClass: 'text-red-400', dimClass: 'text-red-300/70' },
  info: { label: '[INFO]', textClass: 'text-indigo-400', dimClass: 'text-slate-400' },
};

function isValidAddress(addr) {
  if (!addr) return null;
  if (/^0x[0-9a-fA-F]{40}$/.test(addr)) return 'EVM';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return 'Solana';
  return false;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('wallets');
  const [network, setNetwork] = useState(DEFAULT_NETWORK);
  const [simResults, setSimResults] = useState([]);
  const [simStats, setSimStats] = useState(null);
  const [simConfig, setSimConfig] = useState(null);
  const [tokenAddress, setTokenAddress] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // History state
  const [sessionHistory, setSessionHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Global activity log
  const [logs, setLogs] = useState([]);
  const [logOpen, setLogOpen] = useState(false);
  const [logView, setLogView] = useState('activity'); // 'activity' | 'monitor'
  const logListRef = useRef(null);

  // Replay trigger
  const [replayConfig, setReplayConfig] = useState(null);

  // Handle Theme Toggle
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Load history on mount
  useEffect(() => {
    setSessionHistory(getSessions());
  }, []);

  const handleResultsChange = useCallback((results, stats, config) => {
    setSimResults(results);
    setSimStats(stats);
    setSimConfig(config);

    // Persist session if results exist
    if (results && results.length > 0) {
      saveSession(results, stats, config, network, tokenAddress);
      setSessionHistory(getSessions()); // Refresh local state
    }
  }, [network, tokenAddress]);

  const addLog = useCallback((message, level = 'info') => {
    setLogs(prev => {
      const entry = {
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        message,
        level,
      };
      return [...prev.slice(-499), entry];
    });
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  // Auto-open log panel on first log entry
  useEffect(() => {
    if (logs.length === 1) setLogOpen(true);
  }, [logs.length]);

  // Log when user sets a token address
  const prevTokenRef = useRef('');
  useEffect(() => {
    if (tokenAddress && tokenAddress !== prevTokenRef.current) {
      const kind = isValidAddress(tokenAddress);
      if (kind) {
        addLog(`Token address set: ${tokenAddress} (${kind})`, 'info');
      }
    }
    prevTokenRef.current = tokenAddress;
  }, [tokenAddress, addLog]);

  const addrValidity = isValidAddress(tokenAddress);
  const addrBorderColor =
    tokenAddress === '' ? '#2d2d3d' :
      addrValidity === false ? '#7f1d1d' :
        '#065f46';

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200">
      <Header
        network={network}
        onNetworkChange={setNetwork}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      {/* ── Tab Navigation ──────────────────────────────────────── */}
      <div
        className="border-b sticky z-40 bg-theme-elevated/80 backdrop-blur-md border-theme-subtle shadow-sm transition-all duration-300"
        style={{ top: '61px' }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn whitespace-nowrap flex items-center gap-2 ${activeTab === tab.id ? 'tab-btn-active' : 'tab-btn-inactive'}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.id === 'dashboard' && simStats && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-900 text-indigo-300">
                    {simStats.totalTxs}
                  </span>
                )}
              </button>
            ))}

            {/* History Toggle Button */}
            <div className="ml-auto pl-4 border-l border-theme-subtle flex items-center">
              <button
                onClick={() => setHistoryOpen(true)}
                className="tab-btn whitespace-nowrap flex items-center gap-2 tab-btn-inactive! hover:text-indigo-400"
              >
                <span>🕒</span>
                <span>History</span>
                {sessionHistory.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full font-mono bg-theme-base border border-theme-subtle">
                    {sessionHistory.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Session Config Bar (token address) ──────────────────── */}
      <div
        className="border-b glass-nav transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
          <span className="text-xs text-theme-secondary uppercase tracking-wider font-mono flex-shrink-0 transition-colors">
            Token
          </span>
          <div className="relative flex-1 min-w-[18rem] max-w-lg">
            <input
              type="text"
              className="input-field py-1.5 text-xs font-mono pr-20"
              style={{ borderColor: addrBorderColor }}
              placeholder="Paste contract address to tag this session (optional)"
              value={tokenAddress}
              onChange={e => setTokenAddress(e.target.value.trim())}
              spellCheck={false}
            />
            {tokenAddress && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {addrValidity ? (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ backgroundColor: '#064e3b30', color: '#10b981' }}
                  >
                    {addrValidity}
                  </span>
                ) : (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ backgroundColor: '#450a0a30', color: '#f87171' }}
                  >
                    invalid
                  </span>
                )}
                <button
                  onClick={() => setTokenAddress('')}
                  className="text-theme-secondary hover:text-theme-primary transition-colors text-xs"
                  title="Clear"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          {tokenAddress && addrValidity && (
            <span className="text-xs text-theme-secondary font-mono truncate hidden md:block transition-colors">
              · {tokenAddress.slice(0, 8)}…{tokenAddress.slice(-6)}
            </span>
          )}
          {!tokenAddress && (
            <span className="text-xs text-theme-secondary opacity-80 hidden md:block transition-colors">
              Required for live testnet execution
            </span>
          )}

          {/* Master Wallet Key Input */}
          <div className="flex items-center gap-3 ml-auto border-l border-theme-subtle pl-4 transition-colors duration-200">
            <span className="text-xs text-theme-secondary uppercase tracking-wider font-mono flex-shrink-0">
              Master Key
            </span>
            <input
              type="password"
              className="input-field py-1.5 text-xs font-mono w-48"
              placeholder="Private key (for gas)"
              value={masterKey}
              onChange={e => setMasterKey(e.target.value.trim())}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Why Private Key Explanation */}
        <div className="max-w-7xl mx-auto px-4 pb-2 text-xs text-theme-secondary max-w-2xl text-left border-l-2 border-theme-subtle ml-4 mb-2 mt-1 transition-colors duration-200">
          <strong className="text-theme-primary">Why a Private Key?</strong> To simulate load, the system generates random temporary wallets that act as independent buyers/sellers (to avoid 500 MetaMask popups). A master wallet is needed to automatically fund these bots with gas so they can submit transactions simultaneously. <strong>Please only use a dedicated testnet wallet with ZERO real funds on mainnet.</strong>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main
        className="flex-1 max-w-7xl mx-auto w-full px-4 py-6"
        style={{ paddingBottom: logOpen ? '18rem' : '4rem' }}
      >
        {activeTab === 'wallets' && (
          <WalletGenerator network={network} addLog={addLog} masterKey={masterKey} />
        )}
        {activeTab === 'simulator' && (
          <TransactionSimulator
            network={network}
            onResultsChange={handleResultsChange}
            addLog={addLog}
            tokenAddress={tokenAddress}
            masterKey={masterKey}
            replayConfig={replayConfig}
            onReplayConsumed={() => setReplayConfig(null)}
          />
        )}
        {activeTab === 'stress' && (
          <LiquidityStressTest
            network={network}
            onResultsChange={handleResultsChange}
            addLog={addLog}
            tokenAddress={tokenAddress}
            masterKey={masterKey}
          />
        )}
        {activeTab === 'dashboard' && (
          <Dashboard
            results={simResults}
            stats={simStats}
            config={simConfig}
            tokenAddress={tokenAddress}
            network={network}
          />
        )}
        {activeTab === 'gas' && (
          <GasEstimation network={network} addLog={addLog} />
        )}
        {activeTab === 'compare' && (
          <NetworkComparison addLog={addLog} />
        )}
      </main>

      {/* ── Slide-over History Panel ─────────────────────────────── */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        sessions={sessionHistory}
        onRefreshHistory={() => setSessionHistory(getSessions())}
        onLoadSession={(session) => {
          setSimResults(session.results);
          setSimStats(session.stats);
          setSimConfig(session.config);
          setNetwork(session.network);
          setTokenAddress(session.tokenAddress || '');
          setActiveTab('dashboard');
          setHistoryOpen(false);
          addLog(`Loaded past session from ${new Date(session.timestamp).toLocaleTimeString()}`, 'success');
        }}
        onReplaySession={(session) => {
          setReplayConfig(session.config);
          setNetwork(session.network);
          setTokenAddress(session.tokenAddress || '');
          setActiveTab('simulator');
          setHistoryOpen(false);
          addLog(`Replaying session from ${new Date(session.timestamp).toLocaleTimeString()}`, 'info');
        }}
      />

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-theme-subtle py-4 transition-colors duration-200 bg-theme-base">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-theme-secondary transition-colors">
          <div>
            <strong className="text-theme-secondary opacity-80 transition-colors">TestnetSim</strong> — Testnet-only liquidity &amp; load simulation for token creators
          </div>
          <div className="flex items-center gap-4">
            <span className="badge-testnet">⚠ TESTNET ONLY</span>
            <span>No mainnet support · No real funds at risk</span>
          </div>
        </div>
      </footer>

      {/* ── Global Activity Log Panel (fixed bottom) ─────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 select-none bg-theme-elevated/95 backdrop-blur-xl border-t border-theme-subtle shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-300"
      >
        {/* Header bar */}
        <div
          className="max-w-7xl mx-auto px-4 flex items-center justify-between cursor-pointer"
          style={{ height: '40px' }}
          onClick={() => setLogOpen(v => !v)}
        >
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="text-xs font-mono font-semibold text-theme-secondary uppercase tracking-widest flex-shrink-0 transition-colors">
              Activity Log
            </span>
            {/* Toggle between Activity and Monitor */}
            <div className="flex gap-1 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); setLogView('activity'); }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-all ${
                  logView === 'activity' ? 'bg-indigo-500/20 text-indigo-400' : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                Log
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLogView('monitor'); }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-all ${
                  logView === 'monitor' ? 'bg-indigo-500/20 text-indigo-400' : 'text-theme-secondary hover:text-theme-primary'
                }`}
              >
                Monitor
              </button>
            </div>
            {logs.length > 0 && (
              <span
                className="px-2 py-0.5 text-[10px] rounded-full font-mono flex-shrink-0 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]"
              >
                {logs.length}
              </span>
            )}
            {!logOpen && logs.length > 0 && (
              <span className="text-xs text-theme-secondary truncate ml-1 font-mono transition-colors">
                · {logs[logs.length - 1].message}
              </span>
            )}
            {!logOpen && logs.length === 0 && (
              <span className="text-xs text-theme-secondary opacity-70 ml-1 font-mono transition-colors">· no activity yet</span>
            )}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 ml-4">
            {logs.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); clearLogs(); }}
                className="text-xs text-theme-secondary hover:text-red-500 transition-colors font-mono"
              >
                clear
              </button>
            )}
            <span className="text-theme-secondary text-xs font-mono transition-colors">{logOpen ? '▼' : '▲'}</span>
          </div>
        </div>

        {/* Expandable log body */}
        {logOpen && (
          <div
            className="max-w-7xl mx-auto px-4 pb-3 border-t border-theme-subtle transition-colors duration-200"
          >
            {logView === 'activity' ? (
              <div
                ref={logListRef}
                className="overflow-y-auto py-2 space-y-0.5"
                style={{ height: '13rem' }}
              >
                {logs.length === 0 ? (
                  <div className="text-xs text-theme-secondary opacity-70 py-8 text-center font-mono transition-colors">
                    No activity yet — use the tools above to generate log entries.
                  </div>
                ) : (
                  [...logs].reverse().map(entry => {
                    const meta = LOG_LEVEL_META[entry.level] ?? LOG_LEVEL_META.info;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2 text-xs font-mono py-0.5 px-1 rounded transition-colors"
                      >
                        <span className="text-theme-secondary flex-shrink-0 w-16 tabular-nums transition-colors">{entry.time}</span>
                        <span className={`flex-shrink-0 font-bold ${meta.textClass}`} style={{ minWidth: '3.5rem' }}>
                          {meta.label}
                        </span>
                        <span className={meta.dimClass}>{entry.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="py-2" style={{ height: '13rem' }}>
                <TxMonitor network={network} addLog={addLog} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
