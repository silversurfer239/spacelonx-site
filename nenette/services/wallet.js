export function getWalletProvider() {
  if (window.ethereum?.providers?.length) {
    return window.ethereum.providers.find(p => p.isMetaMask) || window.ethereum.providers[0];
  }
  return window.ethereum || null;
}

export async function connectWallet() {
  const provider = getWalletProvider();
  if (!provider) throw new Error("No browser wallet detected.");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  return { provider, address: accounts[0] };
}

export async function ensurePolygon(provider) {
  const chainId = await provider.request({ method: "eth_chainId" });
  if (chainId !== "0x89") {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x89" }] });
  }
}
