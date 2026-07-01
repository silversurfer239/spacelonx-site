import { getMarketData } from "../../services/market.js";
import { getSettings, saveSettings } from "../../services/storage.js";
import { usd, fmt } from "../../services/format.js";

function checkAlerts(market, settings) {
  const messages = [];
  const priceTarget = Number(settings.priceAlertUsd);
  const liqTarget = Number(settings.liquidityAlertUsd);

  if (priceTarget && market.priceUsd >= priceTarget) {
    messages.push(`Price alert reached: ${usd(market.priceUsd)} >= ${usd(priceTarget)}`);
  }

  if (liqTarget && market.liquidityUsd >= liqTarget) {
    messages.push(`Liquidity alert reached: ${usd(market.liquidityUsd)} >= ${usd(liqTarget)}`);
  }

  if (!messages.length) messages.push("No local alert triggered.");
  return messages;
}

export async function renderAlerts(container) {
  const settings = getSettings();
  const market = await getMarketData();
  const messages = checkAlerts(market, settings);

  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <div><h2>Local Alerts V7.2</h2><p>Browser-side alerts for SLX price and liquidity. Stored locally in this browser.</p></div>
        <span>ALERTS</span>
      </div>
      <div class="data-grid">
        <div class="metric"><span>Current Price</span><b>${usd(market.priceUsd)}</b></div>
        <div class="metric"><span>Current Liquidity</span><b>${usd(market.liquidityUsd)}</b></div>
        <div class="metric"><span>Market Source</span><b>${market.status}</b><p>${market.source}</p></div>
      </div>
      <div class="form">
        <input id="price-alert" placeholder="Price alert USD" value="${settings.priceAlertUsd || ""}">
        <input id="liq-alert" placeholder="Liquidity alert USD" value="${settings.liquidityAlertUsd || ""}">
        <button id="save-alerts">Save alerts</button>
        <button id="refresh-alerts">Refresh check</button>
      </div>
      <div class="answer">
        ${messages.map(m => `<p>${m}</p>`).join("")}
        <p>24H change: ${fmt(market.change24h)}% · 24H volume: ${usd(market.volume24h)}</p>
      </div>
    </section>`;

  container.querySelector("#save-alerts").addEventListener("click", () => {
    const s = getSettings();
    s.priceAlertUsd = container.querySelector("#price-alert").value.trim();
    s.liquidityAlertUsd = container.querySelector("#liq-alert").value.trim();
    saveSettings(s);
    document.querySelector('[data-route="alerts"]').click();
  });

  container.querySelector("#refresh-alerts").addEventListener("click", () => {
    document.querySelector('[data-route="alerts"]').click();
  });
}
