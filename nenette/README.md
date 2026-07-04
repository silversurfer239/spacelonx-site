# Nénette AI V7.6.2 — Network Refresh & Data Integrity

This release keeps the V7.6.1 MetaMask connection fix and corrects the remaining wallet display issues.

## Fixes
- Waits for Polygon Mainnet to be confirmed after wallet connection.
- Refreshes Active Network, Polygon Ready and Last Connected immediately.
- Displays known chain names instead of raw hexadecimal IDs.
- Marks USD valuation as **Estimate** whenever DexScreener is unavailable.
- Shows the fallback price used for the estimate.
- Caps wallet readiness at **PROVISIONAL** while market data is in fallback mode.
- Labels Diamond amounts as a **20% APR simulation**, not accrued on-chain rewards.
- Updates export wording, footer, badge, manifest and service-worker cache.

## Security
Read-only wallet analysis. No seed phrase, private key or transaction signature is requested.

## Deployment
Upload all extracted files and folders into `spacelonx-site/nenette/`, replacing the current files.
