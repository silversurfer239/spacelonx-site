import { CONFIG } from "../config/config.js";

export const DEFAULT_EXIT_FRACTIONS = Object.freeze([0.01, 0.05, 0.10, 0.25, 1]);

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function canSimulateExit(market) {
  return Boolean(
    market?.priceMode === "onchain" &&
    finitePositive(market.reserveSlx) &&
    finitePositive(market.reserveQuote) &&
    finitePositive(market.quotePriceUsd) &&
    finitePositive(market.priceUsd)
  );
}

export function simulateSell(market, amountSlx, feeBps = Number(CONFIG.swapFeeBps || 30)) {
  if (!canSimulateExit(market)) {
    throw new Error("On-chain QuickSwap reserves are required for the exit simulator.");
  }

  const reserveSlx = finitePositive(market.reserveSlx);
  const reserveQuote = finitePositive(market.reserveQuote);
  const quotePriceUsd = finitePositive(market.quotePriceUsd);
  const spotPriceUsd = finitePositive(market.priceUsd);
  const amountIn = finitePositive(amountSlx);
  if (!amountIn) throw new Error("The simulated SLX amount must be greater than zero.");

  const safeFeeBps = clamp(Number(feeBps || 0), 0, 1000);
  const feeMultiplier = (10000 - safeFeeBps) / 10000;
  const effectiveInput = amountIn * feeMultiplier;

  // Uniswap V2 / QuickSwap V2 constant-product estimate for a direct SLX -> quote swap.
  const outputQuote = (reserveQuote * effectiveInput) / (reserveSlx + effectiveInput);
  const outputUsd = outputQuote * quotePriceUsd;
  const spotValueUsd = amountIn * spotPriceUsd;
  const averageExecutionPriceUsd = outputUsd / amountIn;
  const executionLossPct = spotValueUsd > 0 ? (1 - outputUsd / spotValueUsd) * 100 : 0;

  const postReserveSlx = reserveSlx + amountIn;
  const postReserveQuote = Math.max(0, reserveQuote - outputQuote);
  const postSpotPriceUsd = postReserveSlx > 0 ? (postReserveQuote / postReserveSlx) * quotePriceUsd : 0;
  const poolPriceImpactPct = spotPriceUsd > 0 ? (1 - postSpotPriceUsd / spotPriceUsd) * 100 : 0;

  return {
    amountSlx: amountIn,
    feeBps: safeFeeBps,
    feePct: safeFeeBps / 100,
    outputQuote,
    outputUsd,
    spotValueUsd,
    averageExecutionPriceUsd,
    executionLossPct: clamp(executionLossPct, 0, 100),
    poolPriceImpactPct: clamp(poolPriceImpactPct, 0, 100),
    postSpotPriceUsd,
    walletToPoolReservePct: (amountIn / reserveSlx) * 100,
    quoteToken: String(market.pair || "SLX / POL").split("/").pop().trim(),
    assumptions: [
      "Direct constant-product swap against the displayed QuickSwap V2 pool.",
      `Fee assumption: ${(safeFeeBps / 100).toFixed(2)}%.`,
      "Excludes gas, MEV, routing, price changes, transfer taxes and other pools."
    ]
  };
}

export function buildExitAnalysis(market, walletSlx, fractions = DEFAULT_EXIT_FRACTIONS) {
  const slxBalance = finitePositive(walletSlx);
  if (!canSimulateExit(market) || !slxBalance) {
    return {
      available: false,
      status: "UNAVAILABLE",
      scoreCap: 75,
      scenarios: [],
      flags: ["Exit simulation requires a positive SLX balance and live QuickSwap reserve data."]
    };
  }

  const scenarios = fractions.map(fraction => ({
    fraction,
    percent: fraction * 100,
    ...simulateSell(market, slxBalance * fraction)
  }));

  const full = scenarios.find(item => item.fraction === 1) || scenarios[scenarios.length - 1];
  const ten = scenarios.find(item => item.fraction === 0.10) || scenarios[0];
  const walletSpotValueUsd = slxBalance * Number(market.priceUsd || 0);
  const poolLiquidityUsd = Number(market.liquidityUsd || 0);
  const quoteReserveUsd = Number(market.reserveQuote || 0) * Number(market.quotePriceUsd || 0);
  const walletSpotToLiquidityRatio = poolLiquidityUsd > 0 ? walletSpotValueUsd / poolLiquidityUsd : Infinity;
  const walletToSlxReserveRatio = Number(market.reserveSlx || 0) > 0 ? slxBalance / Number(market.reserveSlx) : Infinity;

  let status = "MANAGEABLE";
  let scoreCap = 90;
  if (walletSpotToLiquidityRatio > 1 || full.executionLossPct >= 70 || ten.executionLossPct >= 25) {
    status = "HIGH EXIT RISK";
    scoreCap = 55;
  } else if (walletSpotToLiquidityRatio > 0.5 || full.executionLossPct >= 50 || ten.executionLossPct >= 15) {
    status = "ELEVATED EXIT RISK";
    scoreCap = 65;
  } else if (walletSpotToLiquidityRatio > 0.2 || full.executionLossPct >= 30 || ten.executionLossPct >= 8) {
    status = "LIQUIDITY WATCH";
    scoreCap = 75;
  }

  const flags = [
    `Wallet spot value equals ${(walletSpotToLiquidityRatio * 100).toFixed(1)}% of total displayed pool liquidity.`,
    `Wallet SLX balance equals ${(walletToSlxReserveRatio * 100).toFixed(1)}% of the pool's SLX reserve.`,
    `A simulated sale of 10% of the wallet has an estimated ${ten.executionLossPct.toFixed(1)}% execution loss versus the current spot valuation.`,
    `The pool currently contains about $${quoteReserveUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} of quote-side liquidity before fees and market movement.`
  ];

  return {
    available: true,
    status,
    scoreCap,
    scenarios,
    walletSpotValueUsd,
    poolLiquidityUsd,
    quoteReserveUsd,
    walletSpotToLiquidityRatio,
    walletToSlxReserveRatio,
    feeBps: Number(CONFIG.swapFeeBps || 30),
    flags
  };
}

export function poolDepthMetrics(market) {
  if (!canSimulateExit(market)) return null;
  const fractions = [0.01, 0.05, 0.10];
  return fractions.map(fraction => ({
    fraction,
    percent: fraction * 100,
    ...simulateSell(market, Number(market.reserveSlx) * fraction)
  }));
}
