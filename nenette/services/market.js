import { CONFIG } from "../config/config.js";
import { getProvider } from "./blockchain.js";

const V2_PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
];

const ERC20_META_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

const AGGREGATOR_V3_ABI = [
  "function decimals() view returns (uint8)",
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
];

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
    priceMode: "api",
    priceLive: true,
    metricsLive: true,
    estimated: false,
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
    priceMode: "fallback",
    priceLive: false,
    metricsLive: false,
    estimated: true,
    source: `Fallback · ${error?.message || "All market sources unavailable"}`,
    url: CONFIG.dexscreenerUrl,
    pairAddress: CONFIG.slxPair,
    updatedAt: new Date().toISOString()
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function isStableSymbol(symbol = "") {
  return ["USDC", "USDC.E", "USDT", "DAI"].includes(String(symbol).toUpperCase());
}

function isPolSymbol(symbol = "") {
  const value = String(symbol).toUpperCase();
  return value.includes("POL") || value.includes("MATIC");
}

async function readPolUsdFromChainlink(provider) {
  if (!CONFIG.chainlinkPolUsdFeed) throw new Error("POL/USD oracle is not configured");
  const feed = new ethers.Contract(CONFIG.chainlinkPolUsdFeed, AGGREGATOR_V3_ABI, provider);
  const [decimals, round] = await Promise.all([feed.decimals(), feed.latestRoundData()]);
  const answer = round.answer ?? round[1];
  const updatedAt = Number(round.updatedAt ?? round[3] ?? 0n);
  if (answer <= 0n) throw new Error("Chainlink POL/USD answer is invalid");
  if (!updatedAt) throw new Error("Chainlink POL/USD timestamp is missing");
  const age = Math.max(0, Math.floor(Date.now() / 1000) - updatedAt);
  if (age > Number(CONFIG.maxOracleAgeSeconds || 86400)) {
    throw new Error(`Chainlink POL/USD answer is stale (${age}s)`);
  }
  return {
    priceUsd: Number(ethers.formatUnits(answer, decimals)),
    source: "Chainlink POL/USD",
    updatedAt: new Date(updatedAt * 1000).toISOString()
  };
}

async function readPolUsdFromCoinGecko() {
  const data = await fetchJson(CONFIG.coingeckoPolUrl);
  const price = Number(data?.["polygon-ecosystem-token"]?.usd || data?.["matic-network"]?.usd || 0);
  if (!(price > 0)) throw new Error("CoinGecko POL/USD price is unavailable");
  return { priceUsd: price, source: "CoinGecko POL/USD", updatedAt: new Date().toISOString() };
}

async function readQuoteUsd(provider, quoteSymbol) {
  if (isStableSymbol(quoteSymbol)) {
    return { priceUsd: 1, source: `${quoteSymbol} USD reference`, updatedAt: new Date().toISOString() };
  }
  if (!isPolSymbol(quoteSymbol)) {
    throw new Error(`Unsupported QuickSwap quote token: ${quoteSymbol}`);
  }

  try {
    return await readPolUsdFromChainlink(provider);
  } catch (chainlinkError) {
    try {
      const coingecko = await readPolUsdFromCoinGecko();
      return { ...coingecko, warning: `Chainlink unavailable: ${chainlinkError.message}` };
    } catch (coingeckoError) {
      throw new Error(`POL/USD unavailable: Chainlink ${chainlinkError.message} | CoinGecko ${coingeckoError.message}`);
    }
  }
}

export async function getOnChainPoolData() {
  const { provider, rpc } = await getProvider();
  const pair = new ethers.Contract(CONFIG.slxPair, V2_PAIR_ABI, provider);
  const [token0Address, token1Address, reserves, blockNumber] = await Promise.all([
    pair.token0(),
    pair.token1(),
    pair.getReserves(),
    provider.getBlockNumber()
  ]);

  const token0 = new ethers.Contract(token0Address, ERC20_META_ABI, provider);
  const token1 = new ethers.Contract(token1Address, ERC20_META_ABI, provider);
  const [decimals0, symbol0, decimals1, symbol1] = await Promise.all([
    token0.decimals(), token0.symbol(), token1.decimals(), token1.symbol()
  ]);

  const slxAddress = CONFIG.slxContract.toLowerCase();
  const token0IsSlx = token0Address.toLowerCase() === slxAddress;
  const token1IsSlx = token1Address.toLowerCase() === slxAddress;
  if (!token0IsSlx && !token1IsSlx) throw new Error("Configured QuickSwap pair does not contain SLX");

  const reserve0Raw = reserves.reserve0 ?? reserves[0];
  const reserve1Raw = reserves.reserve1 ?? reserves[1];
  const reserveTimestamp = Number(reserves.blockTimestampLast ?? reserves[2] ?? 0);

  const slxToken = token0IsSlx ? token0 : token1;
  const slxDecimals = token0IsSlx ? decimals0 : decimals1;
  const slxSymbol = token0IsSlx ? symbol0 : symbol1;
  const slxReserveRaw = token0IsSlx ? reserve0Raw : reserve1Raw;

  const quoteDecimals = token0IsSlx ? decimals1 : decimals0;
  const quoteSymbol = token0IsSlx ? symbol1 : symbol0;
  const quoteAddress = token0IsSlx ? token1Address : token0Address;
  const quoteReserveRaw = token0IsSlx ? reserve1Raw : reserve0Raw;

  const [totalSupplyRaw, quoteUsd] = await Promise.all([
    slxToken.totalSupply(),
    readQuoteUsd(provider, quoteSymbol)
  ]);

  const reserveSlx = Number(ethers.formatUnits(slxReserveRaw, slxDecimals));
  const reserveQuote = Number(ethers.formatUnits(quoteReserveRaw, quoteDecimals));
  const totalSupply = Number(ethers.formatUnits(totalSupplyRaw, slxDecimals));
  if (!(reserveSlx > 0) || !(reserveQuote > 0)) throw new Error("QuickSwap pool reserves are empty");

  const priceQuote = reserveQuote / reserveSlx;
  const priceUsd = priceQuote * quoteUsd.priceUsd;
  const liquidityUsd = reserveQuote * quoteUsd.priceUsd * 2;
  const fdvUsd = totalSupply * priceUsd;

  if (!(priceUsd > 0) || !Number.isFinite(priceUsd)) throw new Error("QuickSwap reserve price is invalid");

  return {
    pair: `${slxSymbol || "SLX"} / ${quoteSymbol}`,
    priceUsd,
    liquidityUsd,
    fdvUsd,
    marketCapUsd: fdvUsd,
    volume24h: 0,
    volume6h: 0,
    volume1h: 0,
    change24h: 0,
    change6h: 0,
    change1h: 0,
    buys24h: 0,
    sells24h: 0,
    txns24h: 0,
    dex: "QuickSwap V2",
    status: "On-chain Pool",
    priceMode: "onchain",
    priceLive: true,
    metricsLive: false,
    estimated: false,
    source: `QuickSwap V2 reserves · ${quoteUsd.source}`,
    sourceWarning: quoteUsd.warning || "",
    quotePriceUsd: quoteUsd.priceUsd,
    quotePriceSource: quoteUsd.source,
    quoteTokenAddress: quoteAddress,
    reserveSlx,
    reserveQuote,
    blockNumber,
    reserveTimestamp: reserveTimestamp ? new Date(reserveTimestamp * 1000).toISOString() : null,
    rpc,
    url: CONFIG.dexscreenerUrl,
    pairAddress: CONFIG.slxPair,
    updatedAt: new Date().toISOString()
  };
}

export function isMarketPriceLive(market) {
  return Boolean(market?.priceLive) || market?.status === "Live API" || market?.status === "On-chain Pool";
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

  try {
    return await getOnChainPoolData();
  } catch (error) {
    errors.push(`on-chain: ${error.message}`);
  }

  return fallback(new Error(errors.join(" | ")));
}

export function getMarketScore(market) {
  let score = 45;
  if (isMarketPriceLive(market)) score += market.status === "Live API" ? 20 : 18;
  if (market.liquidityUsd >= 1000) score += 12;
  if (market.liquidityUsd >= 5000) score += 10;
  if (market.metricsLive && market.volume24h > 0) score += 8;
  if (market.metricsLive && market.txns24h > 0) score += 5;
  return Math.min(score, 100);
}

export function marketSignal(market) {
  if (market.status === "Fallback") return "Fallback mode: DexScreener and on-chain pool pricing are unavailable.";
  if (market.status === "On-chain Pool") return "On-chain spot price active: SLX/USD is calculated from live QuickSwap reserves and a POL/USD reference. Volume and price-change metrics are unavailable.";
  if (market.change24h > 10 && market.volume24h > 0) return "Momentum positive: price and activity are rising.";
  if (market.change24h < -10) return "Risk watch: strong 24h drawdown detected.";
  if (market.liquidityUsd < 1000) return "Liquidity watch: liquidity remains thin.";
  return "Stable watch: no major market anomaly detected.";
}
