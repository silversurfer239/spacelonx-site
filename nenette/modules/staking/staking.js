import { stakingPools, estimateRewards } from "../../services/staking.js";
import { getMarketData } from "../../services/market.js";
import { getSettings, saveSettings } from "../../services/storage.js";
import { fmt, usd } from "../../services/format.js";

export async function renderStaking(container) {
  const market = await getMarketData();
  const settings = getSettings();
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
        <div><h2>Staking Engine V7.2</h2><p>Reward simulator with yearly, monthly and daily projections.</p></div>
        <span>STAKING+</span>
      </div>
      <div class="staking-grid">${cards}</div>
      <div class="form">
        <input id="stake-amount" placeholder="SLX amount">
        <select id="stake-apr">${stakingPools.map(pool => `<option value="${pool.apr}" ${pool.name === settings.defaultPool ? "selected" : ""}>${pool.name} · ${pool.apr}%</option>`).join("")}</select>
        <button id="estimate">Estimate</button>
      </div>
      <div id="staking-result"></div>
    </section>`;

  container.querySelector("#estimate").addEventListener("click", () => {
    const amount = Number(container.querySelector("#stake-amount").value);
    const apr = Number(container.querySelector("#stake-apr").value);
    const selectedText = container.querySelector("#stake-apr").selectedOptions[0].textContent;
    const poolName = selectedText.split("·")[0].trim();
    const s = getSettings();
    s.defaultPool = poolName;
    saveSettings(s);

    const yearly = estimateRewards(amount, apr);
    const monthly = yearly / 12;
    const daily = yearly / 365;
    const total = amount + yearly;

    container.querySelector("#staking-result").innerHTML = `
      <div class="data-grid">
        <div class="metric"><span>Pool</span><b>${poolName}</b></div>
        <div class="metric"><span>APR</span><b>${apr}%</b></div>
        <div class="metric"><span>Principal</span><b>${fmt(amount)} SLX</b></div>
        <div class="metric"><span>Yearly Reward</span><b>${fmt(yearly)} SLX</b><p>${usd(yearly * market.priceUsd)}</p></div>
        <div class="metric"><span>Monthly Reward</span><b>${fmt(monthly)} SLX</b><p>${usd(monthly * market.priceUsd)}</p></div>
        <div class="metric"><span>Daily Reward</span><b>${fmt(daily)} SLX</b><p>${usd(daily * market.priceUsd)}</p></div>
        <div class="metric"><span>Projected Total</span><b>${fmt(total)} SLX</b><p>${usd(total * market.priceUsd)}</p></div>
        <div class="metric"><span>Status</span><b>Simulation only</b><p>No staking contract is called.</p></div>
      </div>`;
  });
}
