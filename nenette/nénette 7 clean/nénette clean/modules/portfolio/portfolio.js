import { readTokenBalance, readNativeBalance } from "../../services/blockchain.js";
import { connectWallet, ensurePolygon } from "../../services/wallet.js";
import { CONFIG } from "../../config/config.js";
import { fmt, usd } from "../../services/format.js";

async function load(container, address) {
  const [slx, pol] = await Promise.all([readTokenBalance(address), readNativeBalance(address)]);
  const value = Number(slx.balance) * CONFIG.fallback.priceUsd;
  const rewards = Number(slx.balance) * 0.20;
  const data = [
    ["Address", `${address.slice(0,6)}...${address.slice(-4)}`], ["SLX Balance", `${fmt(slx.balance)} ${slx.symbol}`],
    ["POL Balance", `${fmt(pol.balance)} POL`], ["SLX Value", usd(value)], ["Diamond Rewards", `${fmt(rewards)} SLX`],
    ["Reward Value", usd(rewards * CONFIG.fallback.priceUsd)]
  ];
  container.querySelector("#portfolio-result").innerHTML = `<div class="data-grid">${data.map(x => `<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div>`;
}

export function renderPortfolio(container) {
  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Portfolio Intelligence</h2><p>Read a Polygon address or connect a browser wallet.</p></div><span>WALLET</span></div><div class="form"><input id="wallet-address" placeholder="Paste Polygon wallet address 0x..."><button id="read-wallet">Read Portfolio</button><button id="connect-wallet">Connect Wallet</button></div><div id="portfolio-result"></div></section>`;

  container.querySelector("#read-wallet").addEventListener("click", async () => {
    const address = container.querySelector("#wallet-address").value.trim();
    if (!ethers.isAddress(address)) {
      container.querySelector("#portfolio-result").innerHTML = "Invalid wallet address.";
      return;
    }
    await load(container, address);
  });

  container.querySelector("#connect-wallet").addEventListener("click", async () => {
    try {
      const wallet = await connectWallet();
      await ensurePolygon(wallet.provider);
      await load(container, wallet.address);
    } catch (error) {
      container.querySelector("#portfolio-result").innerHTML = "Wallet error: " + error.message;
    }
  });
}
