/**
 * Download a string as a file in the browser.
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export simulation results as JSON.
 */
export function exportJSON(results, stats, config) {
  const data = { exportedAt: new Date().toISOString(), config, stats, transactions: results };
  downloadFile(JSON.stringify(data, null, 2), `testnet-sim-${Date.now()}.json`, 'application/json');
}

/**
 * Export simulation results as CSV.
 */
export function exportCSV(results) {
  const headers = [
    'id', 'type', 'wallet', 'amountEth', 'amountToken',
    'priceImpact', 'gasUsed', 'gasPriceGwei', 'gasCostEth',
    'success', 'failReason', 'congestion', 'poolReserveToken', 'poolReserveEth',
  ];
  const rows = results.map(r =>
    headers.map(h => {
      const val = r[h];
      if (val === undefined || val === null) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val;
    }).join(',')
  );
  downloadFile([headers.join(','), ...rows].join('\n'), `testnet-sim-${Date.now()}.csv`, 'text/csv');
}

/**
 * Export wallets as CSV.
 */
export function exportWalletsCSV(wallets) {
  const headers = ['id', 'address', 'privateKey', 'mnemonic'];
  const rows = wallets.map(w =>
    `${w.id},"${w.address}","${w.privateKey}","${w.mnemonic ?? ''}"`
  );
  downloadFile([headers.join(','), ...rows].join('\n'), `testnet-wallets-${Date.now()}.csv`, 'text/csv');
}

/**
 * Export wallets as JSON.
 */
export function exportWalletsJSON(wallets) {
  downloadFile(
    JSON.stringify({ exportedAt: new Date().toISOString(), warning: 'TESTNET ONLY — Never use these keys on mainnet', wallets }, null, 2),
    `testnet-wallets-${Date.now()}.json`,
    'application/json'
  );
}

/**
 * Export simulation report as PDF (via browser print dialog).
 */
export function exportPDFReport(results, stats, config, networkName) {
  if (!results?.length || !stats) return;

  const failRows = stats.failureReasons
    ? Object.entries(stats.failureReasons)
        .map(([reason, count]) => `<tr><td>${reason}</td><td>${count}</td></tr>`)
        .join('')
    : '';

  const html = `<!DOCTYPE html>
<html><head><title>TestnetSim Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; color: #1e293b; font-size: 13px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 24px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: #fef3c7; color: #92400e; margin-left: 8px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; }
  .stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; color: #475569; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
  .success { color: #059669; } .fail { color: #dc2626; } .warn { color: #d97706; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>TestnetSim — Simulation Report <span class="badge">⚠ Testnet Only</span></h1>
<div class="meta">Generated ${new Date().toLocaleString()} · Network: ${networkName || 'Unknown'} · ${results.length} transactions</div>

<div class="section">
  <div class="grid">
    <div class="stat"><div class="stat-label">Total TXs</div><div class="stat-value">${stats.totalTxs}</div></div>
    <div class="stat"><div class="stat-label">Success Rate</div><div class="stat-value ${stats.successRate > 80 ? 'success' : stats.successRate > 50 ? 'warn' : 'fail'}">${stats.successRate}%</div></div>
    <div class="stat"><div class="stat-label">Avg Gas</div><div class="stat-value">${stats.avgGas?.toLocaleString()}</div></div>
    <div class="stat"><div class="stat-label">Slippage</div><div class="stat-value">${stats.minSlippage}–${stats.maxSlippage}%</div></div>
  </div>
  <div class="grid">
    <div class="stat"><div class="stat-label">Buys</div><div class="stat-value">${stats.buyCount}</div></div>
    <div class="stat"><div class="stat-label">Sells</div><div class="stat-value">${stats.sellCount}</div></div>
    <div class="stat"><div class="stat-label">Total Gas Cost</div><div class="stat-value">${stats.totalGasCostEth} ETH</div></div>
    <div class="stat"><div class="stat-label">Avg Slippage</div><div class="stat-value">${stats.avgSlippage}%</div></div>
  </div>
</div>

${failRows ? `<div class="section"><div class="section-title">Failure Breakdown</div><table><tr><th>Reason</th><th>Count</th></tr>${failRows}</table></div>` : ''}

<div class="section">
  <div class="section-title">Transaction Log (first 100)</div>
  <table>
    <tr><th>#</th><th>Type</th><th>Amount</th><th>Impact</th><th>Gas</th><th>Status</th></tr>
    ${results.slice(0, 100).map(r => `<tr>
      <td>${r.id}</td>
      <td>${r.type.toUpperCase()}</td>
      <td>${r.amountEth}</td>
      <td>${r.priceImpact}%</td>
      <td>${r.gasPriceGwei}</td>
      <td class="${r.success ? 'success' : 'fail'}">${r.success ? '✓ OK' : '✗ FAIL'}</td>
    </tr>`).join('')}
  </table>
</div>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }
}

