import { ethers } from 'ethers';
import { Connection } from '@solana/web3.js';

/**
 * Fetch live gas/fee data from the selected testnet.
 * Returns a normalised shape regardless of chain type.
 */
export async function fetchGasPrice(network) {
  if (!network?.rpc) throw new Error('Network RPC is missing');

  if (network.isSolana) {
    const connection = new Connection(network.rpc, 'confirmed');
    const fees = await connection.getRecentPrioritizationFees();
    const avg =
      fees.length > 0
        ? Math.round(fees.reduce((a, f) => a + f.prioritizationFee, 0) / fees.length)
        : 1000;
    const max = fees.length > 0 ? Math.max(...fees.map(f => f.prioritizationFee)) : 5000;
    return {
      baseFee: 5000,              // lamports (base sig fee)
      priorityFee: avg,           // μlamports per CU
      maxFee: max,
      unit: 'μlamports',
      currency: network.currency,
      timestamp: Date.now(),
    };
  }

  // EVM chains
  const provider = new ethers.JsonRpcProvider(network.rpc);
  const feeData = await provider.getFeeData();
  const baseFee = feeData.gasPrice ? Number(ethers.formatUnits(feeData.gasPrice, 'gwei')) : 0;
  const priorityFee = feeData.maxPriorityFeePerGas
    ? Number(ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'))
    : 0;
  const maxFee = feeData.maxFeePerGas
    ? Number(ethers.formatUnits(feeData.maxFeePerGas, 'gwei'))
    : baseFee * 2;

  return {
    baseFee: +baseFee.toFixed(4),
    priorityFee: +priorityFee.toFixed(4),
    maxFee: +maxFee.toFixed(4),
    unit: 'Gwei',
    currency: network.currency,
    timestamp: Date.now(),
  };
}

/**
 * Estimate total simulation cost given the number of TXs and current gas data.
 */
export function estimateSimCost(numTxs, gasData, network) {
  if (!gasData) return null;

  if (network?.isSolana) {
    // base fee per sig (0.000005 SOL) + priority per CU
    const baseFeeSOL = 0.000005;
    const computeUnits = network.gasEstimate || 200000;
    const priorityCostSOL = (gasData.priorityFee * computeUnits) / 1e6 / 1e9;
    const perTx = baseFeeSOL + priorityCostSOL;
    return {
      perTx: +perTx.toFixed(9),
      total: +(perTx * numTxs).toFixed(6),
      currency: 'SOL',
    };
  }

  // EVM: gasCost = gasUsed × gasPrice (Gwei) / 1e9
  const gasUsed = network?.gasEstimate || 150000;
  const gasPriceGwei = gasData.baseFee + gasData.priorityFee;
  const perTx = (gasUsed * gasPriceGwei) / 1e9;
  return {
    perTx: +perTx.toFixed(8),
    total: +(perTx * numTxs).toFixed(6),
    currency: network?.currency || 'ETH',
  };
}
