export const CONFIG = {
  version: "8.0.0-nenette-pure",
  buildName: "Nénette Pure",
  swapFeeBps: 30,
  exitPresets: [0.01, 0.05, 0.10, 0.25, 1],
  ticker: "SLX",
  chainName: "Polygon Mainnet",
  chainId: 137,
  reownProjectId: "94d6600d7b6bc898f5870bbd2e6684e2",
  appUrl: "https://silversurfer239.github.io",
  appName: "Nénette AI V8.0 — SpacelonX Intelligence Dashboard",
  appDescription: "Unified SpacelonX dashboard for market, wallet, liquidity, staking simulation, tokenomics, trust, roadmap and AI intelligence.",
  slxContract: "0xcAC47b268787a280816b50e7F9b679e81B8a179e",
  slxPair: "0x837c80c5f4f0165110a36ef0e10dd95f2579eed4",
  dexscreenerUrl: "https://dexscreener.com/polygon/0x837c80c5f4f0165110a36ef0e10dd95f2579eed4",
  dexscreenerApiUrl: "https://api.dexscreener.com/latest/dex/pairs/polygon/0x837c80c5f4f0165110a36ef0e10dd95f2579eed4",
  polygonscanUrl: "https://polygonscan.com/token/0xcAC47b268787a280816b50e7F9b679e81B8a179e",
  lpLockUrl: "https://app.uncx.network/lockers/univ2/chain/137/address/0x837c80C5F4f0165110A36eF0e10DD95F2579EeD4/lock/0",
  lpUnlockDate: "2027-06-16T14:15:00Z",
  diamondApr: 0.20,
  chainlinkPolUsdFeed: "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0",
  maxOracleAgeSeconds: 86400,
  coingeckoPolUrl: "https://api.coingecko.com/api/v3/simple/price?ids=polygon-ecosystem-token,matic-network&vs_currencies=usd",
  projectLinks: {
    website: "https://silversurfer239.github.io/spacelonx-site/",
    dashboard: "https://silversurfer239.github.io/spacelonx-site/nenette/",
    dexscreener: "https://dexscreener.com/polygon/0x837c80c5f4f0165110a36ef0e10dd95f2579eed4",
    polygonscan: "https://polygonscan.com/token/0xcAC47b268787a280816b50e7F9b679e81B8a179e",
    lpLock: "https://app.uncx.network/lockers/univ2/chain/137/address/0x837c80C5F4f0165110A36eF0e10DD95F2579EeD4/lock/0",
    x: "https://x.com/spacelonxslx",
    telegram: "https://t.me/SpacelonXCommunity"
  },
  tokenomics: [
    { name: "Team", percent: 15, vesting: "Vesting framework" },
    { name: "Treasury", percent: 15, vesting: "Vesting framework" },
    { name: "Ecosystem", percent: 5, vesting: "Vesting framework" },
    { name: "Advisors", percent: 5, vesting: "Vesting framework" },
    { name: "Liquidity, launch and circulation", percent: 60, vesting: "Operational allocation" }
  ],
  roadmap: [
    { phase: "Phase 0", title: "Polygon Amoy Testnet", status: "DONE", detail: "Token and ecosystem validation." },
    { phase: "Phase 1", title: "Community Foundation", status: "DONE", detail: "Website, X and Telegram launch." },
    { phase: "Phase 2", title: "Liquidity & Launch", status: "DONE", detail: "QuickSwap V2 pool and LP lock." },
    { phase: "Phase 3", title: "Mainnet Operations", status: "ACTIVE", detail: "Nénette, market intelligence and listings preparation." },
    { phase: "Phase 4", title: "Growth", status: "NEXT", detail: "CoinGecko, CMC, partnerships and CEX expansion." }
  ],
  fallback: {
    pair: "SLX / WPOL",
    priceUsd: 0.000005978,
    liquidityUsd: 1100,
    fdvUsd: 5900,
    marketCapUsd: 5900,
    volume24h: 0,
    change24h: 0,
    dex: "QuickSwap V2"
  },
  rpcList: [
    "https://polygon-bor-rpc.publicnode.com",
    "https://polygon-rpc.com",
    "https://rpc.ankr.com/polygon"
  ]
};
