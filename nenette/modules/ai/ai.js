import { askNenette } from "../../services/ai.js";
import { generateStrategicBrief, briefToMarkdown } from "../../services/brief.js";
import { addBrief } from "../../services/memory.js";

function badgeClass(risk) {
  if (risk === "LOW") return "brief-low";
  if (risk === "MODERATE") return "brief-moderate";
  if (risk === "ELEVATED") return "brief-elevated";
  return "brief-high";
}

function renderBrief(brief) {
  return `
    <section class="brief-shell">
      <div class="brief-header">
        <div>
          <h3>AI Strategic Brief</h3>
          <p>${new Date(brief.generatedAt).toLocaleString()}</p>
        </div>
        <div class="brief-score ${badgeClass(brief.riskLevel)}">
          <strong>${brief.globalScore}</strong>
          <span>${brief.riskLevel}</span>
        </div>
      </div>

      <div class="answer strategic-answer">
        <strong>Recommendation:</strong> ${brief.recommendation}
      </div>

      <div class="data-grid">
        <div class="metric"><span>Price</span><b>${brief.metrics.price}</b></div>
        <div class="metric"><span>Liquidity</span><b>${brief.metrics.liquidity}</b></div>
        <div class="metric"><span>24H Volume</span><b>${brief.metrics.volume24h}</b></div>
        <div class="metric"><span>24H Change</span><b>${brief.metrics.change24h}</b></div>
        <div class="metric"><span>Market</span><b>${brief.metrics.marketStatus}</b></div>
        <div class="metric"><span>Latest Block</span><b>${brief.metrics.latestBlock}</b></div>
        <div class="metric"><span>Saved Wallets</span><b>${brief.metrics.savedWallets}</b></div>
        <div class="metric"><span>Next Build</span><b>V7.7</b></div>
      </div>

      <div class="brief-grid">
        <article>
          <h4>Executive Summary</h4>
          ${brief.executiveSummary.map(item => `<p>• ${item}</p>`).join("")}
        </article>
        <article>
          <h4>Scores</h4>
          <p>Market: ${brief.scores.market}/100</p>
          <p>Blockchain: ${brief.scores.blockchain}/100</p>
          <p>Trust: ${brief.scores.trust}/100</p>
          <p>Product: ${brief.scores.product}/100</p>
        </article>
        <article>
          <h4>Risk Flags</h4>
          ${brief.riskFlags.map(item => `<p>• ${item}</p>`).join("")}
        </article>
        <article>
          <h4>Recommended Actions</h4>
          ${brief.actions.map(item => `<p>• ${item}</p>`).join("")}
        </article>
      </div>

      <div class="answer strategic-answer">
        <strong>Next build:</strong> ${brief.nextBuild}
      </div>
    </section>
  `;
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function renderAI(container) {
  container.innerHTML = `
    <section class="card ai-brief-card">
      <div class="section-title">
        <div>
          <h2>Nénette AI Strategic Brief V7.6.5</h2>
          <p>Local assistant + automated operational brief with AI Memory persistence.</p>
        </div>
        <span>AI BRIEF</span>
      </div>

      <div class="form">
        <input id="question" placeholder="Ask Nénette...">
        <button id="ask">Ask</button>
        <button id="brief">Generate Strategic Brief</button>
        <button id="open-memory" type="button">Open Memory</button>
      </div>

      <div class="quick-prompts">
        <button data-prompt="Can you analyze the market risk?">Market risk</button>
        <button data-prompt="What is the staking status?">Staking</button>
        <button data-prompt="Can you track holders and whales?">Whales</button>
        <button data-prompt="Generate a strategic brief">Brief</button>
      </div>

      <div id="answer"></div>
      <div id="brief-result"></div>
    </section>`;

  const answer = container.querySelector("#answer");
  const result = container.querySelector("#brief-result");

  container.querySelector("#ask").addEventListener("click", () => {
    const question = container.querySelector("#question").value.trim();
    answer.innerHTML = `<div class="answer">${askNenette(question)}</div>`;
  });

  container.querySelectorAll("[data-prompt]").forEach(button => {
    button.addEventListener("click", () => {
      container.querySelector("#question").value = button.dataset.prompt;
      answer.innerHTML = `<div class="answer">${askNenette(button.dataset.prompt)}</div>`;
    });
  });


  const openMemory = container.querySelector("#open-memory");
  if (openMemory) {
    openMemory.addEventListener("click", () => document.querySelector('[data-route="memory"]')?.click());
  }

  container.querySelector("#brief").addEventListener("click", async () => {
    result.innerHTML = `<section class="loading ultimate-loader"><div class="orb">AI</div><div><h2>Generating strategic brief...</h2><p>Reading market, blockchain, trust, staking and local settings.</p></div></section>`;

    try {
      const brief = await generateStrategicBrief();
      const markdown = briefToMarkdown(brief);
      addBrief(brief);
      result.innerHTML = `
        <div class="form brief-actions">
          <button id="copy-brief">Copy Brief</button>
          <button id="download-brief">Download Markdown</button>
          <button id="download-json">Download JSON</button>
        </div>
        ${renderBrief(brief)}
      `;

      result.querySelector("#copy-brief").addEventListener("click", async () => {
        await navigator.clipboard.writeText(markdown);
        answer.innerHTML = `<div class="answer">Strategic brief copied to clipboard and saved to AI Memory.</div>`;
      });

      result.querySelector("#download-brief").addEventListener("click", () => {
        downloadText("nenette-ai-v7-4-1-strategic-brief.md", markdown);
      });

      result.querySelector("#download-json").addEventListener("click", () => {
        downloadText("nenette-ai-v7-4-1-strategic-brief.json", JSON.stringify(brief, null, 2));
      });
    } catch (error) {
      result.innerHTML = `<div class="answer">Strategic brief error: ${error.message || error}</div>`;
    }
  });
}
