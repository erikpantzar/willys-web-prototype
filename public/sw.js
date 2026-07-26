'use strict';
// Two jobs, deliberately simple (hand-rolled, no Workbox — this is a small
// prototype): (1) cache the app shell so it opens offline/on a flaky
// connection (data still needs the tailnet — see settings.js — this is
// just "the app loads"), (2) CacheFirst for willys.se product images, which
// is the "cache image URLs" ask — no backend storage, just a faster/more
// resilient repeat load of the same photo.
const SHELL_CACHE = 'willys-shell-v1';
const IMAGE_CACHE = 'willys-images-v1';
const SHELL_URLS = [self.registration.scope, `${self.registration.scope}manifest.json`, `${self.registration.scope}icon.svg`];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== IMAGE_CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

function isProductImage(url) {
  return url.hostname.endsWith('willys.se') || url.hostname.includes('cdn');
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  if (isProductImage(url) && event.request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const res = await fetch(event.request);
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
