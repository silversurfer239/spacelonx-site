import { CONFIG } from "../config/config.js";

function fallback(error) {
  return {
    pair: CONFIG.fallback.pair,
    priceUsd: CONFIG.fallback.priceUsd,
    liquidityUsd: CONFIG.fallback.liquidityUsd,
    fdvUsd: CONFIG.fallback.fdvUsd,
    marketCapUsd: CONFIG.fallback.marketCapUsd,
    volume24h: CONFIG.fallback.volume24h,
    change24h: CONFIG.fallback.change24h,
    buys24h: 0,
    sells24h: 0,
    txns24h: 0,
    dex: CONFIG.fallback.dex,
    status: "Fallback",
    source: `Fallback · ${error?.message || "API unavailable"}`,
    url: CONFIG.dexscreenerUrl,
    updatedAt: new Date().toISOString()
  };
}

export async function getMarketData() {
  try {
    const response = await fetch(CONFIG.dexscreenerApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`DexScreener ${response.status}`);
    const data = await response.json();
    const pair = data.pair || (data.pairs && data.pairs[0]);
    if (!pair) throw new Error("Pair not found");
    return {
      pair: `${pair.baseToken?.symbol || "SLX"} / ${pair.quoteToken?.symbol || "WPOL"}`,
      priceUsd: Number(pair.priceUsd || CONFIG.fallback.priceUsd),
      liquidityUsd: Number(pair.liquidity?.usd || CONFIG.fallback.liquidityUsd),
      fdvUsd: Number(pair.fdv || CONFIG.fallback.fdvUsd),
      marketCapUsd: Number(pair.marketCap || pair.fdv || CONFIG.fallback.marketCapUsd),
      volume24h: Number(pair.volume?.h24 || 0),
      change24h: Number(pair.priceChange?.h24 || 0),
      buys24h: Number(pair.txns?.h24?.buys || 0),
      sells24h: Number(pair.txns?.h24?.sells || 0),
      txns24h: Number((pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0)),
      dex: pair.dexId || CONFIG.fallback.dex,
      status: "Live API",
      source: "DexScreener API",
      url: pair.url || CONFIG.dexscreenerUrl,
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    return fallback(error);
  }
}

export function getMarketScore(market) {
  let score = 45;
  if (market.liquidityUsd >= 1000) score += 15;
  if (market.liquidityUsd >= 5000) score += 15;
  if (market.volume24h > 0) score += 10;
  if (market.status === "Live API") score += 15;
  return Math.min(score, 100);
}
