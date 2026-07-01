import { getHolderStats, trustScore } from "../../services/holders.js";

export async function renderHolders(container) {
  const s = await getHolderStats();
  const data = [
    ["Investor Trust", trustScore(s) + "/100"], ["Current Holders", s.holders], ["Whales", s.whales],
    ["Top 10", s.top10Concentration], ["LP Locked", s.lpLocked ? "YES" : "NO"], ["LP Lock Percent", s.lpLockPercent + "%"],
    ["LP Unlock", new Date(s.lpUnlockDate).toLocaleDateString()], ["Contract Verified", s.contractVerified ? "YES" : "NO"],
    ["Latest Block", s.latestBlock]
  ];

  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Holder Intelligence</h2><p>LP lock, investor trust and holder indexer readiness.</p></div><span>TRUST</span></div><div class="data-grid">${data.map(x => `<div class="metric"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("")}</div></section>`;
}
