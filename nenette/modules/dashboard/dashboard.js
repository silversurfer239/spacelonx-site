import { getMarketData, getMarketScore } from "../../services/market.js";
import { getBlockchainStats, blockchainScore } from "../../services/blockchain.js";
import { getHolderStats, trustScore } from "../../services/holders.js";
import { usd, fmt, shortTime } from "../../services/format.js";

function ring(score) {
  const safe = Math.max(0, Math.min(100, Number(score || 0)));
  return `<div class="ring ultimate-ring" style="--score:${safe}"><strong>${safe}</strong><span>/100</span></div>`;
}

export async function renderDashboard(container) {
  container.innerHTML = `<section class="loading ultimate-loader"><div class="orb">SLX</div><div><h2>Launching V7 Ultimate UI...</h2><p>Initializing market, blockchain and trust engines.</p></div></section>`;

  const market = await getMarketData();
  let blockchain = null;
  let holders = null;

  try { blockchain = await getBlockchainStats(); } catch {}
  try { holders = await getHolderStats(); } catch {}

  const marketScore = getMarketScore(market);
  const chainScore = blockchain ? blockchainScore(blockchain) : 0;
  const investorScore = holders ? trustScore(holders) : 0;
  const globalScore = Math.round((marketScore + chainScore + investorScore) / 3);

  container.innerHTML = `
    <section class="ultimate-command">
      <div class="holo-core">
        <div class="planet">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <div class="orbit orbit-three"></div>
          <div class="planet-inner">SLX</div>
        </div>
      </div>

      <div class="command-copy">
        <div class="pill">● V7.3 AI STRATEGIC BRIEF</div>
        <h3>SpacelonX AI Strategic Terminal</h3>
        <p>
          Nénette adds an automated AI strategic brief for market, liquidity,
          Polygon blockchain health, LP trust, staking simulation and deployment readiness.
        </p>
        <div class="hero-actions">
          <button data-target="terminal">Open Web3 Terminal</button>
          <button data-target="portfolio">Read Portfolio</button>
          <button data-target="staking" class="outline">Open Staking</button>
          <button data-target="ai" class="outline">Generate AI Brief</button>
          <a href="${market.url}" target="_blank">DexScreener</a>
        </div>
      </div>

      <div class="terminal-panel">
        <span>Terminal Score</span>
        ${ring(globalScore)}
        <p>Deployment readiness</p>
      </div>
    </section>

    <section class="ultimate-matrix">
      <article class="matrix-card">
        <span>Market</span>
        ${ring(marketScore)}
        <b>${market.status}</b>
      </article>
      <article class="matrix-card">
        <span>Blockchain</span>
        ${ring(chainScore)}
        <b>${blockchain ? "Polygon Online" : "Unavailable"}</b>
      </article>
      <article class="matrix-card">
        <span>Trust</span>
        ${ring(investorScore)}
        <b>${holders?.lpLocked ? "LP Locked" : "Pending"}</b>
      </article>
    </section>

    <section class="ultimate-kpis">
      <article class="ultimate-kpi gold"><small>SLX Price</small><strong>${usd(market.priceUsd)}</strong><p>${market.pair}</p></article>
      <article class="ultimate-kpi blue"><small>Liquidity</small><strong>${usd(market.liquidityUsd)}</strong><p>${market.source}</p></article>
      <article class="ultimate-kpi green"><small>Latest Block</small><strong>${blockchain ? fmt(blockchain.latestBlock, 0) : "N/A"}</strong><p>${blockchain ? shortTime(blockchain.updatedAt) : "RPC unavailable"}</p></article>
      <article class="ultimate-kpi violet"><small>LP Lock</small><strong>${holders?.lpLocked ? "100%" : "N/A"}</strong><p>${holders?.lpLocked ? new Date(holders.lpUnlockDate).toLocaleDateString() : "Pending"}</p></article>
    </section>

    <section class="ai-console">
      <div class="ai-avatar">
        <div class="ai-face">N</div>
      </div>
      <div>
        <div class="section-title">
          <div><h2>Nénette AI Strategic Brief</h2><p>V7.3 AI strategic brief summary.</p></div>
          <span>AI COMMAND</span>
        </div>
        <div class="brief-grid ultimate-brief">
          <div><h4>Market</h4><p>${market.status === "Live API" ? "Live data is active." : "Fallback market mode is active."}</p></div>
          <div><h4>Blockchain</h4><p>${blockchain?.contractDetected ? "SLX contract detected on Polygon." : "Blockchain check pending."}</p></div>
          <div><h4>Trust</h4><p>${holders?.lpLocked ? "LP lock is displayed and monitored." : "Indexer required for full holder metrics."}</p></div>
          <div><h4>Staking</h4><p>Bronze, Silver, Gold and Diamond simulations are ready.</p></div>
        </div>
      </div>
    </section>
  `;

  container.querySelector('[data-target="terminal"]').addEventListener("click", () => document.querySelector('[data-route="terminal"]').click());
  container.querySelector('[data-target="portfolio"]').addEventListener("click", () => document.querySelector('[data-route="portfolio"]').click());
  container.querySelector('[data-target="staking"]').addEventListener("click", () => document.querySelector('[data-route="staking"]').click());
}
