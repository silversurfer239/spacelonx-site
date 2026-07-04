# Nénette AI V7.6 Multi-Wallet Provider

V7.6 keeps the complete V7.5 terminal and adds a true wallet selector.

## Wallet options
- MetaMask (explicit injected provider)
- Rabby Wallet (explicit injected provider)
- Coinbase Wallet (explicit injected provider)
- WalletConnect QR through Reown AppKit for mobile wallets
- Other EIP-6963 injected EVM wallets when detected

## Mobile
WalletConnect is the recommended connection method on iPhone and Android. The QR/deep-link modal is loaded only when requested.

## Architecture
- Static GitHub Pages deployment
- Reown AppKit loaded lazily from an ESM CDN
- Polygon Mainnet only
- Public read-only SLX and POL balance analysis
- Multiple public addresses can be saved locally; one wallet session is active at a time on the Starter plan

## Security
- No seed phrase or private key request
- No transaction signature request
- Reown Project ID is public by design and domain-allowlisted
- No App ID or secret is required for this web deployment

## Deployment
Upload all extracted files and folders into `spacelonx-site/nenette/`, replacing the existing V7.5 files.
