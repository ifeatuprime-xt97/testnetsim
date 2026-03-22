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
