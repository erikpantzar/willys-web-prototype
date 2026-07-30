'use strict';
import * as api from '../api.js';
import { extractPrice, isVariableWeight, formatSum, parseQuantity, formatProduct } from '../format.js';
import { showToast } from '../toast.js';
import { confirmDialog } from '../dialog.js';
import { getWho, getIdentity, setWho } from '../who.js';
import { FAMILY_MEMBERS, personaFor, personaBadgeHtml } from '../personas.js';
import { recordAction, performUndo } from '../undo.js';
import { pixelLoaderHtml } from '../loader.js';
import { playAddSound, playQtyUpSound, playQtyDownSound, playRemoveSound, vibrateAdd, vibrateRemove } from '../sound.js';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_RESULT_LIMIT = 15;

// Press-and-hold qty-stepper acceleration (issue #29): a delay before the
// first repeat so a plain tap never triggers it, then a classic
// scroll-wheel-style ramp — each successive step waits a little less than
// the last, down to a floor, so holding longer feels like it's speeding up
// rather than just ticking at a fixed rate.
const QTY_HOLD_DELAY_MS = 400;
const QTY_REPEAT_START_MS = 220;
const QTY_REPEAT_FLOOR_MS = 60;
const QTY_REPEAT_ACCEL = 0.82;

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
        <input id="search-input" type="text" placeholder="Find products… e.g. 2 mjölk" autocomplete="off" autocapitalize="off" enterkeyhint="search" />
        <button type="button" id="search-clear" class="search-clear-btn" hidden aria-label="Clear search">✕</button>
      </form>
      <div id="search-results" class="results-grid"></div>
    </div>

    <ul class="item-list">
      ${items.length === 0 ? emptyState() : items.map(itemRow).join('')}
    </ul>

    ${pricedTotal > 0 ? `
      <div class="total">
        Total: <span id="total-amount">${formatSum(pricedTotal)}</span> kr
        ${missingPrice || anyVariable ? `<div class="note">${[missingPrice && 'some items have no price on file', anyVariable && 'some prices are per kg — weight varies'].filter(Boolean).join('; ')}</div>` : ''}
      </div>
    ` : ''}

    <div class="utility-section">
      <div class="who-row" id="who-row">${whoRowHtml(items)}</div>
    </div>

    <div class="list-status">
      Status: ${state.status}${state.trigger_at ? ` · Trigger: ${new Date(state.trigger_at).toLocaleString()} (${state.trigger_set_by})` : ''}
    </div>

    <div class="list-actions">
      <button id="reset-btn" class="danger">Reset list</button>
    </div>
    </div>
  `;

  wireWhoPicker(root, items);

  wireProductSearch(root, items);

  root.querySelectorAll('.item-row').forEach((li) => wireItemRow(li, root, items));

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

// Chip picker for "who's adding" (issue #30) — replaces the old free-text
// name field. Family members are always offered (so a fresh, empty list
// still has them ready to tap), plus anyone else already seen on this list,
// plus "+ New" for a one-off guest. Picking an existing chip can never
// collide on casing since it writes back the exact canonical name; only
// the "+ New" path can still produce a near-duplicate, so that's the one
// place the casing-collision warning survives.
function whoRowHtml(items) {
  const selected = getWho() || 'Guest';
  // The currently-selected name is included as a candidate too, not just
  // names already on the list — otherwise typing a brand-new "+ New" name
  // sets it correctly but has no chip to show it as selected until they've
  // actually added an item under it.
  const candidateNames = [...items.map((i) => i.added_by), selected];
  const seen = new Set();
  const extraNames = [];
  for (const n of candidateNames) {
    const key = n.toLowerCase();
    if (key === 'guest' || FAMILY_MEMBERS.some((p) => p.name.toLowerCase() === key) || seen.has(key)) continue;
    seen.add(key);
    extraNames.push(n);
  }
  const chips = [...FAMILY_MEMBERS, personaFor('Guest'), ...extraNames.map((n) => personaFor(n))];
  return `
    <div class="who-label">Who's adding?</div>
    <div class="who-chips" id="who-chips">
      ${chips.map((p) => personaChipHtml(p, p.name.toLowerCase() === selected.toLowerCase())).join('')}
      <button type="button" class="persona-chip persona-chip-new" id="who-new-btn">
        <span class="persona-chip-emoji">✏️</span><span class="persona-chip-name">+ New</span>
      </button>
    </div>
    <div class="who-new-row" id="who-new-row" hidden>
      <input id="who-new-input" type="text" placeholder="Type a name…" autocomplete="off" />
    </div>
  `;
}

function personaChipHtml(persona, isSelected) {
  return `
    <button type="button" class="persona-chip${isSelected ? ' selected' : ''}" data-persona="${escapeHtml(persona.name)}" style="--persona-color:${persona.color}">
      <span class="persona-chip-emoji">${persona.emoji}</span>
      <span class="persona-chip-name">${escapeHtml(persona.name)}</span>
    </button>
  `;
}

function wireWhoPicker(root, items) {
  const whoRow = root.querySelector('#who-row');

  function rerender() {
    whoRow.innerHTML = whoRowHtml(items);
    wire();
  }

  function wire() {
    whoRow.querySelectorAll('[data-persona]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setWho(btn.dataset.persona);
        rerender();
      });
    });

    const newBtn = whoRow.querySelector('#who-new-btn');
    const newRow = whoRow.querySelector('#who-new-row');
    const newInput = whoRow.querySelector('#who-new-input');

    newBtn.addEventListener('click', () => {
      newRow.hidden = false;
      newInput.focus();
    });

    // Guards against firing twice: committing via Enter replaces this
    // input's DOM (rerender), which itself fires a native blur on the
    // about-to-be-removed input — without this flag that blur would call
    // commit() a second time.
    let committed = false;
    function commit() {
      if (committed) return;
      committed = true;
      const newName = newInput.value.trim();
      if (!newName) {
        newRow.hidden = true;
        return;
      }
      const existingNames = new Set(items.map((i) => i.added_by.toLowerCase()));
      if (existingNames.has(newName.toLowerCase()) && newName.toLowerCase() !== (getWho() || '').toLowerCase()) {
        const matches = items.filter((i) => i.added_by.toLowerCase() === newName.toLowerCase()).map((i) => i.added_by);
        const existingCasing = [...new Set(matches)][0];
        if (existingCasing && existingCasing !== newName) {
          showToast(`Note: "${existingCasing}" is already in use on this list (different casing).`);
        }
      }
      setWho(newName);
      rerender();
    }

    newInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      }
    });
    newInput.addEventListener('blur', commit);
  }

  wire();
}

// Attaches the remove + qty-step handlers a row needs, whether it came from
// renderList's initial batch or was just spliced in by addItemLocally() —
// one wiring path for both so a freshly-added row behaves identically to
// one that was there since page load.
function wireItemRow(li, root, items) {
  const removeBtn = li.querySelector('[data-remove]');
  if (removeBtn) wireRemoveButton(removeBtn, root, items);
  li.querySelectorAll('[data-qty-step]').forEach((btn) => wireQtyButton(btn, root, items));
}

function wireRemoveButton(btn, root, items) {
  btn.addEventListener('click', async () => {
    const itemId = Number(btn.dataset.remove);
    const item = items.find((i) => i.id === itemId);
    btn.disabled = true;
    try {
      await api.removeItem(itemId);
      if (item) {
        recordAction({ type: 'remove', itemId, text: item.text, who: item.added_by });
      }
      playRemoveSound();
      vibrateRemove();
      // Same local-patch treatment as qty +/- (see applyQuantityLocally) —
      // a full renderList() here flashed "Loading list…" and dropped scroll
      // position for what's visually just one row disappearing.
      removeItemLocally(root, items, itemId);
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
}

function wireQtyButton(btn, root, items) {
  // `busy` serializes requests for this one button (so a fast repeat never
  // overlaps two setQuantity calls); `repeating` tracks whether the hold
  // delay has actually elapsed and auto-repeat has taken over from what
  // would otherwise be a plain tap.
  let busy = false;
  let repeating = false;
  let repeatFailed = false;
  let holdTimer = null;
  let repeatTimer = null;

  function showQtyToast(next) {
    showToast(`Quantity updated to ${next}`, {
      type: 'success',
      actionLabel: 'Undo',
      onAction: async () => {
        await performUndo();
        renderList(root);
      },
    });
  }

  // One quantity step, shared by a plain tap and every auto-repeat tick.
  // Returns 'ok' | 'floor' (hit the 1-item floor, not an error) | 'error'
  // so the repeat loop knows whether to keep going.
  async function step({ silent } = {}) {
    if (busy) return 'busy';
    const id = Number(btn.dataset.id);
    const delta = Number(btn.dataset.qtyStep);
    const current = Number(btn.dataset.current);
    const next = current + delta;
    if (next < 1) return 'floor';
    busy = true;
    try {
      await api.setQuantity(id, next);
      recordAction({ type: 'qty', itemId: id, previousValue: current });
      if (delta > 0) playQtyUpSound(); else playQtyDownSound();
      // Patch the DOM in place instead of a full renderList() — that was
      // re-fetching + rebuilding the whole view on every +/- tap, which
      // visibly flashed a "Loading list…" screen for a one-number change.
      applyQuantityLocally(root, items, id, next);
      if (!silent) showQtyToast(next);
      return 'ok';
    } catch (err) {
      showToast(`Could not update quantity: ${err.message}`);
      return 'error';
    } finally {
      busy = false;
    }
  }

  function scheduleRepeat(intervalMs) {
    repeatTimer = setTimeout(async () => {
      const result = await step({ silent: true });
      if (result === 'error') repeatFailed = true;
      if (result !== 'ok' || !repeating) return; // hit the floor, errored, or already released
      scheduleRepeat(Math.max(QTY_REPEAT_FLOOR_MS, intervalMs * QTY_REPEAT_ACCEL));
    }, intervalMs);
  }

  function startPress() {
    repeatFailed = false;
    holdTimer = setTimeout(async () => {
      repeating = true;
      const result = await step({ silent: true });
      if (result === 'error') repeatFailed = true;
      if (result === 'ok' && repeating) scheduleRepeat(QTY_REPEAT_START_MS);
    }, QTY_HOLD_DELAY_MS);
  }

  // On release: a plain tap (never made it past the hold delay) does its
  // single step now, same as the old click handler. A hold that already
  // auto-repeated just stops — one toast for wherever it landed, not one
  // per tick — unless the last tick errored, which already showed its own.
  function endPress({ wasCancel } = {}) {
    clearTimeout(holdTimer);
    clearTimeout(repeatTimer);
    holdTimer = null;
    repeatTimer = null;
    if (repeating) {
      repeating = false;
      if (!repeatFailed && !wasCancel) showQtyToast(Number(btn.dataset.current));
    } else if (!wasCancel) {
      step();
    }
  }

  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // primary mouse button only
    btn.setPointerCapture(e.pointerId);
    startPress();
  });
  btn.addEventListener('pointerup', () => endPress());
  btn.addEventListener('pointercancel', () => endPress({ wasCancel: true }));
}

// Product-database search-and-add (the item-matcher-backed flow the
// Telegram bot's inline-keyboard search maps to) — folded into the List
// view instead of a separate Search tab.
function wireProductSearch(root, items) {
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
      vibrateAdd();
      showToast(`Added "${added.text}"`, {
        type: 'success',
        actionLabel: 'Undo',
        onAction: async () => {
          await performUndo();
          renderList(root);
        },
      });
      // Local insert instead of a full renderList() — same reasoning as
      // applyQuantityLocally: avoids the "Loading list…" flash and, here,
      // avoids dropping focus/scroll too, which matters more for add since
      // clearing-and-refocusing the search input is what makes adding
      // several items back to back not need a re-tap each time.
      addItemLocally(root, items, added);
      clearTimeout(debounceTimer);
      input.value = '';
      clearBtn.hidden = true;
      resultsEl.innerHTML = '';
      currentResolution = null;
      input.focus();
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

// Shared tail end of every local-patch path (qty change, add, remove):
// refresh the cart badge and tween the total to match the now-mutated
// `items` array. Falls back to a full renderList() only if the Total card
// needs to appear/disappear entirely (e.g. the last priced item was
// removed, or its quantity dropped to where rounding makes a 0kr total —
// rare, not worth a bespoke DOM-insertion path for).
function updateBadgeAndTotal(root, items) {
  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  updateCartBadge(totalQty);

  const pricedTotal = items.reduce((sum, i) => {
    const price = extractPrice(i.text);
    return price === null ? sum : sum + price * (i.quantity || 1);
  }, 0);
  const totalEl = root.querySelector('#total-amount');
  if (totalEl && pricedTotal > 0) {
    animateTotal(totalEl, pricedTotal);
  } else if (pricedTotal > 0 !== Boolean(totalEl)) {
    renderList(root); // the Total card needs to appear or disappear — full rebuild
  }
}

// Patches just the changed item's row + the cart badge + the total in
// place, instead of a full renderList() re-fetch/rebuild (which flashed a
// "Loading list…" screen for a single +/- tap).
function applyQuantityLocally(root, items, id, next) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.quantity = next;

  const row = root.querySelector(`[data-qty-step][data-id="${id}"]`)?.closest('.item-row');
  if (row) {
    row.querySelector('.qty-stepper span').textContent = next;
    row.querySelectorAll('[data-qty-step]').forEach((b) => (b.dataset.current = String(next)));
  }

  updateBadgeAndTotal(root, items);
}

// Splices a freshly-added item into the in-memory list and inserts its row
// with the same entrance animation search-result cards use, instead of a
// full renderList() (see addFromSearch — that flashed "Loading list…" and,
// worse, dropped focus out of the search input between successive adds).
function addItemLocally(root, items, item) {
  items.push(item);
  const list = root.querySelector('.item-list');
  if (!list) return;

  list.querySelector('.empty-state')?.remove();

  const wrapper = document.createElement('div');
  wrapper.innerHTML = itemRow(item);
  const li = wrapper.firstElementChild;
  li.classList.add('item-row-enter');
  list.appendChild(li);
  wireItemRow(li, root, items);

  updateBadgeAndTotal(root, items);
}

// Removes the row from both the in-memory list and the DOM in place —
// counterpart to addItemLocally, same reasoning (see wireRemoveButton).
function removeItemLocally(root, items, itemId) {
  const idx = items.findIndex((i) => i.id === itemId);
  if (idx === -1) return;
  items.splice(idx, 1);

  root.querySelector(`[data-remove="${itemId}"]`)?.closest('.item-row')?.remove();

  const list = root.querySelector('.item-list');
  if (list && items.length === 0) list.innerHTML = emptyState();

  updateBadgeAndTotal(root, items);
}

// Rolls the displayed total from its current value to the new one over a
// short tween instead of just snapping to the new number, plus a small pop
// so an increase/decrease is felt, not just read.
function animateTotal(el, newTotal) {
  const from = parseFloat((el.dataset.rawValue ?? el.textContent).toString().replace(/\s/g, '').replace(',', '.')) || 0;
  el.dataset.rawValue = String(newTotal);
  if (from === newTotal) return;

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = formatSum(newTotal);
    return;
  }

  el.classList.remove('total-pop');
  void el.offsetWidth; // restart the pop animation even if it's still mid-way
  el.classList.add('total-pop');

  const durationMs = 400;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min(1, (now - startTime) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = formatSum(from + (newTotal - from) * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
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
      ${personaBadgeHtml(item.added_by)}
      <div class="item-main">
        <div class="item-text">${escapeHtml(item.text)}</div>
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
