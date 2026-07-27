'use strict';
import * as api from '../api.js';
import { pixelLoaderHtml } from '../loader.js';

// Delivery status state: 'idle' | 'loading' | 'ready'
let deliveryStatus = 'idle';

export function getDeliveryStatus() {
  return deliveryStatus;
}

function setDeliveryStatus(status) {
  deliveryStatus = status;
  updateTabBadge();
}

function updateTabBadge() {
  const badge = document.querySelector('.tab[data-route="delivery"] .tab-badge');
  if (!badge) return;

  if (deliveryStatus === 'loading') {
    badge.hidden = false;
    badge.className = 'tab-badge loading';
  } else if (deliveryStatus === 'ready') {
    badge.hidden = false;
    badge.className = 'tab-badge ready';
  } else {
    badge.hidden = true;
  }
}

function currentRoute() {
  return (location.hash || '#list').slice(1);
}

function hero(inner) {
  return `
    <div class="hero hero-delivery">
      <div class="hero-row">
        <div>
          <div class="hero-title">Delivery Time</div>
          <div class="hero-subtitle">Pick a day and time that works for your family</div>
        </div>
        <button class="hero-icon-btn" id="refresh-delivery" title="Refresh available times">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0113.66-5.66M20 12a8 8 0 01-13.66 5.66" stroke="#fff" stroke-width="2" stroke-linecap="round"></path><path d="M17 3v4h-4M7 21v-4h4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>
    </div>
    <div class="view-body">${inner}</div>
  `;
}

export async function renderDelivery(root) {
  const routeAtStart = currentRoute();

  root.innerHTML = hero(pixelLoaderHtml('Fetching delivery times… (can take up to ~20s)'));
  wireRefresh(root);
  setDeliveryStatus('loading');

  let body;
  try {
    body = await api.getDeliveryTimesWide();
  } catch (err) {
    // Only render error if we're still on the delivery route
    if (currentRoute() === routeAtStart && routeAtStart === 'delivery') {
      root.innerHTML = hero(`<div class="error">Could not check delivery times: ${escapeHtml(err.message)}</div>`);
      wireRefresh(root);
    }
    setDeliveryStatus('idle');
    return;
  }

  setDeliveryStatus('ready');

  // Only render content if we're still on the delivery route
  if (currentRoute() !== routeAtStart || routeAtStart !== 'delivery') {
    return;
  }

  const alternatives = body.alternatives || [];
  if (alternatives.every((a) => a.slots.length === 0)) {
    root.innerHTML = hero(`<div class="empty">No delivery times available in the next few days — try again later.</div>`);
    wireRefresh(root);
    return;
  }

  root.innerHTML = hero(`
    <div id="delivery-groups">
      ${alternatives.map(dateGroup).join('')}
    </div>
    <div id="confirm-box"></div>
  `);
  wireRefresh(root);

  root.querySelectorAll('[data-slot]').forEach((btn) => {
    btn.addEventListener('click', () => showConfirm(root, JSON.parse(btn.dataset.slot)));
  });
}

function wireRefresh(root) {
  root.querySelector('#refresh-delivery')?.addEventListener('click', () => renderDelivery(root));
}

function dateGroup(alt) {
  if (alt.slots.length === 0) {
    return `<section class="delivery-group"><h3>${escapeHtml(alt.targetDate)}</h3><div class="empty small">No slots this day.</div></section>`;
  }
  return `
    <section class="delivery-group">
      <h3>${escapeHtml(alt.targetDate)} <span class="muted">(${escapeHtml(alt.label)})</span></h3>
      <div class="slot-buttons">
        ${alt.slots.map((s) => `<button data-slot='${JSON.stringify(s).replace(/'/g, '&#39;')}'>${escapeHtml(timePart(s.formattedTime))}</button>`).join('')}
      </div>
    </section>
  `;
}

function timePart(formattedTime) {
  const m = formattedTime.match(/(\d{2}:\d{2}-\d{2}:\d{2})$/);
  return m ? m[1] : formattedTime;
}

async function showConfirm(root, slot) {
  const box = root.querySelector('#confirm-box');
  let count = 0;
  try {
    const { items } = await api.getList();
    count = items.length;
  } catch {
    // fall through with count 0 — the confirm copy still makes sense
  }
  box.innerHTML = `
    <div class="confirm-dialog">
      <p>Confirm delivery time <strong>${escapeHtml(slot.formattedTime)}</strong>?</p>
      <p>This sends your current list (${count} item${count === 1 ? '' : 's'}) for shopping and starts a fresh list — can't be undone.</p>
      <div class="confirm-actions">
        <button id="confirm-yes" class="danger">Confirm</button>
        <button id="confirm-no">Cancel</button>
      </div>
    </div>
  `;
  box.querySelector('#confirm-no').addEventListener('click', () => (box.innerHTML = ''));
  box.querySelector('#confirm-yes').addEventListener('click', async () => {
    box.innerHTML = `<div class="loading">Finalizing…</div>`;
    const who = localStorage.getItem('willys.who') || 'unknown';
    try {
      await api.chooseDeliveryTime(slot);
      await api.fakeSend(who);
      await api.resetList();
      box.innerHTML = `<div class="success">✅ Delivery time set: ${escapeHtml(slot.formattedTime)}. List sent for shopping and cleared for a new one.</div>`;
    } catch (err) {
      box.innerHTML = `<div class="error">Could not finalize: ${escapeHtml(err.message)}</div>`;
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
