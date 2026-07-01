import { CONFIG } from "../config/config.js";

export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)"
];

const DEAD_WALLET = "0x000000000000000000000000000000000000dEaD";
const ZERO_WALLET = "0x0000000000000000000000000000000000000000";

export async function getProvider() {
  let lastError = null;
  for (const rpc of CONFIG.rpcList) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber();
      return { provider, rpc };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No Polygon RPC available");
}

export async function getBlockchainStats() {
  const { provider, rpc } = await getProvider();
  const token = new ethers.Contract(CONFIG.slxContract, ERC20_ABI, provider);

  const latestBlock = await provider.getBlockNumber();
  const code = await provider.getCode(CONFIG.slxContract);

  const [totalRaw, deadRaw, zeroRaw, decimals, symbol] = await Promise.all([
    token.totalSupply(),
    token.balanceOf(DEAD_WALLET),
    token.balanceOf(ZERO_WALLET),
    token.decimals(),
    token.symbol()
  ]);

  const totalSupply = Number(ethers.formatUnits(totalRaw, decimals));
  const burnedTokens = Number(ethers.formatUnits(deadRaw, decimals)) + Number(ethers.formatUnits(zeroRaw, decimals));

  return {
    symbol,
    totalSupply,
    burnedTokens,
    circulatingSupply: totalSupply - burnedTokens,
    latestBlock,
    contractDetected: code && code !== "0x",
    rpc,
    deadWallet: DEAD_WALLET,
    zeroWallet: ZERO_WALLET,
    updatedAt: new Date().toISOString()
  };
}

export function blockchainScore(stats) {
  let score = 0;
  if (stats.contractDetected) score += 35;
  if (stats.latestBlock > 0) score += 25;
  if (stats.rpc) score += 25;
  if (stats.circulatingSupply > 0) score += 15;
  return Math.min(score, 100);
}

export async function readTokenBalance(address) {
  const { provider, rpc } = await getProvider();
  const token = new ethers.Contract(CONFIG.slxContract, ERC20_ABI, provider);
  const [raw, decimals, symbol] = await Promise.all([token.balanceOf(address), token.decimals(), token.symbol()]);
  return { balance: ethers.formatUnits(raw, decimals), symbol, rpc };
}

export async function readNativeBalance(address) {
  const { provider, rpc } = await getProvider();
  const raw = await provider.getBalance(address);
  return { balance: ethers.formatEther(raw), symbol: "POL", rpc };
}
