import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Validates if the browser has the expected extension installed depending on network format.
 */
export function hasWalletExtension(network) {
  if (network?.isSolana) {
    return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
  }
  return typeof window !== 'undefined' && !!window.ethereum;
}

/**
 * Connects to the injected Web3 wallet (MetaMask or Phantom) and returns the connected address.
 */
export async function connectWallet(network) {
  if (!hasWalletExtension(network)) {
    throw new Error(network?.isSolana ? 'Phantom Wallet not found. Please install Phantom extension.' : 'No Web3 wallet found. Please install MetaMask.');
  }

  if (network?.isSolana) {
    const resp = await window.solana.connect();
    return { account: resp.publicKey.toString() };
  } else {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    if (!accounts || accounts.length === 0) {
      throw new Error('User rejected the connection request.');
    }
    return { account: accounts[0], provider };
  }
}

/**
 * Checks the connected wallet's network and prompts a switch if necessary (EVM only).
 */
export async function ensureNetwork(provider, network) {
  if (network?.isSolana) return; // Phantom handles devnet/mainnet logic implicitly via RPC connections for dApp requests
  
  if (!provider) return;
  const expectedChainId = network.chainId;
  if (!expectedChainId) return;

  const currentNetwork = await provider.getNetwork();
  
  if (currentNetwork.chainId !== BigInt(expectedChainId)) {
    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${expectedChainId.toString(16)}` }
      ]);
    } catch (switchError) {
      if (switchError.code === 4902) {
        throw new Error(`Please add network ID ${expectedChainId} to your wallet.`);
      }
      throw switchError;
    }
  }
}

/**
 * Funds the session bridge wallet from the connected wallet.
 */
export async function fundSessionBridge(network, sessionAddress, amount, connectedAccount) {
    if (network?.isSolana) {
        const connection = new Connection(network.rpc, 'confirmed');
        const lamports = Math.floor(amount * 1e9);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: new PublicKey(connectedAccount),
                toPubkey: new PublicKey(sessionAddress),
                lamports
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = window.solana.publicKey;

        const { signature } = await window.solana.signAndSendTransaction(transaction);
        await connection.confirmTransaction(signature);
        return signature; // TX Hash
    } else {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
            to: sessionAddress,
            value: ethers.parseEther(amount.toString())
        });
        await tx.wait();
        return tx.hash;
    }
}

/**
 * Sweeps all remaining funds from the session bridge wallet back to the user's connected wallet.
 */
export async function sweepSessionBridge(network, sessionPrivateKey, connectedAccount) {
    if (network?.isSolana) {
        const connection = new Connection(network.rpc, 'confirmed');
        const keypair = Keypair.fromSecretKey(bs58.decode(sessionPrivateKey));
        const balance = await connection.getBalance(keypair.publicKey);
        
        const txFeeCost = 5000; // Standard single sig fee is 5000 lamports
        if (balance > txFeeCost) {
            const sweepAmount = balance - txFeeCost;
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: keypair.publicKey,
                    toPubkey: new PublicKey(connectedAccount),
                    lamports: sweepAmount
                })
            );
            const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
            return signature;
        } else {
            throw new Error(`Balance too low to cover network fee.`);
        }
    } else {
        const provider = new ethers.JsonRpcProvider(network.rpc);
        const wallet = new ethers.Wallet(sessionPrivateKey, provider);
        const balance = await provider.getBalance(wallet.address);
        
        if (balance > 0n) {
           const feeData = await provider.getFeeData();
           const gasPrice = feeData.gasPrice || ethers.parseUnits('1', 'gwei');
           let gasLimit = 21000n;
           try { gasLimit = await provider.estimateGas({to: connectedAccount, value: 100n}); } catch(e) {}
           const txCost = gasPrice * gasLimit;
           
           if (balance > txCost) {
               const tx = await wallet.sendTransaction({
                   to: connectedAccount,
                   value: balance - txCost,
                   gasPrice, gasLimit
               });
               await tx.wait();
               return tx.hash;
           } else {
               throw new Error(`Balance too low to cover network fee.`);
           }
        } else {
           throw new Error(`Session bridge is already empty.`);
        }
    }
}
