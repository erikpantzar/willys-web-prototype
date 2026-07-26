'use strict';
import * as api from '../api.js';
import { extractPrice, isVariableWeight, formatSum, splitParts } from '../format.js';
import { showToast } from '../toast.js';
import { confirmDialog } from '../dialog.js';

const WHO_KEY = 'willys.who';
function getWho() {
  return localStorage.getItem(WHO_KEY) || '';
}
function setWho(name) {
  localStorage.setItem(WHO_KEY, name);
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

  root.innerHTML = `
    <div class="who-row">
      <label>Your name <input id="who" type="text" value="${escapeHtml(getWho())}" placeholder="e.g. Erik" /></label>
    </div>

    <form id="add-form" class="add-row">
      <input id="add-input" type="text" placeholder="Add items… (comma-separated)" autocomplete="off" />
      <button type="submit">Add</button>
    </form>

    <ul class="item-list">
      ${items.length === 0 ? '<li class="empty">List is empty.</li>' : items.map(itemRow).join('')}
    </ul>

    ${pricedTotal > 0 ? `
      <div class="total">
        Total: ${formatSum(pricedTotal)} kr
        ${missingPrice || anyVariable ? `<div class="note">${[missingPrice && 'some items have no price on file', anyVariable && 'some prices are per kg — weight varies'].filter(Boolean).join('; ')}</div>` : ''}
      </div>
    ` : ''}

    <div class="list-status">
      Status: ${state.status}${state.trigger_at ? ` · Trigger: ${new Date(state.trigger_at).toLocaleString()} (${state.trigger_set_by})` : ''}
    </div>

    <div class="list-actions">
      <button id="reset-btn" class="danger">Reset list</button>
    </div>
  `;

  root.querySelector('#who').addEventListener('change', (e) => setWho(e.target.value.trim()));

  root.querySelector('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = root.querySelector('#add-input');
    const text = input.value.trim();
    const who = getWho();
    if (!text) return;
    if (!who) return showToast('Enter your name first.');
    input.disabled = true;
    try {
      for (const part of splitParts(text)) {
        await api.addItem(part, who);
      }
      renderList(root);
    } catch (err) {
      showToast(`Could not add: ${err.message}`);
      input.disabled = false;
    }
  });

  root.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api.removeItem(Number(btn.dataset.remove));
        renderList(root);
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
      try {
        await api.setQuantity(id, next);
        renderList(root);
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
      <button class="remove-btn" data-remove="${item.id}" aria-label="Remove">✕</button>
    </li>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
