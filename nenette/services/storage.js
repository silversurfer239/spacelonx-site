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
    savedWallets: [],
    lastConnectedWallet: ""
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


export function updateWalletLabel(address, label = "") {
  const settings = getSettings();
  settings.savedWallets = settings.savedWallets.map(wallet =>
    wallet.address.toLowerCase() === address.toLowerCase() ? { ...wallet, label: String(label || "").trim() || wallet.label } : wallet
  );
  saveSettings(settings);
  return settings.savedWallets;
}

export function setLastConnectedWallet(address) {
  const settings = getSettings();
  settings.lastConnectedWallet = address || "";
  saveSettings(settings);
  return settings;
}

export function exportSettings() {
  return {
    exportedAt: new Date().toISOString(),
    version: "Nénette AI V7.6.4 Liquidity & Exit",
    settings: getSettings()
  };
}
