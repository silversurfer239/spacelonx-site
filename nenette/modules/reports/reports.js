import { CONFIG } from "../../config/config.js";
import { getMarketData } from "../../services/market.js";
import { getBlockchainStats } from "../../services/blockchain.js";
import { getHolderStats } from "../../services/holders.js";
import { getSettings } from "../../services/storage.js";
import { buildWalletSnapshot, snapshotToMarkdown } from "../../services/wallet.js";

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function renderReports(container) {
  container.innerHTML = `<section class="loading ultimate-loader"><div class="orb">R</div><div><h2>Preparing reports...</h2><p>Collecting current market, blockchain, trust and wallet data.</p></div></section>`;
  const settings = getSettings();
  const [market, blockchain, trust] = await Promise.all([
    getMarketData().catch(error => ({ status: "Unavailable", error: error.message })),
    getBlockchainStats().catch(error => ({ error: error.message })),
    getHolderStats().catch(error => ({ error: error.message }))
  ]);
  let wallet = null;
  if (settings.lastConnectedWallet && ethers.isAddress(settings.lastConnectedWallet)) {
    try { wallet = await buildWalletSnapshot(settings.lastConnectedWallet); } catch {}
  }
  const report = {
    product: CONFIG.appName,
    version: CONFIG.version,
    generatedAt: new Date().toISOString(),
    market,
    blockchain,
    trust,
    wallet,
    tokenomics: CONFIG.tokenomics,
    roadmap: CONFIG.roadmap,
    safety: {
      readOnly: true,
      stakingLive: false,
      stakingMode: "simulation",
      privateKeysRequested: false
    }
  };

  container.innerHTML = `
    <section class="card ultimate-module v8-detail-page">
      <div class="section-title"><div><h2>SpacelonX Reports</h2><p>Export transparent, source-labelled dashboard snapshots.</p></div><span>V8.0</span></div>
      <div class="v8-report-cards">
        <article><h3>Full Dashboard JSON</h3><p>Structured market, chain, trust, wallet, tokenomics and roadmap data.</p><button id="report-json">Export JSON</button></article>
        <article><h3>Wallet Markdown</h3><p>Wallet, liquidity, exit and staking simulation report.</p><button id="report-wallet" ${wallet ? "" : "disabled"}>${wallet ? "Export Wallet Report" : "Connect Wallet First"}</button></article>
        <article><h3>Print / PDF</h3><p>Use the browser print dialog to save the current dashboard as PDF.</p><button id="report-print">Print / Save PDF</button></article>
      </div>
      <div class="answer strategic-answer"><strong>Report integrity:</strong> exports distinguish live API data, on-chain calculations, fallback estimates and staking simulations.</div>
    </section>`;

  container.querySelector("#report-json")?.addEventListener("click", () => download("nenette-v8-full-dashboard.json", JSON.stringify(report, null, 2), "application/json;charset=utf-8"));
  container.querySelector("#report-wallet")?.addEventListener("click", () => wallet && download("nenette-v8-wallet-report.md", snapshotToMarkdown(wallet).replaceAll("V7.6.5 Liquidity Accuracy", "V8.0 Nénette Pure"), "text/markdown;charset=utf-8"));
  container.querySelector("#report-print")?.addEventListener("click", () => window.print());
}
