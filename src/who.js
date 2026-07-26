'use strict';
// Centralized 'who' state management — localStorage + topbar badge.
const WHO_KEY = 'willys.who';

export function getWho() {
  return localStorage.getItem(WHO_KEY) || '';
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
  const who = getWho();
  badge.textContent = who ? `as ${who}` : '';
  badge.classList.toggle('active', Boolean(who));
}
