import { CONFIG } from "../config/config.js";
import { readTokenBalance, readNativeBalance } from "./blockchain.js";
import { getMarketData } from "./market.js";
import { fmt, usd } from "./format.js";

export function getWalletProvider() {
  if (window.ethereum?.providers?.length) {
    return window.ethereum.providers.find(p => p.isMetaMask && !p.isRabby && !p.isCoinbaseWallet) || window.ethereum.providers[0];
  }
  return window.ethereum || null;
}

export function walletAvailable() {
  return Boolean(getWalletProvider());
}

export async function connectWallet() {
  const provider = getWalletProvider();
  if (!provider) throw new Error("No browser wallet detected. Install MetaMask or another EVM wallet.");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("Wallet connection rejected or no account returned.");
  return { provider, address: accounts[0] };
}

export async function getConnectedAccounts() {
  const provider = getWalletProvider();
  if (!provider) return [];
  try {
    return await provider.request({ method: "eth_accounts" });
  } catch {
    return [];
  }
}

function chainLabel(chainId) {
  const labels = {
    "0x1": "Ethereum Mainnet",
    "0x89": "Polygon Mainnet",
    "0xa": "Optimism",
    "0x38": "BNB Smart Chain",
    "0xa4b1": "Arbitrum One",
    "0x2105": "Base"
  };
  return labels[String(chainId || "").toLowerCase()] || `Chain ${chainId}`;
}

export async function getChainStatus(provider = getWalletProvider()) {
  if (!provider?.request) return { available: false, chainId: null, chainName: "No wallet", isPolygon: false };
  const chainId = String(await provider.request({ method: "eth_chainId" })).toLowerCase();
  return {
    available: true,
    chainId,
    chainName: chainLabel(chainId),
    isPolygon: chainId === "0x89"
  };
}

async function waitForPolygon(provider, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await getChainStatus(provider);
    if (status.isPolygon) return status;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const current = await getChainStatus(provider);
  throw new Error(`Polygon switch was not confirmed. Current network: ${current.chainName}.`);
}

export async function ensurePolygon(provider = getWalletProvider()) {
  if (!provider?.request) throw new Error("No browser wallet detected.");
  const current = await getChainStatus(provider);
  if (current.isPolygon) return current;

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] });
  } catch (switchError) {
    if (switchError?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x89",
          chainName: "Polygon Mainnet",
          nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
          rpcUrls: [CONFIG.rpcList[0] || "https://polygon-rpc.com"],
          blockExplorerUrls: ["https://polygonscan.com"]
        }]
      });
    } else {
      throw switchError;
    }
  }

  return waitForPolygon(provider);
}

export async function buildWalletSnapshot(address) {
  if (!ethers.isAddress(address)) throw new Error("Invalid Polygon wallet address.");
  const [market, slx, pol] = await Promise.all([
    getMarketData(),
    readTokenBalance(address),
    readNativeBalance(address)
  ]);

  const slxNumber = Number(slx.balance || 0);
  const polNumber = Number(pol.balance || 0);
  const price = Number(market.priceUsd || 0);
  const marketIsLive = market.status === "Live API";
  const slxValue = slxNumber * price;
  const diamondApr = Number(CONFIG.diamondApr || 0.20);
  const diamondYearly = slxNumber * diamondApr;
  const diamondMonthly = diamondYearly / 12;
  const diamondDaily = diamondYearly / 365;

  return {
    address,
    short: `${address.slice(0, 6)}...${address.slice(-4)}`,
    slx,
    pol,
    market,
    marketIsLive,
    slxValueIsEstimate: !marketIsLive,
    slxNumber,
    polNumber,
    slxValue,
    diamondApr,
    diamondYearly,
    diamondMonthly,
    diamondDaily,
    generatedAt: new Date().toISOString(),
    explorerUrl: `https://polygonscan.com/address/${address}`,
    tokenUrl: `${CONFIG.polygonscanUrl}?a=${address}`
  };
}

export function walletHealth(snapshot) {
  let score = 45;
  const flags = [];
  const marketIsLive = snapshot.market.status === "Live API";

  if (snapshot.slxNumber > 0) score += 20; else flags.push("No SLX balance detected.");
  if (snapshot.polNumber > 0.02) score += 15; else flags.push("Low POL balance for network fees.");

  if (marketIsLive) {
    score += 10;
    if (snapshot.slxValue > 10) score += 10;
  } else {
    score = Math.min(score, 75);
    flags.push("Live market data is unavailable: the USD value uses the configured fallback price and is only an estimate.");
  }

  flags.push(`Diamond figures are a simulation at ${(snapshot.diamondApr * 100).toFixed(0)}% APR, not rewards read from a staking contract.`);

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: normalized,
    flags,
    status: marketIsLive ? (normalized >= 80 ? "READY" : normalized >= 60 ? "WATCH" : "LIMITED") : "PROVISIONAL",
    provisional: !marketIsLive
  };
}

export function snapshotToMarkdown(snapshot) {
  const health = walletHealth(snapshot);
  const valueLabel = snapshot.marketIsLive ? "Live market value" : "Estimated value using fallback price";
  return `# Nénette AI V7.6.2 Wallet Snapshot\n\nGenerated: ${new Date(snapshot.generatedAt).toLocaleString()}\nWallet: ${snapshot.address}\n\n## Balances\n- SLX: ${fmt(snapshot.slxNumber)} ${snapshot.slx.symbol}\n- POL: ${fmt(snapshot.polNumber, 6)} POL\n- ${valueLabel}: ${usd(snapshot.slxValue)}\n- Price source: ${snapshot.market.status} (${snapshot.market.source || "N/A"})\n\n## Diamond Simulation (${(snapshot.diamondApr * 100).toFixed(0)}% APR)\n- Yearly simulation: ${fmt(snapshot.diamondYearly)} SLX\n- Monthly simulation: ${fmt(snapshot.diamondMonthly)} SLX\n- Daily simulation: ${fmt(snapshot.diamondDaily)} SLX\n- These figures are projections only and are not on-chain accrued rewards.\n\n## Wallet Health\n- Score: ${health.score}/100\n- Status: ${health.status}\n${health.flags.map(flag => `- ${flag}`).join("\n")}\n\n## Sources\n- Market status: ${snapshot.market.status}\n- Market source: ${snapshot.market.source || "N/A"}\n- RPC source: ${snapshot.slx.rpc || snapshot.pol.rpc || "N/A"}\n`;
}
