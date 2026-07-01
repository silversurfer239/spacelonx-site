import { renderDashboard } from "../../modules/dashboard/dashboard.js";
import { renderTerminal } from "../../modules/terminal/terminal.js";
import { renderMarket } from "../../modules/market/market.js";
import { renderBlockchain } from "../../modules/blockchain/blockchain.js";
import { renderHolders } from "../../modules/holders/holders.js";
import { renderPortfolio } from "../../modules/portfolio/portfolio.js";
import { renderStaking } from "../../modules/staking/staking.js";
import { renderSecurity } from "../../modules/security/security.js";
import { renderGovernance } from "../../modules/governance/governance.js";
import { renderAI } from "../../modules/ai/ai.js";
import { renderEcosystem } from "../../modules/ecosystem/ecosystem.js";

const routes = {
  dashboard: renderDashboard,
  terminal: renderTerminal,
  market: renderMarket,
  blockchain: renderBlockchain,
  holders: renderHolders,
  portfolio: renderPortfolio,
  staking: renderStaking,
  security: renderSecurity,
  governance: renderGovernance,
  ai: renderAI,
  ecosystem: renderEcosystem
};

export async function navigate(route) {
  const view = document.getElementById("view");
  const renderer = routes[route] || routes.dashboard;

  document.querySelectorAll("#nav button").forEach(button => {
    button.classList.toggle("active", button.dataset.route === route);
  });

  try {
    await renderer(view);
  } catch (error) {
    view.innerHTML = `<section class="card"><h2>Module error</h2><p>${error.message || error}</p></section>`;
  }
}
