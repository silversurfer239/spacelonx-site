export function askNenette(question) {
  const q = question.toLowerCase();
  if (q.includes("staking")) return "Use the Staking module to simulate Bronze, Silver, Gold and Diamond rewards.";
  if (q.includes("market") || q.includes("price")) return "Use the Market module to view price, liquidity, FDV, market cap and volume.";
  if (q.includes("security")) return "Use the Security module to review LP lock, contract detection and RPC status.";
  if (q.includes("portfolio")) return "Use the Portfolio module to read a Polygon address or connect a browser wallet.";
  return "I can help with SLX market, blockchain, portfolio, staking, security and investor trust.";
}
