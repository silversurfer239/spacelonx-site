import { loadMemory, saveNotes, addDecision, deleteDecision, deleteBrief, clearMemory, exportMemory } from "../../services/memory.js";

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function card(label, value) {
  return `<div class="metric"><span>${label}</span><b>${value}</b></div>`;
}

function renderMemoryHTML(memory) {
  return `
    <section class="card">
      <div class="section-title">
        <div><h2>AI Memory V7.6.3</h2><p>Private local memory stored in this browser only. It keeps strategic briefs, project decisions and notes.</p></div>
        <span>LOCAL</span>
      </div>
      <div class="data-grid">
        ${card("Saved Briefs", memory.briefs.length)}
        ${card("Decisions", memory.decisions.length)}
        ${card("Events", memory.events.length)}
        ${card("Notes", memory.notes?.trim() ? "Saved" : "Empty")}
      </div>
      <div class="answer strategic-answer"><strong>Important:</strong> this memory is localStorage. It stays on this browser and is not a server database.</div>
    </section>

    <section class="card">
      <div class="section-title"><div><h2>Project Notes</h2><p>Persistent notes for the SLX/Nénette build.</p></div><span>NOTES</span></div>
      <div class="form"><textarea id="memory-notes" placeholder="Write project notes...">${memory.notes || ""}</textarea><button id="save-notes">Save Notes</button></div>
      <div id="memory-result" class="answer">Ready.</div>
    </section>

    <section class="card">
      <div class="section-title"><div><h2>Project Decisions</h2><p>Record strategic decisions so future briefs can keep context.</p></div><span>DECISIONS</span></div>
      <div class="form"><input id="decision-text" placeholder="Example: Keep staking wording as simulator until on-chain contract exists."><button id="add-decision">Add Decision</button></div>
      <div class="memory-list">
        ${memory.decisions.length ? memory.decisions.map(item => `<article class="memory-item"><div><strong>${item.status}</strong><p>${item.text}</p><small>${new Date(item.at).toLocaleString()}</small></div><button class="small-danger" data-delete-decision="${item.id}">Delete</button></article>`).join("") : `<div class="answer">No decision saved yet.</div>`}
      </div>
    </section>

    <section class="card">
      <div class="section-title"><div><h2>Strategic Brief History</h2><p>Briefs generated from the AI tab are saved here automatically.</p></div><span>HISTORY</span></div>
      <div class="memory-list">
        ${memory.briefs.length ? memory.briefs.map(item => `<article class="memory-item"><div><strong>${item.title}</strong><p>Score ${item.score}/100 · Risk ${item.riskLevel}</p><p>${item.recommendation || "No recommendation saved."}</p><small>${new Date(item.savedAt).toLocaleString()}</small></div><button class="small-danger" data-delete-brief="${item.id}">Delete</button></article>`).join("") : `<div class="answer">No saved brief yet. Go to AI → Generate Strategic Brief.</div>`}
      </div>
    </section>

    <section class="card">
      <div class="section-title"><div><h2>Export / Reset</h2><p>Export memory for backup, or clear local memory.</p></div><span>TOOLS</span></div>
      <div class="form"><button id="export-memory">Export Memory JSON</button><button id="clear-memory" class="small-danger">Clear AI Memory</button></div>
    </section>
  `;
}

export function renderMemory(container) {
  const draw = () => {
    const memory = loadMemory();
    container.innerHTML = renderMemoryHTML(memory);

    container.querySelector("#save-notes").addEventListener("click", () => {
      saveNotes(container.querySelector("#memory-notes").value);
      container.querySelector("#memory-result").innerHTML = "Project notes saved.";
    });

    container.querySelector("#add-decision").addEventListener("click", () => {
      addDecision(container.querySelector("#decision-text").value, "Open");
      draw();
    });

    container.querySelectorAll("[data-delete-decision]").forEach(button => {
      button.addEventListener("click", () => { deleteDecision(button.dataset.deleteDecision); draw(); });
    });

    container.querySelectorAll("[data-delete-brief]").forEach(button => {
      button.addEventListener("click", () => { deleteBrief(button.dataset.deleteBrief); draw(); });
    });

    container.querySelector("#export-memory").addEventListener("click", () => downloadJSON("nenette-v7-6-memory.json", exportMemory()));
    container.querySelector("#clear-memory").addEventListener("click", () => {
      if (confirm("Clear Nénette AI Memory on this browser?")) {
        clearMemory();
        draw();
      }
    });
  };

  draw();
}
