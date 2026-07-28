'use strict';
// Client-side cache for the delivery-times fetch (issue #18) — that call is
// a real headless-browser check against willys.se and takes up to ~20s, so
// reusing a recent result instead of re-running it on every visit to the
// Delivery tab is a meaningful UX win. TTL_MS controls how long a cached
// result is shown at all; STALE_MS is shorter and gates whether a slot
// needs to be re-verified live before it's actually committed to, since
// slots can sell out between the original fetch and the user tapping one.
const KEY = 'willys.deliveryCache';
const TTL_MS = 8 * 60 * 60 * 1000;
const STALE_MS = 30 * 60 * 1000;

export function getCached() {
  let raw;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.fetchedAt !== 'number' || Date.now() - parsed.fetchedAt > TTL_MS) return null;
  return parsed;
}

export function setCached(body) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ fetchedAt: Date.now(), body }));
  } catch {
    // localStorage unavailable/full — cache is a nice-to-have, not required
  }
}

export function clearCached() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function isStale(fetchedAt) {
  return Date.now() - fetchedAt > STALE_MS;
}
