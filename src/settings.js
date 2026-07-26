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
