'use strict';
// Screen reader announcements for dynamic list/search/delivery actions
// (see issue #9) — uses a single aria-live region similar to toast.js pattern.

function container() {
  let el = document.getElementById('announce-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'announce-container';
    el.className = 'sr-only';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
  }
  return el;
}

export function announce(message) {
  container().textContent = message;
}
