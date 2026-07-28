'use strict';
import * as api from '../api.js';
import { pixelLoaderHtml } from '../loader.js';
import { getIdentity } from '../who.js';
import { getCached, setCached, clearCached, isStale } from '../deliveryCache.js';

// Delivery status state: 'idle' | 'loading' | 'ready'
let deliveryStatus = 'idle';
// When the alternatives currently on screen were fetched — drives the
// "checked Xm ago" note and whether a picked slot needs re-verifying
// before it's actually committed to (issue #18).
let lastFetchedAt = null;

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
    // Three tiny bouncing dots, echoing the same bouncing-dot language as
    // the in-view "Fetching delivery times…" loader (loader.js) — one
    // consistent "still working on it" motif instead of two different ones.
    badge.innerHTML = '<i></i><i></i><i></i>';
  } else if (deliveryStatus === 'ready') {
    badge.hidden = false;
    badge.className = 'tab-badge ready';
    badge.innerHTML = '';
  } else {
    badge.hidden = true;
    badge.innerHTML = '';
  }
}

function currentRoute() {
  return (location.hash || '#list').slice(1);
}

// No colored hero banner (the top nav tab already carries the "Delivery"
// identity/color) — just the view-body plus a small refresh control,
// present in every state (loading/error/empty/success alike) so there's
// always a way to re-check without waiting.
function shell(inner) {
  return `
    <div class="view-body view-body-top">
      <div class="view-toolbar">
        <button class="toolbar-icon-btn" id="refresh-delivery" title="Refresh available times">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0113.66-5.66M20 12a8 8 0 01-13.66 5.66" stroke="var(--delivery-pill-fg)" stroke-width="2" stroke-linecap="round"></path><path d="M17 3v4h-4M7 21v-4h4" stroke="var(--delivery-pill-fg)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
      </div>
      ${inner}
    </div>
  `;
}

function checkedNote(fetchedAt) {
  const mins = Math.max(0, Math.round((Date.now() - fetchedAt) / 60000));
  const when = mins === 0 ? 'just now' : mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
  return `<div class="muted" style="margin-bottom: 0.7rem">Checked ${when}${mins >= 5 ? ' — tap ↻ above to refresh' : ''}</div>`;
}

export async function renderDelivery(root, { forceRefresh = false } = {}) {
  const routeAtStart = currentRoute();

  if (!forceRefresh) {
    const cached = getCached();
    if (cached) {
      lastFetchedAt = cached.fetchedAt;
      setDeliveryStatus('ready');
      renderAlternatives(root, cached.body, cached.fetchedAt);
      return;
    }
  }

  root.innerHTML = shell(pixelLoaderHtml('Fetching delivery times… (can take up to ~20s)'));
  wireRefresh(root);
  setDeliveryStatus('loading');

  let body;
  try {
    body = await api.getDeliveryTimesWide();
  } catch (err) {
    // Only render error if we're still on the delivery route
    if (currentRoute() === routeAtStart && routeAtStart === 'delivery') {
      root.innerHTML = shell(`<div class="error">Could not check delivery times: ${escapeHtml(err.message)}</div>`);
      wireRefresh(root);
    }
    setDeliveryStatus('idle');
    return;
  }

  // Only render content if we're still on the delivery route
  if (currentRoute() !== routeAtStart || routeAtStart !== 'delivery') {
    return;
  }

  setCached(body);
  lastFetchedAt = Date.now();
  setDeliveryStatus('ready');
  renderAlternatives(root, body, lastFetchedAt);
}

function renderAlternatives(root, body, fetchedAt) {
  const alternatives = body.alternatives || [];
  if (alternatives.every((a) => a.slots.length === 0)) {
    root.innerHTML = shell(`<div class="empty">No delivery times available in the next few days — try again later.</div>`);
    wireRefresh(root);
    return;
  }

  root.innerHTML = shell(`
    ${checkedNote(fetchedAt)}
    <div id="delivery-groups">
      ${alternatives.map(dateGroup).join('')}
    </div>
  `);
  wireRefresh(root);

  root.querySelectorAll('[data-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Show the tap as pressed/selected immediately — the modal (which
      // does its own async work) can take a moment to appear.
      root.querySelectorAll('[data-slot].sel').forEach((b) => b.classList.remove('sel'));
      btn.classList.add('sel');
      openConfirmModal(root, JSON.parse(btn.dataset.slot), btn);
    });
  });
}

function wireRefresh(root) {
  root.querySelector('#refresh-delivery')?.addEventListener('click', () => renderDelivery(root, { forceRefresh: true }));
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

// A slot picked from a cached/older list might have sold out in the
// meantime — re-check live before committing if the data behind it is
// more than 30 minutes old (see deliveryCache.js STALE_MS).
async function verifySlotStillAvailable(slot) {
  const body = await api.getDeliveryTimesWide();
  setCached(body);
  lastFetchedAt = Date.now();
  const stillThere = (body.alternatives || []).some((a) => a.slots.some((s) => s.startTime === slot.startTime));
  return { stillThere, body };
}

function itemSummaryRow(item) {
  return `
    <li class="item-row item-row-readonly">
      <div class="item-main">
        <div class="item-text">${escapeHtml(item.text)}</div>
        <div class="item-meta">added by ${escapeHtml(item.added_by)}</div>
      </div>
      <div class="item-qty-readonly">×${item.quantity}</div>
    </li>
  `;
}

// Fullscreen — not the small centered .modal-backdrop used elsewhere
// (dialog.js) — this is the last checkpoint before sending a real order,
// so it gets the full list, the chosen time, and a clear signoff, not a
// one-line "are you sure?".
async function openConfirmModal(root, slot, slotBtn) {
  let items = [];
  try {
    ({ items } = await api.getList());
  } catch {
    // fall through with an empty list — the modal still works, just
    // without a item-by-item breakdown
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'fullscreen-modal-backdrop';
  const who = getIdentity();
  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

  function renderBody(inner) {
    backdrop.innerHTML = `
      <div class="fullscreen-modal-header">
        <div class="fullscreen-modal-title">Confirm order</div>
        <button class="toolbar-icon-btn" id="modal-close" title="Cancel">✕</button>
      </div>
      <div class="fullscreen-modal-body">${inner}</div>
    `;
    backdrop.querySelector('#modal-close')?.addEventListener('click', cancel);
  }

  function cancel() {
    backdrop.remove();
    slotBtn.classList.remove('sel');
  }

  renderBody(`
    <div class="confirm-time-banner">
      <div class="muted">Delivery time</div>
      <div class="confirm-time">${escapeHtml(slot.formattedTime)}</div>
    </div>
    <ul class="item-list">
      ${items.length === 0 ? '<li class="empty small">No items on the list.</li>' : items.map(itemSummaryRow).join('')}
    </ul>
    <div class="signoff-row muted">
      ${totalQty} item${totalQty === 1 ? '' : 's'} — confirming as <strong>${escapeHtml(who)}</strong>. This sends the list for
      shopping and starts a fresh one — can't be undone.
    </div>
    <div class="fullscreen-modal-actions">
      <button id="confirm-yes" class="danger">Confirm &amp; send</button>
      <button id="confirm-no">Cancel</button>
    </div>
  `);
  document.body.appendChild(backdrop);

  backdrop.querySelector('#confirm-no').addEventListener('click', cancel);
  backdrop.querySelector('#confirm-yes').addEventListener('click', async () => {
    renderBody(pixelLoaderHtml('Finalizing…'));

    let finalSlot = slot;
    if (isStale(lastFetchedAt)) {
      renderBody(pixelLoaderHtml("This list was checked a while ago — confirming it's still available…"));
      let verified;
      try {
        verified = await verifySlotStillAvailable(slot);
      } catch (err) {
        renderBody(`<div class="error">Could not re-check availability: ${escapeHtml(err.message)}</div><div class="fullscreen-modal-actions"><button id="modal-close-2">Close</button></div>`);
        backdrop.querySelector('#modal-close-2').addEventListener('click', cancel);
        return;
      }
      if (!verified.stillThere) {
        renderAlternatives(root, verified.body, lastFetchedAt);
        cancel();
        return;
      }
      renderBody(pixelLoaderHtml('Finalizing…'));
    }

    try {
      await api.chooseDeliveryTime(finalSlot);
      await api.fakeSend(who);
      await api.resetList();
      backdrop.remove();
      // Clear the view fully — the delivery times just used are spent
      // (a fresh order needs a fresh check), so don't leave the old slot
      // groups on screen or serve them from cache next visit.
      clearCached();
      lastFetchedAt = null;
      setDeliveryStatus('idle');
      root.innerHTML = shell(`<div class="success">✅ Sent! Delivery time ${escapeHtml(finalSlot.formattedTime)} confirmed and the list is cleared for next time.</div>`);
      wireRefresh(root);
    } catch (err) {
      renderBody(`<div class="error">Could not finalize: ${escapeHtml(err.message)}</div><div class="fullscreen-modal-actions"><button id="modal-close-2">Close</button></div>`);
      backdrop.querySelector('#modal-close-2').addEventListener('click', cancel);
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
