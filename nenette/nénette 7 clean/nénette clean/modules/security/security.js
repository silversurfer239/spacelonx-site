import { CONFIG } from "../../config/config.js";
import { getBlockchainStats, blockchainScore } from "../../services/blockchain.js";
import { getHolderStats, trustScore } from "../../services/holders.js";

export async function renderSecurity(container) {
  const blockchain = await getBlockchainStats();
  const holders = await getHolderStats();
  const data = [
    ["Blockchain Health", blockchainScore(blockchain) + "/100"], ["Investor Trust", trustScore(holders) + "/100"],
    ["Contract", blockchain.contractDetected ? "Detected" : "Not detected"], ["LP Locked", holders.lpLocked ? "YES" : "NO"],
    ["LP Unlock", new Date(CONFIG.lpUnlockDate).toLocaleDateString()], ["RPC", blockchain.rpc]
  ];

  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Security Center</h2><p>Contract, RPC and LP lock checks.</p></div><span>SECURITY</span></div><div class="data-grid">${data.map(x => `<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div><a class="link" href="${CONFIG.lpLockUrl}" target="_blank">Open LP Lock</a></section>`;
}
