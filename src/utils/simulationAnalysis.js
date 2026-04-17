export function analyzeSimulation(results, stats) {
  if (!results || !stats || results.length === 0) return null;

  const warnings = [];
  const insights = [];
  
  let score = stats.successRate;
  
  const failureTypes = Object.keys(stats.failureReasons || {});
  const hasConstraintViolations = failureTypes.some(r => r.includes('maxTx') || r.includes('maxWallet') || r.toLowerCase().includes('violat'));
  const hasMultipleFailures = failureTypes.length > 1;
  const isHighSlippage = stats.avgSlippage > 10;
  
  // Detect if average gas used is unusually high for standard token operations (> 300k limits)
  const isHighGas = stats.avgGas > 300000; 

  // Detect gas price spikes
  const successfulOps = results.filter(r => r.success);
  const avgGasPriceGwei = successfulOps.length > 0 
    ? successfulOps.reduce((a, r) => a + (r.gasPriceGwei || 0), 0) / successfulOps.length 
    : 0;
  const hasGasSpikes = successfulOps.some(r => r.gasPriceGwei > avgGasPriceGwei * 2.5);

  // Score adjustments
  if (isHighSlippage) score -= 10;
  if (hasConstraintViolations) score -= 15;
  if (isHighGas || hasGasSpikes) score -= 5;
  
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Output logic
  if (stats.successRate < 70) warnings.push("High transaction failure rate detected.");
  if (isHighSlippage) warnings.push("Slippage exceeded safe threshold (>10%).");
  if (hasConstraintViolations) warnings.push("Max transaction or wallet limit hit multiple times.");
  if (isHighGas || hasGasSpikes) warnings.push("Gas costs spike under load.");

  if (stats.successRate >= 90) {
    if (hasGasSpikes) insights.push("System handles gradual load well but gas prices spike under burst traffic.");
    else insights.push("System handles simulated transaction load reliably without execution faults.");
  } else if (stats.successRate < 70) {
    insights.push("System struggles under traffic and needs adjusted parameters or pool depth.");
  }
  
  if (stats.maxSlippage > 10) {
    insights.push("Liquidity is likely too low for large buy pressure, causing volatile price impacts.");
  }
  
  if (failureTypes.some(r => r.includes('maxWallet') || r.includes('balance'))) {
    insights.push("Sell transactions fail frequently when wallet distribution gets uneven.");
  }
  
  if (insights.length === 0) {
    insights.push("Transaction throughput behaves smoothly under the current simulated profile.");
  }

  // Verdict logic
  let verdict = "SAFE";
  if (stats.successRate < 70 || hasConstraintViolations) {
    verdict = "FAIL";
  } else if (stats.successRate <= 90 || isHighSlippage || hasMultipleFailures) {
    verdict = "RISKY";
  } else {
    // Further clamp safe requirement
    if (stats.avgSlippage > 5 || stats.failCount > Math.max(2, results.length * 0.05)) {
      verdict = "RISKY";
    }
  }

  // Summary String
  let summary = "";
  if (verdict === "FAIL") {
    summary = "This simulation shows a high risk of failure under realistic conditions. Multiple transactions failed or constraints were heavily violated.";
  } else if (verdict === "RISKY") {
    summary = "The simulation passed with some concerns. You may experience volatile slippage, occasional failed transactions, or minor constraint hits under load.";
  } else {
    summary = "The simulation succeeded cleanly. The token handles load effectively with low slippage, steady gas, and minimal failures.";
  }

  // New fields
  let riskLevel = "Low Risk";
  if (verdict === "FAIL") riskLevel = "High Risk";
  else if (verdict === "RISKY") riskLevel = "Moderate Risk";

  const failureHighlights = Object.entries(stats.failureReasons || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => `${reason}`);

  let recommendation = "";
  if (hasConstraintViolations) {
    recommendation = "Reduce maxTx or maxWallet limits to prevent widespread rejection.";
  } else if (isHighSlippage && stats.successRate >= 80) {
    recommendation = "Contract logic holds up, but liquidity is too shallow. Increase pool depth.";
  } else if (hasGasSpikes) {
    recommendation = "Ensure network gas settings can tolerate burst conditions or throttle volume.";
  } else if (stats.successRate < 70) {
    recommendation = "Review contract logic; widespread failures likely caused by hidden reversion conditions.";
  } else {
    recommendation = "No immediate blockers. Safe to proceed with cautious mainnet deployment.";
  }

  return {
    verdict,
    riskLevel,
    score,
    summary,
    recommendation,
    warnings,
    insights,
    failureHighlights,
    breakdown: {
      successRate: stats.successRate,
      avgGas: stats.avgGas,
      avgSlippage: stats.avgSlippage,
      totalGasCost: stats.totalGasCostEth
    }
  };
}
