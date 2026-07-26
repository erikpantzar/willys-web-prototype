'use strict';
// The tailnet HTTPS base URL (e.g. https://ep-precision-5570.tail5370f3.ts.net)
// is asked for once and kept in localStorage rather than baked into this
// public repo/site — it's low-sensitivity (only reachable by devices already
// on the tailnet) but there's no reason to hardcode a hostname that could
// change, or to force a redeploy if it ever does.
const KEY = 'willys.baseUrl';

export function getBaseUrl() {
  return localStorage.getItem(KEY) || '';
}

export function setBaseUrl(url) {
  localStorage.setItem(KEY, url.replace(/\/+$/, ''));
}

export function hasBaseUrl() {
  return Boolean(getBaseUrl());
}

// Demo mode: every view runs against seeded in-memory data (src/fakeData.js,
// src/api.fake.js) instead of the real tailnet backends — for design/
// interaction review without a Tailscale connection. `?demo=1` in the URL
// is a shareable way to land straight in it (e.g. for a design review
// link); once set it persists in localStorage like the base URL does.
const DEMO_KEY = 'willys.demo';

export function isDemoMode() {
  if (new URLSearchParams(location.search).get('demo') === '1') {
    localStorage.setItem(DEMO_KEY, '1');
  }
  return localStorage.getItem(DEMO_KEY) === '1';
}

export function setDemoMode(on) {
  if (on) localStorage.setItem(DEMO_KEY, '1');
  else localStorage.removeItem(DEMO_KEY);
}
