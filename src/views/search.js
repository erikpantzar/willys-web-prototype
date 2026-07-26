'use strict';
import * as api from '../api.js';
import { parseQuantity, formatProduct } from '../format.js';
import { pixelLoaderHtml } from '../loader.js';

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 15;

export function renderSearch(root) {
  root.innerHTML = `
    <form id="search-form" class="add-row">
      <input id="search-input" type="text" placeholder="Search products… e.g. 2 mjölk" autocomplete="off" />
    </form>
    <div id="search-results" class="results-grid"></div>
  `;

  const input = root.querySelector('#search-input');
  const resultsEl = root.querySelector('#search-results');
  let debounceTimer;
  let requestSeq = 0;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const raw = input.value.trim();
    if (!raw) {
      resultsEl.innerHTML = '';
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
      body = await api.search(query, RESULT_LIMIT);
    } catch (err) {
      if (seq === requestSeq) resultsEl.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
      return;
    }
    if (seq !== requestSeq) return; // a newer keystroke's search already landed

    const candidates = body.candidates || [];
    if (candidates.length === 0) {
      resultsEl.innerHTML = `<div class="empty">No matches for "${escapeHtml(query)}".</div>`;
      return;
    }
    resultsEl.innerHTML = candidates.map((c, i) => resultCard(c, i)).join('');
    resultsEl.querySelectorAll('[data-pick]').forEach((card, i) => {
      card.addEventListener('click', () => addFromSearch(query, candidates[i], quantity, card));
    });
  }

  async function addFromSearch(query, candidate, quantity, card) {
    const who = localStorage.getItem('willys.who');
    if (!who) return alert('Set your name on the List tab first.');
    card.classList.add('picking');
    try {
      // /search doesn't persist a resolution (see item-matcher/src/server.js) —
      // /resolve does, and re-running it for the same query hits the same
      // catalog/cache path deterministically, so this reuses /resolve+/confirm
      // (the bot's own "actually add this" path) instead of duplicating that
      // logic here.
      const resolution = await api.resolve(query);
      const match = (resolution.candidates || []).find((c) => (c.url && c.url === candidate.url) || c.name === candidate.text || c.name === candidate.name);
      if (!match) throw new Error('That result changed between search and add — try again.');
      const confirmed = await api.confirm(resolution.resolutionId, match.rank);
      const added = await api.addItem(formatProduct(confirmed, quantity), who);
      card.classList.remove('picking');
      card.classList.add('added');
      card.querySelector('.result-status').textContent = `Added "${added.text}" ✓`;
    } catch (err) {
      card.classList.remove('picking');
      alert(`Could not add: ${err.message}`);
    }
  }
}

function resultCard(c, i) {
  const size = c.size ? `<div class="result-size">${escapeHtml(c.size)}</div>` : '';
  const price = c.price ? `<div class="result-price">${escapeHtml(c.price)} kr${c.priceUnit === 'kg' ? '/kg' : ''}</div>` : '';
  const img = c.imageUrl
    ? `<img class="result-img" src="${escapeHtml(c.imageUrl)}" loading="lazy" alt="" />`
    : `<div class="result-img placeholder"></div>`;
  return `
    <div class="result-card" data-pick="${i}">
      ${img}
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
