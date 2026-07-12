import { CONFIG } from "../../config/config.js";
import { getBlockchainStats } from "../../services/blockchain.js";
import { fmt } from "../../services/format.js";

export async function renderTokenomics(container) {
  let chain = null;
  try { chain = await getBlockchainStats(); } catch {}
  const supply = chain?.totalSupply || 6000000000;

  container.innerHTML = `
    <section class="card ultimate-module v8-detail-page">
      <div class="section-title"><div><h2>SpacelonX Tokenomics</h2><p>Allocation, vesting framework and on-chain supply intelligence.</p></div><span>V8.0</span></div>
      <div class="v8-kpi-grid v8-detail-kpis">
        <article><small>Total Supply</small><strong>${fmt(supply, 0)} SLX</strong><p>${chain ? "Read from Polygon" : "Configured supply"}</p></article>
        <article><small>Circulating Supply</small><strong>${chain ? `${fmt(chain.circulatingSupply, 0)} SLX` : "N/A"}</strong><p>On-chain burn adjustment</p></article>
        <article><small>Declared Vesting</small><strong>40%</strong><p>Team, Treasury, Ecosystem, Advisors</p></article>
        <article><small>Network</small><strong>Polygon</strong><p>ERC-20 SLX</p></article>
      </div>
      <div class="v8-tokenomics v8-tokenomics-large">
        ${CONFIG.tokenomics.map(item => `<div><span style="--w:${item.percent}%"></span><p><b>${item.name}</b><strong>${item.percent}% · ${fmt(supply * item.percent / 100, 0)} SLX</strong></p><small>${item.vesting}</small></div>`).join("")}
      </div>
      <div class="answer strategic-answer"><strong>Integrity note:</strong> the 40% vesting framework is separated into Team 15%, Treasury 15%, Ecosystem 5% and Advisors 5%. The remaining 60% is shown as the broader liquidity, launch and circulation allocation; detailed vesting schedules require published contract-level vesting data.</div>
    </section>`;
}
