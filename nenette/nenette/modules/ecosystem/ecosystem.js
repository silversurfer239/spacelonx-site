export function renderEcosystem(container) {
  const items = ["SpacelonX", "Nénette AI", "YDEC-CALL", "Oracle", "Nono Trading", "Jarvis", "Gouvernor Bank", "SLX Token", "DAO"];
  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Ecosystem Map</h2><p>SpacelonX and YDEC future utility map.</p></div><span>ECOSYSTEM</span></div><div class="brief-grid">${items.map(item => `<div><h4>${item}</h4><p>Utility layer</p></div>`).join("")}</div></section>`;
}
