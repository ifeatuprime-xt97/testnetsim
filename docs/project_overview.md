# TestnetSim: Project Overview & Payment Architecture

## Current Project Description

**TestnetSim** has evolved from a generic transaction emulator into a premium **Pre-Launch Failure Detection Tool**. It is designed for token developers and smart-contract creators to aggressively stress test their token's AMM pool architectures (using realistic slippage limits, `maxTx` chunking, and `maxWallet` constraints) before deploying to mainnet. 

By modeling extreme mathematical boundaries and simulating highly-concurrent bot interactions, TestnetSim acts as the final firewall ensuring creators avoid costly launch failures, liquidity crunches, and smart-contract limitation traps.

### Key Features
- **Wallet Generator:** Ephemerally spawn up to 50,000 EVM (secp256k1) or Solana (ed25519) keypairs securely in browser memory without external storage.
- **Liquidity Stress Test:** Models intense buy/sell pressure over a targeted timeframe, allowing creators to inject volatility and track exactly how fast pool depths evaporate under strain. 
- **Live On-Chain Transaction Simulator:** Execute synchronized swarm attacks over real RPC layers using distinct Behavioral Matrices ("Burst", "Spike", "Drip") to observe organic network responses to aggressive activity limits.
- **Simulation Analysis Layer:** Raw mathematical findings are automatically processed into a **Pre-Launch Report** that grades launch viability from 0-100 yielding "SAFE", "RISKY", or "FAIL". The intelligence isolates deep parsing failures, highlights specific limit triggers, and suggests parameter calibrations.

---

## Monetization Architecture & Pricing Strategy

TestnetSim has officially pivoted away from the archaic time-duration model into a direct **Pay-Per-Report Business Model**. Free exploration is strictly limited (wallet caps and disabled analytics). To expose actionable intelligence (e.g., specific smart-contract fixes, timeline mapping, and failure traces), users must spend "Report Credits". 

Prices are quoted dynamically in USD via CoinGecko oracles, converting securely into real-time ETH and SOL prices.

### Supported Cryptocurrencies
1. **Ethereum (ETH)**
   - Operates across the Ethereum Mainnet RPC.
   - Leverages `ethers.js` to index the blockchain to verify incoming value to the internal `VITE_PAYMENT_WALLET_ETH`.
2. **Solana (SOL)**
   - Leverages Solana Web3 modules parsing standard block confirmations verifying direct transfers to `VITE_PAYMENT_WALLET_SOL`.

### The Pricing Tiers 
1. **Preview (Free Tier)**
   - **Wallet Limit:** 10 maximum parallel wallets.
   - **Features:** Disables advanced swarm matrices ("Burst", "Spike"). The analysis layer is blurred via a frosted glass UI constraint; users can only see the ultimate "SAFE / FAIL" label and the mathematical score without the diagnostic telemetry.
2. **Single Report ($10)**
   - **Reports Included:** 1
   - **Wallet Limit:** Up to 100 
   - **Features:** Instantly unlocks the full diagnostic telemetry for a single simulation result. 
3. **Pro Pack ($25)**
   - **Reports Included:** 5
   - **Wallet Limit:** Up to 1,000 
   - **Features:** Unmasks all timing boundaries allowing "Burst/Spike" integrations. Ideal for moderate developers needing localized tuning.
4. **Advanced Model (Dynamic Scale)**
   - **Reports Included:** Unlimited
   - **Pricing Mechanism:** The USD floor is anchored at $50.00, but immediately scales dynamically based on the exact ceiling of parallel wallets the user requires, billed at $0.001 per connected wallet logic array (e.g., entering 60,000 structural connections calculates immediately to $60.00).

### Seamless Checkout UX
1. The user dictates an upgrade directly within the `PricingModal` interface structure.
2. They are supplied a designated receiving address and precise `ETH` or `SOL` amount payload.
3. The user initiates the payment from their hot wallet and inputs their confirmation `txHash`.
4. **Auto-Polling:** The application immediately transitions into an automated validation loop—interrogating the external RPC nodes every 5 seconds until the block structure verifies the receipt.
5. The payment validates silently, locking the state transaction variables, automatically deducting a "Report Credit" dynamically, and peeling off the blurred UI overlay entirely without the user requiring further clicks!
