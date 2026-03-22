import { ethers } from 'ethers';

/**
 * WebSocket / polling monitor for live on-chain transaction events.
 * Falls back to block polling since many testnet RPCs lack WS support.
 */
export function createMonitor(network) {
  if (!network?.rpc) return null;

  let provider = null;
  let listeners = [];
  let pollInterval = null;
  let lastBlock = 0;

  function init() {
    provider = new ethers.JsonRpcProvider(network.rpc);
  }

  /**
   * Subscribe to new blocks and scan for transactions involving watched addresses.
   */
  function subscribe(addresses, callback) {
    if (!provider) init();
    const addrSet = new Set(addresses.map(a => a.toLowerCase()));
    listeners.push({ addrSet, callback });

    // Start polling blocks every 5s
    if (!pollInterval) {
      pollInterval = setInterval(async () => {
        try {
          const blockNum = await provider.getBlockNumber();
          if (blockNum <= lastBlock) return;

          for (let b = lastBlock + 1; b <= blockNum; b++) {
            const block = await provider.getBlock(b, true);
            if (!block || !block.transactions) continue;

            for (const txHash of block.transactions) {
              try {
                const tx = await provider.getTransaction(txHash);
                if (!tx) continue;
                const from = tx.from?.toLowerCase();
                const to = tx.to?.toLowerCase();

                for (const { addrSet: watchSet, callback: cb } of listeners) {
                  if (watchSet.has(from) || watchSet.has(to)) {
                    cb({
                      hash: tx.hash,
                      from: tx.from,
                      to: tx.to,
                      value: ethers.formatEther(tx.value),
                      blockNumber: b,
                      status: 'confirmed',
                      timestamp: Date.now(),
                    });
                  }
                }
              } catch {
                // Skip individual tx errors
              }
            }
          }
          lastBlock = blockNum;
        } catch (err) {
          console.warn('[TxMonitor] Poll error:', err.message);
        }
      }, 5000);
    }
  }

  /**
   * Add a pending tx to monitor via its hash
   */
  async function watchTx(txHash, callback) {
    if (!provider) init();
    try {
      const receipt = await provider.waitForTransaction(txHash, 1, 60000);
      callback({
        hash: txHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
        timestamp: Date.now(),
      });
    } catch (err) {
      callback({
        hash: txHash,
        status: 'timeout',
        error: err.message,
        timestamp: Date.now(),
      });
    }
  }

  function unsubscribe() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    listeners = [];
    lastBlock = 0;
  }

  return { subscribe, watchTx, unsubscribe };
}
