const CACHE_NAME = 'myfinance-v3';
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).then(() =>
        Promise.allSettled(CDN_ASSETS.map(url => cache.add(url)))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin === location.origin || CDN_ASSETS.includes(request.url)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return response;
        }).catch(() => {
          if (request.headers.get('Accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
    );
  }
});
