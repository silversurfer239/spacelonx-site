export function askNenette(question) {
  const q = question.toLowerCase();

  if (q.includes("staking")) {
    return "Staking is still simulation-only. Use the Staking module to estimate Bronze, Silver, Gold and Diamond rewards. On-chain staking must wait for an audited smart contract.";
  }

  if (q.includes("holder") || q.includes("whale")) {
    return "Real holders and whale tracking require an indexer API or backend. The frontend can display wallet balances, LP status and market data, but cannot reliably index all holders alone.";
  }

  if (q.includes("market") || q.includes("price") || q.includes("liquid")) {
    return "Use the Market module for live DexScreener data. V7.2 tries the pair API first, then the token API, before using fallback data.";
  }

  if (q.includes("security") || q.includes("contract")) {
    return "Use Security to verify contract detection, LP lock, Polygon RPC status and official links. Always verify the contract address before any transaction.";
  }

  if (q.includes("portfolio") || q.includes("wallet")) {
    return "Use Portfolio V7.2 to read one wallet, save multiple wallets locally, and estimate aggregate SLX exposure and Diamond simulation rewards.";
  }

  if (q.includes("alert")) {
    return "Use Alerts V7.2 to set local browser-side price and liquidity alerts. These alerts work only when the page is opened.";
  }

  return "Nénette V7.2 can help with SLX market, portfolio, staking simulation, local alerts, security checks and deployment readiness.";
}
