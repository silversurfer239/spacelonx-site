import { getMarketData, getMarketScore } from "../../services/market.js";
import { usd, fmt, shortTime } from "../../services/format.js";

export async function renderMarket(container) {
  const m = await getMarketData();
  const data = [
    ["Market Score", getMarketScore(m) + "/100"], ["Pair", m.pair], ["Price", usd(m.priceUsd)],
    ["24H Change", fmt(m.change24h) + "%"], ["Liquidity", usd(m.liquidityUsd)], ["FDV", usd(m.fdvUsd)],
    ["Market Cap", usd(m.marketCapUsd)], ["Volume 24H", usd(m.volume24h)], ["Buys / Sells", `${m.buys24h} / ${m.sells24h}`],
    ["Status", m.status], ["Updated", shortTime(m.updatedAt)], ["DEX", m.dex]
  ];

  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Market Intelligence</h2><p>Market analytics, DexScreener chart and deployment-ready fallback.</p></div><span>MARKET</span></div><div class="data-grid">${data.map(x => `<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div><a class="link" href="${m.url}" target="_blank">Open DexScreener</a>
<div class="mini-chart-panel">
  <iframe class="dex-frame small" src="${m.url}?embed=1&theme=dark&trades=0&info=0" title="SLX chart" loading="lazy"></iframe>
</div>
</section>`;
}
