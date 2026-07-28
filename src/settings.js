'use strict';
// The tailnet HTTPS base URL (e.g. https://ep-precision-5570.tail5370f3.ts.net)
// is asked for once and kept in localStorage rather than baked into this
// public repo/site — it's low-sensitivity (only reachable by devices already
// on the tailnet) but there's no reason to hardcode a hostname that could
// change, or to force a redeploy if it ever does.
const KEY = 'willys.baseUrl';
const CONNECTION_VERIFIED_KEY = 'willys.connectionVerified';

export function getBaseUrl() {
  return localStorage.getItem(KEY) || '';
}

export function setBaseUrl(url) {
  localStorage.setItem(KEY, url.replace(/\/+$/, ''));
  // Clear connection verification when base URL changes, since the new URL must be re-verified
  localStorage.removeItem(CONNECTION_VERIFIED_KEY);
}

export function hasBaseUrl() {
  return Boolean(getBaseUrl());
}

export function isConnectionVerified() {
  return localStorage.getItem(CONNECTION_VERIFIED_KEY) === '1';
}

export function setConnectionVerified(verified) {
  if (verified) localStorage.setItem(CONNECTION_VERIFIED_KEY, '1');
  else localStorage.removeItem(CONNECTION_VERIFIED_KEY);
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

// Testing-mode bypass (see docs/testing-mode-plan.md) — skips the forced
// Settings/verify-connection gate for a period while non-Tailscale devices
// (e.g. kids' phones) try the real app. `?open=1` is the shareable link,
// same persistence pattern as demo mode. Settings/verify are NOT deleted —
// still reachable via the gear icon, and this is one `isTestingOpen()`
// check to remove (or make return false) to fully re-enable the gate.
const TESTING_KEY = 'willys.testingOpen';

export function isTestingOpen() {
  if (new URLSearchParams(location.search).get('open') === '1') {
    localStorage.setItem(TESTING_KEY, '1');
  }
  return localStorage.getItem(TESTING_KEY) === '1';
}

export function setTestingOpen(on) {
  if (on) localStorage.setItem(TESTING_KEY, '1');
  else localStorage.removeItem(TESTING_KEY);
}
