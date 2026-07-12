import { CONFIG } from "../../config/config.js";

function cls(status) {
  if (status === "DONE") return "good";
  if (status === "ACTIVE") return "warn";
  return "neutral";
}

export async function renderRoadmap(container) {
  container.innerHTML = `
    <section class="card ultimate-module v8-detail-page">
      <div class="section-title"><div><h2>SpacelonX Roadmap</h2><p>Execution path from testnet validation to ecosystem growth.</p></div><span>V8.0</span></div>
      <div class="v8-roadmap v8-roadmap-large">
        ${CONFIG.roadmap.map(item => `<article class="${cls(item.status)}"><span>${item.phase}</span><h3>${item.title}</h3><small>${item.status}</small><p>${item.detail}</p></article>`).join("")}
      </div>
      <div class="brief-grid">
        <article><h4>Current operational focus</h4><p>Mainnet tooling, Nénette intelligence, market data resilience and listings preparation.</p></article>
        <article><h4>Next growth gates</h4><p>CoinGecko, CoinMarketCap, partnerships, community growth and exchange expansion.</p></article>
      </div>
    </section>`;
}
