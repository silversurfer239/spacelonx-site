export function renderGovernance(container) {
  const proposals = ["Burn mechanism roadmap", "Marketing allocation", "Diamond pool priority"];
  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Governance</h2><p>Snapshot-ready governance module.</p></div><span>DAO</span></div><div class="brief-grid">${proposals.map((p, i) => `<div><h4>Proposal #00${i+1}</h4><p>${p}</p><span>Draft</span></div>`).join("")}</div></section>`;
}
