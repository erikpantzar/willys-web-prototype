'use strict';
import * as api from '../api.js';
import { parseQuantity, formatProduct } from '../format.js';
import { pixelLoaderHtml } from '../loader.js';
import { showToast } from '../toast.js';
import { recordAction, performUndo } from '../undo.js';
import { announce } from '../announce.js';

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 15;

export function renderSearch(root) {
  root.innerHTML = `
    <div class="hero hero-search">
      <div class="hero-title">Find Groceries</div>
      <div class="hero-subtitle">Search our shelves and add what you need</div>
      <form id="search-form" class="hero-search-box">
        <svg width="18" height="18" viewBox="0 0 18 18" style="flex-shrink:0"><circle cx="8" cy="8" r="6" fill="none" stroke="var(--search-pill-fg)" stroke-width="2"></circle><line x1="12.2" y1="12.2" x2="16.5" y2="16.5" stroke="var(--search-pill-fg)" stroke-width="2" stroke-linecap="round"></line></svg>
        <input id="search-input" type="text" placeholder="Search products… e.g. 2 mjölk" autocomplete="off" />
      </form>
    </div>
    <div class="view-body">
    <div id="search-results" class="results-grid"></div>
    </div>
  `;

  const input = root.querySelector('#search-input');
  const resultsEl = root.querySelector('#search-results');
  let debounceTimer;
  let requestSeq = 0;
  let currentResolution = null; // Store the latest resolve() result

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const raw = input.value.trim();
    if (!raw) {
      resultsEl.innerHTML = '';
      currentResolution = null;
      return;
    }
    debounceTimer = setTimeout(() => runSearch(raw), DEBOUNCE_MS);
  });

  root.querySelector('#search-form').addEventListener('submit', (e) => e.preventDefault());

  async function runSearch(raw) {
    const seq = ++requestSeq;
    const { text: query, quantity } = parseQuantity(raw);
    resultsEl.innerHTML = pixelLoaderHtml('Searching…');
    let body;
    try {
      // Call resolve() instead of search() to get a persisted resolution.
      // This avoids the race condition where calling resolve() again on click
      // could match a different product if the catalog changed in between.
      // resolve() returns candidates with the same fields as search(), so we
      // can render the grid identically and use the stored rank in confirm().
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
      announce(`No results for "${query}"`);
      return;
    }
    // Store the resolution for use in addFromSearch()
    currentResolution = body;

    const confirmedUrl = body.confirmedUrl || null;
    resultsEl.innerHTML = candidates.map((c, i) => resultCard(c, i, confirmedUrl)).join('');
    announce(`Found ${candidates.length} result${candidates.length === 1 ? '' : 's'} for "${query}"`);
    resultsEl.querySelectorAll('[data-pick]').forEach((card, i) => {
      card.addEventListener('click', () => addFromSearch(candidates[i], quantity, card));
    });
  }

  async function addFromSearch(candidate, quantity, card) {
    const who = localStorage.getItem('willys.who');
    if (!who) return showToast('Set your name on the List tab first.');
    if (!currentResolution) return showToast('Search result expired — try again.');
    card.classList.add('picking');
    try {
      // Call confirm() directly with the rank from the original resolve() response.
      // This eliminates the second resolve() call and prevents the race condition
      // where re-resolving could match a different product if the catalog changed.
      const confirmed = await api.confirm(currentResolution.resolutionId, candidate.rank);
      const added = await api.addItem(formatProduct(confirmed, quantity), who);
      recordAction({ type: 'add', itemId: added.id, text: added.text, who });
      card.classList.remove('picking');
      card.classList.add('added');
      card.querySelector('.result-status').textContent = `Added "${added.text}" ✓`;
      announce(`Added ${added.text}`);
      showToast(`Added "${added.text}"`, {
        type: 'success',
        actionLabel: 'Undo',
        onAction: async () => {
          await performUndo();
          // Refresh search results to reflect the undo
          resultsEl.innerHTML = '';
          input.value = '';
        },
      });
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
  return `
    <div class="result-card${confirmedClass}" data-pick="${i}">
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
