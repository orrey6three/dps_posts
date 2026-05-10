const STATIC_CACHE = 'dps45-static-v45';
const RUNTIME_CACHE = 'dps45-runtime-v45';

// Only precache files that actually exist in the public directory.
const PRECACHE_URLS = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys
        .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
        .map((k) => caches.delete(k)));
    } catch {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Cache API doesn't support cache.put for non-GET.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Don't cache cross-origin (Yandex, etc.)
  if (url.origin !== self.location.origin) return;

  // Never cache API/admin actions.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin')) return;

  // Navigation: network-first (fresh HTML), fallback to cache.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req)) || (await caches.match('/'));
      }
    })());
    return;
  }

  // Assets: cache-first, then update in background.
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;

    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  })());
});
