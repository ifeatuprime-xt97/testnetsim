import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

/**
 * Verify ETH payment on Ethereum blockchain
 * @param {string} txHash - Transaction hash to verify
 * @param {string} toAddress - Recipient wallet address
 * @param {number} expectedAmount - Expected amount in ETH
 * @returns {Promise<{verified: boolean, amount: number, from: string}>}
 */
export async function verifyETHPayment(txHash, toAddress, expectedAmount) {
  try {
    const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_ETH_RPC_URL || 'https://eth.llamarpc.com');
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      return { verified: false, error: 'Transaction not found' };
    }

    // Wait for confirmation
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      return { verified: false, error: 'Transaction failed' };
    }

    // Check recipient and amount
    const toAddressLower = toAddress.toLowerCase();
    if (tx.to?.toLowerCase() !== toAddressLower) {
      return { verified: false, error: 'Wrong recipient address' };
    }

    const sentAmount = ethers.formatEther(tx.value);
    if (parseFloat(sentAmount) < expectedAmount) {
      return { verified: false, error: `Insufficient amount. Sent: ${sentAmount} ETH, Expected: ${expectedAmount} ETH` };
    }

    return {
      verified: true,
      amount: parseFloat(sentAmount),
      from: tx.from,
      blockNumber: receipt.blockNumber,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('ETH payment verification error:', error);
    return { verified: false, error: error.message };
  }
}

/**
 * Verify SOL payment on Solana blockchain
 * @param {string} txHash - Transaction hash to verify
 * @param {string} toAddress - Recipient wallet address
 * @param {number} expectedAmount - Expected amount in SOL
 * @returns {Promise<{verified: boolean, amount: number, from: string}>}
 */
export async function verifySOLPayment(txHash, toAddress, expectedAmount) {
  try {
    const connection = new Connection(import.meta.env.VITE_SOL_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Parse transaction
    const txSignature = txHash;
    const txInfo = await connection.getParsedTransaction(txSignature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo) {
      return { verified: false, error: 'Transaction not found' };
    }

    // Check if transaction was successful
    if (txInfo.meta?.err) {
      return { verified: false, error: 'Transaction failed' };
    }

    // Find the transfer amount to the recipient
    const toAddressPubkey = new PublicKey(toAddress);
    let totalAmount = 0;

    txInfo.transaction.message.instructions.forEach((instruction) => {
      if ('parsed' in instruction) {
        const parsed = instruction.parsed;
        if (parsed.type === 'transfer' && parsed.info?.destination === toAddress) {
          totalAmount += parsed.info.lamports / 1e9; // Convert lamports to SOL
        }
      }
    });

    // Also check inner instructions
    if (txInfo.meta?.innerInstructions) {
      txInfo.meta.innerInstructions.forEach((inner) => {
        inner.instructions.forEach((instruction) => {
          if ('parsed' in instruction) {
            const parsed = instruction.parsed;
            if (parsed.type === 'transfer' && parsed.info?.destination === toAddress) {
              totalAmount += parsed.info.lamports / 1e9;
            }
          }
        });
      });
    }

    if (totalAmount < expectedAmount) {
      return { verified: false, error: `Insufficient amount. Sent: ${totalAmount} SOL, Expected: ${expectedAmount} SOL` };
    }

    return {
      verified: true,
      amount: totalAmount,
      from: txInfo.transaction.message.accountKeys[0]?.pubkey?.toString() || 'unknown',
      slot: txInfo.slot,
      timestamp: txInfo.blockTime ? txInfo.blockTime * 1000 : Date.now(),
    };
  } catch (error) {
    console.error('SOL payment verification error:', error);
    return { verified: false, error: error.message };
  }
}

/**
 * Get current balance of an ETH address
 * @param {string} address - Wallet address
 * @returns {Promise<number>} Balance in ETH
 */
export async function getETHBalance(address) {
  try {
    const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_ETH_RPC_URL || 'https://eth.llamarpc.com');
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (error) {
    console.error('Error getting ETH balance:', error);
    return 0;
  }
}

/**
 * Get current balance of a SOL address
 * @param {string} address - Wallet address
 * @returns {Promise<number>} Balance in SOL
 */
export async function getSOLBalance(address) {
  try {
    const connection = new Connection(import.meta.env.VITE_SOL_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
    const pubkey = new PublicKey(address);
    const balance = await connection.getBalance(pubkey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
}

/**
 * Check if a transaction is confirmed
 * @param {string} txHash - Transaction hash
 * @param {'ETH'|'SOL'} chain - Blockchain
 * @returns {Promise<{confirmed: boolean, details?: object}>}
 */
export async function checkTransactionStatus(txHash, chain) {
  if (chain === 'ETH') {
    const result = await verifyETHPayment(txHash, import.meta.env.VITE_PAYMENT_WALLET_ETH, 0);
    return {
      confirmed: result.verified || result.error?.includes('Transaction'),
      details: result,
    };
  } else {
    const result = await verifySOLPayment(txHash, import.meta.env.VITE_PAYMENT_WALLET_SOL, 0);
    return {
      confirmed: result.verified || result.error?.includes('Transaction'),
      details: result,
    };
  }
}
