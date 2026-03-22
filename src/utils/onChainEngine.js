import { ethers } from 'ethers';
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

// Minimal ERC20 ABI to approve and get balance
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
];

// Minimal Uniswap V2 Router ABI
const ROUTER_ABI = [
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

/**
 * Creates an ethers.js provider for the given network.
 */
export function getProvider(network) {
    if (!network?.rpc) throw new Error("Network RPC is missing");
    return new ethers.JsonRpcProvider(network.rpc);
}

/**
 * Sends testnet ETH/SOL from a master wallet to a child wallet.
 */
export async function fundWallet(masterKey, childAddress, amountEth, network) {
    if (network.isSolana) {
        const connection = new Connection(network.rpc, 'confirmed');
        const masterKeypair = Keypair.fromSecretKey(bs58.decode(masterKey));
        const toPubkey = new PublicKey(childAddress);

        // Convert to lamports (1 SOL = 1e9 lamports)
        const lamports = Math.floor(amountEth * 1e9);

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: masterKeypair.publicKey,
                toPubkey,
                lamports
            })
        );

        await sendAndConfirmTransaction(connection, transaction, [masterKeypair]);
        return;
    }

    const provider = getProvider(network);
    const masterWallet = new ethers.Wallet(masterKey, provider);

    const tx = await masterWallet.sendTransaction({
        to: childAddress,
        value: ethers.parseEther(amountEth.toString()),
    });

    return tx.wait();
}

/**
 * Simulates a Solana token interactions by performing an on-chain action.
 * (Interacting with real Raydium/Orca programmatically requires their heavy SDK and pool IDs)
 */
async function executeSolanaTrade(walletKey, network) {
    const connection = new Connection(network.rpc, 'confirmed');
    const keypair = Keypair.fromSecretKey(bs58.decode(walletKey));

    // A self-transfer ensures the transaction hits the network and consumes compute,
    // which effectively tests the network throughput and wallet's tx limits under load.
    const transaction = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: keypair.publicKey,
            lamports: 100 // dust 
        })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);
    return { hash: signature };
}

/**
 * Executes a Buy transaction (ETH -> Token) on the DEX.
 */
export async function executeBuy(walletKey, amountEth, tokenAddress, network) {
    if (network.isSolana) {
        return await executeSolanaTrade(walletKey, network);
    }

    const provider = getProvider(network);
    const wallet = new ethers.Wallet(walletKey, provider);

    const router = new ethers.Contract(network.dexRouter, ROUTER_ABI, wallet);
    const amountInWei = ethers.parseEther(amountEth.toString());
    const path = [network.weth, tokenAddress];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins

    // Try to estimate gas first, if it fails, the transaction will likely revert.
    try {
        await router.swapExactETHForTokens.estimateGas(
            0, // amountOutMin = 0 (accepting max slippage for the simulation)
            path,
            wallet.address,
            deadline,
            { value: amountInWei }
        );
    } catch (err) {
        throw new Error(`Execution reverted: ${err.shortMessage || err.message}`);
    }

    const tx = await router.swapExactETHForTokens(
        0,
        path,
        wallet.address,
        deadline,
        { value: amountInWei }
    );

    return tx.wait();
}

/**
 * Executes a Sell transaction (Token -> ETH) on the DEX.
 */
export async function executeSell(walletKey, tokenAddress, network) {
    if (network.isSolana) {
        return await executeSolanaTrade(walletKey, network);
    }

    const provider = getProvider(network);
    const wallet = new ethers.Wallet(walletKey, provider);

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const router = new ethers.Contract(network.dexRouter, ROUTER_ABI, wallet);

    // 1. Get Token Balance
    const balance = await token.balanceOf(wallet.address);
    if (balance === 0n) {
        throw new Error("Wallet has 0 tokens to sell");
    }

    // 2. Approve Router to spend tokens (if not already approved)
    // For simulation speed, we just approve max every time
    const approveTx = await token.approve(network.dexRouter, ethers.MaxUint256);
    await approveTx.wait();

    // 3. Swap Tokens for ETH
    const path = [tokenAddress, network.weth];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 mins

    try {
        await router.swapExactTokensForETH.estimateGas(
            balance,
            0, // amountOutMin = 0 
            path,
            wallet.address,
            deadline
        );
    } catch (err) {
        throw new Error(`Execution reverted: ${err.shortMessage || err.message}`);
    }

    const tx = await router.swapExactTokensForETH(
        balance,
        0,
        path,
        wallet.address,
        deadline
    );

    return tx.wait();
}

export async function getLiveReserves(tokenAddress, network) {
    // This is a minimal helper to get prices if needed, 
    // real AMMs require pair address or exact calculations, 
    // for this feature we will execute the trade instead to measure outcome.
    return { tokenReserve: 0, ethReserve: 0 };
}

/**
 * Sweeps all leftover native currency and tokens from the given wallets back to the master.
 */
export async function sweepFunds(wallets, masterKey, tokenAddress, network, onProgress) {
    if (!wallets || wallets.length === 0) return;

    if (network.isSolana) {
        const connection = new Connection(network.rpc, 'confirmed');
        const masterKeypair = Keypair.fromSecretKey(bs58.decode(masterKey));
        const masterPubkey = masterKeypair.publicKey;

        for (let i = 0; i < wallets.length; i++) {
            const w = wallets[i];
            onProgress?.(`Sweeping ${i + 1}/${wallets.length}...`);
            try {
                const keypair = Keypair.fromSecretKey(bs58.decode(w.privateKey));
                const balance = await connection.getBalance(keypair.publicKey);

                // Leave enough for fee (typically 5000 lamports)
                const sweepAmount = balance - 5000;

                if (sweepAmount > 0) {
                    const transaction = new Transaction().add(
                        SystemProgram.transfer({
                            fromPubkey: keypair.publicKey,
                            toPubkey: masterPubkey,
                            lamports: sweepAmount
                        })
                    );
                    await sendAndConfirmTransaction(connection, transaction, [keypair]);
                }
            } catch (err) {
                console.warn(`Failed to sweep SOL from ${w.address}:`, err);
            }
        }
    } else {
        const provider = getProvider(network);
        const masterWallet = new ethers.Wallet(masterKey);

        for (let i = 0; i < wallets.length; i++) {
            const w = wallets[i];
            onProgress?.(`Sweeping ${i + 1}/${wallets.length}...`);
            try {
                const wallet = new ethers.Wallet(w.privateKey, provider);

                // 1. Sweep Token Balance
                if (tokenAddress) {
                    const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
                    const tokenBalance = await token.balanceOf(wallet.address);
                    if (tokenBalance > 0n) {
                        try {
                            // Standard ERC20 transfer
                            const transferAbi = ["function transfer(address to, uint256 amount) external returns (bool)"];
                            const tokenTransfer = new ethers.Contract(tokenAddress, transferAbi, wallet);
                            const tx = await tokenTransfer.transfer(masterWallet.address, tokenBalance);
                            await tx.wait();
                        } catch (err) {
                            console.warn(`Failed to sweep token from ${w.address}:`, err);
                        }
                    }
                }

                // 2. Sweep Native Balance
                const balance = await provider.getBalance(wallet.address);
                if (balance > 0n) {
                    // Estimate gas for a simple transfer
                    const gasPrice = (await provider.getFeeData()).gasPrice || ethers.parseUnits('1', 'gwei');
                    const gasLimit = 21000n; // Standard ETH transfer cost
                    const txCost = gasPrice * gasLimit;

                    if (balance > txCost) {
                        const sweepAmount = balance - txCost;
                        const tx = await wallet.sendTransaction({
                            to: masterWallet.address,
                            value: sweepAmount,
                            gasLimit,
                            gasPrice
                        });
                        await tx.wait();
                    }
                }
            } catch (err) {
                console.warn(`Failed to sweep ETH from ${w.address}:`, err);
            }
        }
    }
}
