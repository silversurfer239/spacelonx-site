import { getBlockchainStats, blockchainScore } from "../../services/blockchain.js";
import { fmt, shortTime, shortAddress } from "../../services/format.js";

export async function renderBlockchain(container) {
  const s = await getBlockchainStats();
  const data = [
    ["Health", blockchainScore(s) + "/100"], ["Total Supply", `${fmt(s.totalSupply)} ${s.symbol}`],
    ["Circulating", `${fmt(s.circulatingSupply)} ${s.symbol}`], ["Burned", `${fmt(s.burnedTokens)} ${s.symbol}`],
    ["Latest Block", s.latestBlock], ["Contract", s.contractDetected ? "Detected" : "Not detected"],
    ["RPC", s.rpc], ["Dead Wallet", shortAddress(s.deadWallet)], ["Zero Wallet", shortAddress(s.zeroWallet)],
    ["Updated", shortTime(s.updatedAt)]
  ];

  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Blockchain Intelligence</h2><p>Direct Polygon readings for SLX.</p></div><span>ON-CHAIN</span></div><div class="data-grid">${data.map(x => `<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div></section>`;
}
