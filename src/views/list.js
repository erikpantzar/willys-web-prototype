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

// Sort & filter (issue #37). Sort never hides an item, just reorders what's
// already there — a single tap-to-cycle icon button, no modal needed.
// Filter *hides* items, which is the thing that needs to be unmissable when
// active, so it gets the real modal (see openFilterModal) plus three layers
// of "you're not seeing everything" signal: the banner below, the trigger
// button's own state change, and the banner doubling as a one-tap clear.
// Both live at module scope rather than component-local state so they
// survive a full renderList() (Reset, Undo) instead of silently resetting —
// but only for this page session; not worth persisting to localStorage on
// top of that for a viewing preference this minor.
const SORT_MODES = [
  { id: 'none', label: 'Default order', glyph: '↕' },
  { id: 'newest', label: 'Newest first', glyph: 'NEW' },
  { id: 'oldest', label: 'Oldest first', glyph: 'OLD' },
  { id: 'unpriced', label: 'Unpriced first', glyph: 'NO¤' },
  { id: 'alpha', label: 'A–Z', glyph: 'A–Z' },
];
let sortMode = SORT_MODES[0].id;
let filterState = { person: null, priced: null, qtyGt1: false };

function activeFilterCount(f) {
  return (f.person ? 1 : 0) + (f.priced ? 1 : 0) + (f.qtyGt1 ? 1 : 0);
}

function isFilterActive(f) {
  return activeFilterCount(f) > 0;
}

// The fast local-patch paths (addItemLocally etc.) only make sense when
// what's on screen is exactly `items` in API order — once a sort or filter
// is engaged they fall back to rebuilding just the list (still no network
// call, still no "Loading list…" flash, just not the single-row DOM patch).
function isDefaultView() {
  return sortMode === 'none' && !isFilterActive(filterState);
}

function applySortFilter(items) {
  let out = items.filter((i) => {
    if (filterState.person && i.added_by !== filterState.person) return false;
    if (filterState.priced === 'priced' && extractPrice(i.text) === null) return false;
    if (filterState.priced === 'unpriced' && extractPrice(i.text) !== null) return false;
    if (filterState.qtyGt1 && !((i.quantity || 1) > 1)) return false;
    return true;
  });
  if (sortMode === 'newest') out = out.slice().sort((a, b) => new Date(b.added_at) - new Date(a.added_at));
  else if (sortMode === 'oldest') out = out.slice().sort((a, b) => new Date(a.added_at) - new Date(b.added_at));
  else if (sortMode === 'unpriced') out = out.slice().sort((a, b) => (extractPrice(a.text) === null ? 0 : 1) - (extractPrice(b.text) === null ? 0 : 1));
  else if (sortMode === 'alpha') out = out.slice().sort((a, b) => a.text.localeCompare(b.text));
  return out;
}

function filterBannerText() {
  const parts = [];
  if (filterState.person) parts.push(`${filterState.person}'s items`);
  if (filterState.priced === 'priced') parts.push('priced items');
  if (filterState.priced === 'unpriced') parts.push('items with no price');
  if (filterState.qtyGt1) parts.push('qty > 1');
  return `Showing: ${parts.join(', ')} only — Tap to clear`;
}

function clearFilters(root, items) {
  filterState = { person: null, priced: null, qtyGt1: false };
  rerenderItemList(root, items);
}

// Rebuilds just the toolbar's state (sort glyph, filter trigger/badge), the
// banner, and the item-list markup — everything sort/filter can affect —
// without touching the search box, total, who-picker, etc. Also the
// fallback rebuild path local-patch functions use once sort/filter isn't
// in its default state (see isDefaultView).
function rerenderItemList(root, items) {
  const sortBtn = root.querySelector('#sort-btn');
  if (sortBtn) {
    const mode = SORT_MODES.find((m) => m.id === sortMode);
    sortBtn.textContent = mode.glyph;
    sortBtn.title = `Sort: ${mode.label} (tap to cycle)`;
  }

  const filterBtn = root.querySelector('#filter-btn');
  if (filterBtn) {
    const active = isFilterActive(filterState);
    filterBtn.classList.toggle('active', active);
    filterBtn.querySelector('.filter-count-badge')?.remove();
    if (active) {
      const badge = document.createElement('span');
      badge.className = 'filter-count-badge';
      badge.textContent = String(activeFilterCount(filterState));
      filterBtn.appendChild(badge);
    }
  }

  root.querySelector('#filter-banner')?.remove();
  if (isFilterActive(filterState)) {
    const banner = document.createElement('div');
    banner.id = 'filter-banner';
    banner.className = 'filter-banner';
    banner.innerHTML = `<span>${escapeHtml(filterBannerText())}</span><button type="button" class="filter-banner-clear-btn" aria-label="Clear filters">✕</button>`;
    banner.addEventListener('click', () => clearFilters(root, items));
    root.querySelector('.list-toolbar')?.after(banner);
  }

  const list = root.querySelector('.item-list');
  if (list) {
    const visible = applySortFilter(items);
    list.innerHTML = items.length === 0 ? emptyState() : visible.length === 0 ? filteredEmptyState() : visible.map(itemRow).join('');
    list.querySelectorAll('.item-row').forEach((li) => wireItemRow(li, root, items));
  }
}

function wireSortFilterToolbar(root, items) {
  root.querySelector('#sort-btn')?.addEventListener('click', () => {
    const idx = SORT_MODES.findIndex((m) => m.id === sortMode);
    sortMode = SORT_MODES[(idx + 1) % SORT_MODES.length].id;
    rerenderItemList(root, items);
  });
  root.querySelector('#filter-btn')?.addEventListener('click', () => openFilterModal(root, items));
  root.querySelector('#filter-banner')?.addEventListener('click', () => clearFilters(root, items));
}

// The filter modal (issue #37) — by person (reusing the same persona chips
// #30 already established), by priced/unpriced, by quantity > 1. Applies
// live as each chip is tapped rather than needing a separate "Apply" step —
// simpler than tracking a draft state that could diverge from what's
// actually showing underneath.
function openFilterModal(root, items) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  function personChips() {
    const names = [...new Set(items.map((i) => i.added_by))];
    const options = [{ name: null, label: 'Everyone' }, ...names.map((n) => ({ name: n, label: personaFor(n).name }))];
    return options
      .map((o) => {
        const persona = o.name ? personaFor(o.name) : null;
        const selected = filterState.person === o.name;
        return `
          <button type="button" class="persona-chip${selected ? ' selected' : ''}" data-person="${o.name ? escapeHtml(o.name) : ''}" style="${persona ? `--persona-color:${persona.color}` : ''}">
            ${persona ? `<span class="persona-chip-emoji">${persona.emoji}</span>` : ''}
            <span class="persona-chip-name">${escapeHtml(o.label)}</span>
          </button>
        `;
      })
      .join('');
  }

  function priceChips() {
    const options = [
      { v: null, label: 'All' },
      { v: 'priced', label: 'Priced' },
      { v: 'unpriced', label: 'No price' },
    ];
    return options
      .map((o) => `<button type="button" class="persona-chip${filterState.priced === o.v ? ' selected' : ''}" data-priced="${o.v || ''}"><span class="persona-chip-name">${o.label}</span></button>`)
      .join('');
  }

  function render() {
    backdrop.innerHTML = `
      <div class="confirm-dialog filter-modal">
        <div class="filter-modal-header">
          <div class="filter-modal-title">Filter list</div>
          <button type="button" class="toolbar-icon-btn" id="filter-modal-close" title="Close">✕</button>
        </div>
        <div class="filter-modal-section">
          <div class="who-label">Who</div>
          <div class="who-chips">${personChips()}</div>
        </div>
        <div class="filter-modal-section">
          <div class="who-label">Price</div>
          <div class="who-chips">${priceChips()}</div>
        </div>
        <div class="filter-modal-section">
          <label class="filter-modal-toggle">
            <input type="checkbox" id="filter-qty-gt1" ${filterState.qtyGt1 ? 'checked' : ''} />
            Quantity greater than 1
          </label>
        </div>
        <button type="button" id="filter-clear-all" class="danger" style="width: 100%">Clear all filters</button>
      </div>
    `;
    backdrop.querySelector('#filter-modal-close').addEventListener('click', close);
    backdrop.querySelectorAll('[data-person]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterState.person = btn.dataset.person || null;
        rerenderItemList(root, items);
        render();
      });
    });
    backdrop.querySelectorAll('[data-priced]').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterState.priced = btn.dataset.priced || null;
        rerenderItemList(root, items);
        render();
      });
    });
    backdrop.querySelector('#filter-qty-gt1').addEventListener('change', (e) => {
      filterState.qtyGt1 = e.target.checked;
      rerenderItemList(root, items);
    });
    backdrop.querySelector('#filter-clear-all').addEventListener('click', () => {
      clearFilters(root, items);
      render();
    });
  }

  function close() {
    backdrop.remove();
  }
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  render();
  document.body.appendChild(backdrop);
}

function filteredEmptyState() {
  return `
    <li class="empty-state" style="list-style: none">
      <div class="empty-state-title">No items match this filter</div>
      <div class="empty-state-subtitle">Tap the banner above to clear it.</div>
    </li>
  `;
}

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

  const visibleItems = applySortFilter(items);
  const activeSortMode = SORT_MODES.find((m) => m.id === sortMode);

  root.innerHTML = `
    <div class="view-body view-body-top list-view-body">
    <div class="search-section">
      <form id="search-form" class="search-box">
        <svg width="18" height="18" viewBox="0 0 18 18" style="flex-shrink:0"><circle cx="8" cy="8" r="6" fill="none" stroke="var(--search-pill-fg)" stroke-width="2"></circle><line x1="12.2" y1="12.2" x2="16.5" y2="16.5" stroke="var(--search-pill-fg)" stroke-width="2" stroke-linecap="round"></line></svg>
        <input id="search-input" type="text" placeholder="Find products… e.g. 2 mjölk" autocomplete="off" autocapitalize="off" enterkeyhint="search" />
        <button type="button" id="search-clear" class="search-clear-btn" hidden aria-label="Clear search">✕</button>
      </form>
      <div id="search-results" class="results-grid"></div>
    </div>

    <div class="list-rail">
    <div class="view-toolbar list-toolbar">
      <button type="button" class="toolbar-icon-btn" id="sort-btn" title="Sort: ${escapeHtml(activeSortMode.label)} (tap to cycle)">${escapeHtml(activeSortMode.glyph)}</button>
      <button type="button" class="toolbar-icon-btn${isFilterActive(filterState) ? ' active' : ''}" id="filter-btn" title="Filter list">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M8 12h8M11 18h2" stroke="var(--list-pill-fg)" stroke-width="2" stroke-linecap="round"></path></svg>
        ${isFilterActive(filterState) ? `<span class="filter-count-badge">${activeFilterCount(filterState)}</span>` : ''}
      </button>
    </div>
    ${isFilterActive(filterState) ? `<div class="filter-banner" id="filter-banner"><span>${escapeHtml(filterBannerText())}</span><button type="button" class="filter-banner-clear-btn" aria-label="Clear filters">✕</button></div>` : ''}

    <ul class="item-list">
      ${items.length === 0 ? emptyState() : visibleItems.length === 0 ? filteredEmptyState() : visibleItems.map(itemRow).join('')}
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
    </div>
  `;

  wireWhoPicker(root, items);

  wireProductSearch(root, items);

  wireSortFilterToolbar(root, items);

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
  if (removeBtn) {
    wireRemoveButton(removeBtn, root, items);
    wireSwipeToRemove(li, removeBtn, root, items);

    // Shortcut suggested in #37: tap the row's own persona badge to filter
    // straight to that person, instead of only being reachable through the
    // filter modal — reuses UI that's already there (issue #30). Tapping
    // the same person's badge again toggles the filter back off.
    const itemId = Number(removeBtn.dataset.remove);
    const item = items.find((i) => i.id === itemId);
    const badge = li.querySelector('.item-persona-badge');
    if (badge && item) {
      badge.addEventListener('click', () => {
        filterState.person = filterState.person === item.added_by ? null : item.added_by;
        rerenderItemList(root, items);
      });
    }
  }
  li.querySelectorAll('[data-qty-step]').forEach((btn) => wireQtyButton(btn, root, items));
}

function wireRemoveButton(btn, root, items) {
  btn.addEventListener('click', () => performRemove(btn, root, items));
}

// Shared by the ✕ button's click and the swipe gesture below — same
// request, same sound/haptic, same undo toast, regardless of which
// triggered it. Returns whether it succeeded so a caller mid-animation
// (the swipe path) knows whether to finish removing the row or snap it
// back into place.
async function performRemove(btn, root, items) {
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
    return true;
  } catch (err) {
    showToast(`Could not remove: ${err.message}`);
    btn.disabled = false;
    return false;
  }
}

// Swipe-to-remove (issue #28) — reuses toast.js's wireSwipeToDismiss gesture
// language (drag-follows-finger, threshold-based commit on release) rather
// than inventing a new one, but only follows a leftward drag: unlike a
// toast, a row swiping right doesn't mean anything, so that direction just
// rubber-bands back.
//
// Critical wrinkle (flagged in the issue): main.js listens for horizontal
// swipes on #app itself to navigate List → Delivery → Settings. Since
// touch events bubble from the row up through #app, every handler here
// calls stopPropagation() so a swipe that starts on an item row is never
// also seen by that view-nav listener — the row owns the gesture
// exclusively once it starts there.
const SWIPE_REMOVE_THRESHOLD_PX = 90; // more deliberate than the 60px toast/nav swipes — this one is destructive
const SWIPE_REMOVE_FOLLOW_MAX_PX = 250; // roughly where the row visually bottoms out at opacity 0.25 mid-drag

function wireSwipeToRemove(li, btn, root, items) {
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let isHorizontal = false; // decided once |dx| clearly outpaces |dy|; false lets normal vertical scroll happen

  li.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
      isHorizontal = false;
    },
    { passive: true }
  );

  li.addEventListener(
    'touchmove',
    (e) => {
      if (!tracking) return;
      e.stopPropagation();
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!isHorizontal && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5) isHorizontal = true;
      if (!isHorizontal) return;
      const clamped = Math.min(0, dx); // left only — a rightward drag doesn't move the row
      li.style.transform = `translateX(${clamped}px)`;
      li.style.opacity = String(Math.max(0.25, 1 - Math.abs(clamped) / SWIPE_REMOVE_FOLLOW_MAX_PX));
      // Reddens toward the threshold so the drag itself previews "this is
      // about to be removed" rather than just fading uniformly.
      const progress = Math.min(1, Math.abs(clamped) / SWIPE_REMOVE_THRESHOLD_PX);
      li.style.background = progress > 0 ? `color-mix(in oklch, var(--danger-bg) ${Math.round(progress * 70)}%, var(--card))` : '';
    },
    { passive: true }
  );

  li.addEventListener(
    'touchend',
    (e) => {
      if (!tracking) return;
      tracking = false;
      e.stopPropagation();
      const dx = e.changedTouches[0].clientX - startX;
      if (isHorizontal && dx < -SWIPE_REMOVE_THRESHOLD_PX) {
        commitSwipeRemove(li, btn, root, items);
      } else {
        snapBack(li);
      }
    },
    { passive: true }
  );

  li.addEventListener(
    'touchcancel',
    (e) => {
      tracking = false;
      e.stopPropagation();
      snapBack(li);
    },
    { passive: true }
  );
}

function snapBack(li) {
  li.style.transition = 'transform 0.15s ease, opacity 0.15s ease, background 0.15s ease';
  li.style.transform = '';
  li.style.opacity = '';
  li.style.background = '';
  setTimeout(() => (li.style.transition = ''), 150);
}

async function commitSwipeRemove(li, btn, root, items) {
  li.style.transition = 'transform 0.18s ease, opacity 0.18s ease';
  li.style.transform = 'translateX(-100%)';
  li.style.opacity = '0';
  const ok = await performRemove(btn, root, items);
  // On success, performRemove's removeItemLocally() already pulled the row
  // out of the DOM entirely — nothing left to reset. On failure, the row
  // is still there (still in `items`, still in the DOM), so bring it back
  // rather than leaving it looking gone while the item quietly isn't.
  if (!ok) snapBack(li);
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

  // A non-default sort/filter can change whether this item still belongs
  // in view, or where — e.g. "qty > 1" filtering it out, or "unpriced
  // first" moving it — which the single-row patch below can't express, so
  // fall back to rebuilding the (still local, still no network call) list.
  if (!isDefaultView()) {
    rerenderItemList(root, items);
    updateBadgeAndTotal(root, items);
    return;
  }

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

  // Same reasoning as applyQuantityLocally — a filter could hide the new
  // item entirely (e.g. filtered to someone else's items) or a sort could
  // mean it doesn't belong at the end, so let rerenderItemList figure out
  // where (or whether) it lands instead of always appending.
  if (!isDefaultView()) {
    rerenderItemList(root, items);
    updateBadgeAndTotal(root, items);
    return;
  }

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

  if (!isDefaultView()) {
    rerenderItemList(root, items);
    updateBadgeAndTotal(root, items);
    return;
  }

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
