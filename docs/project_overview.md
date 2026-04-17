# TestnetSim: Project Overview & Payment Architecture

## Current Project Description

**TestnetSim** is a comprehensive Liquidity and Load Simulator designed specifically for token creators and developers. It allows projects to simulate extreme market conditions and transaction volume on testnets (or locally) before executing a mainnet token launch. 

By modeling variables such as token reserves, liquidity depth, max limits, and slippage tolerances, the simulator helps creators avoid costly launch failures.

### Key Features
- **Wallet Generator:** Ephemerally generate up to 50,000 EVM (secp256k1) or Solana (ed25519) keypairs securely in memory to simulate high-volume bot participation without requiring local hardware constraints.
- **Liquidity Stress Test:** Models intense buy/sell pressure over a simulated timeframe to gauge transaction failures, slippage impacts, max transaction (`maxTx`) violations, and max wallet limits across your custom ERC20/SPL tokens.
- **Transaction Simulator:** Actively attempts simulated or live automated trades over a network to mimic real-world interactions over predefined timing schedules (e.g., Burst, Slow Drip, Spike).
- **Pre-Launch Analysis Layer:** Immediately scores project readiness from 0-100 to yield a "SAFE", "RISKY", or "FAIL" verdict. Offers warnings and insights by evaluating success rates, gas spikes, and average impact vs tolerance ceilings.

---

## Payment Methods & Pricing

Given the immense processing requirements for executing tens of thousands of simulated smart contract transactions, TestnetSim operates under a tiered scaling model payable purely in cryptocurrencies. Prices are pegged to USD but dynamically converted into ETH and SOL using integrated CoinGecko oracles.

### Supported Cryptocurrencies
1. **Ethereum (ETH)**
   - Operates over the Ethereum Mainnet RPC (`VITE_ETH_RPC_URL` or standard providers).
   - Validates transactions using `ethers.js` logic to inspect `txHash` execution, receipt confirmations, and ensuring the value hits the designated `VITE_PAYMENT_WALLET_ETH`.
2. **Solana (SOL)**
   - Operates over Solana Mainnet (`VITE_SOL_RPC_URL`).
   - Parses the transaction confirmation blocks to trace token transfers directly to `VITE_PAYMENT_WALLET_SOL` across the SPL instruction dataset.

*Note: All payments accommodate a 2.5% slippage buffer to compensate for mid-transaction price fluctuations between the API quote layer and execution times.*

### Pricing Tiers
- **Free:** $0
  - Up to 100 wallets simultaneously.
  - Useful for basic parameter sanity-checking and limits execution to testnet constraints.
- **Basic:** $25 (active for 24 hours)
  - Broadens bandwidth to 1,000 wallets.
  - Grants token creators full Live testnet executions for 1 active simulation session over the course of a launch day.
- **Pro:** $50 (active for 24 hours)
  - Access to 10,000 parallel execution wallets.
  - Supports up to 5 full simulations for granular refinement. Includes advanced simulation analysis analytics.
- **Enterprise:** $100 (active for 24 hours)
  - Top-tier 50,000 wallet limit payload.
  - Dedicated capacity designed for extreme load, bypassing consumer hardware limitations and offering up to 10 heavy payload simulations.

### Payment Flow
1. User selects a tier inside the `PricingModal` interface.
2. User copies the generated payment wallet address mapped from internal `.env` protocols.
3. User navigates to their external Web3 wallet (MetaMask, Phantom) and executes the raw token transfer.
4. User pastes the completed `txHash` back into the portal.
5. The system performs an on-chain verification using RPC validation to permanently unlock the session.
