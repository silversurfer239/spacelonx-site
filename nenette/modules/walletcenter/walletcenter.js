import { ensurePolygon, getChainStatus, buildWalletSnapshot, walletHealth, snapshotToMarkdown } from "../../services/wallet.js";
import { simulateSell } from "../../services/liquidity.js";
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

function pct(value, decimals = 1) {
  const number = Number(value || 0);
  return `${number.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}%`;
}

function renderExitRow(item) {
  return `
    <tr>
      <td><strong>${item.percent < 1 ? item.percent.toFixed(2) : item.percent.toFixed(0)}%</strong></td>
      <td>${fmt(item.amountSlx)} SLX</td>
      <td>${usd(item.spotValueUsd)}</td>
      <td>${fmt(item.outputQuote, 6)} ${item.quoteToken}</td>
      <td>${usd(item.outputUsd)}</td>
      <td class="${item.executionLossPct >= 25 ? "risk-high" : item.executionLossPct >= 10 ? "risk-watch" : "risk-ok"}">${pct(item.executionLossPct)}</td>
      <td>${pct(item.recoveryPct)}</td>
      <td>${pct(item.poolPriceImpactPct)}</td>
    </tr>`;
}

function renderCustomExitResult(item) {
  return `
    <div class="exit-result-grid">
      <div class="metric"><span>Estimated received</span><b>${fmt(item.outputQuote, 6)} ${item.quoteToken}</b><small>${usd(item.outputUsd)}</small></div>
      <div class="metric"><span>Spot valuation</span><b>${usd(item.spotValueUsd)}</b><small>Reference value before execution</small></div>
      <div class="metric"><span>Recovery vs spot</span><b>${pct(item.recoveryPct)}</b><small>Estimated proceeds / spot valuation</small></div>
      <div class="metric"><span>Execution shortfall</span><b>${pct(item.executionLossPct)}</b><small>Fee + reserve impact</small></div>
      <div class="metric"><span>Post-trade pool spot</span><b>${usd(item.postSpotPriceUsd)}</b><small>${pct(item.poolPriceImpactPct)} pool spot-price change</small></div>
    </div>`;
}

function renderExitSimulator(snapshot) {
  const analysis = snapshot.exitAnalysis;
  if (!analysis?.available) {
    return `
      <section class="exit-simulator unavailable">
        <div class="section-title"><div><h3>Liquidity & Exit Simulator</h3><p>Live QuickSwap reserves are required.</p></div><span>UNAVAILABLE</span></div>
      </section>`;
  }

  const riskClass = ["EXTREME EXIT RISK", "HIGH EXIT RISK"].includes(analysis.status) ? "exit-risk-high" : analysis.status === "ELEVATED EXIT RISK" ? "exit-risk-watch" : "exit-risk-ok";
  return `
    <section class="exit-simulator ${riskClass}">
      <div class="section-title">
        <div>
          <h3>Liquidity & Exit Simulator</h3>
          <p>Constant-product estimate for a direct SLX sale into the displayed QuickSwap V2 pool.</p>
        </div>
        <span>${analysis.status}</span>
      </div>
      <div class="data-grid exit-summary-grid">
        <div class="metric"><span>Wallet Spot Valuation</span><b>${usd(analysis.walletSpotValueUsd)}</b><small>Reference value, not guaranteed proceeds</small></div>
        <div class="metric"><span>Estimated Full-Wallet Exit</span><b>${usd(analysis.fullExitUsd)}</b><small>Direct-pool model at current reserves</small></div>
        <div class="metric"><span>Full-Wallet Recovery</span><b>${pct(analysis.fullExitRecoveryPct)}</b><small>Estimated proceeds / spot valuation</small></div>
        <div class="metric"><span>Total Pool Liquidity</span><b>${usd(analysis.poolLiquidityUsd)}</b><small>Both reserve sides at current spot</small></div>
        <div class="metric"><span>Current Quote Reserve</span><b>${fmt(analysis.quoteReserveAmount, 6)} ${analysis.quoteToken}</b><small>${usd(analysis.quoteReserveUsd)} · any direct-swap output remains below this reserve</small></div>
        <div class="metric"><span>Wallet / Pool Liquidity</span><b>${pct(analysis.walletSpotToLiquidityRatio * 100)}</b><small>Spot-valuation comparison</small></div>
        <div class="metric"><span>Wallet / SLX Reserve</span><b>${pct(analysis.walletToSlxReserveRatio * 100)}</b><small>Pool-depth comparison</small></div>
        <div class="metric"><span>Fee Assumption</span><b>${(analysis.feeBps / 100).toFixed(2)}%</b><small>Applied to every simulation</small></div>
      </div>
      <div class="exit-table-wrap">
        <table class="exit-table">
          <thead><tr><th>Wallet sold</th><th>SLX amount</th><th>Spot valuation</th><th>Estimated quote</th><th>Estimated USD</th><th>Execution shortfall</th><th>Recovery</th><th>Pool spot-price change</th></tr></thead>
          <tbody>${analysis.scenarios.map(renderExitRow).join("")}</tbody>
        </table>
      </div>
      <div class="custom-exit-panel">
        <div>
          <h4>Custom wallet sale</h4>
          <p>Enter a percentage from 0.01% to 100%. This is a read-only estimate and does not create a transaction.</p>
        </div>
        <div class="form exit-form">
          <input id="exit-percent" type="number" min="0.01" max="100" step="0.01" value="10" inputmode="decimal">
          <button id="simulate-exit">Simulate Exit</button>
        </div>
        <div id="custom-exit-result">${renderCustomExitResult(analysis.scenarios.find(item => item.fraction === 0.10) || analysis.scenarios[0])}</div>
      </div>
      <div class="answer exit-disclaimer">
        <strong>Model limits:</strong> direct-pool constant-product calculation only. The current quote reserve is a pool balance, not an amount withdrawable at a fixed price; the pool price changes with every trade, and direct-swap output always remains below that reserve. Gas, MEV, routing, other pools, market movement and token transfer mechanics are excluded. Actual execution can differ materially.
      </div>
    </section>`;
}

function renderSnapshot(snapshot, connection = {}) {
  const health = walletHealth(snapshot);
  const isApi = snapshot.market.priceMode === "api";
  const isOnChain = snapshot.market.priceMode === "onchain";
  const valueLabel = isApi ? "SLX Value (Live API)" : isOnChain ? "SLX Value (On-chain Spot)" : "SLX Value (Estimate)";
  const valueNote = isApi
    ? "DexScreener live price"
    : isOnChain
      ? `QuickSwap reserves · ${snapshot.market.quotePriceSource || "POL/USD reference"}`
      : `Fallback price: $${Number(snapshot.market.priceUsd || 0).toFixed(9)}`;
  const sourceLabel = isApi ? "DexScreener Live API" : isOnChain ? "QuickSwap On-chain" : "Fallback / Estimated";
  const integrityText = isApi
    ? "USD valuation uses live DexScreener market data."
    : isOnChain
      ? "USD valuation uses the current QuickSwap V2 reserve ratio and a POL/USD reference. It is a pool spot price, not a guaranteed execution price."
      : "USD valuation is an estimate calculated from the configured fallback price.";

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
        <div class="metric"><span>${valueLabel}</span><b>${usd(snapshot.slxValue)}</b><small>${valueNote}</small></div>
        <div class="metric"><span>POL Balance</span><b>${fmt(snapshot.polNumber, 6)} POL</b></div>
        <div class="metric"><span>Market Source</span><b>${sourceLabel}</b><small>${snapshot.market.source || "N/A"}</small></div>
        ${isOnChain ? `<div class="metric"><span>Pool Liquidity</span><b>${usd(snapshot.market.liquidityUsd)}</b><small>Calculated from both QuickSwap reserves</small></div>` : ""}
        ${isOnChain ? `<div class="metric"><span>Pool Block</span><b>${snapshot.market.blockNumber || "N/A"}</b><small>${snapshot.market.rpc || "Polygon RPC"}</small></div>` : ""}
        <div class="metric"><span>Diamond Simulation · Yearly</span><b>${fmt(snapshot.diamondYearly)} SLX</b><small>${(snapshot.diamondApr * 100).toFixed(0)}% APR scenario</small></div>
        <div class="metric"><span>Diamond Simulation · Monthly</span><b>${fmt(snapshot.diamondMonthly)} SLX</b><small>Projection only</small></div>
      </div>
      <div class="brief-grid">
        <article><h4>Wallet & Exit Readiness</h4>${health.flags.map(flag => `<p>• ${flag}</p>`).join("")}</article>
        <article>
          <h4>Data Integrity</h4>
          <p>• ${integrityText}</p>
          <p>• Exit estimates use current pool reserves and a ${(snapshot.exitAnalysis?.feeBps || 30) / 100}% fee assumption.</p>
          <p>• The current quote reserve is a hard upper bound for direct pool output, not guaranteed proceeds at the current spot price.</p>
          <p>• Diamond values are simulations at ${(snapshot.diamondApr * 100).toFixed(0)}% APR, not accrued rewards.</p>
        </article>
        <article>
          <h4>Security</h4>
          <p>• Read-only balance and liquidity analysis.</p>
          <p>• No seed phrase or private key is requested.</p>
          <p>• No transaction signature is requested.</p>
          <p>• Reown Project ID is restricted to the SpacelonX domain.</p>
        </article>
      </div>
      ${renderExitSimulator(snapshot)}
      <div class="form brief-actions">
        <button id="copy-wallet-address">Copy Address</button>
        <button id="save-connected-wallet">Save Wallet</button>
        <button id="export-wallet-md">Export Snapshot</button>
        <a class="btn" target="_blank" rel="noreferrer" href="${snapshot.explorerUrl}">Open Polygonscan</a>
      </div>
    </section>`;
}

function bindExitSimulator(result, snapshot) {
  const button = result.querySelector("#simulate-exit");
  const input = result.querySelector("#exit-percent");
  const output = result.querySelector("#custom-exit-result");
  if (!button || !input || !output || !snapshot.exitAnalysis?.available) return;

  const run = () => {
    const percent = Number(input.value);
    if (!Number.isFinite(percent) || percent < 0.01 || percent > 100) {
      output.innerHTML = `<div class="answer"><strong>Invalid percentage:</strong> enter a value between 0.01 and 100.</div>`;
      return;
    }
    try {
      const scenario = simulateSell(snapshot.market, snapshot.slxNumber * percent / 100);
      output.innerHTML = renderCustomExitResult(scenario);
    } catch (error) {
      output.innerHTML = `<div class="answer"><strong>Simulation error:</strong> ${error.message || error}</div>`;
    }
  };

  button.addEventListener("click", run);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter") run();
  });
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
    downloadText("nenette-v765-liquidity-accuracy-snapshot.md", snapshotToMarkdown(snapshot), "text/markdown;charset=utf-8");
  });
  bindExitSimulator(result, snapshot);
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
          <h2>Wallet Center V7.6.5</h2>
          <p>Multi-wallet Polygon reading with precise QuickSwap reserve terminology, liquidity depth and wallet exit simulation.</p>
        </div>
        <span>LIQUIDITY ACCURACY</span>
      </div>
      <div class="answer strategic-answer"><strong>Read-only analysis:</strong> Nénette estimates pool execution from current reserves. It never creates or signs a sale transaction.</div>
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
