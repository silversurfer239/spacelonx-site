import { getMarketData } from "../../services/market.js";
import { getBlockchainStats } from "../../services/blockchain.js";
import { getHolderStats } from "../../services/holders.js";
import { terminalReadiness, dexScreenerEmbedUrl, deploymentChecklist, WEB3_LIMITS } from "../../services/terminal.js";
import { usd, fmt, shortTime } from "../../services/format.js";

export async function renderTerminal(container) {
  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Web3 Terminal</h2><p>Loading live terminal state...</p></div><span>WEB3</span></div></section>`;

  const market = await getMarketData();
  let blockchain = null;
  let holders = null;
  try { blockchain = await getBlockchainStats(); } catch {}
  try { holders = await getHolderStats(); } catch {}

  const readiness = terminalReadiness({ market, blockchain, holders });
  const checklist = deploymentChecklist();

  container.innerHTML = `
    <section class="web3-command">
      <div>
        <div class="pill">● WEEKEND RELEASE</div>
        <h2>SpacelonX Web3 Terminal</h2>
        <p>Production-oriented control screen for SLX market, Polygon health, LP lock, wallet readiness and deployment status.</p>
      </div>
      <div class="terminal-readiness">
        <div class="ring" style="--score:${readiness.score}"><strong>${readiness.score}</strong><span>/100</span></div>
        <p>Weekend deployment readiness</p>
      </div>
    </section>

    <section class="kpi-grid">
      <article class="kpi gold"><span>SLX Price</span><strong>${usd(market.priceUsd)}</strong><p>${market.status}</p></article>
      <article class="kpi blue"><span>Liquidity</span><strong>${usd(market.liquidityUsd)}</strong><p>${market.source}</p></article>
      <article class="kpi green"><span>Polygon Block</span><strong>${blockchain ? fmt(blockchain.latestBlock, 0) : "N/A"}</strong><p>${blockchain ? shortTime(blockchain.updatedAt) : "RPC pending"}</p></article>
      <article class="kpi violet"><span>LP Lock</span><strong>${holders?.lpLocked ? "100%" : "N/A"}</strong><p>${holders?.lpLocked ? new Date(holders.lpUnlockDate).toLocaleDateString() : "Pending"}</p></article>
    </section>

    <section class="card terminal-chart-card">
      <div class="section-title">
        <div><h2>SLX Live Chart</h2><p>DexScreener embedded chart for the SLX / WPOL pair.</p></div>
        <span>CHART</span>
      </div>
      <iframe class="dex-frame" src="${dexScreenerEmbedUrl()}" title="SLX DexScreener chart" loading="lazy"></iframe>
      <a class="link" href="${market.url}" target="_blank">Open full DexScreener page</a>
    </section>

    <section class="card">
      <div class="section-title">
        <div><h2>Readiness Matrix</h2><p>What is deployable now and what needs backend/API work.</p></div>
        <span>STATUS</span>
      </div>
      <div class="readiness-grid">
        ${readiness.checks.map(c => `<div class="readiness-item ${c.ok ? "ok" : "pending"}"><b>${c.ok ? "✓" : "!"}</b><span>${c.label}</span></div>`).join("")}
      </div>
    </section>

    <section class="card">
      <div class="section-title">
        <div><h2>Production Constraints</h2><p>These require API keys, contracts or backend services.</p></div>
        <span>LIMITS</span>
      </div>
      <div class="brief-grid">
        ${Object.entries(WEB3_LIMITS).map(([key, value]) => `<div><h4>${key}</h4><p>${value}</p></div>`).join("")}
      </div>
    </section>

    <section class="card">
      <div class="section-title">
        <div><h2>Weekend Deployment Checklist</h2><p>Steps to put Nénette on SpacelonX.</p></div>
        <span>DEPLOY</span>
      </div>
      <ol class="deploy-list">${checklist.map(item => `<li>${item}</li>`).join("")}</ol>
    </section>
  `;
}
