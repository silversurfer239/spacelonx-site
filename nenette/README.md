# Nénette AI V7.6.3 — QuickSwap On-Chain Price Engine

V7.6.3 keeps the V7.6.2 wallet, Polygon and data-integrity fixes and adds an independent live price path when DexScreener is unavailable.

## Market source order
1. DexScreener pair API.
2. DexScreener token API.
3. QuickSwap V2 pool reserves read directly on Polygon.
4. Protected static fallback only when all live sources fail.

## On-chain calculation
- Reads `token0`, `token1` and `getReserves` from the configured QuickSwap V2 pair.
- Detects the SLX side and quote-token side dynamically.
- Calculates the live SLX/quote spot ratio from normalized pool reserves.
- Converts the quote asset to USD with Chainlink POL/USD, with CoinGecko as a secondary POL/USD reference.
- Calculates pool liquidity and FDV from live reserve and supply reads.
- Marks 1H, 6H, 24H volume and change as unavailable when only pool reserves are active.

## Data integrity
- `On-chain Pool` is shown separately from `Live API`.
- Pool spot price is not presented as a guaranteed execution price.
- Static fallback values remain clearly marked as estimates.
- Diamond values remain simulations, not accrued staking rewards.

## Security
Read-only market and wallet analysis. No seed phrase, private key or transaction signature is requested.

## Deployment
Upload all extracted files and folders into `spacelonx-site/nenette/`, replacing the current V7.6.2 files.
