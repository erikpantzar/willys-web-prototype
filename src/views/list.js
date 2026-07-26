'use strict';
import * as api from '../api.js';
import { extractPrice, isVariableWeight, formatSum, splitParts } from '../format.js';
import { showToast } from '../toast.js';
import { confirmDialog } from '../dialog.js';
import { getWho, setWho } from '../who.js';
import { recordAction, performUndo } from '../undo.js';
import { announce } from '../announce.js';

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
    <div class="hero hero-list">
      <div class="hero-title">Our List</div>
      <div class="hero-subtitle">${items.length === 0 ? 'Nothing on the list yet' : `${totalQty} item${totalQty === 1 ? '' : 's'} to shop for`}</div>
    </div>

    <div class="view-body">
    <div class="who-row">
      <label>Your name <input id="who" type="text" value="${escapeHtml(getWho())}" placeholder="e.g. Erik" /></label>
    </div>

    <form id="add-form" class="add-row">
      <input id="add-input" type="text" placeholder="Add items… (comma-separated)" autocomplete="off" />
      <button type="submit">Add</button>
    </form>

    <ul class="item-list">
      ${items.length === 0 ? emptyState() : items.map(itemRow).join('')}
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

  root.querySelector('#add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = root.querySelector('#add-input');
    const text = input.value.trim();
    const who = getWho();
    if (!text) return;
    if (!who) return showToast('Enter your name first.');
    input.disabled = true;
    try {
      const parts = splitParts(text);
      let lastAddedItem = null;
      for (const part of parts) {
        lastAddedItem = await api.addItem(part, who);
      }
      const itemCount = parts.length;
      announce(itemCount === 1 ? `Added ${parts[0]}` : `Added ${itemCount} items`);
      // Record undo for the last item added (or only item if single)
      if (lastAddedItem) {
        recordAction({ type: 'add', itemId: lastAddedItem.id, text: lastAddedItem.text, who });
        renderList(root);
        root.querySelector('#add-input')?.focus();
        showToast(`Added "${lastAddedItem.text}"`, {
          type: 'success',
          actionLabel: 'Undo',
          onAction: async () => {
            await performUndo();
            renderList(root);
          },
        });
      } else {
        renderList(root);
      }
    } catch (err) {
      showToast(`Could not add: ${err.message}`);
      input.disabled = false;
    }
  });

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
        announce(`Removed ${itemText}`);
        renderList(root);
        root.querySelector('#add-input')?.focus();
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
        announce(`${itemText} quantity changed to ${next}`);
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
      <div class="empty-state-subtitle">Search for groceries to start adding!</div>
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
      <button class="remove-btn" data-remove="${item.id}" aria-label="Remove">✕</button>
    </li>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
