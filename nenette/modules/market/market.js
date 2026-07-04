import { getMarketData, getMarketScore, marketSignal } from "../../services/market.js";
import { usd, fmt, shortTime } from "../../services/format.js";

function metricValue(market, key, formatter) {
  if (!market.metricsLive && ["change1h", "change6h", "change24h", "volume1h", "volume6h", "volume24h", "buys24h", "sells24h"].includes(key)) {
    return "N/A";
  }
  return formatter(market[key]);
}

export async function renderMarket(container) {
  const m = await getMarketData();
  const data = [
    ["Market Score", getMarketScore(m) + "/100"],
    ["Pair", m.pair],
    ["Price", usd(m.priceUsd)],
    ["Price Mode", m.status],
    ["Price Source", m.source],
    ["1H Change", metricValue(m, "change1h", value => fmt(value) + "%")],
    ["6H Change", metricValue(m, "change6h", value => fmt(value) + "%")],
    ["24H Change", metricValue(m, "change24h", value => fmt(value) + "%")],
    ["Liquidity", usd(m.liquidityUsd)],
    ["FDV", usd(m.fdvUsd)],
    ["Market Cap", usd(m.marketCapUsd)],
    ["Volume 1H", metricValue(m, "volume1h", usd)],
    ["Volume 6H", metricValue(m, "volume6h", usd)],
    ["Volume 24H", metricValue(m, "volume24h", usd)],
    ["Buys / Sells 24H", m.metricsLive ? `${m.buys24h} / ${m.sells24h}` : "N/A"],
    ["Updated", shortTime(m.updatedAt)],
    ["DEX", m.dex]
  ];

  if (m.priceMode === "onchain") {
    data.push(
      ["SLX Pool Reserve", `${fmt(m.reserveSlx)} SLX`],
      ["Quote Pool Reserve", `${fmt(m.reserveQuote, 6)} ${String(m.pair).split("/").pop().trim()}`],
      ["Quote USD", usd(m.quotePriceUsd)],
      ["Quote Oracle", m.quotePriceSource || "N/A"],
      ["Pool Block", fmt(m.blockNumber, 0)],
      ["RPC", m.rpc || "N/A"]
    );
  }

  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <div><h2>Market Intelligence V7.6.3</h2><p>DexScreener first, QuickSwap V2 on-chain reserve pricing second, protected static fallback last.</p></div>
        <span>ON-CHAIN PRICE</span>
      </div>
      <div class="answer"><strong>Nénette signal:</strong> ${marketSignal(m)}</div>
      ${m.sourceWarning ? `<div class="answer"><strong>Oracle note:</strong> ${m.sourceWarning}</div>` : ""}
      <div class="data-grid">${data.map(x => `<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div>
      <div class="mini-chart-panel">
        <iframe class="dex-frame small" src="${m.url}?embed=1&theme=dark&trades=0&info=0" title="SLX chart" loading="lazy"></iframe>
      </div>
      <a class="link" href="${m.url}" target="_blank">Open DexScreener</a>
    </section>`;
}
