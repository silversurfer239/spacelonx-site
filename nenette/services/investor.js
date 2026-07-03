import { getMarketData, getMarketScore, marketSignal } from "./market.js";
import { getBlockchainStats, blockchainScore } from "./blockchain.js";
import { getHolderStats, trustScore } from "./holders.js";
import { getSettings } from "./storage.js";
import { loadMemory, memoryStats } from "./memory.js";
import { usd, fmt } from "./format.js";

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value || 0))));
}

export function riskFromScore(score) {
  if (score >= 80) return "LOW";
  if (score >= 65) return "MODERATE";
  if (score >= 45) return "ELEVATED";
  return "HIGH";
}

function liquidityScore(market) {
  const liq = Number(market?.liquidityUsd || 0);
  if (market?.status !== "Live API") return 35;
  if (liq >= 25000) return 92;
  if (liq >= 10000) return 82;
  if (liq >= 5000) return 72;
  if (liq >= 1000) return 58;
  return 42;
}

function productScore(memory) {
  const stats = memoryStats(memory);
  let score = 76;
  if (stats.briefs) score += 6;
  if (stats.decisions) score += 5;
  if (stats.hasNotes) score += 4;
  return clamp(score);
}

function memoryScore(memory) {
  const stats = memoryStats(memory);
  return clamp(45 + stats.briefs * 5 + stats.decisions * 4 + (stats.hasNotes ? 8 : 0) + Math.min(stats.events, 20));
}

function communityScore() {
  return 64;
}

function walletScore(settings) {
  let score = 45;
  if (settings.savedWallets?.length) score += 25;
  if (settings.savedWallets?.length >= 2) score += 10;
  if (settings.lastConnectedWallet) score += 15;
  return clamp(score);
}

function weighted(scores) {
  return clamp(
    scores.market * 0.20 +
    scores.liquidity * 0.16 +
    scores.blockchain * 0.15 +
    scores.trust * 0.17 +
    scores.product * 0.14 +
    scores.memory * 0.09 +
    scores.wallet * 0.08 +
    scores.community * 0.07
  );
}

function flags({ market, blockchain, holders, memory, settings }) {
  const items = [];
  if (market.status !== "Live API") items.push({ level: "HIGH", title: "Market fallback", note: "DexScreener live data is not confirmed. Avoid public live-price claims until the Market module is live again." });
  if (Number(market.liquidityUsd || 0) < 1000) items.push({ level: "ELEVATED", title: "Thin liquidity", note: "Liquidity remains below the preferred public-readiness threshold." });
  if (Number(market.change24h || 0) <= -10) items.push({ level: "ELEVATED", title: "24H drawdown", note: "The 24H change indicates material volatility." });
  if (!blockchain) items.push({ level: "HIGH", title: "Blockchain unavailable", note: "Polygon RPC or contract reads are not currently available." });
  if (blockchain && !blockchain.contractDetected) items.push({ level: "HIGH", title: "Contract detection", note: "SLX contract detection did not pass the local read check." });
  if (!holders?.lpLocked) items.push({ level: "ELEVATED", title: "LP lock verification", note: "LP lock is not confirmed by the local trust module." });
  if (!memory.briefs.length) items.push({ level: "LOW", title: "No saved brief", note: "Generate and save at least one strategic brief to create an audit trail." });
  if (!settings.savedWallets?.length) items.push({ level: "LOW", title: "No saved wallet", note: "Use Wallet Center or Portfolio to save a Polygon wallet and improve portfolio readiness." });
  if (!items.length) items.push({ level: "LOW", title: "No major local flag", note: "Nénette did not detect a major local risk flag in this run." });
  return items;
}

function actions({ market, holders, settings, memory }) {
  const items = [];
  if (market.status !== "Live API") items.push("Check market endpoints before publishing screenshots or price statements.");
  if (Number(market.liquidityUsd || 0) < 5000) items.push("Keep liquidity language conservative and monitor slippage risk.");
  if (!holders?.lpLocked) items.push("Verify LP lock evidence before investor-facing communication.");
  if (!settings.savedWallets?.length) items.push("Use Wallet Center to connect or save at least one Polygon wallet for portfolio readiness.");
  if (!memory.decisions.length) items.push("Record key project decisions in AI Memory for continuity.");
  items.push("Keep staking language clear: the current staking module is a simulator, not an on-chain staking contract.");
  return items;
}

function projectStatus({ market, blockchain, holders, memory, settings }) {
  return [
    { name: "Website", status: "Live", score: 95, note: "SpacelonX site and whitepaper page are published." },
    { name: "Whitepaper", status: "V1.2 Premium Gold", score: 95, note: "PDF and Word documents are live on the website." },
    { name: "Nénette", status: "V7.5 Wallet Connect", score: 93, note: "Full terminal structure preserved with AI Memory and Investor Intelligence." },
    { name: "Market", status: market.status, score: getMarketScore(market), note: marketSignal(market) },
    { name: "Blockchain", status: blockchain ? "Readable" : "Unavailable", score: blockchain ? blockchainScore(blockchain) : 0, note: blockchain ? "Polygon read checks are operational." : "RPC/contract read unavailable." },
    { name: "LP / Trust", status: holders?.lpLocked ? "LP lock displayed" : "Verification required", score: holders ? trustScore(holders) : 0, note: holders?.lpLocked ? "LP lock is shown by the local trust module." : "Trust source requires verification." },
    { name: "Wallet Connect", status: settings.lastConnectedWallet ? "Connected once" : "Not connected", score: walletScore(settings), note: `${settings.savedWallets?.length || 0} saved wallet(s) in local Portfolio.` },
    { name: "Memory", status: `${memory.briefs.length} saved brief(s)`, score: memoryScore(memory), note: "Local browser memory creates continuity for briefs, notes and decisions." }
  ];
}

export async function buildInvestorIntelligence() {
  const settings = getSettings();
  const memory = loadMemory();
  const market = await getMarketData();
  let blockchain = null;
  let holders = null;
  try { blockchain = await getBlockchainStats(); } catch {}
  try { holders = await getHolderStats(); } catch {}

  const scores = {
    market: clamp(getMarketScore(market)),
    liquidity: liquidityScore(market),
    blockchain: blockchain ? clamp(blockchainScore(blockchain)) : 0,
    trust: holders ? clamp(trustScore(holders)) : 0,
    product: productScore(memory),
    memory: memoryScore(memory),
    community: communityScore(),
    wallet: walletScore(settings)
  };
  const globalScore = weighted(scores);
  const riskLevel = riskFromScore(globalScore);

  return {
    version: "Nénette AI V7.5 Investor Intelligence",
    generatedAt: new Date().toISOString(),
    globalScore,
    riskLevel,
    recommendation: globalScore >= 80 ? "Operational posture: continue growth while monitoring liquidity and trust indicators." : globalScore >= 65 ? "Controlled launch posture: publish carefully and keep market/trust claims conservative." : "Risk-first posture: fix weak indicators before wider promotion.",
    market,
    blockchain,
    holders,
    settings,
    memory,
    metrics: {
      price: usd(market.priceUsd),
      liquidity: usd(market.liquidityUsd),
      volume24h: usd(market.volume24h),
      change24h: `${fmt(market.change24h)}%`,
      marketStatus: market.status,
      latestBlock: blockchain ? fmt(blockchain.latestBlock, 0) : "N/A",
      savedWallets: settings.savedWallets?.length || 0,
      lastConnectedWallet: settings.lastConnectedWallet ? `${settings.lastConnectedWallet.slice(0,6)}...${settings.lastConnectedWallet.slice(-4)}` : "N/A",
      savedBriefs: memory.briefs.length,
      decisions: memory.decisions.length
    },
    scores,
    riskFlags: flags({ market, blockchain, holders, memory, settings }),
    actions: actions({ market, holders, settings, memory }),
    projectStatus: projectStatus({ market, blockchain, holders, memory, settings })
  };
}
