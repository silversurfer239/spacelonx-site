# Nénette AI V7.6.4 — Liquidity & Exit Simulator

V7.6.4 keeps the complete V7.6.3 multi-wallet and on-chain price engine, then adds liquidity-aware wallet scoring and a read-only exit simulator.

## Added in V7.6.4
- QuickSwap V2 constant-product exit estimates.
- Preset simulations for 1%, 5%, 10%, 25% and 100% of a wallet's SLX balance.
- Custom sale percentage from 0.01% to 100%.
- Estimated POL/quote received and USD proceeds.
- Execution loss versus current spot valuation.
- Post-trade pool price impact.
- Wallet value / pool liquidity and wallet / SLX reserve ratios.
- Wallet readiness score capped when practical exit liquidity is weak.
- Market-level pool depth stress tests.
- Markdown export including exit scenarios and model assumptions.

## Model
The simulator applies a direct Uniswap V2 / QuickSwap V2 constant-product calculation to the current on-chain pool reserves. The configurable fee assumption is 0.30% (`swapFeeBps: 30`).

It does not create a transaction and excludes gas, MEV, routing, other pools, price movement and token-specific transfer mechanics. Results are estimates, not guaranteed execution quotes.

## Preserved
- MetaMask, Rabby, Coinbase Wallet and WalletConnect.
- Polygon Mainnet confirmation.
- DexScreener → QuickSwap on-chain → fallback market hierarchy.
- Chainlink POL/USD reference with CoinGecko backup.
- Clear fallback valuation labels.
- Diamond staking simulations clearly separated from on-chain rewards.
- AI Memory and Investor Intelligence.

## Deployment
Upload all extracted files and folders into `spacelonx-site/nenette/`, replacing the current V7.6.3 files.

Suggested commit message:

`Deploy Nénette AI V7.6.4 Liquidity Exit Simulator`
