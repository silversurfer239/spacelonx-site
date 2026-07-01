import { CONFIG } from "../config/config.js";

function normalizePair(pair, source) {
  if (!pair) throw new Error("Pair not found");
  return {
    pair: `${pair.baseToken?.symbol || "SLX"} / ${pair.quoteToken?.symbol || "WPOL"}`,
    priceUsd: Number(pair.priceUsd || CONFIG.fallback.priceUsd),
    liquidityUsd: Number(pair.liquidity?.usd || CONFIG.fallback.liquidityUsd),
    fdvUsd: Number(pair.fdv || CONFIG.fallback.fdvUsd),
    marketCapUsd: Number(pair.marketCap || pair.fdv || CONFIG.fallback.marketCapUsd),
    volume24h: Number(pair.volume?.h24 || 0),
    volume6h: Number(pair.volume?.h6 || 0),
    volume1h: Number(pair.volume?.h1 || 0),
    change24h: Number(pair.priceChange?.h24 || 0),
    change6h: Number(pair.priceChange?.h6 || 0),
    change1h: Number(pair.priceChange?.h1 || 0),
    buys24h: Number(pair.txns?.h24?.buys || 0),
    sells24h: Number(pair.txns?.h24?.sells || 0),
    txns24h: Number((pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0)),
    dex: pair.dexId || CONFIG.fallback.dex,
    status: "Live API",
    source,
    url: pair.url || CONFIG.dexscreenerUrl,
    pairAddress: pair.pairAddress || CONFIG.slxPair,
    updatedAt: new Date().toISOString()
  };
}

function fallback(error) {
  return {
    pair: CONFIG.fallback.pair,
    priceUsd: CONFIG.fallback.priceUsd,
    liquidityUsd: CONFIG.fallback.liquidityUsd,
    fdvUsd: CONFIG.fallback.fdvUsd,
    marketCapUsd: CONFIG.fallback.marketCapUsd,
    volume24h: CONFIG.fallback.volume24h,
    volume6h: 0,
    volume1h: 0,
    change24h: CONFIG.fallback.change24h,
    change6h: 0,
    change1h: 0,
    buys24h: 0,
    sells24h: 0,
    txns24h: 0,
    dex: CONFIG.fallback.dex,
    status: "Fallback",
    source: `Fallback · ${error?.message || "API unavailable"}`,
    url: CONFIG.dexscreenerUrl,
    pairAddress: CONFIG.slxPair,
    updatedAt: new Date().toISOString()
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "accept": "application/json" }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export async function getMarketData() {
  const errors = [];

  try {
    const data = await fetchJson(CONFIG.dexscreenerApiUrl);
    const pair = data.pair || (Array.isArray(data.pairs) ? data.pairs[0] : null);
    if (pair) return normalizePair(pair, "DexScreener pair API");
    throw new Error("Pair endpoint empty");
  } catch (error) {
    errors.push(`pair: ${error.message}`);
  }

  try {
    const tokenUrl = `https://api.dexscreener.com/latest/dex/tokens/${CONFIG.slxContract}`;
    const data = await fetchJson(tokenUrl);
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    const polygonPairs = pairs.filter(p => String(p.chainId).toLowerCase().includes("polygon"));
    const best = (polygonPairs.length ? polygonPairs : pairs)
      .sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0))[0];

    if (best) return normalizePair(best, "DexScreener token API");
    throw new Error("Token endpoint empty");
  } catch (error) {
    errors.push(`token: ${error.message}`);
  }

  return fallback(new Error(errors.join(" | ")));
}

export function getMarketScore(market) {
  let score = 45;
  if (market.status === "Live API") score += 20;
  if (market.liquidityUsd >= 1000) score += 12;
  if (market.liquidityUsd >= 5000) score += 10;
  if (market.volume24h > 0) score += 8;
  if (market.txns24h > 0) score += 5;
  return Math.min(score, 100);
}

export function marketSignal(market) {
  if (market.status !== "Live API") return "Fallback mode: live market data unavailable.";
  if (market.change24h > 10 && market.volume24h > 0) return "Momentum positive: price and activity are rising.";
  if (market.change24h < -10) return "Risk watch: strong 24h drawdown detected.";
  if (market.liquidityUsd < 1000) return "Liquidity watch: liquidity remains thin.";
  return "Stable watch: no major market anomaly detected.";
}
