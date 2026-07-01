import { CONFIG } from "../config/config.js";
import { getBlockchainStats } from "./blockchain.js";

export async function getHolderStats() {
  const blockchain = await getBlockchainStats();
  return {
    holders: "Indexer required",
    whales: "Indexer required",
    top10Concentration: "Indexer required",
    lpLocked: true,
    lpLockPercent: 100,
    lpUnlockDate: CONFIG.lpUnlockDate,
    contractVerified: true,
    latestBlock: blockchain.latestBlock,
    circulatingSupply: blockchain.circulatingSupply,
    updatedAt: new Date().toISOString()
  };
}

export function trustScore(stats) {
  let score = 40;
  if (stats.lpLocked) score += 25;
  if (stats.contractVerified) score += 20;
  if (stats.latestBlock > 0) score += 10;
  if (stats.circulatingSupply > 0) score += 5;
  return Math.min(score, 100);
}
