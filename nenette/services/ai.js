export function askNenette(question) {
  const q = question.toLowerCase();

  if (q.includes("brief") || q.includes("strategy") || q.includes("strategic")) {
    return "Use the Generate Strategic Brief button. V7.3 will synthesize market, liquidity, blockchain, LP lock, staking, wallet settings and risk flags into one operational brief.";
  }

  if (q.includes("risk")) {
    return "Risk is assessed through market data quality, liquidity, 24H movement, blockchain availability, LP lock status and whether holders/whales require an indexer.";
  }

  if (q.includes("staking")) {
    return "Staking is still simulation-only. Use the Staking module to estimate Bronze, Silver, Gold and Diamond rewards. On-chain staking must wait for an audited smart contract.";
  }

  if (q.includes("holder") || q.includes("whale")) {
    return "Real holders and whale tracking require an indexer API or backend. V7.3 flags this clearly inside the strategic brief.";
  }

  if (q.includes("market") || q.includes("price") || q.includes("liquid")) {
    return "Use Market for live DexScreener data. V7.3 includes those market signals in the automatic strategic brief.";
  }

  if (q.includes("security") || q.includes("contract")) {
    return "Use Security and the strategic brief to verify contract detection, LP lock, Polygon RPC status and official links. Always verify the contract address before any transaction.";
  }

  if (q.includes("portfolio") || q.includes("wallet")) {
    return "Use Portfolio to read one wallet or save multiple wallets locally. V7.3 uses the saved-wallet count to enrich the strategic brief.";
  }

  if (q.includes("alert")) {
    return "Use Alerts to set local browser-side price and liquidity alerts. These alerts only work when the page is open.";
  }

  return "Nénette V7.3 can answer local SLX questions and generate a strategic brief covering market, liquidity, blockchain, LP lock, staking, portfolio readiness and risk level.";
}
