import { buildInvestorIntelligence } from "../../services/investor.js";

function scoreClass(risk) {
  if (risk === "LOW") return "brief-low";
  if (risk === "MODERATE") return "brief-moderate";
  if (risk === "ELEVATED") return "brief-elevated";
  return "brief-high";
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><b>${value}</b></div>`;
}

function progress(label, score) {
  return `<article class="metric investor-progress"><span>${label}</span><b>${score}/100</b><div class="progress"><i style="width:${score}%"></i></div></article>`;
}

export async function renderInvestor(container) {
  container.innerHTML = `<section class="loading ultimate-loader"><div class="orb">AI</div><div><h2>Building Investor Intelligence...</h2><p>Reading market, blockchain, trust, memory and project status.</p></div></section>`;

  const intel = await buildInvestorIntelligence();
  container.innerHTML = `
    <section class="card investor-command">
      <div class="section-title">
        <div>
          <h2>Investor Intelligence V7.5</h2>
          <p>Consolidated readiness score for SLX based on market, liquidity, blockchain, trust, product and AI memory.</p>
        </div>
        <span>${intel.riskLevel}</span>
      </div>
      <div class="brief-header">
        <div class="answer strategic-answer"><strong>Recommendation:</strong> ${intel.recommendation}</div>
        <div class="brief-score ${scoreClass(intel.riskLevel)}"><strong>${intel.globalScore}</strong><span>${intel.riskLevel}</span></div>
      </div>
      <div class="data-grid">
        ${metric("Price", intel.metrics.price)}
        ${metric("Liquidity", intel.metrics.liquidity)}
        ${metric("24H Volume", intel.metrics.volume24h)}
        ${metric("24H Change", intel.metrics.change24h)}
        ${metric("Saved Briefs", intel.metrics.savedBriefs)}
        ${metric("Project Decisions", intel.metrics.decisions)}
        ${metric("Saved Wallets", intel.metrics.savedWallets)}
        ${metric("Last Connected", intel.metrics.lastConnectedWallet)}
      </div>
    </section>

    <section class="card">
      <div class="section-title"><div><h2>Score Breakdown</h2><p>Weighted investor-facing indicators.</p></div><span>SCORE</span></div>
      <div class="data-grid">
        ${progress("Market", intel.scores.market)}
        ${progress("Liquidity", intel.scores.liquidity)}
        ${progress("Blockchain", intel.scores.blockchain)}
        ${progress("Trust", intel.scores.trust)}
        ${progress("Product", intel.scores.product)}
        ${progress("AI Memory", intel.scores.memory)}
        ${progress("Wallet Connect", intel.scores.wallet)}
      </div>
    </section>

    <section class="brief-grid">
      <article>
        <h4>Risk Flags</h4>
        ${intel.riskFlags.map(item => `<p><strong>${item.level}</strong> — ${item.title}: ${item.note}</p>`).join("")}
      </article>
      <article>
        <h4>Recommended Actions</h4>
        ${intel.actions.map(item => `<p>• ${item}</p>`).join("")}
      </article>
    </section>

    <section class="card">
      <div class="section-title"><div><h2>Project Status</h2><p>Operational readiness checklist.</p></div><span>STATUS</span></div>
      <div class="data-grid">
        ${intel.projectStatus.map(item => `<article class="metric"><span>${item.name}</span><b>${item.status}</b><p>${item.score}/100 · ${item.note}</p></article>`).join("")}
      </div>
    </section>
  `;
}
