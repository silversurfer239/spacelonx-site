import { stakingPools, estimateRewards } from "../../services/staking.js";
import { getMarketData } from "../../services/market.js";
import { getSettings, saveSettings } from "../../services/storage.js";
import { fmt, usd } from "../../services/format.js";

export async function renderStaking(container) {
  const market = await getMarketData();
  const settings = getSettings();
  const cards = stakingPools.map(pool => `
    <button class="staking-card ${pool.name.toLowerCase()}" data-pool="${pool.name}" data-apr="${pool.apr}">
      <span>${pool.name}</span>
      <strong>${pool.apr}% APR</strong>
      <p>${pool.lock}</p>
      <small>SIMULATION</small>
    </button>
  `).join("");

  container.innerHTML = `
    <section class="card ultimate-module v8-detail-page">
      <div class="section-title">
        <div><h2>Staking Center V8.0</h2><p>Bronze, Silver, Gold and Diamond reward projections with explicit simulation status.</p></div>
        <span>SIMULATION ONLY</span>
      </div>
      <div class="answer strategic-answer"><strong>Contract status:</strong> no verified staking contract is connected. Stake, unstake and claim actions are disabled. All figures below are projections, not accrued on-chain rewards.</div>
      <div class="staking-grid">${cards}</div>
      <div class="form v8-staking-form">
        <input id="stake-amount" inputmode="decimal" placeholder="SLX amount">
        <select id="stake-apr">${stakingPools.map(pool => `<option value="${pool.apr}" data-name="${pool.name}" ${pool.name === settings.defaultPool ? "selected" : ""}>${pool.name} · ${pool.apr}% · ${pool.lock}</option>`).join("")}</select>
        <button id="estimate">Simulate Rewards</button>
      </div>
      <div id="staking-result" class="v8-stake-result"><p>Enter an amount and select a tier.</p></div>
      <div class="v8-disabled-actions"><button disabled>Stake</button><button disabled>Unstake</button><button disabled>Claim Rewards</button><small>Enabled only after verified smart-contract integration.</small></div>
    </section>`;

  container.querySelectorAll("[data-pool]").forEach(card => {
    card.addEventListener("click", () => {
      const select = container.querySelector("#stake-apr");
      const option = [...select.options].find(item => item.dataset.name === card.dataset.pool);
      if (option) select.value = option.value;
      container.querySelectorAll("[data-pool]").forEach(item => item.classList.toggle("selected", item === card));
    });
  });

  container.querySelector("#estimate").addEventListener("click", () => {
    const amount = Number(container.querySelector("#stake-amount").value);
    const select = container.querySelector("#stake-apr");
    const apr = Number(select.value);
    const poolName = select.selectedOptions[0]?.dataset.name || "Pool";
    if (!(amount > 0)) {
      container.querySelector("#staking-result").innerHTML = `<p class="v8-error">Enter a positive SLX amount.</p>`;
      return;
    }

    const s = getSettings();
    s.defaultPool = poolName;
    saveSettings(s);

    const yearly = estimateRewards(amount, apr);
    const monthly = yearly / 12;
    const daily = yearly / 365;
    const total = amount + yearly;

    container.querySelector("#staking-result").innerHTML = `
      <div><span>Tier</span><b>${poolName}</b></div>
      <div><span>APR scenario</span><b>${apr}%</b></div>
      <div><span>Principal</span><b>${fmt(amount)} SLX</b></div>
      <div><span>Yearly projection</span><b>${fmt(yearly)} SLX</b><small>${usd(yearly * market.priceUsd)}</small></div>
      <div><span>Monthly projection</span><b>${fmt(monthly)} SLX</b></div>
      <div><span>Daily projection</span><b>${fmt(daily)} SLX</b></div>
      <div><span>Projected total</span><b>${fmt(total)} SLX</b><small>${usd(total * market.priceUsd)}</small></div>
      <div><span>Status</span><b>SIMULATION ONLY</b><small>No staking contract call.</small></div>`;
  });
}
