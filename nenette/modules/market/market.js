import { getMarketData, getMarketScore, marketSignal } from "../../services/market.js";
import { usd, fmt, shortTime } from "../../services/format.js";

export async function renderMarket(container) {
  const m = await getMarketData();
  const data = [
    ["Market Score", getMarketScore(m) + "/100"], ["Pair", m.pair], ["Price", usd(m.priceUsd)],
    ["1H Change", fmt(m.change1h) + "%"], ["6H Change", fmt(m.change6h) + "%"], ["24H Change", fmt(m.change24h) + "%"],
    ["Liquidity", usd(m.liquidityUsd)], ["FDV", usd(m.fdvUsd)], ["Market Cap", usd(m.marketCapUsd)],
    ["Volume 1H", usd(m.volume1h)], ["Volume 6H", usd(m.volume6h)], ["Volume 24H", usd(m.volume24h)],
    ["Buys / Sells 24H", `${m.buys24h} / ${m.sells24h}`], ["Status", m.status], ["Updated", shortTime(m.updatedAt)], ["DEX", m.dex]
  ];

  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <div><h2>Market Intelligence V7.2</h2><p>Dual-source DexScreener market engine with fallback protection.</p></div>
        <span>MARKET+</span>
      </div>
      <div class="answer"><strong>Nénette signal:</strong> ${marketSignal(m)}</div>
      <div class="data-grid">${data.map(x => `<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div>
      <div class="mini-chart-panel">
        <iframe class="dex-frame small" src="${m.url}?embed=1&theme=dark&trades=0&info=0" title="SLX chart" loading="lazy"></iframe>
      </div>
      <a class="link" href="${m.url}" target="_blank">Open DexScreener</a>
    </section>`;
}
