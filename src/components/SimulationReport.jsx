import React from 'react';

export default function SimulationReport({ data, isPaid, onUnlock, onDownload }) {
  if (!data) return null;

  const VERDICT_STYLES = {
    SAFE: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', icon: '🟢' },
    RISKY: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)', icon: '🟡' },
    FAIL: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)', icon: '🔴' },
  };

  const currentStyle = VERDICT_STYLES[data.verdict] || VERDICT_STYLES.SAFE;
  const scoreColor = data.score >= 90 ? '#10b981' : data.score >= 70 ? '#fbbf24' : '#ef4444';

  return (
    <div className="card mb-5 relative overflow-hidden" style={{ borderColor: currentStyle.border }}>
      {/* Background tint */}
      <div 
        className="absolute inset-0 pointer-events-none transition-colors duration-500" 
        style={{ background: `linear-gradient(135deg, ${currentStyle.bg} 0%, transparent 60%)` }}
      />
      
      <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
        
        {/* Left Side: Verdict & Score (Always Visible) */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-theme-elevated border border-theme-subtle min-w-[160px] w-full md:w-auto">
          <div 
            className="text-sm font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full mb-3 flex items-center gap-2"
            style={{ 
              backgroundColor: currentStyle.bg, 
              color: currentStyle.color,
              border: `1px solid ${currentStyle.border}`
            }}
          >
            <span>{currentStyle.icon}</span> {data.verdict}
          </div>
          <div className="text-5xl font-black transition-colors text-glow" style={{ color: scoreColor, fontFamily: "'Space Grotesk', sans-serif" }}>
            {data.score}
          </div>
          <div className="text-[10px] text-theme-secondary uppercase tracking-widest mt-1">
            Readiness Score
          </div>
        </div>

        {/* Middle & Right Container */}
        <div className="flex-1 w-full space-y-4">
          
          {/* Summary String (Always Visible) */}
          <div>
            <h3 className="text-lg font-bold text-theme-primary mb-1">Pre-Launch Report</h3>
            <p className="text-sm text-theme-secondary leading-relaxed border-l-2 pl-3 py-0.5" style={{ borderColor: currentStyle.color }}>
              {data.summary}
            </p>
          </div>

          {/* Locked Overlay or Full View */}
          {!isPaid ? (
            <div className="mt-4 p-5 rounded-xl border border-indigo-500/20 bg-theme-elevated/50 backdrop-blur-md relative overflow-hidden">
               <div className="absolute inset-0 bg-indigo-500/5 mix-blend-overlay pointer-events-none" />
               <h4 className="text-sm font-bold text-theme-primary mb-2 flex items-center gap-2">
                 🔒 Unlock Full Report
               </h4>
               <p className="text-xs text-theme-secondary leading-relaxed mb-4">
                 ⚠️ <strong>This simulation is too limited to reflect real launch conditions.</strong><br/><br/>
                 Unlock the full report to see:<br/>
                 • Critical failure reasons & highlights<br/>
                 • Detailed slippage risks & liquidity gaps<br/>
                 • Network gas spikes and cost analysis<br/>
                 • Smart contract constraint violations
               </p>
               <button 
                 onClick={onUnlock}
                 className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all"
               >
                 Unlock Full Report
               </button>
               <p className="text-[10px] text-theme-secondary mt-3 italic opacity-80">
                 Note: This test uses only 10 wallets and may not reflect real launch conditions.
               </p>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Warnings */}
                {data.warnings && data.warnings.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="text-amber-500">⚠</span> Warnings
                    </h4>
                    <ul className="space-y-1.5">
                      {data.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-red-400/90 leading-tight">
                          • {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Insights */}
                {data.insights && data.insights.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <span className="text-indigo-400">💡</span> Key Insights
                    </h4>
                    <ul className="space-y-1.5">
                      {data.insights.map((ins, i) => (
                        <li key={i} className="text-xs text-indigo-300/90 leading-tight">
                          • {ins}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Advanced Recommendations & Highlights */}
              <div className="p-3 bg-theme-base border border-theme-subtle rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                 <div>
                    <div className="text-[10px] uppercase tracking-wider text-theme-secondary mb-1">Recommendation</div>
                    <div className="text-emerald-400 font-medium leading-relaxed">{data.recommendation}</div>
                 </div>
                 {data.failureHighlights?.length > 0 && (
                   <div>
                      <div className="text-[10px] uppercase tracking-wider text-theme-secondary mb-1">Critical Failures</div>
                      <ul className="text-red-400 flex flex-col gap-0.5">
                        {data.failureHighlights.map((f, i) => <li key={i}>• {f}</li>)}
                      </ul>
                   </div>
                 )}
              </div>

              {/* Metrics Quick Look */}
              <div className="flex flex-wrap gap-3 w-full">
                <div className="flex-1 bg-theme-base p-3 rounded-lg border border-theme-subtle min-w-[80px]">
                  <div className="text-[10px] text-theme-secondary uppercase tracking-wider mb-0.5">Success Rate</div>
                  <div className="font-mono text-sm font-bold text-theme-primary">{data.breakdown.successRate}%</div>
                </div>
                <div className="flex-1 bg-theme-base p-3 rounded-lg border border-theme-subtle min-w-[80px]">
                  <div className="text-[10px] text-theme-secondary uppercase tracking-wider mb-0.5">Avg Slippage</div>
                  <div className="font-mono text-sm font-bold text-theme-primary">{data.breakdown.avgSlippage}%</div>
                </div>
                <div className="flex-1 bg-theme-base p-3 rounded-lg border border-theme-subtle min-w-[80px]">
                  <div className="text-[10px] text-theme-secondary uppercase tracking-wider mb-0.5">Total Cost</div>
                  <div className="font-mono text-sm font-bold text-theme-primary">{data.breakdown.totalGasCost} ETH</div>
                </div>
              </div>
              
              {/* Extra Download Hook inside paid state */}
              {onDownload && (
                <div className="pt-2">
                  <button 
                    onClick={onDownload}
                    className="bg-theme-elevated hover:bg-theme-secondary text-theme-primary border border-theme-subtle text-xs px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    ⬇ Download Report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
