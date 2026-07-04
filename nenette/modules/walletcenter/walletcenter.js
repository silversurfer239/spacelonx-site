import { ensurePolygon, getChainStatus, buildWalletSnapshot, walletHealth, snapshotToMarkdown } from "../../services/wallet.js";
import { discoverInjectedWallets, connectInjectedWallet, connectWalletConnect, getAppKitStatus } from "../../services/multiwallet.js";
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

function walletIcon(wallet) {
  if (wallet.icon) return `<img src="${wallet.icon}" alt="" referrerpolicy="no-referrer">`;
  const initials = wallet.id === "metamask" ? "MM" : wallet.id === "rabby" ? "RB" : wallet.id === "coinbase" ? "CB" : "EV";
  return `<span>${initials}</span>`;
}

function renderProviderCards(wallets) {
  const byId = new Map(wallets.map(wallet => [wallet.id, wallet]));
  const definitions = [
    { id: "metamask", name: "MetaMask", text: "Connect the MetaMask browser extension.", mobile: "Use WalletConnect on iPhone." },
    { id: "rabby", name: "Rabby Wallet", text: "Connect Rabby with explicit provider selection.", mobile: "Browser extension connection." },
    { id: "coinbase", name: "Coinbase Wallet", text: "Connect the Coinbase Wallet browser provider.", mobile: "WalletConnect supports the mobile app." }
  ];

  const injected = definitions.map(def => {
    const wallet = byId.get(def.id);
    return `
      <article class="wallet-provider-card ${wallet ? "detected" : "not-detected"}">
        <div class="wallet-provider-icon">${walletIcon(wallet || def)}</div>
        <div class="wallet-provider-copy">
          <h3>${def.name}</h3>
          <p>${def.text}</p>
          <small>${wallet ? "Detected in this browser" : def.mobile}</small>
        </div>
        <button data-wallet-provider="${def.id}" ${wallet ? "" : "disabled"}>${wallet ? "Connect" : "Not detected"}</button>
      </article>`;
  }).join("");

  const otherWallets = wallets.filter(wallet => !definitions.some(def => def.id === wallet.id)).map(wallet => `
    <article class="wallet-provider-card detected">
      <div class="wallet-provider-icon">${walletIcon(wallet)}</div>
      <div class="wallet-provider-copy"><h3>${wallet.name}</h3><p>Detected EVM browser wallet.</p><small>Injected provider</small></div>
      <button data-wallet-provider="${wallet.id}">Connect</button>
    </article>`).join("");

  return `${injected}${otherWallets}
    <article class="wallet-provider-card walletconnect-card detected">
      <div class="wallet-provider-icon"><span>WC</span></div>
      <div class="wallet-provider-copy">
        <h3>WalletConnect QR</h3>
        <p>Connect a mobile wallet through Reown AppKit.</p>
        <small>Recommended for iPhone and Android</small>
      </div>
      <button data-wallet-provider="walletconnect">Open QR</button>
    </article>`;
}

function renderSnapshot(snapshot, connection = {}) {
  const health = walletHealth(snapshot);
  return `
    <section class="brief-shell wallet-command">
      <div class="brief-header">
        <div>
          <h3>${connection.walletName || "Wallet"} Snapshot</h3>
          <p>${snapshot.address}</p>
          <small>${connection.method === "walletconnect" ? "Reown AppKit / WalletConnect" : connection.method === "manual" ? "Public address read" : "Injected browser provider"}</small>
        </div>
        <div class="brief-score ${health.score >= 80 ? "brief-low" : health.score >= 60 ? "brief-moderate" : "brief-elevated"}">
          <strong>${health.score}</strong><span>${health.status}</span>
        </div>
      </div>
      <div class="data-grid">
        <div class="metric"><span>SLX Balance</span><b>${fmt(snapshot.slxNumber)} ${snapshot.slx.symbol}</b></div>
        <div class="metric"><span>${snapshot.marketIsLive ? "SLX Value (Live)" : "SLX Value (Estimate)"}</span><b>${usd(snapshot.slxValue)}</b><small>${snapshot.marketIsLive ? "DexScreener live price" : `Fallback price: $${Number(snapshot.market.priceUsd || 0).toFixed(9)}`}</small></div>
        <div class="metric"><span>POL Balance</span><b>${fmt(snapshot.polNumber, 6)} POL</b></div>
        <div class="metric"><span>Market Source</span><b>${snapshot.marketIsLive ? "Live API" : "Fallback / Estimated"}</b><small>${snapshot.market.source || "N/A"}</small></div>
        <div class="metric"><span>Diamond Simulation · Yearly</span><b>${fmt(snapshot.diamondYearly)} SLX</b><small>${(snapshot.diamondApr * 100).toFixed(0)}% APR scenario</small></div>
        <div class="metric"><span>Diamond Simulation · Monthly</span><b>${fmt(snapshot.diamondMonthly)} SLX</b><small>Projection only</small></div>
      </div>
      <div class="brief-grid">
        <article><h4>Wallet Readiness</h4>${health.flags.map(flag => `<p>• ${flag}</p>`).join("")}</article>
        <article>
          <h4>Data Integrity</h4>
          <p>• ${snapshot.marketIsLive ? "USD valuation uses live DexScreener data." : "USD valuation is an estimate calculated from the configured fallback price."}</p>
          <p>• Diamond values are simulations at ${(snapshot.diamondApr * 100).toFixed(0)}% APR.</p>
          <p>• Simulated values are not staking rewards read from a smart contract.</p>
        </article>
        <article>
          <h4>Security</h4>
          <p>• Read-only balance analysis.</p>
          <p>• No seed phrase or private key is requested.</p>
          <p>• No transaction signature is requested.</p>
          <p>• Reown Project ID is restricted to the SpacelonX domain.</p>
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

function bindSnapshotActions(result, snapshot, connection) {
  result.querySelector("#copy-wallet-address")?.addEventListener("click", async event => {
    await navigator.clipboard.writeText(snapshot.address);
    event.currentTarget.textContent = "Copied";
  });
  result.querySelector("#save-connected-wallet")?.addEventListener("click", event => {
    addWallet(snapshot.address, connection.walletName || "Connected Wallet");
    addEvent("wallet", `${connection.walletName || "Wallet"} saved: ${snapshot.short}`);
    event.currentTarget.textContent = "Saved";
  });
  result.querySelector("#export-wallet-md")?.addEventListener("click", () => {
    downloadText("nenette-v762-wallet-snapshot.md", snapshotToMarkdown(snapshot), "text/markdown;charset=utf-8");
  });
}

async function connectAndRead(container, walletId, wallets) {
  const result = container.querySelector("#wallet-center-result");
  const label = walletId === "walletconnect" ? "WalletConnect QR" : walletId === "metamask" ? "MetaMask" : walletId === "rabby" ? "Rabby" : walletId === "coinbase" ? "Coinbase Wallet" : "wallet";
  result.innerHTML = `<section class="loading ultimate-loader"><div class="orb">W</div><div><h2>Connecting ${label}...</h2><p>${walletId === "walletconnect" ? "Loading Reown AppKit and waiting for mobile approval." : "Requesting browser wallet access and Polygon Mainnet."}</p></div></section>`;

  const connection = walletId === "walletconnect" ? await connectWalletConnect() : await connectInjectedWallet(walletId);
  if (connection.provider && connection.method === "injected") await ensurePolygon(connection.provider);
  setLastConnectedWallet(connection.address);
  await renderConnectionStatus(container, wallets, connection.provider, connection.address, connection.walletName, connection.method);
  const snapshot = await buildWalletSnapshot(connection.address);
  addEvent("wallet", `${connection.walletName} connected: ${snapshot.short}`);
  result.innerHTML = renderSnapshot(snapshot, connection);
  bindSnapshotActions(result, snapshot, connection);
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
  const connection = { walletName: "Public Wallet", method: "manual" };
  result.innerHTML = renderSnapshot(snapshot, connection);
  bindSnapshotActions(result, snapshot, connection);
}

async function renderConnectionStatus(container, wallets, activeProvider = null, activeAddress = "", walletName = "", method = "") {
  const result = container.querySelector("#connection-status");
  const settings = getSettings();
  const appKit = getAppKitStatus();
  let chain = { chainName: "No injected wallet", isPolygon: false };
  if (method === "walletconnect") {
    chain = { chainName: "Polygon Mainnet (WalletConnect)", isPolygon: true };
  } else {
    try { chain = await getChainStatus(activeProvider || wallets[0]?.provider); } catch {}
  }
  result.innerHTML = `
    <div class="data-grid">
      <div class="metric"><span>Injected Wallets</span><b>${wallets.length}</b></div>
      <div class="metric"><span>WalletConnect</span><b>${appKit.projectIdReady ? "Ready" : "Not configured"}</b></div>
      <div class="metric"><span>Active Network</span><b>${chain.chainName}</b></div>
      <div class="metric"><span>Polygon Ready</span><b>${chain.isPolygon ? "Yes" : "Switch required"}</b></div>
      <div class="metric"><span>Saved Wallets</span><b>${settings.savedWallets?.length || 0}</b></div>
      <div class="metric"><span>Last Connected</span><b>${activeAddress ? `${activeAddress.slice(0,6)}...${activeAddress.slice(-4)}` : settings.lastConnectedWallet ? `${settings.lastConnectedWallet.slice(0,6)}...${settings.lastConnectedWallet.slice(-4)}` : "N/A"}</b><small>${walletName || ""}</small></div>
    </div>`;
}

export async function renderWalletCenter(container) {
  container.innerHTML = `
    <section class="card wallet-center-card">
      <div class="section-title">
        <div>
          <h2>Wallet Center V7.6.2</h2>
          <p>Explicit MetaMask, Rabby, Coinbase Wallet and WalletConnect QR connections with mobile-ready Polygon portfolio reading.</p>
        </div>
        <span>MULTI-WALLET</span>
      </div>
      <div class="answer strategic-answer"><strong>One active wallet at a time:</strong> the Starter plan supports a wallet selector and many wallet brands, while saved public addresses remain available together in Portfolio.</div>
      <div id="connection-status"></div>
      <div id="wallet-provider-list" class="wallet-provider-grid"><section class="loading"><p>Detecting wallet providers...</p></section></div>
      <div class="manual-wallet-panel">
        <h3>Read any public Polygon address</h3>
        <div class="form"><input id="manual-wallet" placeholder="0x..."><button id="read-manual-wallet">Read Address</button></div>
      </div>
      <div id="wallet-center-result"></div>
    </section>`;

  const wallets = await discoverInjectedWallets();
  const providerList = container.querySelector("#wallet-provider-list");
  providerList.innerHTML = renderProviderCards(wallets);
  await renderConnectionStatus(container, wallets);

  providerList.querySelectorAll("[data-wallet-provider]").forEach(button => {
    button.addEventListener("click", async () => {
      const originalLabel = button.textContent;
      button.disabled = true;
      button.textContent = "Connecting...";
      try {
        await connectAndRead(container, button.dataset.walletProvider, wallets);
      } catch (error) {
        container.querySelector("#wallet-center-result").innerHTML = `<div class="answer"><strong>Wallet error:</strong> ${error.message || error}<br><small>For MetaMask, unlock the extension and check its icon for a pending request.</small></div>`;
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  });

  container.querySelector("#read-manual-wallet").addEventListener("click", async () => {
    try { await readManual(container); }
    catch (error) { container.querySelector("#wallet-center-result").innerHTML = `<div class="answer">Read error: ${error.message || error}</div>`; }
  });
}
