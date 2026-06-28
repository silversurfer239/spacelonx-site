const SLX_CONTRACT = "0xcAC47b268787a280816b50e7F9b679e81B8a179e";
const SLX_PAIR = "0x837c80c5f4f0165110a36ef0e10dd95f2579eed4";
const SLX_PRICE_USD = 0.000005978;
const RPC_LIST = [
  "https://polygon-bor-rpc.publicnode.com",
  "https://polygon-rpc.com",
  "https://rpc.ankr.com/polygon"
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

function addBot(message) {
  const box = document.getElementById("chatBox");
  if (!box) return;
  const div = document.createElement("div");
  div.className = "bot";
  div.innerHTML = "Nénette: " + message;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function fmt(n) {
  if (n === undefined || n === null || n === "") return "N/A";
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  if (num === 0) return "0";
  if (num < 0.0001) return num.toExponential(3);
  return num.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("visible"));
  document.getElementById(id).classList.add("visible");
  document.querySelectorAll("nav button").forEach(b => b.classList.toggle("active", b.dataset.section === id));
}

function renderMarket() {
  const html = `
    <div class="metric"><span>Pair</span><b>SLX / WPOL</b></div>
    <div class="metric"><span>Price USD</span><b>$${fmt(SLX_PRICE_USD)}</b></div>
    <div class="metric"><span>Liquidity</span><b>$1.1K</b></div>
    <div class="metric"><span>FDV</span><b>$5.9K</b></div>
    <div class="metric"><span>DEX</span><b>QuickSwap V2</b></div>
    <div class="metric"><span>Status</span><b>Fallback Data</b></div>
    <div class="metric"><span>Chart</span><b><a href="https://dexscreener.com/polygon/${SLX_PAIR}" target="_blank">DexScreener</a></b></div>
  `;
  const marketStatus = document.getElementById("marketStatus");
  const marketDetails = document.getElementById("marketDetails");
  if (marketStatus) marketStatus.innerHTML = "SLX market data loaded.";
  if (marketDetails) marketDetails.innerHTML = html;
  addBot("SLX market loaded. DexScreener direct API may return 403 locally, so V4 uses verified fallback data.");
}

async function readSLXBalance(address) {
  let lastError = null;
  for (const rpc of RPC_LIST) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const slx = new ethers.Contract(SLX_CONTRACT, ERC20_ABI, provider);
      const balanceRaw = await slx.balanceOf(address);
      const decimals = await slx.decimals();
      const symbol = await slx.symbol();
      return { balance: ethers.formatUnits(balanceRaw, decimals), symbol, rpc };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("RPC unavailable");
}

function getMetaMaskProvider() {
  if (!window.ethereum) return null;
  if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
    return window.ethereum.providers.find(p => p.isMetaMask) || null;
  }
  return window.ethereum.isMetaMask ? window.ethereum : null;
}

async function connectWallet() {
  const target = document.getElementById("walletStatus");
  const injected = getMetaMaskProvider();

  if (!injected) {
    target.innerHTML = "MetaMask not detected or another wallet takes priority.";
    addBot("Use read-only wallet mode or temporarily disable conflicting wallet extensions.");
    return;
  }

  try {
    const accounts = await injected.request({ method: "eth_requestAccounts" });
    const account = accounts[0];
    const result = await readSLXBalance(account);
    renderPortfolio(account, result, "Connected Wallet");
  } catch (err) {
    target.innerHTML = "Wallet connection failed or was rejected.";
    addBot("Wallet error: " + (err.message || err));
  }
}

function renderPortfolio(address, result, mode) {
  const value = Number(result.balance) * SLX_PRICE_USD;
  const html = `
    Address: <b>${address.slice(0, 6)}...${address.slice(-4)}</b><br>
    Mode: <b>${mode}</b><br>
    Network: <b>Polygon Mainnet</b><br>
    SLX Balance: <b>${fmt(result.balance)} ${result.symbol}</b><br>
    Estimated Value: <b>$${fmt(value)}</b><br>
    RPC: <b>${result.rpc}</b>
  `;
  document.getElementById("walletStatus").innerHTML = html;
  document.getElementById("portfolioDetails").innerHTML = html;
  addBot(`Portfolio loaded: ${fmt(result.balance)} ${result.symbol}, estimated value $${fmt(value)}.`);
}

async function readManualWallet() {
  const input = document.getElementById("manualAddress").value.trim();
  if (!ethers.isAddress(input)) {
    document.getElementById("portfolioDetails").innerHTML = "Invalid wallet address.";
    addBot("Paste a valid Polygon address starting with 0x.");
    return;
  }
  try {
    document.getElementById("portfolioDetails").innerHTML = "Reading SLX balance...";
    const result = await readSLXBalance(input);
    renderPortfolio(input, result, "Read-only");
  } catch (err) {
    document.getElementById("portfolioDetails").innerHTML = "Wallet read error.";
    addBot("Polygon RPC error: " + (err.message || err));
  }
}

function estimateRewards() {
  const amount = Number(document.getElementById("stakeAmount").value);
  const apr = Number(document.getElementById("stakeApr").value);
  if (!amount || amount <= 0) {
    document.getElementById("stakingResult").innerHTML = "Enter a valid SLX amount.";
    return;
  }
  const annualReward = amount * apr / 100;
  document.getElementById("stakingResult").innerHTML = `
    Estimated annual reward: <b>${fmt(annualReward)} SLX</b><br>
    Estimated annual value: <b>$${fmt(annualReward * SLX_PRICE_USD)}</b><br>
    Indicative only. Final rewards depend on the staking contract.
  `;
}

function askAI() {
  const q = document.getElementById("aiInput").value.trim().toLowerCase();
  let answer = "I can help with SLX market data, wallet balance, staking estimates, DAO governance and the SpacelonX roadmap.";
  if (q.includes("staking")) answer = "For a sustainable launch, Bronze 30d, Silver 90d, Gold 180d and Diamond 365d should remain indicative until the rewards wallet is funded.";
  if (q.includes("wallet") || q.includes("balance")) answer = "Open Portfolio, paste a Polygon wallet address, then click Read SLX Balance.";
  if (q.includes("dao")) answer = "The recommended V1 governance layer is Snapshot using SLX ERC-20 balance on Polygon.";
  if (q.includes("price") || q.includes("market")) answer = "Open Market to display SLX/WPOL price, liquidity, FDV and DexScreener link.";
  document.getElementById("aiAnswer").innerHTML = answer;
  addBot("AI module answered locally. Future V5 can connect to a backend AI API.");
}

document.querySelectorAll("nav button").forEach(btn => btn.addEventListener("click", () => showSection(btn.dataset.section)));
document.getElementById("refreshBtn").addEventListener("click", renderMarket);
document.getElementById("connectBtn").addEventListener("click", connectWallet);
document.getElementById("manualBtn").addEventListener("click", readManualWallet);
document.getElementById("marketBtn").addEventListener("click", renderMarket);
document.getElementById("calcRewards").addEventListener("click", estimateRewards);
document.getElementById("aiAsk").addEventListener("click", askAI);

renderMarket();
