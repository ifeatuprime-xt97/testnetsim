/**
 * AMM Simulator — Uniswap V2 constant-product formula.
 * x * y = k  (no real blockchain calls, pure math simulation)
 *
 * reserve0 = token reserve
 * reserve1 = ETH/BNB/MATIC reserve
 */

const FEE_NUMERATOR = 997;
const FEE_DENOMINATOR = 1000;

/**
 * Calculate tokens out for a buy (ETH in → Token out)
 * @param {number} ethIn - Amount of ETH to spend
 * @param {number} reserveToken - Current token reserve
 * @param {number} reserveEth - Current ETH reserve
 * @returns {{ amountOut: number, priceImpact: number, newReserveToken: number, newReserveEth: number }}
 */
export function simulateBuy(ethIn, reserveToken, reserveEth) {
  const ethInWithFee = ethIn * FEE_NUMERATOR;
  const amountOut = (ethInWithFee * reserveToken) / (reserveEth * FEE_DENOMINATOR + ethInWithFee);
  const priceImpact = (ethIn / (reserveEth + ethIn)) * 100; // as percentage

  return {
    amountOut,
    priceImpact,
    newReserveToken: reserveToken - amountOut,
    newReserveEth: reserveEth + ethIn,
  };
}

/**
 * Calculate ETH out for a sell (Token in → ETH out)
 * @param {number} tokenIn - Amount of tokens to sell
 * @param {number} reserveToken - Current token reserve
 * @param {number} reserveEth - Current ETH reserve
 * @returns {{ amountOut: number, priceImpact: number, newReserveToken: number, newReserveEth: number }}
 */
export function simulateSell(tokenIn, reserveToken, reserveEth) {
  const tokenInWithFee = tokenIn * FEE_NUMERATOR;
  const amountOut = (tokenInWithFee * reserveEth) / (reserveToken * FEE_DENOMINATOR + tokenInWithFee);
  const priceImpact = (tokenIn / (reserveToken + tokenIn)) * 100;

  return {
    amountOut,
    priceImpact,
    newReserveToken: reserveToken + tokenIn,
    newReserveEth: reserveEth - amountOut,
  };
}

/**
 * Spot price: how many tokens per 1 ETH
 */
export function getSpotPrice(reserveToken, reserveEth) {
  return reserveToken / reserveEth;
}

/**
 * Check if a transaction violates contract constraints
 * @returns {{ passes: boolean, reason: string | null }}
 */
export function checkConstraints({ amountEth, amountToken, maxTxEth, maxWalletToken, walletTokenBalance }) {
  if (maxTxEth > 0 && amountEth > maxTxEth) {
    return { passes: false, reason: `maxTx exceeded (${amountEth.toFixed(4)} > ${maxTxEth} ETH)` };
  }
  if (maxWalletToken > 0 && walletTokenBalance + amountToken > maxWalletToken) {
    return {
      passes: false,
      reason: `maxWallet exceeded (${(walletTokenBalance + amountToken).toFixed(2)} > ${maxWalletToken} tokens)`,
    };
  }
  return { passes: true, reason: null };
}

/**
 * Estimate EVM gas cost with simulated congestion.
 * @param {number} baseGas - Base gas units
 * @param {number} basePriceGwei - Base gas price in Gwei
 * @param {'low'|'normal'|'high'|'spike'} congestion
 * @returns {{ gasUsed, gasPriceGwei, costEth }}
 */
export function estimateGas(baseGas, basePriceGwei = 20, congestion = 'normal') {
  const multipliers = { low: 0.8, normal: 1.0, high: 1.5, spike: 3.0 };
  const jitter = 0.9 + Math.random() * 0.2;
  const gasPrice = basePriceGwei * (multipliers[congestion] ?? 1) * jitter;
  const gasUsed = Math.floor(baseGas * (0.95 + Math.random() * 0.1));
  const costEth = (gasUsed * gasPrice) / 1e9;
  return { gasUsed, gasPriceGwei: +gasPrice.toFixed(2), costEth: +costEth.toFixed(6) };
}

/**
 * Estimate Solana transaction fee with simulated priority fee congestion.
 * Solana fees = base fee (5000 lamports/sig) + priority fee (microlamports × compute units).
 * Returns values in the same shape as estimateGas so the engine stays generic.
 *  gasUsed     → compute units consumed
 *  gasPriceGwei → priority fee in microlamports (displayed as μlamports)
 *  costEth     → total fee in SOL
 * @param {number} baseComputeUnits - Compute unit budget for this tx type
 * @param {number} basePriorityUlamports - Base priority fee in microlamports per CU
 * @param {'low'|'normal'|'high'|'spike'} congestion
 */
export function estimateSolanaFee(baseComputeUnits, basePriorityUlamports = 1000, congestion = 'normal') {
  const multipliers = { low: 0.5, normal: 1.0, high: 3.0, spike: 20.0 };
  const jitter = 0.9 + Math.random() * 0.2;
  const priorityFee = Math.round(basePriorityUlamports * (multipliers[congestion] ?? 1) * jitter);
  const computeUnits = Math.floor(baseComputeUnits * (0.9 + Math.random() * 0.15));

  // Total fee in SOL: base fee (0.000005 SOL) + priority fee in SOL
  // priorityFee (μlamports/CU) × computeUnits / 1e6 (→ lamports) / 1e9 (→ SOL)
  const baseFeeSOL = 0.000005;
  const priorityFeeSOL = (priorityFee * computeUnits) / 1e6 / 1e9;
  const costSol = +(baseFeeSOL + priorityFeeSOL).toFixed(9);

  return { gasUsed: computeUnits, gasPriceGwei: priorityFee, costEth: costSol };
}

/**
 * Unified fee estimator — picks the right model based on network.
 */
export function estimateFee(network, congestion = 'normal') {
  if (network?.isSolana) {
    return estimateSolanaFee(network.gasEstimate, 1000, congestion);
  }
  return estimateGas(network?.gasEstimate ?? 150000, 20, congestion);
}
