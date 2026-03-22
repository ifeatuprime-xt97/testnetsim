import React from 'react';
import { NETWORKS } from '../config/networks.js';
import { deleteSession } from '../utils/storageUtils.js';

export default function HistoryPanel({ isOpen, onClose, sessions, onRefreshHistory, onLoadSession, onReplaySession }) {
    if (!isOpen) return null;

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this session?')) {
            deleteSession(id);
            onRefreshHistory();
        }
    };

    const handleClearAll = () => {
        if (confirm('Are you sure you want to clear ALL session history?')) {
            deleteSession();
            onRefreshHistory();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-md bg-theme-base border-l border-theme-subtle shadow-2xl flex flex-col h-full animate-slide-in-right">

                {/* Header */}
                <div className="flex items-center justify-between p-5 glass-nav z-10">
                    <div>
                        <h2 className="text-lg font-bold text-theme-primary">Session History</h2>
                        <p className="text-xs text-theme-secondary mt-1">
                            Your recent simulation runs ({sessions.length}/15)
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-theme-secondary hover:text-white transition-colors rounded-full hover:bg-white/5"
                        title="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Content List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {sessions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-5xl mb-4 opacity-20 text-theme-primary text-glow">🕒</div>
                            <p className="text-sm font-semibold text-theme-primary">No history yet</p>
                            <p className="text-xs mt-2 text-theme-secondary max-w-[200px] mx-auto">
                                Run a simulation or stress test to save it here automatically.
                            </p>
                        </div>
                    ) : (
                        sessions.map(session => {
                            const net = NETWORKS[session.network] || {};
                            const date = new Date(session.timestamp);

                            return (
                                <div
                                    key={session.id}
                                    onClick={() => onLoadSession(session)}
                                    className="glass-panel p-4 cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 group transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            <img src={`/${net.iconId || 'ethereum-eth'}-logo.svg`} alt={net.name} className="w-5 h-5 object-contain" />
                                            <span className="text-xs font-bold text-theme-primary">{net.name || session.network}</span>
                                        </div>
                                        <span className="text-[10px] text-theme-secondary font-mono">
                                            {date.toLocaleDateString()} {date.toLocaleTimeString()}
                                        </span>
                                    </div>

                                    <div className="text-xs text-theme-secondary font-mono mb-4">
                                        Token: <span className="text-theme-primary">{session.tokenAddress || 'Not set'}</span>
                                    </div>

                                    <div className="flex items-end justify-between">
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase tracking-widest text-theme-muted mb-1">Total TXs</div>
                                                <div className="text-sm font-bold text-theme-primary">{session.stats?.totalTxs || 0}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase tracking-widest text-emerald-400/70 mb-1">Success</div>
                                                <div className="text-sm font-bold text-emerald-400">{session.stats?.successCount || 0}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase tracking-widest text-red-400/70 mb-1">Failed</div>
                                                <div className="text-sm font-bold text-red-400">{session.stats?.failCount || 0}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Replay + Delete Buttons (visible on hover) */}
                                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {onReplaySession && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onReplaySession(session); }}
                                          className="p-1.5 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                                          title="Replay Session"
                                        >
                                          🔄
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => handleDelete(e, session.id)}
                                        className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                        title="Delete Session"
                                      >
                                        🗑
                                      </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {sessions.length > 0 && (
                    <div className="p-5 border-t border-theme-subtle glass-nav">
                        <button
                            onClick={handleClearAll}
                            className="w-full btn-danger py-2"
                        >
                            Clear All History
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
