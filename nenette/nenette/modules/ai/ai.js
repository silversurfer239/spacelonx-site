import { askNenette } from "../../services/ai.js";

export function renderAI(container) {
  container.innerHTML = `<section class="card"><div class="section-title"><div><h2>Nénette AI Assistant</h2><p>Local V1 assistant.</p></div><span>AI V1</span></div><div class="form"><input id="question" placeholder="Ask Nénette..."><button id="ask">Ask</button></div><div id="answer"></div></section>`;

  container.querySelector("#ask").addEventListener("click", () => {
    container.querySelector("#answer").innerHTML = `<div class="answer">${askNenette(container.querySelector("#question").value.trim())}</div>`;
  });
}
