import { getMarketData, getMarketScore, marketSignal, isMarketPriceLive } from "./market.js";
import { getBlockchainStats, blockchainScore } from "./blockchain.js";
import { getHolderStats, trustScore } from "./holders.js";
import { getSettings } from "./storage.js";
import { stakingPools } from "./staking.js";
import { usd, fmt } from "./format.js";

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

function riskFromScore(score) {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MODERATE";
  if (score >= 40) return "ELEVATED";
  return "HIGH";
}

function recommendationFor({ market, blockchain, holders, globalScore }) {
  if (!blockchain) return "Pause any external claim until Polygon RPC and contract status are readable again.";
  if (!isMarketPriceLive(market)) return "Keep communication conservative: both API and on-chain pool pricing are unavailable, so avoid live price claims.";
  if (market.status === "On-chain Pool") return "On-chain QuickSwap spot pricing is active. Price and liquidity can be shown, but volume and 24H change should remain marked unavailable.";
  if (Number(market.liquidityUsd) < 1000) return "Priority: strengthen liquidity and keep users informed that liquidity remains thin.";
  if (!holders?.lpLocked) return "Priority: verify LP lock status before any investor-facing communication.";
  if (globalScore >= 80) return "Operational: continue growth, community updates and product iteration while monitoring liquidity.";
  if (globalScore >= 60) return "Controlled launch posture: continue deployment, but monitor market depth and trust indicators.";
  return "Risk-first posture: fix weak indicators before promoting the terminal widely.";
}

function buildFlags({ market, blockchain, holders }) {
  const flags = [];

  if (!isMarketPriceLive(market)) flags.push("Market data is in full fallback mode: DexScreener and QuickSwap reserve pricing are unavailable.");
  if (market.status === "On-chain Pool") flags.push("Market price uses the QuickSwap pool spot ratio; volume and historical change metrics are unavailable.");
  if (Number(market.liquidityUsd) < 1000) flags.push("Liquidity is below the preferred 1,000 USD minimum.");
  if (Number(market.change24h) <= -10) flags.push("24H price change shows a material drawdown.");
  if (!blockchain) flags.push("Blockchain stats are unavailable.");
  if (blockchain && !blockchain.contractDetected) flags.push("SLX contract detection failed.");
  if (!holders?.lpLocked) flags.push("LP lock is not confirmed by the local trust module.");
  if (holders?.holders === "Indexer required") flags.push("Holder and whale tracking still require an indexer or backend.");

  if (!flags.length) flags.push("No major local risk flag detected.");
  return flags;
}

function buildActions({ market, blockchain, holders, settings }) {
  const actions = [];

  if (!isMarketPriceLive(market)) {
    actions.push("Check DexScreener, QuickSwap pool reads and POL/USD references before publishing market screenshots.");
  } else if (market.status === "On-chain Pool") {
    actions.push("Use the Market module for the current QuickSwap spot price and pool liquidity; keep volume and change metrics marked unavailable.");
  } else {
    actions.push("Use the Market module as the live source for SLX price, liquidity and 24H activity.");
  }

  if (Number(market.liquidityUsd) < 5000) {
    actions.push("Track liquidity closely; low liquidity can create high volatility and execution slippage.");
  }

  if (holders?.holders === "Indexer required") {
    actions.push("For V7.6, add a holder indexer or third-party API before claiming whale tracking.");
  }

  if (settings.savedWallets?.length) {
    actions.push(`Review the ${settings.savedWallets.length} saved wallet(s) in Portfolio before making portfolio conclusions.`);
  } else {
    actions.push("Save at least one wallet in Portfolio to enrich future strategic briefs.");
  }

  actions.push("Keep staking language clear: current staking module is a simulator, not an on-chain staking contract.");
  return actions;
}

export async function generateStrategicBrief() {
  const settings = getSettings();
  const market = await getMarketData();

  let blockchain = null;
  let holders = null;

  try { blockchain = await getBlockchainStats(); } catch {}
  try { holders = await getHolderStats(); } catch {}

  const marketScore = clamp(getMarketScore(market));
  const chainScore = blockchain ? clamp(blockchainScore(blockchain)) : 0;
  const trust = holders ? clamp(trustScore(holders)) : 0;
  const productScore = 92;
  const globalScore = clamp((marketScore + chainScore + trust + productScore) / 4);

  const brief = {
    version: "Nénette AI V7.6.5 Liquidity Accuracy Strategic Brief",
    generatedAt: new Date().toISOString(),
    globalScore,
    riskLevel: riskFromScore(globalScore),
    recommendation: recommendationFor({ market, blockchain, holders, globalScore }),
    executiveSummary: [
      `SLX terminal readiness is ${globalScore}/100 with a ${riskFromScore(globalScore)} risk level.`,
      marketSignal(market),
      blockchain ? "Polygon blockchain reading is operational." : "Polygon blockchain reading is temporarily unavailable.",
      holders?.lpLocked ? `LP lock is displayed as ${holders.lpLockPercent}% until ${new Date(holders.lpUnlockDate).toLocaleDateString()}.` : "LP lock status needs verification."
    ],
    metrics: {
      price: usd(market.priceUsd),
      liquidity: usd(market.liquidityUsd),
      volume24h: market.metricsLive ? usd(market.volume24h) : "N/A",
      change24h: market.metricsLive ? `${fmt(market.change24h)}%` : "N/A",
      marketStatus: market.status,
      latestBlock: blockchain ? fmt(blockchain.latestBlock, 0) : "N/A",
      circulatingSupply: blockchain ? `${fmt(blockchain.circulatingSupply, 0)} ${blockchain.symbol}` : "N/A",
      stakingPools: stakingPools.map(pool => `${pool.name} ${pool.apr}% APR`).join(" · "),
      savedWallets: settings.savedWallets?.length || 0,
      lastConnectedWallet: settings.lastConnectedWallet ? `${settings.lastConnectedWallet.slice(0,6)}...${settings.lastConnectedWallet.slice(-4)}` : "N/A"
    },
    scores: {
      market: marketScore,
      blockchain: chainScore,
      trust,
      product: productScore
    },
    riskFlags: buildFlags({ market, blockchain, holders }),
    actions: buildActions({ market, blockchain, holders, settings }),
    nextBuild: "V7.7 should add optional backend/indexer support for holder analytics, whale movement detection and richer historical charts."
  };

  return brief;
}

export function briefToMarkdown(brief) {
  return `# ${brief.version}

Generated: ${new Date(brief.generatedAt).toLocaleString()}

## Global Status
Score: ${brief.globalScore}/100
Risk level: ${brief.riskLevel}
Recommendation: ${brief.recommendation}

## Executive Summary
${brief.executiveSummary.map(item => `- ${item}`).join("\n")}

## Metrics
- Price: ${brief.metrics.price}
- Liquidity: ${brief.metrics.liquidity}
- 24H volume: ${brief.metrics.volume24h}
- 24H change: ${brief.metrics.change24h}
- Market status: ${brief.metrics.marketStatus}
- Latest block: ${brief.metrics.latestBlock}
- Circulating supply: ${brief.metrics.circulatingSupply}
- Staking pools: ${brief.metrics.stakingPools}
- Saved wallets: ${brief.metrics.savedWallets}
- Last connected wallet: ${brief.metrics.lastConnectedWallet}

## Scores
- Market: ${brief.scores.market}/100
- Blockchain: ${brief.scores.blockchain}/100
- Trust: ${brief.scores.trust}/100
- Product: ${brief.scores.product}/100

## Risk Flags
${brief.riskFlags.map(item => `- ${item}`).join("\n")}

## Recommended Actions
${brief.actions.map(item => `- ${item}`).join("\n")}

## Next Build
${brief.nextBuild}
`;
}
