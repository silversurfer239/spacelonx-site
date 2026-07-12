import { CONFIG } from "../../config/config.js";
import { getMarketData, getMarketScore, isMarketPriceLive } from "../../services/market.js";
import { getBlockchainStats, blockchainScore } from "../../services/blockchain.js";
import { getHolderStats, trustScore } from "../../services/holders.js";
import { getSettings } from "../../services/storage.js";
import { buildWalletSnapshot, walletHealth } from "../../services/wallet.js";
import { stakingPools, estimateRewards } from "../../services/staking.js";
import { usd, fmt, shortTime, shortAddress } from "../../services/format.js";

function ring(score, label = "") {
  const safe = Math.max(0, Math.min(100, Math.round(Number(score || 0))));
  return `<div class="ring ultimate-ring v8-ring" style="--score:${safe}"><strong>${safe}</strong><span>/100</span>${label ? `<small>${label}</small>` : ""}</div>`;
}

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

function statusClass(value = "") {
  const text = String(value).toUpperCase();
  if (text.includes("DONE") || text.includes("READY") || text.includes("LIVE")) return "good";
  if (text.includes("ACTIVE") || text.includes("WATCH") || text.includes("NEXT")) return "warn";
  if (text.includes("RISK") || text.includes("FALLBACK")) return "risk";
  return "neutral";
}

function sourceLabel(market) {
  if (market.status === "Live API") return "DexScreener Live";
  if (market.status === "On-chain Pool") return "QuickSwap On-chain";
  return "Fallback Estimate";
}

function intelligenceLines({ market, blockchain, holders, wallet }) {
  const lines = [];
  if (market.status === "On-chain Pool") lines.push("QuickSwap reserve pricing is active; execution value must be read together with liquidity depth.");
  else if (market.status === "Live API") lines.push("DexScreener live market data is active.");
  else lines.push("Market data is in fallback mode; USD values remain provisional.");

  if (wallet?.exitAnalysis?.available) {
    lines.push(`Wallet exit status: ${wallet.exitAnalysis.status}. Full-wallet recovery is estimated at ${wallet.exitAnalysis.fullExitRecoveryPct.toFixed(1)}% of spot valuation.`);
  } else {
    lines.push("Connect or read a Polygon wallet to activate portfolio and exit intelligence.");
  }

  lines.push(blockchain?.contractDetected ? "SLX contract is detected on Polygon Mainnet." : "SLX contract verification is unavailable.");
  lines.push(holders?.lpLocked ? `LP lock is displayed through ${new Date(holders.lpUnlockDate).toLocaleDateString()}.` : "LP lock data is unavailable.");
  lines.push("Bronze, Silver, Gold and Diamond staking figures are simulations until a verified staking contract is connected.");
  return lines;
}

function buildReport(data) {
  return {
    product: "Nénette AI V8.0 — Nénette Pure",
    generatedAt: new Date().toISOString(),
    market: data.market,
    blockchain: data.blockchain,
    trust: data.holders,
    wallet: data.wallet ? {
      address: data.wallet.address,
      slx: data.wallet.slxNumber,
      pol: data.wallet.polNumber,
      spotValueUsd: data.wallet.slxValue,
      health: walletHealth(data.wallet),
      exit: data.wallet.exitAnalysis
    } : null,
    staking: stakingPools,
    tokenomics: CONFIG.tokenomics,
    roadmap: CONFIG.roadmap,
    notes: [
      "Wallet, market and liquidity functions are read-only.",
      "Staking figures are simulations until a verified staking contract is integrated.",
      "Pool spot valuation is not guaranteed execution value."
    ]
  };
}

function reportMarkdown(data) {
  const report = buildReport(data);
  const wallet = report.wallet;
  return `# Nénette AI V8.0 — SpacelonX Intelligence Report\n\nGenerated: ${new Date(report.generatedAt).toLocaleString()}\n\n## Market\n- Source: ${sourceLabel(report.market)}\n- Price: ${usd(report.market.priceUsd)}\n- Liquidity: ${usd(report.market.liquidityUsd)}\n- FDV: ${usd(report.market.fdvUsd)}\n\n## Blockchain & Trust\n- Network: Polygon Mainnet\n- Latest block: ${report.blockchain ? fmt(report.blockchain.latestBlock, 0) : "N/A"}\n- Contract detected: ${report.blockchain?.contractDetected ? "Yes" : "No"}\n- LP locked: ${report.trust?.lpLocked ? "Yes" : "No"}\n- LP unlock: ${report.trust?.lpUnlockDate ? new Date(report.trust.lpUnlockDate).toLocaleDateString() : "N/A"}\n\n## Wallet\n${wallet ? `- Address: ${wallet.address}\n- SLX: ${fmt(wallet.slx)}\n- POL: ${fmt(wallet.pol, 6)}\n- Spot value: ${usd(wallet.spotValueUsd)}\n- Status: ${wallet.health.status}\n- Full-wallet exit estimate: ${wallet.exit?.available ? usd(wallet.exit.fullExitUsd) : "N/A"}\n- Full-wallet recovery: ${wallet.exit?.available ? `${wallet.exit.fullExitRecoveryPct.toFixed(1)}%` : "N/A"}` : "No wallet selected."}\n\n## Staking\n${stakingPools.map(pool => `- ${pool.name}: ${pool.apr}% APR · ${pool.lock} · Simulation`).join("\n")}\n\n## Tokenomics\n${CONFIG.tokenomics.map(item => `- ${item.name}: ${item.percent}%`).join("\n")}\n\n## Roadmap\n${CONFIG.roadmap.map(item => `- ${item.phase} — ${item.title}: ${item.status}`).join("\n")}\n\n## Integrity\n- Read-only dashboard.\n- No seed phrase or private key is requested.\n- Staking is not live until a verified contract is connected.\n`;
}

export async function renderDashboard(container) {
  container.innerHTML = `<section class="loading ultimate-loader"><div class="orb">N</div><div><h2>Launching Nénette Pure...</h2><p>Synchronizing Polygon, QuickSwap, wallet intelligence and SpacelonX project data.</p></div></section>`;

  const settings = getSettings();
  const [marketResult, blockchainResult, holdersResult] = await Promise.allSettled([
    getMarketData(),
    getBlockchainStats(),
    getHolderStats()
  ]);

  const market = marketResult.status === "fulfilled" ? marketResult.value : {
    status: "Unavailable", priceUsd: 0, liquidityUsd: 0, fdvUsd: 0, source: marketResult.reason?.message || "Unavailable", pair: "SLX / WPOL"
  };
  const blockchain = blockchainResult.status === "fulfilled" ? blockchainResult.value : null;
  const holders = holdersResult.status === "fulfilled" ? holdersResult.value : null;

  let wallet = null;
  const walletAddress = settings.lastConnectedWallet || settings.savedWallets?.[0]?.address || "";
  if (walletAddress && typeof ethers !== "undefined" && ethers.isAddress(walletAddress)) {
    try { wallet = await buildWalletSnapshot(walletAddress); } catch {}
  }

  const marketScore = getMarketScore(market);
  const chainScore = blockchain ? blockchainScore(blockchain) : 0;
  const projectTrustScore = holders ? trustScore(holders) : 0;
  const walletScore = wallet ? walletHealth(wallet).score : 50;
  const globalScore = Math.round(marketScore * 0.25 + chainScore * 0.25 + projectTrustScore * 0.25 + walletScore * 0.25);
  const intelligence = intelligenceLines({ market, blockchain, holders, wallet });
  const fullExit = wallet?.exitAnalysis?.available ? wallet.exitAnalysis.fullExit : null;
  const valueLabel = market.priceMode === "onchain" ? "On-chain spot" : market.priceMode === "api" ? "Live market" : "Fallback estimate";

  container.innerHTML = `
    <section class="v8-hero">
      <div class="v8-hero-copy">
        <div class="pill">● V8.0 NÉNETTE PURE</div>
        <h3>SpacelonX Intelligence Cockpit</h3>
        <p>One operational dashboard for market data, Polygon, wallet intelligence, liquidity, staking simulation, tokenomics, trust, roadmap and reports.</p>
        <div class="hero-actions">
          <button data-target="walletcenter">Connect / Read Wallet</button>
          <button data-target="market">Open Market Intelligence</button>
          <button data-target="staking" class="outline">Open Staking Center</button>
          <button data-target="reports" class="outline">Generate Report</button>
        </div>
      </div>
      <div class="v8-command-score">
        <span>SpacelonX Readiness</span>
        ${ring(globalScore, "GLOBAL")}
        <b class="source-chip ${statusClass(market.status)}">${sourceLabel(market)}</b>
      </div>
    </section>

    <section class="v8-kpi-grid">
      <article><small>SLX Price</small><strong>${usd(market.priceUsd)}</strong><p>${valueLabel} · ${market.pair || "SLX / WPOL"}</p></article>
      <article><small>Pool Liquidity</small><strong>${usd(market.liquidityUsd)}</strong><p>${market.source || "Source unavailable"}</p></article>
      <article><small>Fully Diluted Value</small><strong>${usd(market.fdvUsd || market.marketCapUsd)}</strong><p>Based on current price source</p></article>
      <article><small>Polygon Block</small><strong>${blockchain ? fmt(blockchain.latestBlock, 0) : "N/A"}</strong><p>${blockchain ? shortTime(blockchain.updatedAt) : "RPC unavailable"}</p></article>
      <article><small>LP Lock</small><strong>${holders?.lpLocked ? "100%" : "N/A"}</strong><p>${holders?.lpUnlockDate ? `Until ${new Date(holders.lpUnlockDate).toLocaleDateString()}` : "Lock data unavailable"}</p></article>
      <article><small>Wallet Status</small><strong>${wallet ? walletHealth(wallet).status : "NOT LOADED"}</strong><p>${wallet ? shortAddress(wallet.address) : "Connect or read a wallet"}</p></article>
    </section>

    <section class="v8-dashboard-grid">
      <article class="v8-panel v8-span-2">
        <div class="section-title"><div><h2>Executive Overview</h2><p>Live operational state across market, chain, trust and wallet readiness.</p></div><span>OVERVIEW</span></div>
        <div class="v8-score-row">
          <div>${ring(marketScore)}<b>Market</b><small>${market.status}</small></div>
          <div>${ring(chainScore)}<b>Blockchain</b><small>${blockchain?.contractDetected ? "Contract detected" : "Unavailable"}</small></div>
          <div>${ring(projectTrustScore)}<b>Trust</b><small>${holders?.lpLocked ? "LP locked" : "Pending"}</small></div>
          <div>${ring(walletScore)}<b>Wallet</b><small>${wallet ? walletHealth(wallet).status : "Not loaded"}</small></div>
        </div>
      </article>

      <article class="v8-panel">
        <div class="section-title"><div><h2>Data Integrity</h2><p>Source hierarchy and calculation status.</p></div><span>LIVE</span></div>
        <div class="v8-data-list">
          <p><span>Price source</span><b>${sourceLabel(market)}</b></p>
          <p><span>Market mode</span><b>${market.priceMode || "unknown"}</b></p>
          <p><span>Pool block</span><b>${market.blockNumber ? fmt(market.blockNumber, 0) : "N/A"}</b></p>
          <p><span>RPC</span><b>${market.rpc || blockchain?.rpc || "N/A"}</b></p>
        </div>
      </article>

      <article class="v8-panel">
        <div class="section-title"><div><h2>Wallet & Portfolio</h2><p>Connected or saved Polygon wallet.</p></div><span>PORTFOLIO</span></div>
        ${wallet ? `
          <div class="v8-wallet-head"><b>${shortAddress(wallet.address)}</b><span class="source-chip ${statusClass(walletHealth(wallet).status)}">${walletHealth(wallet).status}</span></div>
          <div class="v8-data-list">
            <p><span>SLX balance</span><b>${fmt(wallet.slxNumber)} SLX</b></p>
            <p><span>POL balance</span><b>${fmt(wallet.polNumber, 6)} POL</b></p>
            <p><span>Spot value</span><b>${usd(wallet.slxValue)}</b></p>
            <p><span>Full exit estimate</span><b>${fullExit ? usd(fullExit.outputUsd) : "N/A"}</b></p>
            <p><span>Recovery vs spot</span><b>${fullExit ? `${fullExit.recoveryPct.toFixed(1)}%` : "N/A"}</b></p>
          </div>` : `
          <div class="v8-empty"><strong>No wallet loaded</strong><p>Open Wallet Center to connect MetaMask, Rabby, Coinbase Wallet or WalletConnect, or read any public Polygon address.</p><button data-target="walletcenter">Open Wallet Center</button></div>`}
      </article>

      <article class="v8-panel">
        <div class="section-title"><div><h2>Liquidity Intelligence</h2><p>Pool depth and direct-exit realism.</p></div><span>EXIT</span></div>
        ${wallet?.exitAnalysis?.available ? `
          <div class="v8-risk-banner ${statusClass(wallet.exitAnalysis.status)}">${wallet.exitAnalysis.status}</div>
          <div class="v8-data-list">
            <p><span>Wallet / pool liquidity</span><b>${(wallet.exitAnalysis.walletSpotToLiquidityRatio * 100).toFixed(1)}%</b></p>
            <p><span>Wallet / SLX reserve</span><b>${(wallet.exitAnalysis.walletToSlxReserveRatio * 100).toFixed(1)}%</b></p>
            <p><span>Current quote reserve</span><b>${fmt(wallet.exitAnalysis.quoteReserveAmount, 6)} ${wallet.exitAnalysis.quoteToken}</b></p>
            <p><span>Full-wallet exit</span><b>${usd(wallet.exitAnalysis.fullExitUsd)}</b></p>
            <p><span>Execution shortfall</span><b>${wallet.exitAnalysis.fullExitShortfallPct.toFixed(1)}%</b></p>
          </div>
          <button data-target="walletcenter" class="v8-wide-button">Open Full Exit Simulator</button>` : `
          <div class="v8-empty"><strong>Exit model not active</strong><p>Live QuickSwap reserves and a wallet balance are required.</p></div>`}
      </article>

      <article class="v8-panel v8-span-2">
        <div class="section-title"><div><h2>Staking Center</h2><p>Bronze, Silver, Gold and Diamond reward simulation.</p></div><span>SIMULATION</span></div>
        <div class="v8-staking-tiers">
          ${stakingPools.map(pool => `<button class="v8-tier" data-stake-tier="${pool.name}" data-apr="${pool.apr}"><span>${pool.name}</span><strong>${pool.apr}% APR</strong><small>${pool.lock}</small></button>`).join("")}
        </div>
        <div class="v8-staking-form">
          <input id="v8-stake-amount" inputmode="decimal" placeholder="SLX amount">
          <select id="v8-stake-pool">${stakingPools.map(pool => `<option value="${pool.apr}" data-name="${pool.name}">${pool.name} · ${pool.apr}% APR · ${pool.lock}</option>`).join("")}</select>
          <button id="v8-stake-simulate">Simulate</button>
        </div>
        <div id="v8-stake-result" class="v8-stake-result"><p>Simulation only. No staking contract is called and no transaction is created.</p></div>
      </article>

      <article class="v8-panel">
        <div class="section-title"><div><h2>Tokenomics</h2><p>Declared allocation framework.</p></div><span>6B SLX</span></div>
        <div class="v8-tokenomics">
          ${CONFIG.tokenomics.map(item => `<div><span style="--w:${item.percent}%"></span><p><b>${item.name}</b><strong>${item.percent}%</strong></p><small>${item.vesting}</small></div>`).join("")}
        </div>
        <button data-target="tokenomics" class="v8-wide-button">Open Tokenomics</button>
      </article>

      <article class="v8-panel">
        <div class="section-title"><div><h2>Trust & Security</h2><p>Contract, LP lock and analysis boundaries.</p></div><span>READ-ONLY</span></div>
        <div class="v8-check-list">
          <p class="${blockchain?.contractDetected ? "ok" : "no"}">SLX contract detected on Polygon</p>
          <p class="${holders?.lpLocked ? "ok" : "no"}">QuickSwap LP lock displayed</p>
          <p class="ok">No seed phrase or private key request</p>
          <p class="ok">No signature required for analysis</p>
          <p class="warn">Staking remains simulation-only</p>
        </div>
        <button data-target="security" class="v8-wide-button">Open Trust Center</button>
      </article>

      <article class="v8-panel v8-span-2">
        <div class="section-title"><div><h2>SpacelonX Roadmap</h2><p>Project execution from testnet to growth.</p></div><span>ROADMAP</span></div>
        <div class="v8-roadmap">
          ${CONFIG.roadmap.map(item => `<div class="${statusClass(item.status)}"><span>${item.phase}</span><b>${item.title}</b><small>${item.status}</small><p>${item.detail}</p></div>`).join("")}
        </div>
      </article>

      <article class="v8-panel v8-span-2">
        <div class="section-title"><div><h2>Nénette Intelligence</h2><p>Operational conclusions generated from the current dashboard state.</p></div><span>AI COMMAND</span></div>
        <div class="v8-ai-brief">
          <div class="ai-face">N</div>
          <div>${intelligence.map(line => `<p>• ${line}</p>`).join("")}</div>
        </div>
        <div class="v8-inline-actions"><button data-target="ai">Open AI Brief</button><button data-target="investor">Investor Intelligence</button></div>
      </article>

      <article class="v8-panel">
        <div class="section-title"><div><h2>Project Center</h2><p>Official SpacelonX resources.</p></div><span>LINKS</span></div>
        <div class="v8-project-links">
          <a href="${CONFIG.projectLinks.website}" target="_blank" rel="noreferrer">Website</a>
          <a href="${CONFIG.projectLinks.dexscreener}" target="_blank" rel="noreferrer">DexScreener</a>
          <a href="${CONFIG.projectLinks.polygonscan}" target="_blank" rel="noreferrer">Polygonscan</a>
          <a href="${CONFIG.projectLinks.lpLock}" target="_blank" rel="noreferrer">UNCX LP Lock</a>
          <a href="${CONFIG.projectLinks.x}" target="_blank" rel="noreferrer">X / Twitter</a>
          <a href="${CONFIG.projectLinks.telegram}" target="_blank" rel="noreferrer">Telegram</a>
        </div>
      </article>

      <article class="v8-panel">
        <div class="section-title"><div><h2>Reports</h2><p>Export the current intelligence state.</p></div><span>EXPORT</span></div>
        <div class="v8-report-actions">
          <button id="v8-export-json">Export JSON</button>
          <button id="v8-export-md">Export Markdown</button>
          <button id="v8-print-report">Print / Save PDF</button>
        </div>
        <p class="v8-fineprint">Reports identify data sources, estimates, simulations and model limits.</p>
      </article>
    </section>
  `;

  const data = { market, blockchain, holders, wallet };

  container.querySelectorAll("[data-target]").forEach(button => {
    button.addEventListener("click", () => document.querySelector(`[data-route="${button.dataset.target}"]`)?.click());
  });

  container.querySelectorAll("[data-stake-tier]").forEach(button => {
    button.addEventListener("click", () => {
      const select = container.querySelector("#v8-stake-pool");
      const option = [...select.options].find(item => item.dataset.name === button.dataset.stakeTier);
      if (option) select.value = option.value;
      container.querySelectorAll("[data-stake-tier]").forEach(item => item.classList.toggle("selected", item === button));
    });
  });

  container.querySelector("#v8-stake-simulate")?.addEventListener("click", () => {
    const amount = Number(container.querySelector("#v8-stake-amount").value);
    const select = container.querySelector("#v8-stake-pool");
    const apr = Number(select.value);
    const poolName = select.selectedOptions[0]?.dataset.name || "Pool";
    if (!(amount > 0)) {
      container.querySelector("#v8-stake-result").innerHTML = `<p class="v8-error">Enter a positive SLX amount.</p>`;
      return;
    }
    const yearly = estimateRewards(amount, apr);
    const monthly = yearly / 12;
    const daily = yearly / 365;
    container.querySelector("#v8-stake-result").innerHTML = `
      <div><span>Pool</span><b>${poolName}</b></div>
      <div><span>Principal</span><b>${fmt(amount)} SLX</b></div>
      <div><span>Yearly simulation</span><b>${fmt(yearly)} SLX</b><small>${usd(yearly * Number(market.priceUsd || 0))}</small></div>
      <div><span>Monthly simulation</span><b>${fmt(monthly)} SLX</b></div>
      <div><span>Daily simulation</span><b>${fmt(daily)} SLX</b></div>
      <div><span>Status</span><b>SIMULATION ONLY</b><small>No on-chain rewards are read.</small></div>`;
  });

  container.querySelector("#v8-export-json")?.addEventListener("click", () => {
    downloadText("nenette-v8-spacelonx-report.json", JSON.stringify(buildReport(data), null, 2), "application/json;charset=utf-8");
  });
  container.querySelector("#v8-export-md")?.addEventListener("click", () => {
    downloadText("nenette-v8-spacelonx-report.md", reportMarkdown(data), "text/markdown;charset=utf-8");
  });
  container.querySelector("#v8-print-report")?.addEventListener("click", () => window.print());
}
