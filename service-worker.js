const CACHE_NAME = 'myfinance-v9';
const STATIC_ASSETS = [
  './index.html',
  './css/tokens.css',
  './css/app.css',
  './css/components.css',
  './css/animations.css',
  './js/db.js',
  './js/utils.js',
  './js/store.js',
  './js/router.js',
  './js/app.js',
  './components/toast.js',
  './components/modal.js',
  './components/fab.js',
  './pages/dashboard.js',
  './pages/commitments.js',
  './pages/expenses.js',
  './pages/receipts.js',
  './pages/reports.js',
  './pages/debt.js',
  './pages/budget.js',
  './manifest.json',
  './icons/icon.svg'
];
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

/* ── Allow page to force-activate a waiting SW (iOS PWA update fix) ── */
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ── Install: pre-cache everything ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS).then(() =>
        Promise.allSettled(CDN_ASSETS.map(url => cache.add(url)))
      )
    ).then(() => self.skipWaiting())
  );
});

/* ── Activate: wipe old caches, claim clients, notify page to reload ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        // Tell every open tab to reload so it picks up the fresh JS immediately
        self.clients.matchAll({ type: 'window' }).then(clients =>
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
        )
      )
  );
});

/* ── Fetch strategy ──
   CDN assets  → cache-first  (stable versioned URLs, safe to cache long-term)
   App assets  → network-first (always get the latest JS/CSS from server;
                                fall back to cache only when offline)
─────────────────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isCDN = CDN_ASSETS.some(u => request.url.startsWith(u.split('?')[0]));

  if (isCDN) {
    // Cache-first for CDN
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          return res;
        });
      })
    );
  } else if (url.origin === location.origin) {
    // Network-first for all app files
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('./index.html')
          )
        )
    );
  }
});
