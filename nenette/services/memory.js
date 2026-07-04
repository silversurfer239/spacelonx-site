const MEMORY_KEY = "nenette.v7_4_1.memory";
const MAX_BRIEFS = 12;
const MAX_EVENTS = 60;

const defaults = {
  briefs: [],
  decisions: [],
  notes: "",
  alerts: [],
  events: []
};

function now() {
  return new Date().toISOString();
}

function uid(prefix = "m") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

export function loadMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}");
    return {
      ...defaults,
      ...parsed,
      briefs: Array.isArray(parsed.briefs) ? parsed.briefs : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      events: Array.isArray(parsed.events) ? parsed.events : []
    };
  } catch {
    return { ...defaults };
  }
}

export function saveMemory(memory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify({ ...defaults, ...memory }));
  return loadMemory();
}

export function addEvent(type, text) {
  const memory = loadMemory();
  memory.events.unshift({ id: uid("evt"), type, text, at: now() });
  memory.events = memory.events.slice(0, MAX_EVENTS);
  return saveMemory(memory);
}

export function addBrief(brief) {
  const memory = loadMemory();
  const stored = {
    id: uid("brief"),
    savedAt: now(),
    title: brief.version || "Nénette Strategic Brief",
    score: brief.globalScore ?? brief.investorScore ?? 0,
    riskLevel: brief.riskLevel || "N/A",
    recommendation: brief.recommendation || "",
    metrics: brief.metrics || {},
    scores: brief.scores || {},
    riskFlags: brief.riskFlags || [],
    actions: brief.actions || [],
    brief
  };
  memory.briefs.unshift(stored);
  memory.briefs = memory.briefs.slice(0, MAX_BRIEFS);
  memory.events.unshift({ id: uid("evt"), type: "brief", text: `Strategic brief saved with score ${stored.score}/100`, at: now() });
  memory.events = memory.events.slice(0, MAX_EVENTS);
  return saveMemory(memory);
}

export function deleteBrief(id) {
  const memory = loadMemory();
  memory.briefs = memory.briefs.filter(item => item.id !== id);
  return saveMemory(memory);
}

export function addDecision(text, status = "Open") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return loadMemory();
  const memory = loadMemory();
  memory.decisions.unshift({ id: uid("dec"), text: trimmed, status, at: now() });
  memory.events.unshift({ id: uid("evt"), type: "decision", text: trimmed, at: now() });
  memory.events = memory.events.slice(0, MAX_EVENTS);
  return saveMemory(memory);
}

export function deleteDecision(id) {
  const memory = loadMemory();
  memory.decisions = memory.decisions.filter(item => item.id !== id);
  return saveMemory(memory);
}

export function saveNotes(notes) {
  const memory = loadMemory();
  memory.notes = String(notes || "");
  memory.events.unshift({ id: uid("evt"), type: "notes", text: "Project notes updated", at: now() });
  memory.events = memory.events.slice(0, MAX_EVENTS);
  return saveMemory(memory);
}

export function clearMemory() {
  localStorage.removeItem(MEMORY_KEY);
  return loadMemory();
}

export function exportMemory() {
  return {
    exportedAt: now(),
    version: "Nénette AI V7.6 Multi-Wallet Provider",
    memory: loadMemory()
  };
}

export function memoryStats(memory = loadMemory()) {
  return {
    briefs: memory.briefs.length,
    decisions: memory.decisions.length,
    alerts: memory.alerts.length,
    events: memory.events.length,
    hasNotes: Boolean(memory.notes && memory.notes.trim())
  };
}
