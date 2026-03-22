import { simulateBuy, simulateSell, checkConstraints, estimateFee } from './ammSimulator.js';
import { executeBuy, executeSell, fundWallet, getProvider } from './onChainEngine.js';

/**
 * Generate a timing schedule for N transactions based on the chosen pattern.
 * Returns an array of delays (ms) between transactions.
 */
export function buildTimingSchedule(count, pattern, windowMs = 30000) {
  const delays = [];

  switch (pattern) {
    case 'slowDrip': {
      const spacing = windowMs / count;
      for (let i = 0; i < count; i++) delays.push(spacing + (Math.random() - 0.5) * spacing * 0.2);
      break;
    }
    case 'burst': {
      // 3-4 bursts of activity, each burst has rapid txs then a pause
      const bursts = Math.max(2, Math.floor(count / 15));
      let remaining = count;
      for (let b = 0; b < bursts && remaining > 0; b++) {
        const burstSize = Math.min(remaining, Math.floor(count / bursts) + Math.floor(Math.random() * 5));
        for (let i = 0; i < burstSize && remaining > 0; i++) {
          delays.push(50 + Math.random() * 200); // rapid: 50-250ms
          remaining--;
        }
        if (remaining > 0) delays.push(2000 + Math.random() * 3000); // pause between bursts
      }
      while (remaining-- > 0) delays.push(100);
      break;
    }
    case 'spike': {
      // Normal steady pace → sudden spike in the middle → return to normal
      const spikeStart = Math.floor(count * 0.4);
      const spikeEnd = Math.floor(count * 0.6);
      for (let i = 0; i < count; i++) {
        if (i >= spikeStart && i < spikeEnd) {
          delays.push(20 + Math.random() * 80); // spike: very fast
        } else {
          delays.push(400 + Math.random() * 600); // normal: 400-1000ms
        }
      }
      break;
    }
    case 'random':
    default: {
      for (let i = 0; i < count; i++) {
        delays.push(50 + Math.random() * (windowMs / count) * 2);
      }
      break;
    }
  }

  return delays;
}

/**
 * Run a full simulation and yield results one by one (async generator).
 * Caller can consume with `for await (const result of runSimulation(...))`.
 *
 * @param {object} config - Simulation configuration
 * @param {Array}  wallets - Array of wallet objects
 */
export async function* runSimulation(config, wallets) {
  const {
    totalTxs,
    minAmountEth,
    maxAmountEth,
    sellRatio,         // 0-100 percent of txs that are sells
    pattern,
    reserveToken,
    reserveEth,
    maxTxEth,
    maxWalletToken,
    baseGasPriceGwei,
    network,
    fastMode,
    tokenAddress,
    masterKey
  } = config;

  // Mutable state for the pool and wallet token balances
  let poolReserveToken = reserveToken;
  let poolReserveEth = reserveEth;
  const walletTokenBalances = {};
  wallets.forEach(w => (walletTokenBalances[w.address] = 0));

  const delays = buildTimingSchedule(totalTxs, pattern);
  const networkGasBase = network?.gasEstimate ?? 150000;

  const isLive = Boolean(tokenAddress && masterKey);

  for (let i = 0; i < totalTxs; i++) {
    // Pick a random wallet
    const wallet = wallets[Math.floor(Math.random() * wallets.length)];

    // Determine if this is a buy or sell
    const isSell = Math.random() * 100 < sellRatio && walletTokenBalances[wallet.address] > 0;

    // Random amount
    const amountEth = minAmountEth + Math.random() * (maxAmountEth - minAmountEth);

    let ammResult;
    let txType;
    let success = false;
    let failReason = null;
    let useInternalAmm = false;

    // Determine simulated fee/congestion 
    const congestionLevels = ['low', 'normal', 'normal', 'normal', 'high', 'spike'];
    const congestion = congestionLevels[Math.floor(Math.random() * congestionLevels.length)];
    const gas = estimateFee(network, congestion);
    let rpcGasUsed = gas.gasUsed;

    let txHash = null;
    let confirmationMs = null;

    if (isLive) {
      // ON-CHAIN EXECUTION
      const startTime = Date.now();
      if (isSell) {
        txType = 'sell';
        try {
          const receipt = await executeSell(wallet.privateKey, tokenAddress, network);
          txHash = receipt?.hash;
          confirmationMs = Date.now() - startTime;
          success = true;
        } catch (err) {
          success = false;
          failReason = err.message || "EVM Revert";
        }
      } else {
        txType = 'buy';
        try {
          // We need money to buy
          await fundWallet(masterKey, wallet.address, amountEth + 0.005, network); // amount + gas
          const receipt = await executeBuy(wallet.privateKey, amountEth, tokenAddress, network);
          txHash = receipt?.hash;
          confirmationMs = Date.now() - startTime;
          success = true;
        } catch (err) {
          success = false;
          failReason = err.message || "EVM Revert";
        }
      }

      // Re-run local math to approximate the wallet balances
      // Since live nodes take time, we want to show instant estimations too
      useInternalAmm = true;
    } else {
      // LOCAL MATH SIMULATION
      useInternalAmm = true;
    }

    if (useInternalAmm) {
      if (isSell) {
        // Sell some portion of the wallet's token balance
        const tokenAmount = walletTokenBalances[wallet.address] * (0.2 + Math.random() * 0.5);
        ammResult = simulateSell(tokenAmount, poolReserveToken, poolReserveEth);
        txType = 'sell';
      } else {
        ammResult = simulateBuy(amountEth, poolReserveToken, poolReserveEth);
        txType = 'buy';
      }

      // Check constraints
      const constraintCheck = checkConstraints({
        amountEth,
        amountToken: ammResult.amountOut,
        maxTxEth,
        maxWalletToken,
        walletTokenBalance: walletTokenBalances[wallet.address],
      });

      if (!isLive) {
        success = constraintCheck.passes;
        if (!success) failReason = constraintCheck.reason;
      }

      // Update pool state only if tx succeeds
      if (success) {
        poolReserveToken = ammResult.newReserveToken;
        poolReserveEth = ammResult.newReserveEth;
        if (txType === 'buy') {
          walletTokenBalances[wallet.address] += ammResult.amountOut;
        } else {
          walletTokenBalances[wallet.address] -= amountEth; // token amount sold
        }
      }
    }

    const result = {
      id: i + 1,
      timestamp: Date.now(),
      virtualTime: delays.slice(0, i + 1).reduce((a, b) => a + b, 0),
      wallet: wallet.address,
      type: txType,
      amountEth: +amountEth.toFixed(6),
      amountToken: ammResult ? +ammResult.amountOut.toFixed(4) : 0,
      priceImpact: ammResult ? +ammResult.priceImpact.toFixed(4) : 0,
      gasUsed: rpcGasUsed,
      gasPriceGwei: gas.gasPriceGwei,
      gasCostEth: gas.costEth,
      success,
      failReason,
      congestion,
      poolReserveToken: +poolReserveToken.toFixed(2),
      poolReserveEth: +poolReserveEth.toFixed(6),
      txHash,
      confirmationMs,
    };

    yield result;

    if (!fastMode && !isLive) {
      await new Promise(r => setTimeout(r, Math.min(delays[i] ?? 100, 500)));
    }
  }
}

/**
 * Compute summary statistics from a list of simulation results.
 */
export function computeStats(results) {
  if (!results.length) return null;

  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);
  const gasValues = successes.map(r => r.gasUsed);
  const priceImpacts = successes.map(r => r.priceImpact);
  const buys = successes.filter(r => r.type === 'buy');
  const sells = successes.filter(r => r.type === 'sell');

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const min = arr => arr.length ? Math.min(...arr) : 0;
  const max = arr => arr.length ? Math.max(...arr) : 0;

  const failureReasons = {};
  failures.forEach(r => {
    const key = r.failReason || 'Unknown';
    failureReasons[key] = (failureReasons[key] || 0) + 1;
  });

  return {
    totalTxs: results.length,
    successCount: successes.length,
    failCount: failures.length,
    successRate: +((successes.length / results.length) * 100).toFixed(1),
    buyCount: buys.length,
    sellCount: sells.length,
    avgGas: Math.round(avg(gasValues)),
    minGas: Math.round(min(gasValues)),
    maxGas: Math.round(max(gasValues)),
    avgSlippage: +avg(priceImpacts).toFixed(3),
    minSlippage: +min(priceImpacts).toFixed(3),
    maxSlippage: +max(priceImpacts).toFixed(3),
    totalGasCostEth: +successes.reduce((a, r) => a + r.gasCostEth, 0).toFixed(6),
    failureReasons,
  };
}
