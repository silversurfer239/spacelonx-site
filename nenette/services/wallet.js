import { CONFIG } from "../config/config.js";
import { readTokenBalance, readNativeBalance } from "./blockchain.js";
import { getMarketData } from "./market.js";
import { fmt, usd } from "./format.js";

export function getWalletProvider() {
  if (window.ethereum?.providers?.length) {
    return window.ethereum.providers.find(p => p.isMetaMask) || window.ethereum.providers[0];
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

export async function getChainStatus(provider = getWalletProvider()) {
  if (!provider) return { available: false, chainId: null, chainName: "No wallet", isPolygon: false };
  const chainId = await provider.request({ method: "eth_chainId" });
  return {
    available: true,
    chainId,
    chainName: chainId === "0x89" ? "Polygon Mainnet" : `Chain ${chainId}`,
    isPolygon: chainId === "0x89"
  };
}

export async function ensurePolygon(provider = getWalletProvider()) {
  if (!provider) throw new Error("No browser wallet detected.");
  const chainId = await provider.request({ method: "eth_chainId" });
  if (chainId === "0x89") return true;

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] });
    return true;
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
      return true;
    }
    throw switchError;
  }
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
  const slxValue = slxNumber * price;
  const diamondYearly = slxNumber * 0.20;
  const diamondMonthly = diamondYearly / 12;
  const diamondDaily = diamondYearly / 365;

  return {
    address,
    short: `${address.slice(0, 6)}...${address.slice(-4)}`,
    slx,
    pol,
    market,
    slxNumber,
    polNumber,
    slxValue,
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

  if (snapshot.slxNumber > 0) score += 20; else flags.push("No SLX balance detected.");
  if (snapshot.polNumber > 0.02) score += 15; else flags.push("Low POL balance for network fees.");
  if (snapshot.market.status === "Live API") score += 10; else flags.push("Market data fallback is active.");
  if (snapshot.slxValue > 10) score += 10;

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    flags: flags.length ? flags : ["No major wallet readiness issue detected."],
    status: score >= 80 ? "READY" : score >= 60 ? "WATCH" : "LIMITED"
  };
}

export function snapshotToMarkdown(snapshot) {
  const health = walletHealth(snapshot);
  return `# Nénette AI V7.5 Wallet Snapshot\n\nGenerated: ${new Date(snapshot.generatedAt).toLocaleString()}\nWallet: ${snapshot.address}\n\n## Balances\n- SLX: ${fmt(snapshot.slxNumber)} ${snapshot.slx.symbol}\n- POL: ${fmt(snapshot.polNumber, 6)} POL\n- SLX value: ${usd(snapshot.slxValue)}\n\n## Staking Simulation\n- Diamond yearly: ${fmt(snapshot.diamondYearly)} SLX\n- Diamond monthly: ${fmt(snapshot.diamondMonthly)} SLX\n- Diamond daily: ${fmt(snapshot.diamondDaily)} SLX\n\n## Wallet Health\n- Score: ${health.score}/100\n- Status: ${health.status}\n${health.flags.map(flag => `- ${flag}`).join("\n")}\n\n## Sources\n- Market status: ${snapshot.market.status}\n- RPC source: ${snapshot.slx.rpc || snapshot.pol.rpc || "N/A"}\n`;
}
