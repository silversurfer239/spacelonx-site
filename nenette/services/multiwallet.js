import { CONFIG } from "../config/config.js";

const announcedProviders = new Map();
let discoveryStarted = false;
let appKitModal = null;
let appKitState = { address: "", provider: null, connected: false };
let appKitSubscriptionsReady = false;

function normalizeUuid(value = "") {
  return String(value || "").trim().toLowerCase();
}

function providerKey(info, provider) {
  return normalizeUuid(info?.uuid) || [
    info?.rdns,
    info?.name,
    provider?.isRabby ? "rabby" : "",
    provider?.isCoinbaseWallet ? "coinbase" : "",
    provider?.isMetaMask ? "metamask" : "",
    Math.random().toString(36).slice(2)
  ].filter(Boolean).join(":").toLowerCase();
}

function inferWallet(provider, info = {}) {
  const rdns = String(info.rdns || "").toLowerCase();
  const name = String(info.name || "").toLowerCase();

  if (provider?.isRabby || rdns.includes("rabby") || name.includes("rabby")) {
    return { id: "rabby", name: info.name || "Rabby Wallet", icon: info.icon || "", provider };
  }
  if (provider?.isCoinbaseWallet || rdns.includes("coinbase") || name.includes("coinbase")) {
    return { id: "coinbase", name: info.name || "Coinbase Wallet", icon: info.icon || "", provider };
  }
  if (provider?.isMetaMask || rdns.includes("metamask") || name.includes("metamask")) {
    return { id: "metamask", name: info.name || "MetaMask", icon: info.icon || "", provider };
  }
  return { id: `injected-${providerKey(info, provider)}`, name: info.name || "Injected EVM Wallet", icon: info.icon || "", provider };
}

function addAnnouncedProvider(detail) {
  if (!detail?.provider) return;
  const info = detail.info || {};
  announcedProviders.set(providerKey(info, detail.provider), { info, provider: detail.provider });
}

function startProviderDiscovery() {
  if (discoveryStarted || typeof window === "undefined") return;
  discoveryStarted = true;
  window.addEventListener("eip6963:announceProvider", event => addAnnouncedProvider(event.detail));
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function legacyProviders() {
  const eth = window.ethereum;
  if (!eth) return [];
  if (Array.isArray(eth.providers) && eth.providers.length) return eth.providers;
  return [eth];
}

export async function discoverInjectedWallets(waitMs = 250) {
  startProviderDiscovery();
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise(resolve => setTimeout(resolve, waitMs));

  const wallets = [];
  const seen = new Set();

  for (const { info, provider } of announcedProviders.values()) {
    const item = inferWallet(provider, info);
    if (!seen.has(provider)) {
      wallets.push(item);
      seen.add(provider);
    }
  }

  for (const provider of legacyProviders()) {
    if (seen.has(provider)) continue;
    const item = inferWallet(provider, {});
    wallets.push(item);
    seen.add(provider);
  }

  const priority = { metamask: 1, rabby: 2, coinbase: 3 };
  return wallets.sort((a, b) => (priority[a.id] || 10) - (priority[b.id] || 10));
}

export async function connectInjectedWallet(walletId) {
  const wallets = await discoverInjectedWallets(100);
  const wallet = wallets.find(item => item.id === walletId);
  if (!wallet?.provider) {
    throw new Error(`${walletId === "metamask" ? "MetaMask" : walletId === "rabby" ? "Rabby" : walletId === "coinbase" ? "Coinbase Wallet" : "Selected wallet"} is not detected in this browser. Use WalletConnect on mobile or install the extension.`);
  }
  const accounts = await wallet.provider.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("Wallet connection rejected or no account returned.");
  return { provider: wallet.provider, address: accounts[0], walletName: wallet.name, walletId: wallet.id, method: "injected" };
}

function extractAddress(state) {
  if (!state) return "";
  if (typeof state === "string") return state;
  if (state.address) return state.address;
  if (state.caipAddress) return String(state.caipAddress).split(":").pop();
  const first = state.allAccounts?.[0];
  if (typeof first === "string") return first.split(":").pop();
  return first?.address || "";
}

async function loadAppKitPackages() {
  const urls = {
    core: "https://esm.sh/@reown/appkit?bundle",
    ethers: "https://esm.sh/@reown/appkit-adapter-ethers?bundle",
    networks: "https://esm.sh/@reown/appkit/networks?bundle"
  };
  const [core, adapter, networks] = await Promise.all([
    import(urls.core),
    import(urls.ethers),
    import(urls.networks)
  ]);
  if (!core.createAppKit || !adapter.EthersAdapter || !networks.polygon) {
    throw new Error("Reown AppKit modules could not be loaded.");
  }
  return { createAppKit: core.createAppKit, EthersAdapter: adapter.EthersAdapter, polygon: networks.polygon };
}

export async function initAppKit() {
  if (appKitModal) return appKitModal;
  if (!CONFIG.reownProjectId) throw new Error("Reown Project ID is missing.");

  const { createAppKit, EthersAdapter, polygon } = await loadAppKitPackages();
  const metadata = {
    name: CONFIG.appName,
    description: CONFIG.appDescription,
    url: CONFIG.appUrl,
    icons: [`${CONFIG.appUrl}/spacelonx-site/favicon.ico`]
  };

  appKitModal = createAppKit({
    adapters: [new EthersAdapter()],
    networks: [polygon],
    defaultNetwork: polygon,
    metadata,
    projectId: CONFIG.reownProjectId,
    features: {
      analytics: true,
      email: false,
      socials: [],
      onramp: false,
      swaps: false
    },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#38d9ff",
      "--w3m-border-radius-master": "2px"
    }
  });

  if (!appKitSubscriptionsReady) {
    appKitSubscriptionsReady = true;
    try {
      appKitModal.subscribeAccount(state => {
        const address = extractAddress(state);
        appKitState.address = address || "";
        appKitState.connected = Boolean(address);
      });
    } catch {}
    try {
      appKitModal.subscribeProviders(state => {
        appKitState.provider = state?.eip155 || null;
      });
    } catch {}
  }

  return appKitModal;
}

export async function connectWalletConnect(timeoutMs = 120000) {
  const modal = await initAppKit();
  appKitState.address = "";
  appKitState.connected = false;
  await modal.open();

  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (appKitState.address) {
      return {
        provider: appKitState.provider,
        address: appKitState.address,
        walletName: "WalletConnect / Reown",
        walletId: "walletconnect",
        method: "walletconnect"
      };
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("WalletConnect connection timed out. Reopen the QR code and approve the connection in your mobile wallet.");
}

export async function disconnectWalletConnect() {
  if (!appKitModal) return;
  try {
    if (typeof appKitModal.disconnect === "function") await appKitModal.disconnect();
  } catch {}
  appKitState = { address: "", provider: null, connected: false };
}

export function getAppKitStatus() {
  return { ...appKitState, initialized: Boolean(appKitModal), projectIdReady: Boolean(CONFIG.reownProjectId) };
}
