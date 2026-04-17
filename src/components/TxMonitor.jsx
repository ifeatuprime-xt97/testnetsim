import React, { useState, useRef, useCallback } from 'react';
import { NETWORKS } from '../config/networks.js';
import { createMonitor } from '../utils/wsMonitor.js';

export default function TxMonitor({ network, addLog }) {
  const net = NETWORKS[network];
  const [events, setEvents] = useState([]);
  const [watching, setWatching] = useState(false);
  const [watchAddress, setWatchAddress] = useState('');
  const monitorRef = useRef(null);

  const handleStart = useCallback(() => {
    if (!watchAddress || net?.isSolana) return;

    const monitor = createMonitor(net);
    if (!monitor) return;
    monitorRef.current = monitor;

    monitor.subscribe([watchAddress], (event) => {
      setEvents(prev => [event, ...prev].slice(0, 100));
    });

    setWatching(true);
    addLog?.(`Started monitoring ${watchAddress.slice(0, 10)}…`, 'info');
  }, [watchAddress, net, addLog]);

  const handleStop = useCallback(() => {
    monitorRef.current?.unsubscribe();
    monitorRef.current = null;
    setWatching(false);
    addLog?.('Stopped on-chain monitoring', 'info');
  }, [addLog]);

  const statusColor = watching ? '#10b981' : '#64748b';

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="input-field text-xs font-mono flex-1 py-1.5"
          placeholder="Enter address to monitor..."
          value={watchAddress}
          onChange={e => setWatchAddress(e.target.value.trim())}
          disabled={watching}
          spellCheck={false}
        />
        {!watching ? (
          <button
            onClick={handleStart}
            disabled={!watchAddress || net?.isSolana}
            className="btn-success text-xs py-1.5 px-3"
          >
            Watch
          </button>
        ) : (
          <button onClick={handleStop} className="btn-danger text-xs py-1.5 px-3">
            Stop
          </button>
        )}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusColor, boxShadow: watching ? `0 0 8px ${statusColor}` : 'none' }}
        />
      </div>

      {net?.isSolana && (
        <div className="text-xs text-amber-500 px-1">
          On-chain monitoring is currently available for EVM networks only.
        </div>
      )}

      {/* Events list */}
      <div className="overflow-y-auto space-y-0.5" style={{ maxHeight: '10rem' }}>
        {events.length === 0 ? (
          <div className="text-xs text-theme-secondary opacity-70 py-4 text-center font-mono transition-colors">
            {watching ? 'Listening for transactions...' : 'No events — start monitoring to capture live TXs.'}
          </div>
        ) : (
          events.map((ev, i) => (
            <div key={`${ev.hash}-${i}`} className="flex items-start gap-2 text-xs font-mono py-0.5 px-1 rounded transition-colors">
              <span className={`flex-shrink-0 font-bold ${ev.status === 'confirmed' ? 'text-emerald-400' : ev.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>
                {ev.status === 'confirmed' ? '✓' : ev.status === 'failed' ? '✗' : '⏳'}
              </span>
              <a
                href={`${net?.explorer}/tx/${ev.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline truncate flex-1"
                title={ev.hash}
              >
                {ev.hash?.slice(0, 14)}…{ev.hash?.slice(-8)}
              </a>
              {ev.value && ev.value !== '0.0' && (
                <span className="text-theme-secondary flex-shrink-0">{(+ev.value).toFixed(4)} {net?.currency}</span>
              )}
              <span className="text-theme-secondary flex-shrink-0 tabular-nums w-14 text-right">
                #{ev.blockNumber}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

