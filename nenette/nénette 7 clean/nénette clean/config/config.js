export const CONFIG = {
  version: "7.0.0-clean",
  ticker: "SLX",
  chainName: "Polygon Mainnet",
  chainId: 137,
  slxContract: "0xcAC47b268787a280816b50e7F9b679e81B8a179e",
  slxPair: "0x837c80c5f4f0165110a36ef0e10dd95f2579eed4",
  dexscreenerUrl: "https://dexscreener.com/polygon/0x837c80c5f4f0165110a36ef0e10dd95f2579eed4",
  dexscreenerApiUrl: "https://api.dexscreener.com/latest/dex/pairs/polygon/0x837c80c5f4f0165110a36ef0e10dd95f2579eed4",
  polygonscanUrl: "https://polygonscan.com/token/0xcAC47b268787a280816b50e7F9b679e81B8a179e",
  lpLockUrl: "https://app.uncx.network/lockers/univ2/chain/137/address/0x837c80C5F4f0165110A36eF0e10DD95F2579EeD4/lock/0",
  lpUnlockDate: "2027-06-16T14:15:00Z",
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
