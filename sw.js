// EduMarket service worker — offline app shell + image cache.
// Data never comes from here: /api/* always goes to the network (sync-bridge.js handles offline writes).
const VERSION = 'edumarket-v1';
const SHELL_CACHE = VERSION + '-shell';
const MEDIA_CACHE = VERSION + '-media';
const SHELL = [
  '/',
  '/index.html',
  '/app.js',
  '/app.css',
  '/sync-bridge.js',
  '/manifest.webmanifest',
  '/assets/bg-grass.jpg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network first (always the newest code when online), cached copy when offline.
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return (await cache.match(request)) || (fallbackUrl && (await cache.match(fallbackUrl))) || Response.error();
  }
}

// Cached copy right away, refreshed in the background (images, fonts).
async function staleWhileRevalidate(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((response) => {
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || update;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/')) return; // live data only
    if (request.mode === 'navigate') return event.respondWith(networkFirst(request, '/index.html'));
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/uploads/')) {
      return event.respondWith(staleWhileRevalidate(request));
    }
    return event.respondWith(networkFirst(request));
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
