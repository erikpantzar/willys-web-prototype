'use strict';
import * as api from '../api.js';
import { showToast } from '../toast.js';
import { confirmDialog } from '../dialog.js';
import { getIdentity } from '../who.js';
import { playAddSound, vibrateAdd } from '../sound.js';
import { extractPrice, addToListSummary } from '../format.js';
import { updateCartBadge } from './list.js';
import { saveListAsCart, CARTS_UNSUPPORTED_MESSAGE, isCartsUnsupported } from '../saveCart.js';
import { createCartCard } from '../components/CartCard.js';
import emptyStateStyles from '../components/EmptyState.module.css';
import departmentGroupStyles from '../components/DepartmentGroup.module.css';
import cartCardStyles from '../components/CartCard.module.css';
import { icon } from '../icons.js';

function shell(inner) {
  return `
    <div class="view-body view-body-top">
      <h2 class="carts-heading">Carts</h2>
      ${inner}
    </div>
  `;
}

export async function renderCarts(root) {
  root.innerHTML = shell(`<div class="loading">Loading carts…</div>`);

  let carts, listItems;
  try {
    [carts, { items: listItems }] = await Promise.all([api.getCarts(), api.getList()]);
  } catch (err) {
    if (isCartsUnsupported(err)) {
      root.innerHTML = shell(`<div class="empty">${escapeHtml(CARTS_UNSUPPORTED_MESSAGE)}</div>`);
    } else {
      root.innerHTML = shell(`<div class="error">Could not load carts: ${escapeHtml(err.message)}</div>`);
    }
    return;
  }

  if (carts.length === 0) {
    renderEmpty(root, listItems.length);
    return;
  }

  const listTexts = new Set(listItems.map((i) => i.text.toLowerCase()));
  const isOnList = (text) => listTexts.has(text.toLowerCase());
  const cards = new Map();
  let openCard = null;

  async function refreshList() {
    try {
      const { items } = await api.getList();
      listTexts.clear();
      for (const i of items) listTexts.add(i.text.toLowerCase());
      const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
      const pricedTotal = items.reduce((sum, i) => {
        const price = extractPrice(i.text);
        return price === null ? sum : sum + price * (i.quantity || 1);
      }, 0);
      updateCartBadge(totalQty, pricedTotal);
    } catch {}
  }

  function celebrateAdd(addedCount) {
    if (addedCount === 0) return;
    playAddSound();
    vibrateAdd();
  }

  async function onToggle(cart) {
    const card = cards.get(cart.id);
    if (openCard === card) {
      card.setExpanded(false);
      openCard = null;
      return;
    }
    openCard?.setExpanded(false);
    openCard = card;
    card.setLoading();
    card.setExpanded(true);
    try {
      const full = await api.getCart(cart.id);
      if (openCard !== card) return;
      card.setItems(full.items, isOnList);
    } catch (err) {
      showToast(`Could not load cart: ${err.message}`);
    }
  }

  async function onAddAll(cart, items) {
    const card = cards.get(cart.id);
    try {
      const { added, skipped } = await api.addCartToList(cart.id, getIdentity());
      card.markAdded(items.map((i) => i.id));
      celebrateAdd(added.length);
      showToast(addToListSummary(added.length, skipped.length), { type: 'success' });
      await refreshList();
    } catch (err) {
      showToast(`Could not add: ${err.message}`);
    }
  }

  async function onAddItem(cart, itemId) {
    const card = cards.get(cart.id);
    try {
      const { added, skipped } = await api.addCartToList(cart.id, getIdentity(), [itemId]);
      card.markAdded([itemId]);
      if (added.length > 0) {
        celebrateAdd(added.length);
        showToast(`Added "${added[0].text}"`, { type: 'success' });
      } else if (skipped.length > 0) {
        showToast('Already on the list', { type: 'success' });
      }
      await refreshList();
    } catch (err) {
      showToast(`Could not add: ${err.message}`);
    }
  }

  async function onRename(cart, name) {
    try {
      return await api.renameCart(cart.id, name);
    } catch (err) {
      showToast(`Could not rename: ${err.message}`);
      return null;
    }
  }

  async function onDelete(cart) {
    const ok = await confirmDialog(`Delete this cart? Can't be undone.`, { confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await api.deleteCart(cart.id);
    } catch (err) {
      showToast(`Could not delete: ${err.message}`);
      return;
    }
    const card = cards.get(cart.id);
    if (openCard === card) openCard = null;
    cards.delete(cart.id);
    const section = card.el.closest('section');
    card.el.remove();
    if (section && !section.querySelector('li')) section.remove();
    showToast('Cart deleted', { type: 'success' });
    if (cards.size === 0) renderEmpty(root, listTexts.size);
  }

  const handlers = { onToggle, onAddAll, onAddItem, onRename, onDelete };

  function section(title, kind) {
    const group = carts.filter((c) => c.kind === kind);
    if (group.length === 0) return null;
    const el = document.createElement('section');
    el.className = departmentGroupStyles['department-group'];
    el.innerHTML = `<h3>${title}</h3><ul class="${cartCardStyles.list}"></ul>`;
    const ul = el.querySelector('ul');
    for (const cart of group) {
      const card = createCartCard(cart, handlers);
      cards.set(cart.id, card);
      ul.appendChild(card.el);
    }
    return el;
  }

  root.innerHTML = shell('');
  const body = root.querySelector('.view-body');
  for (const s of [section('Saved', 'saved'), section('Sent', 'sent')]) {
    if (s) body.appendChild(s);
  }
}

function renderEmpty(root, listCount) {
  const canSave = listCount > 0;
  root.innerHTML = shell(`
    <div class="${emptyStateStyles['empty-state']}">
      <div class="${emptyStateStyles['empty-state-icon']}" style="background: var(--carts-pill-bg); color: var(--carts-pill-fg)">
        ${icon('cart', { size: 32 })}
      </div>
      <div class="${emptyStateStyles['empty-state-title']}">No carts yet</div>
      <div class="${emptyStateStyles['empty-state-subtitle']}">Save your current list as a cart, or send a list — sent lists show up here.</div>
      <button type="button" id="save-current-list" class="carts-empty-save" ${canSave ? '' : 'disabled'}>Save current list</button>
      ${canSave ? '' : `<div class="muted" style="margin-top: 0.5rem">Your list is empty — add something first.</div>`}
    </div>
  `);
  root.querySelector('#save-current-list').addEventListener('click', async () => {
    const saved = await saveListAsCart();
    if (saved) renderCarts(root);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
