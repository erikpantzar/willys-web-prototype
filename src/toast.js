'use strict';
// In-app toast, replacing native alert() for transient errors/confirmations
// (see issue #3) — the delivery-time confirm dialog already had a styled
// pattern (see dialog.js) for the blocking case; this covers the
// fire-and-forget one.
import styles from './toast.module.css';

const AUTO_DISMISS_MS = 4000;

function container() {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.className = styles['toast-container'];
    document.body.appendChild(el);
  }
  return el;
}

export function showToast(message, { type = 'error', actionLabel, onAction } = {}) {
  // A fast run of actions (add, undo, add, ...) would otherwise stack toasts
  // until the whole screen is covered — only the newest is useful.
  container().replaceChildren();

  const el = document.createElement('div');
  el.className = `${styles.toast} ${styles[`toast-${type}`]}`;

  const msgEl = document.createElement('div');
  msgEl.textContent = message;
  el.appendChild(msgEl);

  if (actionLabel && onAction) {
    const actionBtn = document.createElement('button');
    actionBtn.className = styles['toast-action'];
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener('click', () => {
      onAction();
      el.remove();
    });
    el.appendChild(actionBtn);
  }

  wireSwipeToDismiss(el, onAction);

  container().appendChild(el);
  setTimeout(() => el.remove(), AUTO_DISMISS_MS);
}

// Swipe the toast itself (either direction) as a faster alternative to
// tapping the small Undo button — if there's an action (e.g. undo), the
// swipe fires it, same as tapping would; a toast with no action just
// dismisses early instead of waiting out the full auto-dismiss timer.
const SWIPE_DISMISS_THRESHOLD_PX = 60;

function wireSwipeToDismiss(el, onAction) {
  let startX = 0;
  let startY = 0;
  let tracking = false;

  el.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    },
    { passive: true }
  );

  el.addEventListener(
    'touchmove',
    (e) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      el.style.transform = `translateX(${dx}px)`;
      el.style.opacity = String(Math.max(0.3, 1 - Math.abs(dx) / 200));
    },
    { passive: true }
  );

  el.addEventListener(
    'touchend',
    (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > SWIPE_DISMISS_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
        el.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
        el.style.transform = `translateX(${dx < 0 ? -1 : 1}00%)`;
        el.style.opacity = '0';
        onAction?.();
        setTimeout(() => el.remove(), 150);
      } else {
        el.style.transition = 'transform 0.15s ease, opacity 0.15s ease';
        el.style.transform = '';
        el.style.opacity = '';
        setTimeout(() => (el.style.transition = ''), 150);
      }
    },
    { passive: true }
  );
}
