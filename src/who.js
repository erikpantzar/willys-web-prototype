'use strict';
// Centralized 'who' state management — localStorage + topbar badge.
// A name was never required to use the app (access is already gated on a
// verified tailnet connection — see settings.js) — it's just a courtesy
// label on list items. DEFAULT_WHO is the identity used when nobody's set
// one, so adding/removing items never blocks on typing a name first.
const WHO_KEY = 'willys.who';
const DEFAULT_WHO = 'Guest';

export function getWho() {
  return localStorage.getItem(WHO_KEY) || '';
}

// The identity actually sent to the backend when recording who added/removed
// an item — falls back to DEFAULT_WHO instead of ever being empty.
export function getIdentity() {
  return getWho() || DEFAULT_WHO;
}

export function setWho(name) {
  localStorage.setItem(WHO_KEY, name);
  updateBadge();
}

export function initWho() {
  updateBadge();
}

function updateBadge() {
  const badge = document.getElementById('who-badge');
  if (!badge) return;
  badge.textContent = `as ${getIdentity()}`;
  badge.classList.add('active');
}
