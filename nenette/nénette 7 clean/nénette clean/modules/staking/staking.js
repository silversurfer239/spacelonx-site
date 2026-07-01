import { stakingPools, estimateRewards } from "../../services/staking.js";
import { CONFIG } from "../../config/config.js";
import { fmt, usd } from "../../services/format.js";

export function renderStaking(container) {
  const cards = stakingPools.map(pool => `
    <article class="staking-card ${pool.name.toLowerCase()}">
      <span>${pool.name}</span>
      <strong>${pool.apr}% APR</strong>
      <p>${pool.lock} · ${pool.status}</p>
    </article>
  `).join("");

  container.innerHTML = `
    <section class="card ultimate-module">
      <div class="section-title">
        <div><h2>Staking Engine</h2><p>Bronze, Silver, Gold and Diamond reward simulator.</p></div>
        <span>STAKING</span>
      </div>
      <div class="staking-grid">${cards}</div>
      <div class="form">
        <input id="stake-amount" placeholder="SLX amount">
        <select id="stake-apr">${stakingPools.map(pool => `<option value="${pool.apr}">${pool.name} · ${pool.apr}%</option>`).join("")}</select>
        <button id="estimate">Estimate</button>
      </div>
      <div id="staking-result"></div>
    </section>
  `;

  container.querySelector("#estimate").addEventListener("click", () => {
    const amount = Number(container.querySelector("#stake-amount").value);
    const apr = Number(container.querySelector("#stake-apr").value);
    const reward = estimateRewards(amount, apr);
    container.querySelector("#staking-result").innerHTML = `
      <div class="data-grid">
        <div class="metric"><span>Annual Reward</span><b>${fmt(reward)} SLX</b></div>
        <div class="metric"><span>Estimated Value</span><b>${usd(reward * CONFIG.fallback.priceUsd)}</b></div>
        <div class="metric"><span>Status</span><b>Simulation only</b></div>
      </div>`;
  });
}
