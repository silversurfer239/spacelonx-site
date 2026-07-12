const CACHE_NAME = "nenette-v8-0-pure-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/v7.css",
  "./assets/js/app.js",
  "./assets/js/router.js",
  "./config/config.js",
  "./services/wallet.js",
  "./services/multiwallet.js",
  "./services/blockchain.js",
  "./services/market.js",
  "./services/liquidity.js",
  "./services/storage.js",
  "./services/staking.js",
  "./services/memory.js",
  "./services/investor.js",
  "./services/brief.js",
  "./modules/dashboard/dashboard.js",
  "./modules/walletcenter/walletcenter.js",
  "./modules/market/market.js",
  "./modules/portfolio/portfolio.js",
  "./modules/staking/staking.js",
  "./modules/tokenomics/tokenomics.js",
  "./modules/roadmap/roadmap.js",
  "./modules/reports/reports.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => null);
    return response;
  }).catch(() => caches.match(event.request)));
});
