import { readTokenBalance, readNativeBalance } from "../../services/blockchain.js";
import { getMarketData } from "../../services/market.js";
import { connectWallet, ensurePolygon } from "../../services/wallet.js";
import { addWallet, removeWallet, getSettings } from "../../services/storage.js";
import { fmt, usd } from "../../services/format.js";

async function readOne(address, market) {
  const [slx, pol] = await Promise.all([readTokenBalance(address), readNativeBalance(address)]);
  const slxNumber = Number(slx.balance);
  const polNumber = Number(pol.balance);
  const value = slxNumber * Number(market.priceUsd || 0);
  const diamondReward = slxNumber * 0.20;
  return { address, slx, pol, slxNumber, polNumber, value, diamondReward };
}

function walletCard(item) {
  return `
    <article class="metric wallet-metric">
      <span>${item.address.slice(0,6)}...${item.address.slice(-4)}</span>
      <b>${fmt(item.slxNumber)} ${item.slx.symbol}</b>
      <p>Value: ${usd(item.value)}</p>
      <p>POL: ${fmt(item.polNumber, 6)}</p>
      <p>Diamond yearly rewards: ${fmt(item.diamondReward)} SLX</p>
      <button class="small-danger" data-remove="${item.address}">Remove</button>
    </article>
  `;
}

async function loadSaved(container) {
  const result = container.querySelector("#portfolio-result");
  const settings = getSettings();
  if (!settings.savedWallets.length) {
    result.innerHTML = `<div class="answer">No saved wallet yet. Paste an address or connect MetaMask.</div>`;
    return;
  }

  result.innerHTML = `<div class="answer">Reading ${settings.savedWallets.length} wallet(s)...</div>`;
  const market = await getMarketData();
  const rows = [];

  for (const wallet of settings.savedWallets) {
    try {
      rows.push(await readOne(wallet.address, market));
    } catch (error) {
      rows.push({ address: wallet.address, error: error.message });
    }
  }

  const totalValue = rows.filter(x => !x.error).reduce((sum, x) => sum + x.value, 0);
  const totalSLX = rows.filter(x => !x.error).reduce((sum, x) => sum + x.slxNumber, 0);

  result.innerHTML = `
    <section class="data-grid">
      <div class="metric"><span>Total SLX</span><b>${fmt(totalSLX)} SLX</b></div>
      <div class="metric"><span>Total Value</span><b>${usd(totalValue)}</b></div>
      <div class="metric"><span>Market Source</span><b>${market.status}</b></div>
    </section>
    <section class="data-grid">
      ${rows.map(row => row.error ? `<article class="metric"><span>${row.address.slice(0,6)}...</span><b>Error</b><p>${row.error}</p><button class="small-danger" data-remove="${row.address}">Remove</button></article>` : walletCard(row)).join("")}
    </section>
  `;

  result.querySelectorAll("[data-remove]").forEach(button => {
    button.addEventListener("click", async () => {
      removeWallet(button.dataset.remove);
      await loadSaved(container);
    });
  });
}

async function loadSingle(container, address, shouldSave) {
  const result = container.querySelector("#portfolio-result");
  result.innerHTML = `<div class="answer">Reading wallet ${address.slice(0,6)}...${address.slice(-4)}...</div>`;
  const market = await getMarketData();
  const item = await readOne(address, market);
  if (shouldSave) addWallet(address);
  result.innerHTML = `
    <div class="data-grid">
      <div class="metric"><span>Address</span><b>${address.slice(0,6)}...${address.slice(-4)}</b></div>
      <div class="metric"><span>SLX Balance</span><b>${fmt(item.slxNumber)} ${item.slx.symbol}</b></div>
      <div class="metric"><span>POL Balance</span><b>${fmt(item.polNumber, 6)} POL</b></div>
      <div class="metric"><span>SLX Value</span><b>${usd(item.value)}</b></div>
      <div class="metric"><span>Diamond Rewards</span><b>${fmt(item.diamondReward)} SLX</b></div>
      <div class="metric"><span>Reward Value</span><b>${usd(item.diamondReward * market.priceUsd)}</b></div>
    </div>`;
}

export function renderPortfolio(container) {
  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <div><h2>Portfolio Intelligence V7.2</h2><p>Read one wallet, save multiple wallets locally and estimate aggregate SLX exposure.</p></div>
        <span>WALLET+</span>
      </div>
      <div class="form">
        <input id="wallet-address" placeholder="Paste Polygon wallet address 0x...">
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
      await loadSingle(container, wallet.address, true);
    } catch (error) {
      container.querySelector("#portfolio-result").innerHTML = "Wallet error: " + error.message;
    }
  });

  container.querySelector("#read-saved").addEventListener("click", () => loadSaved(container));
}
