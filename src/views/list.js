'use strict';
import * as api from '../api.js';
import { extractPrice, isVariableWeight, formatSum, parseQuantity, formatProduct } from '../format.js';
import { showToast } from '../toast.js';
import { confirmDialog } from '../dialog.js';
import { getWho, getIdentity, setWho } from '../who.js';
import { recordAction, performUndo } from '../undo.js';
import { pixelLoaderHtml } from '../loader.js';
import { playAddSound } from '../sound.js';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_RESULT_LIMIT = 15;

export async function renderList(root) {
  root.innerHTML = `<div class="loading">Loading list…</div>`;

  let state, items;
  try {
    ({ state, items } = await api.getList());
  } catch (err) {
    root.innerHTML = `<div class="error">Could not load the list: ${escapeHtml(err.message)}</div>`;
    return;
  }

  const pricedTotal = items.reduce((sum, i) => {
    const price = extractPrice(i.text);
    return price === null ? sum : sum + price * (i.quantity || 1);
  }, 0);
  const missingPrice = items.some((i) => extractPrice(i.text) === null);
  const anyVariable = items.some((i) => isVariableWeight(i.text));

  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  updateCartBadge(totalQty);

  root.innerHTML = `
    <div class="view-body view-body-top">
    <div class="search-section">
      <form id="search-form" class="search-box">
        <svg width="18" height="18" viewBox="0 0 18 18" style="flex-shrink:0"><circle cx="8" cy="8" r="6" fill="none" stroke="var(--search-pill-fg)" stroke-width="2"></circle><line x1="12.2" y1="12.2" x2="16.5" y2="16.5" stroke="var(--search-pill-fg)" stroke-width="2" stroke-linecap="round"></line></svg>
        <input id="search-input" type="text" placeholder="Find products… e.g. 2 mjölk" autocomplete="off" />
        <button type="button" id="search-clear" class="search-clear-btn" hidden aria-label="Clear search">✕</button>
      </form>
      <div id="search-results" class="results-grid"></div>
    </div>

    <ul class="item-list">
      ${items.length === 0 ? emptyState() : items.map(itemRow).join('')}
    </ul>

    ${pricedTotal > 0 ? `
      <div class="total">
        Total: ${formatSum(pricedTotal)} kr
        ${missingPrice || anyVariable ? `<div class="note">${[missingPrice && 'some items have no price on file', anyVariable && 'some prices are per kg — weight varies'].filter(Boolean).join('; ')}</div>` : ''}
      </div>
    ` : ''}

    <div class="utility-section">
      <div class="who-row">
        <label>Your name (optional) <input id="who" type="text" value="${escapeHtml(getWho())}" placeholder="e.g. Erik — defaults to Guest" /></label>
      </div>
    </div>

    <div class="list-status">
      Status: ${state.status}${state.trigger_at ? ` · Trigger: ${new Date(state.trigger_at).toLocaleString()} (${state.trigger_set_by})` : ''}
    </div>

    <div class="list-actions">
      <button id="reset-btn" class="danger">Reset list</button>
    </div>
    </div>
  `;

  const whoInput = root.querySelector('#who');
  whoInput.addEventListener('change', (e) => {
    const newName = e.target.value.trim();
    const existingNames = new Set(items.map(i => i.added_by.toLowerCase()));
    const currentWho = getWho().toLowerCase();

    // Warn if the new name case-insensitively matches a different existing name
    if (newName && newName.toLowerCase() !== currentWho && existingNames.has(newName.toLowerCase())) {
      const matches = items.filter(i => i.added_by.toLowerCase() === newName.toLowerCase()).map(i => i.added_by);
      const existingCasing = [...new Set(matches)][0];
      if (existingCasing && existingCasing !== newName) {
        showToast(`Note: "${existingCasing}" is already in use on this list (different casing).`);
      }
    }

    setWho(newName);
  });

  wireProductSearch(root);

  root.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const itemId = Number(btn.dataset.remove);
      const item = items.find((i) => i.id === itemId);
      btn.disabled = true;
      const itemText = btn.closest('.item-row')?.querySelector('.item-text')?.textContent || 'item';
      try {
        await api.removeItem(itemId);
        if (item) {
          recordAction({ type: 'remove', itemId, text: item.text, who: item.added_by });
        }
        renderList(root);
        showToast(`Removed "${item?.text || 'item'}"`, {
          type: 'success',
          actionLabel: 'Undo',
          onAction: async () => {
            await performUndo();
            renderList(root);
          },
        });
      } catch (err) {
        showToast(`Could not remove: ${err.message}`);
        btn.disabled = false;
      }
    });
  });

  root.querySelectorAll('[data-qty-step]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const delta = Number(btn.dataset.qtyStep);
      const current = Number(btn.dataset.current);
      const next = current + delta;
      if (next < 1) return;
      btn.disabled = true;
      const itemText = btn.closest('.item-row')?.querySelector('.item-text')?.textContent || 'item';
      try {
        await api.setQuantity(id, next);
        recordAction({ type: 'qty', itemId: id, previousValue: current });
        renderList(root);
        showToast(`Quantity updated to ${next}`, {
          type: 'success',
          actionLabel: 'Undo',
          onAction: async () => {
            await performUndo();
            renderList(root);
          },
        });
      } catch (err) {
        showToast(`Could not update quantity: ${err.message}`);
        btn.disabled = false;
      }
    });
  });

  root.querySelector('#reset-btn').addEventListener('click', async () => {
    const ok = await confirmDialog("Clear the whole list and start fresh? Can't be undone.", { confirmLabel: 'Clear list' });
    if (!ok) return;
    try {
      await api.resetList();
      renderList(root);
    } catch (err) {
      showToast(`Could not reset: ${err.message}`);
    }
  });
}

// Product-database search-and-add (the item-matcher-backed flow the
// Telegram bot's inline-keyboard search maps to) — folded into the List
// view instead of a separate Search tab.
function wireProductSearch(root) {
  const input = root.querySelector('#search-input');
  const clearBtn = root.querySelector('#search-clear');
  const resultsEl = root.querySelector('#search-results');
  let debounceTimer;
  let requestSeq = 0;
  let currentResolution = null;

  root.querySelector('#search-form').addEventListener('submit', (e) => e.preventDefault());

  input.addEventListener('input', () => {
    clearBtn.hidden = input.value.length === 0;
    clearTimeout(debounceTimer);
    const raw = input.value.trim();
    if (!raw) {
      resultsEl.innerHTML = '';
      currentResolution = null;
      return;
    }
    debounceTimer = setTimeout(() => runSearch(raw), SEARCH_DEBOUNCE_MS);
  });

  clearBtn.addEventListener('click', () => {
    clearTimeout(debounceTimer);
    input.value = '';
    clearBtn.hidden = true;
    resultsEl.innerHTML = '';
    currentResolution = null;
    input.focus();
  });

  async function runSearch(raw) {
    const seq = ++requestSeq;
    const { text: query, quantity } = parseQuantity(raw);
    resultsEl.innerHTML = pixelLoaderHtml('Searching…');
    let body;
    try {
      // Call resolve() instead of search() to get a persisted resolution.
      // This avoids the race condition where calling resolve() again on click
      // could match a different product if the catalog changed in between.
      body = await api.resolve(query);
    } catch (err) {
      if (seq === requestSeq) resultsEl.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
      currentResolution = null;
      return;
    }
    if (seq !== requestSeq) return; // a newer keystroke's search already landed

    const candidates = body.candidates || [];
    if (candidates.length === 0) {
      resultsEl.innerHTML = `<div class="empty">No matches for "${escapeHtml(query)}".</div>`;
      currentResolution = null;
      return;
    }
    currentResolution = body;

    const confirmedUrl = body.confirmedUrl || null;
    resultsEl.innerHTML = candidates.map((c, i) => resultCard(c, i, confirmedUrl)).join('');
    resultsEl.querySelectorAll('[data-pick]').forEach((card, i) => {
      card.addEventListener('click', () => addFromSearch(candidates[i], quantity, card));
    });
  }

  async function addFromSearch(candidate, quantity, card) {
    const who = getIdentity();
    if (!currentResolution) return showToast('Search result expired — try again.');
    card.classList.add('picking');
    try {
      // Call confirm() directly with the rank from the original resolve()
      // response — no second resolve() call, no identity re-matching race.
      const confirmed = await api.confirm(currentResolution.resolutionId, candidate.rank);
      const added = await api.addItem(formatProduct(confirmed, quantity), who);
      recordAction({ type: 'add', itemId: added.id, text: added.text, who });
      playAddSound();
      showToast(`Added "${added.text}"`, {
        type: 'success',
        actionLabel: 'Undo',
        onAction: async () => {
          await performUndo();
          renderList(root);
        },
      });
      renderList(root);
    } catch (err) {
      card.classList.remove('picking');
      showToast(`Could not add: ${err.message}`);
    }
  }
}

function resultCard(c, i, confirmedUrl) {
  const size = c.size ? `<div class="result-size">${escapeHtml(c.size)}</div>` : '';
  const price = c.price ? `<div class="result-price">${escapeHtml(c.price)} kr${c.priceUnit === 'kg' ? '/kg' : ''}</div>` : '';
  const img = c.imageUrl
    ? `<img class="result-img" src="${escapeHtml(c.imageUrl)}" loading="lazy" alt="" />`
    : `<div class="result-img placeholder"></div>`;
  const isConfirmed = confirmedUrl && c.url && c.url === confirmedUrl;
  const confirmedClass = isConfirmed ? ' confirmed' : '';
  // Staggered entrance (issue #24) — capped delay so a long result list
  // doesn't make the bottom cards visibly lag behind the search.
  const delay = Math.min(i, 8) * 40;
  return `
    <div class="result-card${confirmedClass} result-card-enter" data-pick="${i}" style="animation-delay: ${delay}ms">
      ${img}
      ${isConfirmed ? '<div class="result-confirmed-badge">✓</div>' : ''}
      <div class="result-info">
        <div class="result-name">${escapeHtml(c.text || c.name)}</div>
        ${size}
        ${price}
        <div class="result-status"></div>
      </div>
    </div>
  `;
}

function updateCartBadge(totalQty) {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  if (totalQty > 0) {
    badge.hidden = false;
    badge.textContent = String(totalQty);
  } else {
    badge.hidden = true;
  }
}

function emptyState() {
  return `
    <li class="empty-state" style="list-style: none">
      <div class="empty-state-icon" style="background: var(--list-pill-bg)">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 6h16l-1.5 10.5a2 2 0 01-2 1.5H7.5a2 2 0 01-2-1.5L4 6z" stroke="var(--list-pill-fg)" stroke-width="1.8" stroke-linejoin="round"></path><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="var(--list-pill-fg)" stroke-width="1.8"></path></svg>
      </div>
      <div class="empty-state-title">Your list is empty</div>
      <div class="empty-state-subtitle">Search for groceries above to start adding!</div>
    </li>
  `;
}

function itemRow(item) {
  return `
    <li class="item-row">
      <div class="item-main">
        <div class="item-text">${escapeHtml(item.text)}</div>
        <div class="item-meta">added by ${escapeHtml(item.added_by)}</div>
      </div>
      <div class="qty-stepper">
        <button data-qty-step="-1" data-id="${item.id}" data-current="${item.quantity}">−</button>
        <span>${item.quantity}</span>
        <button data-qty-step="1" data-id="${item.id}" data-current="${item.quantity}">+</button>
      </div>
      <button class="remove-btn" data-remove="${item.id}">✕</button>
    </li>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
