'use strict';
// In-app toast, replacing native alert() for transient errors/confirmations
// (see issue #3) — the delivery-time confirm dialog already had a styled
// pattern (see dialog.js) for the blocking case; this covers the
// fire-and-forget one.
const AUTO_DISMISS_MS = 4000;

function container() {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'toast-container';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

export function showToast(message, { type = 'error', actionLabel, onAction } = {}) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;

  const msgEl = document.createElement('div');
  msgEl.textContent = message;
  el.appendChild(msgEl);

  if (actionLabel && onAction) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'toast-action';
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener('click', () => {
      onAction();
      el.remove();
    });
    el.appendChild(actionBtn);
  }

  container().appendChild(el);
  setTimeout(() => el.remove(), AUTO_DISMISS_MS);
}
