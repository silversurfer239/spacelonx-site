# Nénette AI V7.6.5 — Liquidity Accuracy Patch

V7.6.5 keeps the complete V7.6.4 multi-wallet, on-chain price and exit simulator, then corrects liquidity terminology and makes the distinction between spot valuation, estimated exit proceeds and pool reserves explicit.

## Added and corrected in V7.6.5
- Replaces the ambiguous `Quote-side Reserve` label with `Current Quote Reserve`.
- Removes the inaccurate wording `before market movement`.
- States that pool price changes from the first trade.
- States that any direct-swap output remains below the current quote reserve.
- Displays the current quote reserve in both quote-token units and USD.
- Adds estimated full-wallet exit proceeds.
- Adds full-wallet recovery percentage versus spot valuation.
- Adds recovery percentage to every preset and custom exit scenario.
- Renames `execution loss` to `execution shortfall` for clearer interpretation.
- Refines liquidity-risk scoring with an `EXTREME EXIT RISK` band for severe reserve imbalance or very low recovery.
- Updates Markdown exports with the corrected terminology and full-exit metrics.

## Model
The simulator applies a direct Uniswap V2 / QuickSwap V2 constant-product calculation to current on-chain pool reserves. The configured fee assumption is 0.30% (`swapFeeBps: 30`).

The current quote reserve is not an amount that can be withdrawn at the displayed spot price. It is the present quote-token balance of the pool. Every trade changes the reserve ratio and therefore the pool price. Direct-swap output is mathematically lower than the current quote reserve.

The model does not create a transaction and excludes gas, MEV, routing, other pools, market movement and token-specific transfer mechanics. Results are estimates, not guaranteed execution quotes.

## Preserved
- MetaMask, Rabby, Coinbase Wallet and WalletConnect.
- Polygon Mainnet confirmation.
- DexScreener → QuickSwap on-chain → fallback market hierarchy.
- Chainlink POL/USD reference with CoinGecko backup.
- Preset simulations for 1%, 5%, 10%, 25% and 100%.
- Custom sale percentage from 0.01% to 100%.
- Diamond simulations clearly separated from on-chain rewards.
- AI Memory and Investor Intelligence.

## Deployment
Upload all extracted files and folders into `spacelonx-site/nenette/`, replacing the current V7.6.4 files.

Suggested commit message:

`Deploy Nénette AI V7.6.5 Liquidity Accuracy Patch`
