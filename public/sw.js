'use strict';
// Two jobs, deliberately simple (hand-rolled, no Workbox — this is a small
// prototype): (1) cache the app shell so it opens offline/on a flaky
// connection (data still needs the tailnet — see settings.js — this is
// just "the app loads"), (2) CacheFirst for willys.se product images, which
// is the "cache image URLs" ask — no backend storage, just a faster/more
// resilient repeat load of the same photo.
//
// The shell cache is network-first, not cache-first (issue #16): with
// cache-first, once the app shell was cached there was no way for it to
// ever refresh short of a manual cache-name bump — Vite's build hashes mean
// old cached HTML kept referencing JS/CSS bundles from a prior deploy
// indefinitely, which is what made iOS Safari show a very stale version.
// Network-first always picks up a new deploy when online, and still falls
// back to the cache offline.
// Stamped by scripts/stamp-sw.js on every build. Not read by any logic
// below — its only job is to change these bytes on every deploy, so the
// browser's own SW-update check (a byte-diff of this file) has something
// to actually detect. Without it this file is otherwise untouched by Vite
// (it's a static public/ passthrough), so it stays byte-identical across
// deploys that only change the hashed app bundle, and the browser never
// notices a new version exists (see main.js's wireUpdatePrompt, issue #35).
const BUILD_ID = '__BUILD_ID__';

const SHELL_CACHE = 'willys-shell-v2';
const IMAGE_CACHE = 'willys-images-v1';
const SHELL_URLS = [
  self.registration.scope,
  `${self.registration.scope}manifest.json`,
  `${self.registration.scope}icon.svg`,
  `${self.registration.scope}icons/icon-180.png`,
  `${self.registration.scope}icons/icon-192.png`,
  `${self.registration.scope}icons/icon-512.png`,
  `${self.registration.scope}icons/icon-maskable-512.png`,
];

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
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        try {
          const res = await fetch(event.request);
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw new Error('offline and not cached');
        }
      })
    );
  }
});
