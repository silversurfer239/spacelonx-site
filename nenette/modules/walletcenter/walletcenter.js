import { connectWallet, ensurePolygon, getChainStatus, getConnectedAccounts, walletAvailable, buildWalletSnapshot, walletHealth, snapshotToMarkdown } from "../../services/wallet.js";
import { addWallet, setLastConnectedWallet, getSettings } from "../../services/storage.js";
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

function renderSnapshot(snapshot) {
  const health = walletHealth(snapshot);
  return `
    <section class="brief-shell wallet-command">
      <div class="brief-header">
        <div>
          <h3>Connected Wallet Snapshot</h3>
          <p>${snapshot.address}</p>
        </div>
        <div class="brief-score ${health.score >= 80 ? "brief-low" : health.score >= 60 ? "brief-moderate" : "brief-elevated"}">
          <strong>${health.score}</strong>
          <span>${health.status}</span>
        </div>
      </div>

      <div class="data-grid">
        <div class="metric"><span>SLX Balance</span><b>${fmt(snapshot.slxNumber)} ${snapshot.slx.symbol}</b></div>
        <div class="metric"><span>SLX Value</span><b>${usd(snapshot.slxValue)}</b></div>
        <div class="metric"><span>POL Balance</span><b>${fmt(snapshot.polNumber, 6)} POL</b></div>
        <div class="metric"><span>Market Source</span><b>${snapshot.market.status}</b></div>
        <div class="metric"><span>Diamond Yearly</span><b>${fmt(snapshot.diamondYearly)} SLX</b></div>
        <div class="metric"><span>Diamond Monthly</span><b>${fmt(snapshot.diamondMonthly)} SLX</b></div>
      </div>

      <div class="brief-grid">
        <article>
          <h4>Wallet Readiness</h4>
          ${health.flags.map(flag => `<p>• ${flag}</p>`).join("")}
        </article>
        <article>
          <h4>Security Reminder</h4>
          <p>• Nénette V7.5 only reads public wallet balances.</p>
          <p>• No private key or seed phrase is requested.</p>
          <p>• Verify the SLX contract before any transaction.</p>
        </article>
      </div>

      <div class="form brief-actions">
        <button id="copy-wallet-address">Copy Address</button>
        <button id="save-connected-wallet">Save Wallet</button>
        <button id="export-wallet-md">Export Snapshot</button>
        <a class="btn" target="_blank" rel="noreferrer" href="${snapshot.explorerUrl}">Open Polygonscan</a>
      </div>
    </section>`;
}

async function showStatus(container) {
  const result = container.querySelector("#wallet-center-result");
  const providerDetected = walletAvailable();
  const accounts = await getConnectedAccounts();
  let chain = { chainName: "No wallet", isPolygon: false, chainId: "N/A" };
  try { chain = await getChainStatus(); } catch {}
  const settings = getSettings();

  result.innerHTML = `
    <section class="data-grid">
      <div class="metric"><span>Browser Wallet</span><b>${providerDetected ? "Detected" : "Not detected"}</b></div>
      <div class="metric"><span>Connected Account</span><b>${accounts?.[0] ? `${accounts[0].slice(0,6)}...${accounts[0].slice(-4)}` : "None"}</b></div>
      <div class="metric"><span>Network</span><b>${chain.chainName}</b></div>
      <div class="metric"><span>Polygon Ready</span><b>${chain.isPolygon ? "Yes" : "No"}</b></div>
      <div class="metric"><span>Saved Wallets</span><b>${settings.savedWallets?.length || 0}</b></div>
      <div class="metric"><span>Last Connected</span><b>${settings.lastConnectedWallet ? `${settings.lastConnectedWallet.slice(0,6)}...${settings.lastConnectedWallet.slice(-4)}` : "N/A"}</b></div>
    </section>`;
}

async function connectAndRead(container) {
  const result = container.querySelector("#wallet-center-result");
  result.innerHTML = `<section class="loading ultimate-loader"><div class="orb">W</div><div><h2>Connecting wallet...</h2><p>Requesting browser wallet access and switching to Polygon Mainnet if needed.</p></div></section>`;
  const wallet = await connectWallet();
  await ensurePolygon(wallet.provider);
  setLastConnectedWallet(wallet.address);
  const snapshot = await buildWalletSnapshot(wallet.address);
  addEvent("wallet", `Wallet connected: ${snapshot.short}`);
  result.innerHTML = renderSnapshot(snapshot);

  result.querySelector("#copy-wallet-address").addEventListener("click", async () => {
    await navigator.clipboard.writeText(snapshot.address);
  });
  result.querySelector("#save-connected-wallet").addEventListener("click", () => {
    addWallet(snapshot.address, "Connected Wallet");
    addEvent("wallet", `Wallet saved: ${snapshot.short}`);
    result.querySelector("#save-connected-wallet").textContent = "Saved";
  });
  result.querySelector("#export-wallet-md").addEventListener("click", () => {
    downloadText("nenette-v75-wallet-snapshot.md", snapshotToMarkdown(snapshot), "text/markdown;charset=utf-8");
  });
}

async function readManual(container) {
  const address = container.querySelector("#manual-wallet").value.trim();
  const result = container.querySelector("#wallet-center-result");
  if (!ethers.isAddress(address)) {
    result.innerHTML = `<div class="answer">Invalid Polygon wallet address.</div>`;
    return;
  }
  result.innerHTML = `<section class="loading ultimate-loader"><div class="orb">SLX</div><div><h2>Reading wallet...</h2><p>Reading public SLX and POL balances on Polygon.</p></div></section>`;
  const snapshot = await buildWalletSnapshot(address);
  result.innerHTML = renderSnapshot(snapshot);
  result.querySelector("#copy-wallet-address").addEventListener("click", async () => navigator.clipboard.writeText(snapshot.address));
  result.querySelector("#save-connected-wallet").addEventListener("click", () => {
    addWallet(snapshot.address, "Manual Wallet");
    addEvent("wallet", `Manual wallet saved: ${snapshot.short}`);
    result.querySelector("#save-connected-wallet").textContent = "Saved";
  });
  result.querySelector("#export-wallet-md").addEventListener("click", () => downloadText("nenette-v75-wallet-snapshot.md", snapshotToMarkdown(snapshot), "text/markdown;charset=utf-8"));
}

export async function renderWalletCenter(container) {
  container.innerHTML = `
    <section class="card wallet-center-card">
      <div class="section-title">
        <div>
          <h2>Wallet Center V7.5</h2>
          <p>Connect MetaMask, switch to Polygon, read SLX/POL balances and export a wallet readiness snapshot.</p>
        </div>
        <span>WALLET CONNECT</span>
      </div>

      <div class="form">
        <button id="wallet-status">Wallet Status</button>
        <button id="connect-read-wallet">Connect + Read</button>
        <button id="switch-polygon">Switch Polygon</button>
        <input id="manual-wallet" placeholder="Read public wallet 0x...">
        <button id="read-manual-wallet">Read Address</button>
      </div>

      <div class="answer strategic-answer">
        <strong>Security:</strong> this module only reads public balances through Polygon RPC and your browser wallet. It never asks for a seed phrase or private key.
      </div>

      <div id="wallet-center-result"></div>
    </section>`;

  container.querySelector("#wallet-status").addEventListener("click", () => showStatus(container));
  container.querySelector("#connect-read-wallet").addEventListener("click", async () => {
    try { await connectAndRead(container); } catch (error) { container.querySelector("#wallet-center-result").innerHTML = `<div class="answer">Wallet error: ${error.message || error}</div>`; }
  });
  container.querySelector("#switch-polygon").addEventListener("click", async () => {
    try { await ensurePolygon(); await showStatus(container); } catch (error) { container.querySelector("#wallet-center-result").innerHTML = `<div class="answer">Network error: ${error.message || error}</div>`; }
  });
  container.querySelector("#read-manual-wallet").addEventListener("click", async () => {
    try { await readManual(container); } catch (error) { container.querySelector("#wallet-center-result").innerHTML = `<div class="answer">Read error: ${error.message || error}</div>`; }
  });

  await showStatus(container);
}
