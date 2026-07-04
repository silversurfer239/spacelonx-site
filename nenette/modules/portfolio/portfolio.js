import { connectWallet, ensurePolygon, buildWalletSnapshot, walletHealth } from "../../services/wallet.js";
import { addWallet, removeWallet, getSettings, updateWalletLabel, setLastConnectedWallet } from "../../services/storage.js";
import { addEvent } from "../../services/memory.js";
import { fmt, usd } from "../../services/format.js";

function downloadText(filename, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function walletCard(item) {
  const health = item.error ? null : walletHealth(item);
  const label = item.label || "Wallet";
  if (item.error) {
    return `<article class="metric wallet-metric"><span>${label}</span><b>Error</b><p>${item.address.slice(0,6)}...${item.address.slice(-4)}</p><p>${item.error}</p><button class="small-danger" data-remove="${item.address}">Remove</button></article>`;
  }
  return `
    <article class="metric wallet-metric">
      <span>${label} · ${item.short}</span>
      <b>${fmt(item.slxNumber)} ${item.slx.symbol}</b>
      <p>Value: ${usd(item.slxValue)}</p>
      <p>POL: ${fmt(item.polNumber, 6)}</p>
      <p>Health: ${health.score}/100 · ${health.status}</p>
      <p>Diamond yearly: ${fmt(item.diamondYearly)} SLX</p>
      <button data-export-one="${item.address}">Export</button>
      <button class="small-danger" data-remove="${item.address}">Remove</button>
    </article>`;
}

function snapshotsToCsv(rows) {
  const header = ["label","address","slx_balance","pol_balance","slx_value_usd","diamond_yearly_slx","health_score","health_status","market_status"];
  const lines = rows.filter(row => !row.error).map(row => {
    const health = walletHealth(row);
    return [row.label || "", row.address, row.slxNumber, row.polNumber, row.slxValue, row.diamondYearly, health.score, health.status, row.market.status]
      .map(value => `"${String(value).replaceAll('"','""')}"`).join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

async function loadSaved(container) {
  const result = container.querySelector("#portfolio-result");
  const settings = getSettings();
  if (!settings.savedWallets.length) {
    result.innerHTML = `<div class="answer">No saved wallet yet. Paste an address or connect MetaMask in Wallet Center.</div>`;
    return;
  }

  result.innerHTML = `<div class="answer">Reading ${settings.savedWallets.length} wallet(s) on Polygon...</div>`;
  const rows = [];

  for (const wallet of settings.savedWallets) {
    try {
      const snapshot = await buildWalletSnapshot(wallet.address);
      rows.push({ ...snapshot, label: wallet.label || "Wallet" });
    } catch (error) {
      rows.push({ address: wallet.address, label: wallet.label || "Wallet", error: error.message || String(error) });
    }
  }

  const valid = rows.filter(x => !x.error);
  const totalValue = valid.reduce((sum, x) => sum + x.slxValue, 0);
  const totalSLX = valid.reduce((sum, x) => sum + x.slxNumber, 0);
  const totalDiamond = valid.reduce((sum, x) => sum + x.diamondYearly, 0);
  const averageHealth = valid.length ? Math.round(valid.reduce((sum, x) => sum + walletHealth(x).score, 0) / valid.length) : 0;

  result.innerHTML = `
    <section class="data-grid">
      <div class="metric"><span>Total SLX</span><b>${fmt(totalSLX)} SLX</b></div>
      <div class="metric"><span>Total Value</span><b>${usd(totalValue)}</b></div>
      <div class="metric"><span>Diamond Yearly</span><b>${fmt(totalDiamond)} SLX</b></div>
      <div class="metric"><span>Avg Health</span><b>${averageHealth}/100</b></div>
      <div class="metric"><span>Saved Wallets</span><b>${settings.savedWallets.length}</b></div>
      <div class="metric"><span>Version</span><b>V7.6.3</b></div>
    </section>
    <div class="form brief-actions">
      <button id="export-portfolio-json">Export JSON</button>
      <button id="export-portfolio-csv">Export CSV</button>
    </div>
    <section class="data-grid">
      ${rows.map(walletCard).join("")}
    </section>`;

  result.querySelector("#export-portfolio-json").addEventListener("click", () => {
    downloadText("nenette-v76-portfolio.json", JSON.stringify({ exportedAt: new Date().toISOString(), rows }, null, 2), "application/json;charset=utf-8");
  });
  result.querySelector("#export-portfolio-csv").addEventListener("click", () => {
    downloadText("nenette-v76-portfolio.csv", snapshotsToCsv(rows), "text/csv;charset=utf-8");
  });
  result.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", async () => {
      removeWallet(button.dataset.remove);
      addEvent("wallet", `Wallet removed: ${button.dataset.remove.slice(0,6)}...${button.dataset.remove.slice(-4)}`);
      await loadSaved(container);
    });
  });
  result.querySelectorAll("[data-export-one]").forEach(button => {
    button.addEventListener("click", () => {
      const item = rows.find(row => row.address.toLowerCase() === button.dataset.exportOne.toLowerCase());
      if (item) downloadText("nenette-v76-wallet.json", JSON.stringify(item, null, 2), "application/json;charset=utf-8");
    });
  });
}

async function loadSingle(container, address, shouldSave) {
  const result = container.querySelector("#portfolio-result");
  const label = container.querySelector("#wallet-label")?.value.trim() || "";
  result.innerHTML = `<div class="answer">Reading wallet ${address.slice(0,6)}...${address.slice(-4)} on Polygon...</div>`;
  const item = await buildWalletSnapshot(address);
  if (shouldSave) {
    addWallet(address, label || undefined);
    if (label) updateWalletLabel(address, label);
    addEvent("wallet", `Wallet saved in Portfolio: ${item.short}`);
  }
  const health = walletHealth(item);
  result.innerHTML = `
    <div class="data-grid">
      <div class="metric"><span>Address</span><b>${item.short}</b></div>
      <div class="metric"><span>SLX Balance</span><b>${fmt(item.slxNumber)} ${item.slx.symbol}</b></div>
      <div class="metric"><span>POL Balance</span><b>${fmt(item.polNumber, 6)} POL</b></div>
      <div class="metric"><span>SLX Value</span><b>${usd(item.slxValue)}</b></div>
      <div class="metric"><span>Wallet Health</span><b>${health.score}/100 · ${health.status}</b></div>
      <div class="metric"><span>Diamond Rewards</span><b>${fmt(item.diamondYearly)} SLX/year</b></div>
    </div>
    <div class="answer strategic-answer"><strong>Readiness:</strong> ${health.flags.join(" ")}</div>`;
}

export function renderPortfolio(container) {
  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <div><h2>Portfolio Intelligence V7.6.3</h2><p>Read wallets, save labels, aggregate SLX exposure and export a portfolio snapshot.</p></div>
        <span>PORTFOLIO REAL</span>
      </div>
      <div class="form">
        <input id="wallet-address" placeholder="Paste Polygon wallet address 0x...">
        <input id="wallet-label" placeholder="Optional label, e.g. Treasury / Holder / Test">
        <button id="read-wallet">Read</button>
        <button id="save-wallet">Save + Read</button>
        <button id="connect-wallet">Connect MetaMask</button>
        <button id="read-saved">Read Saved Wallets</button>
      </div>
      <div id="portfolio-result"></div>
    </section>`;

  container.querySelector("#read-wallet").addEventListener("click", async () => {
    const address = container.querySelector("#wallet-address").value.trim();
    if (!ethers.isAddress(address)) return container.querySelector("#portfolio-result").innerHTML = "Invalid wallet address.";
    await loadSingle(container, address, false);
  });

  container.querySelector("#save-wallet").addEventListener("click", async () => {
    const address = container.querySelector("#wallet-address").value.trim();
    if (!ethers.isAddress(address)) return container.querySelector("#portfolio-result").innerHTML = "Invalid wallet address.";
    await loadSingle(container, address, true);
  });

  container.querySelector("#connect-wallet").addEventListener("click", async () => {
    try {
      const wallet = await connectWallet();
      await ensurePolygon(wallet.provider);
      setLastConnectedWallet(wallet.address);
      container.querySelector("#wallet-address").value = wallet.address;
      await loadSingle(container, wallet.address, true);
    } catch (error) {
      container.querySelector("#portfolio-result").innerHTML = "Wallet error: " + (error.message || error);
    }
  });

  container.querySelector("#read-saved").addEventListener("click", () => loadSaved(container));
}
