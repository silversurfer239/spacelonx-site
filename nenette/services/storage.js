const PREFIX = "nenette.v7_2.";

export function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function getSettings() {
  return getJSON("settings", {
    refreshSeconds: 30,
    preferredCurrency: "USD",
    autoRefresh: true,
    defaultPool: "Diamond",
    priceAlertUsd: "",
    liquidityAlertUsd: "",
    savedWallets: []
  });
}

export function saveSettings(settings) {
  setJSON("settings", settings);
  return settings;
}

export function addWallet(address, label = "") {
  const settings = getSettings();
  const normalized = address.trim();
  if (!settings.savedWallets.find(w => w.address.toLowerCase() === normalized.toLowerCase())) {
    settings.savedWallets.push({ address: normalized, label: label || `Wallet ${settings.savedWallets.length + 1}` });
    saveSettings(settings);
  }
  return settings.savedWallets;
}

export function removeWallet(address) {
  const settings = getSettings();
  settings.savedWallets = settings.savedWallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
  saveSettings(settings);
  return settings.savedWallets;
}
