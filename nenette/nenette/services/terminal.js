import { CONFIG } from "../config/config.js";

export const WEB3_LIMITS = {
  walletConnect: "Requires a Reown / WalletConnect Project ID before production activation.",
  stakingContract: "Requires audited staking smart contract address and ABI.",
  holderCount: "Requires indexer API such as Polygonscan, Covalent, Moralis, Alchemy or custom backend.",
  whaleTracker: "Requires indexer or backend listener. Frontend-only polling is not reliable for production."
};

export function terminalReadiness({ market, blockchain, holders }) {
  const checks = [
    { label: "Frontend deployable", ok: true },
    { label: "DexScreener chart link", ok: Boolean(market?.url) },
    { label: "Polygon RPC", ok: Boolean(blockchain?.latestBlock) },
    { label: "SLX contract detected", ok: Boolean(blockchain?.contractDetected) },
    { label: "LP lock displayed", ok: Boolean(holders?.lpLocked) },
    { label: "Injected wallet support", ok: Boolean(window.ethereum) },
    { label: "Service worker", ok: "serviceWorker" in navigator },
    { label: "Staking simulator", ok: true },
    { label: "On-chain staking", ok: false },
    { label: "Real holder indexer", ok: false }
  ];
  const score = Math.round(checks.filter(c => c.ok).length / checks.length * 100);
  return { score, checks };
}

export function dexScreenerEmbedUrl() {
  return `${CONFIG.dexscreenerUrl}?embed=1&theme=dark&trades=0&info=0`;
}

export function deploymentChecklist() {
  return [
    "Upload this folder to /nenette-v7/ or /nenette/ on the SpacelonX site.",
    "Keep the previous Nénette folder as backup until V7 is validated.",
    "Add a homepage button: LAUNCH NÉNETTE AI.",
    "Test Dashboard, Web3 Terminal, Market, Blockchain, Portfolio, Staking and Security after deployment.",
    "Verify the browser console has no blocking JavaScript error.",
    "Do not activate on-chain staking until the contract is deployed and audited."
  ];
}
