 📝 Comprehensive Posting API Documentation

This document serves as the complete technical developer reference for the transaction posting logic in TestnetSim. Transaction posting—both mathematical simulation 🧮 and live on-chain execution 🚀—is orchestrated across three core modules: txEngine.js, onChainEngine.js, and ammSimulator.js.

---

 ⚙️ 1. Engine Orchestrator: txEngine.js
The txEngine is responsible for generating transaction schedules ⏱️, handling the state of the AMM pool during local simulation, and routing live requests to the EVM or Solana networks.

 🏃‍♂️ runSimulation(config, wallets)
An async generator function that yields transaction results one by one. It decides whether to post transactions locally (math simulation) or live (on-chain) based on the presence of a masterKey.
- Arguments:
  - config (Object): Simulation parameters.
    - totalTxs (Number): Total transactions to post.
    - minAmountEth / maxAmountEth (Number): Transaction size bounds 📊.
    - sellRatio (Number): 0-100 percentage of transactions that will be sells 📉.
    - pattern (String): Timing pattern ('random', 'burst', 'slowDrip', 'spike').
    - reserveToken / reserveEth (Number): Starting pool reserves 🏦.
    - masterKey / tokenAddress (String): If provided, triggers Live On-Chain Posting 🌐.
  - wallets (Array): Array of generated wallet objects { address, privateKey } 👛.
- Yields: Object containing transaction receipt data (txHash, gasUsed, success, amountToken, priceImpact, etc.).

 ⏳ buildTimingSchedule(count, pattern, windowMs)
Generates an array of millisecond delays representing when the next transaction should be posted.
- Returns: Array<Number> of delays in milliseconds.

 📈 computeStats(results)
Parses the output of runSimulation into aggregate metrics.
- Returns: Object containing successRate, avgGas, totalGasCostEth, avgSlippage, and failureReasons.

---

 🌍 2. Live Execution Layer: onChainEngine.js
Handles posting raw cryptographic transactions to live EVM RPC endpoints or Solana clusters. 

 💸 executeBuy(walletKey, amountEth, tokenAddress, network)
Posts a BUY transaction on-chain via the network's DEX Router.
- EVM Flow: Connects to the AMM Router, calculates 5% slippage via `getAmountsOut`, estimates gas ⛽, and calls `swapExactETHForTokensSupportingFeeOnTransferTokens` to safely accommodate tokens with transfer taxes.
- Solana Flow: Delegates to executeSolanaTrade (self-transfer to test throughput) because direct AMM integration on Solana requires heavy SDKs.
- Returns: A Transaction Receipt object containing the hash 🧾.

 📉 executeSell(walletKey, tokenAddress, network)
Posts a SELL transaction on-chain.
- EVM Flow: 
  1. Calls `token.balanceOf` to check holdings.
  2. Checks `token.allowance` and ONLY submits an `approve` transaction if allowance is insufficient, significantly saving gas.
  3. Calculates 5% slippage via `getAmountsOut`.
  4. Posts `swapExactTokensForETHSupportingFeeOnTransferTokens` to natively support meme coins with transfer block taxes.
- Returns: A Transaction Receipt object 🧾.

 🚰 fundWallet(masterKey, childAddress, amountEth, network)
Posts a native currency transfer from the master wallet to a worker wallet, funding it for gas and purchase costs.
- Returns: Transaction response promise (tx.wait() or sendAndConfirmTransaction).

 🧹 sweepFunds(wallets, masterKey, tokenAddress, network, onProgress)
Cleans up after a live simulation by posting transfer transactions to return all remaining ERC20 tokens and native gas back to the masterKey.
- Gas limits are now dynamically estimated rather than hardcoded, ensuring successful sweeps even if the master wallet is a Smart Contract.

---

 🧮 3. Mathematical Simulation Layer: ammSimulator.js
When posting locally, TestnetSim uses a Constant Product Formula ($x \times y = k$) to approximate the exact outputs of a decentralized exchange without network latency ⚡.

 🛍️ simulateBuy(ethIn, reserveToken, reserveEth)
Calculates the tokens received for spending ethIn, assuming a 0.3% standard DEX fee.
- Returns: { amountOut, priceImpact, newReserveToken, newReserveEth }

 💰 simulateSell(tokenIn, reserveToken, reserveEth)
Calculates the ETH received for selling tokenIn, applying the 0.3% fee.
- Returns: { amountOut, priceImpact, newReserveToken, newReserveEth }

 ⛽ estimateFee(network, congestion)
Calculates simulated gas costs based on theoretical network parameters.
- EVM: Multiplies base gas unit estimates by network gas prices and congestion multipliers.
- Solana: Estimates compute units consumed and applies simulated priority fees (microlamports/CU) to derive a final cost in SOL.
- Returns: { gasUsed, gasPriceGwei, costEth }

 🛡️ checkConstraints({ amountEth, amountToken, maxTxEth, maxWalletToken, walletTokenBalance })
Ensures that a simulated transaction does not violate standard tokenomics anti-whale constraints 🐋. 
- Returns: { passes: Boolean, reason: String | null }

---

 🔐 4. UI Auth & Session Bridge Architecture
To eliminate the friction of massive Web3 popups while safeguarding against private key exposure, the `App.jsx` user interface supports a **Two-Way Authentication** topology:

 🔑 Private Key Mode
- **Mechanism Flow:** The user directly pastes a raw private key string.
- **Usage:** Passed into standard `ethers.Wallet` instantiation for all core operations.
- **UX Benefit:** Complete autonomy—0 browser popups required for running tests.

 🌉 Connect Wallet (Session Bridge) Mode
- **Mechanism Flow:** 
  1. User triggers `connectWallet()` bounding to `window.ethereum`.
  2. UI spawns a temporary "Session Bridge Wallet" (`ethers.Wallet.createRandom()`).
  3. The connected user is prompted to sign exactly **ONE** bulk-funding transaction to send testing gas to the Session Bridge.
  4. The test executes flawlessly without further user interruption, with `onChainEngine.js` using the Session Bridge's local private key as the `masterKey`.
  5. Upon clicking **Sweep**, remaining gas propagates from the execution bots $\rightarrow$ backwards into the Session Bridge $\rightarrow$ finally returning to the user's primary connected Web3 account.
