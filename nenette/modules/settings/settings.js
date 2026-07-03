import { getSettings, saveSettings } from "../../services/storage.js";

export function renderSettings(container) {
  const settings = getSettings();

  container.innerHTML = `
    <section class="card">
      <div class="section-title">
        <div><h2>Settings V7.4.1</h2><p>Local preferences stored only in this browser.</p></div>
        <span>SETTINGS</span>
      </div>
      <div class="data-grid">
        <div class="metric"><span>Auto Refresh</span><b>${settings.autoRefresh ? "ON" : "OFF"}</b></div>
        <div class="metric"><span>Refresh Interval</span><b>${settings.refreshSeconds}s</b></div>
        <div class="metric"><span>Saved Wallets</span><b>${settings.savedWallets.length}</b></div>
      </div>
      <div class="form">
        <select id="auto-refresh">
          <option value="true" ${settings.autoRefresh ? "selected" : ""}>Auto refresh ON</option>
          <option value="false" ${!settings.autoRefresh ? "selected" : ""}>Auto refresh OFF</option>
        </select>
        <input id="refresh-seconds" placeholder="Refresh seconds" value="${settings.refreshSeconds}">
        <select id="default-pool">
          ${["Bronze","Silver","Gold","Diamond"].map(pool => `<option value="${pool}" ${settings.defaultPool === pool ? "selected" : ""}>${pool}</option>`).join("")}
        </select>
        <button id="save-settings">Save Settings</button>
        <button id="clear-local">Clear Local Data</button>
      </div>
      <div id="settings-result" class="answer">Settings are local. They are not sent to a backend.</div>
    </section>`;

  container.querySelector("#save-settings").addEventListener("click", () => {
    const s = getSettings();
    s.autoRefresh = container.querySelector("#auto-refresh").value === "true";
    s.refreshSeconds = Math.max(10, Number(container.querySelector("#refresh-seconds").value || 30));
    s.defaultPool = container.querySelector("#default-pool").value;
    saveSettings(s);
    container.querySelector("#settings-result").innerHTML = "Settings saved.";
  });

  container.querySelector("#clear-local").addEventListener("click", () => {
    if (confirm("Clear Nénette local settings and saved wallets?")) {
      Object.keys(localStorage).filter(k => k.startsWith("nenette.v7_2.") || k.startsWith("nenette.v7_4_1.")).forEach(k => localStorage.removeItem(k));
      document.querySelector('[data-route="settings"]').click();
    }
  });
}
