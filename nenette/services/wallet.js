import { CONFIG } from "../config/config.js";
import { readTokenBalance, readNativeBalance } from "./blockchain.js";
import { getMarketData, isMarketPriceLive } from "./market.js";
import { buildExitAnalysis } from "./liquidity.js";
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
  const marketIsLive = isMarketPriceLive(market);
  const slxValue = slxNumber * price;
  const diamondApr = Number(CONFIG.diamondApr || 0.20);
  const diamondYearly = slxNumber * diamondApr;
  const diamondMonthly = diamondYearly / 12;
  const diamondDaily = diamondYearly / 365;
  const exitAnalysis = buildExitAnalysis(market, slxNumber, CONFIG.exitPresets);

  return {
    address,
    short: `${address.slice(0, 6)}...${address.slice(-4)}`,
    slx,
    pol,
    market,
    marketIsLive,
    marketIsOnChain: market.priceMode === "onchain",
    slxValueIsEstimate: market.priceMode === "fallback",
    slxNumber,
    polNumber,
    slxValue,
    diamondApr,
    diamondYearly,
    diamondMonthly,
    diamondDaily,
    exitAnalysis,
    generatedAt: new Date().toISOString(),
    explorerUrl: `https://polygonscan.com/address/${address}`,
    tokenUrl: `${CONFIG.polygonscanUrl}?a=${address}`
  };
}

export function walletHealth(snapshot) {
  let score = 45;
  const flags = [];
  const marketIsLive = snapshot.marketIsLive ?? isMarketPriceLive(snapshot.market);

  if (snapshot.slxNumber > 0) score += 20; else flags.push("No SLX balance detected.");
  if (snapshot.polNumber > 0.02) score += 15; else flags.push("Low POL balance for network fees.");

  if (marketIsLive) {
    score += snapshot.market.priceMode === "onchain" ? 8 : 10;
    if (snapshot.slxValue > 10) score += 10;
    if (snapshot.market.priceMode === "onchain") {
      flags.push("USD valuation uses the live QuickSwap pool spot price. The exit simulator estimates slippage against current reserves.");
    }
  } else {
    score = Math.min(score, 75);
    flags.push("Live API and on-chain pool pricing are unavailable: the USD value uses the configured fallback price and is only an estimate.");
  }

  if (snapshot.exitAnalysis?.available) {
    score = Math.min(score, snapshot.exitAnalysis.scoreCap);
    flags.push(...snapshot.exitAnalysis.flags.slice(0, 4));
  }

  flags.push(`Diamond figures are a simulation at ${(snapshot.diamondApr * 100).toFixed(0)}% APR, not rewards read from a staking contract.`);

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  let status;
  if (!marketIsLive) status = "PROVISIONAL";
  else if (snapshot.exitAnalysis?.status === "EXTREME EXIT RISK") status = "EXTREME EXIT RISK";
  else if (snapshot.exitAnalysis?.status === "HIGH EXIT RISK") status = "HIGH EXIT RISK";
  else if (snapshot.exitAnalysis?.status === "ELEVATED EXIT RISK") status = "EXIT WATCH";
  else if (snapshot.exitAnalysis?.status === "LIQUIDITY WATCH") status = "LIQUIDITY WATCH";
  else status = normalized >= 80 ? "READY" : normalized >= 60 ? "WATCH" : "LIMITED";

  return {
    score: normalized,
    flags,
    status,
    provisional: !marketIsLive,
    exitRisk: snapshot.exitAnalysis?.status || "UNAVAILABLE"
  };
}

function exitRowsMarkdown(snapshot) {
  if (!snapshot.exitAnalysis?.available) return "Exit simulation unavailable: live on-chain reserves are required.";
  const rows = snapshot.exitAnalysis.scenarios.map(item =>
    `| ${item.percent.toFixed(item.percent < 1 ? 2 : 0)}% | ${fmt(item.amountSlx)} | ${usd(item.spotValueUsd)} | ${fmt(item.outputQuote, 6)} ${item.quoteToken} | ${usd(item.outputUsd)} | ${item.executionLossPct.toFixed(1)}% | ${item.recoveryPct.toFixed(1)}% |`
  ).join("\n");
  return `| Wallet sold | SLX amount | Spot valuation | Estimated quote | Estimated USD | Execution shortfall | Recovery |\n|---:|---:|---:|---:|---:|---:|---:|\n${rows}`;
}

export function snapshotToMarkdown(snapshot) {
  const health = walletHealth(snapshot);
  const valueLabel = snapshot.market.priceMode === "api"
    ? "Live market value"
    : snapshot.market.priceMode === "onchain"
      ? "On-chain QuickSwap spot value"
      : "Estimated value using fallback price";
  return `# Nénette AI V8.0 Nénette Pure Snapshot\n\nGenerated: ${new Date(snapshot.generatedAt).toLocaleString()}\nWallet: ${snapshot.address}\n\n## Balances\n- SLX: ${fmt(snapshot.slxNumber)} ${snapshot.slx.symbol}\n- POL: ${fmt(snapshot.polNumber, 6)} POL\n- ${valueLabel}: ${usd(snapshot.slxValue)}\n- Price source: ${snapshot.market.status} (${snapshot.market.source || "N/A"})\n\n## Liquidity & Exit Simulation\n- Status: ${snapshot.exitAnalysis?.status || "UNAVAILABLE"}\n- Pool liquidity: ${usd(snapshot.market.liquidityUsd)}\n- Current quote reserve: ${snapshot.exitAnalysis?.available ? `${fmt(snapshot.exitAnalysis.quoteReserveAmount, 6)} ${snapshot.exitAnalysis.quoteToken} (${usd(snapshot.exitAnalysis.quoteReserveUsd)})` : "N/A"}
- Direct-pool output upper bound: always below the current quote reserve
- Estimated full-wallet exit: ${snapshot.exitAnalysis?.available ? usd(snapshot.exitAnalysis.fullExitUsd) : "N/A"}
- Full-wallet recovery versus spot: ${snapshot.exitAnalysis?.available ? `${snapshot.exitAnalysis.fullExitRecoveryPct.toFixed(1)}%` : "N/A"}\n- Fee assumption: ${((snapshot.exitAnalysis?.feeBps || CONFIG.swapFeeBps || 30) / 100).toFixed(2)}%\n\n${exitRowsMarkdown(snapshot)}\n\nThese estimates use a direct constant-product pool calculation. The current quote reserve is a pool balance and a hard upper bound for direct output; it is not guaranteed proceeds at the current spot price. Gas, MEV, routing, market movement, transfer taxes and other pools are excluded. No transaction is created.\n\n## Diamond Simulation (${(snapshot.diamondApr * 100).toFixed(0)}% APR)\n- Yearly simulation: ${fmt(snapshot.diamondYearly)} SLX\n- Monthly simulation: ${fmt(snapshot.diamondMonthly)} SLX\n- Daily simulation: ${fmt(snapshot.diamondDaily)} SLX\n- These figures are projections only and are not on-chain accrued rewards.\n\n## Wallet Health\n- Score: ${health.score}/100\n- Status: ${health.status}\n${health.flags.map(flag => `- ${flag}`).join("\n")}\n\n## Sources\n- Market status: ${snapshot.market.status}\n- Market source: ${snapshot.market.source || "N/A"}\n- Pair address: ${snapshot.market.pairAddress || "N/A"}\n- Pool block: ${snapshot.market.blockNumber || "N/A"}\n- RPC source: ${snapshot.market.rpc || snapshot.slx.rpc || snapshot.pol.rpc || "N/A"}\n`;
}
