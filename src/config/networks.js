// TESTNET ONLY — No mainnet configurations are included intentionally.
// Every entry here MUST have isTestnet: true. Mainnet will never be added.

export const NETWORKS = {
  // ── EVM Chains ──────────────────────────────────────────────────────────────
  sepolia: {
    id: 'sepolia',
    name: 'Ethereum Sepolia Testnet',
    chainId: 11155111,
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.etherscan.io',
    currency: 'ETH',
    faucet: 'https://sepoliafaucet.com',
    color: '#627EEA',
    dexRouter: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008', // Uniswap V2 Sepolia
    weth: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    gasEstimate: 150000,
    gasUnit: 'gas',
    feeUnit: 'Gwei',
    iconId: 'ethereum-eth',
    isSolana: false,
    isTestnet: true,
  },
  arbitrumSepolia: {
    id: 'arbitrumSepolia',
    name: 'Arbitrum Sepolia Testnet',
    chainId: 421614,
    rpc: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    currency: 'ETH',
    faucet: 'https://www.alchemy.com/faucets/arbitrum-sepolia',
    color: '#28A0F0',
    dexRouter: '0x101F443B4d1b059569D643917553c771E1b9663E', // Uniswap V2 Arb Sepolia
    weth: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
    gasEstimate: 800000,
    gasUnit: 'gas',
    feeUnit: 'Gwei',
    iconId: 'arbitrum-arb',
    isSolana: false,
    isTestnet: true,
  },
  baseSepolia: {
    id: 'baseSepolia',
    name: 'Base Sepolia Testnet',
    chainId: 84532,
    rpc: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    currency: 'ETH',
    faucet: 'https://www.alchemy.com/faucets/base-sepolia',
    color: '#0052FF',
    dexRouter: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24', // Uniswap V2 Base Sepolia
    weth: '0x4200000000000000000000000000000000000006',
    gasEstimate: 160000,
    gasUnit: 'gas',
    feeUnit: 'Gwei',
    iconId: 'ethereum-eth',
    isSolana: false,
    isTestnet: true,
  },
  avalancheFuji: {
    id: 'avalancheFuji',
    name: 'Avalanche Fuji Testnet',
    chainId: 43113,
    rpc: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorer: 'https://testnet.snowtrace.io',
    currency: 'AVAX',
    faucet: 'https://faucet.avax.network',
    color: '#E84142',
    dexRouter: '0x2D99ABD9008Dc933ff5c0CD271B88309593aB921', // Pangolin Testnet
    weth: '0xd00ae08403B9bbb9124bB305C09058E32C39A48c', // WAVAX
    gasEstimate: 200000,
    gasUnit: 'gas',
    feeUnit: 'nAVAX',
    iconId: 'avalanche-avax',
    isSolana: false,
    isTestnet: true,
  },
  bscTestnet: {
    id: 'bscTestnet',
    name: 'BSC Testnet',
    chainId: 97,
    rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorer: 'https://testnet.bscscan.com',
    currency: 'tBNB',
    faucet: 'https://testnet.binance.org/faucet-smart',
    color: '#F3BA2F',
    dexRouter: '0xD99D1c33F9fC3444f8101754aBC46c52416550d1', // PancakeSwap V2 Testnet
    weth: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
    gasEstimate: 200000,
    gasUnit: 'gas',
    feeUnit: 'Gwei',
    iconId: 'pancakeswap-cake',
    isSolana: false,
    isTestnet: true,
  },
  polygonAmoy: {
    id: 'polygonAmoy',
    name: 'Polygon Amoy Testnet',
    chainId: 80002,
    rpc: 'https://rpc-amoy.polygon.technology',
    explorer: 'https://amoy.polygonscan.com',
    currency: 'MATIC',
    faucet: 'https://faucet.polygon.technology',
    color: '#8247E5',
    dexRouter: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    weth: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    gasEstimate: 180000,
    gasUnit: 'gas',
    feeUnit: 'Gwei',
    iconId: 'polygon-matic',
    isSolana: false,
    isTestnet: true,
  },

  // ── Solana ──────────────────────────────────────────────────────────────────
  solanaDevnet: {
    id: 'solanaDevnet',
    name: 'Solana Devnet Testnet',
    chainId: null,
    rpc: 'https://api.devnet.solana.com',
    explorer: 'https://explorer.solana.com',
    explorerParams: '?cluster=devnet',
    currency: 'SOL',
    faucet: 'https://faucet.solana.com',
    color: '#9945FF',
    dexRouter: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CPMM Devnet
    weth: 'So11111111111111111111111111111111111111112',  // Wrapped SOL
    gasEstimate: 200000,
    gasUnit: 'compute units',
    feeUnit: 'μlamports',
    iconId: 'solana-sol',
    isSolana: true,
    isTestnet: true,
  },
};

// Runtime guard — throws if a non-testnet network is ever accidentally added.
Object.values(NETWORKS).forEach(n => {
  if (!n.isTestnet) throw new Error(`[TestnetSim] Network "${n.id}" is missing isTestnet: true. Only testnet networks are allowed.`);
});

export const DEFAULT_NETWORK = 'sepolia';

export const TIMING_PATTERNS = {
  random: { label: 'Random', description: 'Uniform random distribution over time window' },
  burst: { label: 'Burst', description: 'Concentrated spikes of activity then silence' },
  slowDrip: { label: 'Slow Drip', description: 'Evenly spaced transactions over time window' },
  spike: { label: 'Spike', description: 'Normal activity then a sudden surge then recovery' },
};
