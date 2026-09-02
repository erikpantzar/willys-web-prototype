'use strict';
import styles from './CartCard.module.css';
import itemRowStyles from './ItemRow.module.css';
import { personaBadgeHtml, personaFor } from '../personas.js';
import { cartTitle } from '../format.js';
import { icon } from '../icons.js';

export function createCartCard(cart, { onToggle, onAddAll, onAddItem, onRename, onDelete }) {
  const el = document.createElement('li');
  el.className = styles.card;
  el.dataset.cartId = String(cart.id);
  let current = { ...cart };
  let items = [];
  let onList = () => false;

  function subtitleText() {
    const count = current.item_count;
    return `${count} item${count === 1 ? '' : 's'} · by ${personaFor(current.created_by).name}`;
  }

  el.innerHTML = `
    ${personaBadgeHtml(current.created_by)}
    <button type="button" class="${styles.header}" data-cart-toggle aria-expanded="false">
      <div class="${styles['title-wrap']}">
        <div class="${styles.title}">${escapeHtml(cartTitle(current))}</div>
        <div class="${styles.subtitle}">${escapeHtml(subtitleText())}</div>
      </div>
      <span class="${styles.chevron}">${icon('chevron-down', { size: 14, strokeWidth: 2.5 })}</span>
    </button>
    <div class="${styles.body}">
      <div class="${styles['body-inner']}">
        <div class="${styles['body-content']}"></div>
      </div>
    </div>
  `;

  const header = el.querySelector('[data-cart-toggle]');
  const titleEl = el.querySelector(`.${styles.title}`);
  const subtitleEl = el.querySelector(`.${styles.subtitle}`);
  const content = el.querySelector(`.${styles['body-content']}`);

  header.addEventListener('click', () => onToggle(current));

  function setExpanded(expanded) {
    el.classList.toggle(styles.open, expanded);
    header.setAttribute('aria-expanded', String(expanded));
  }

  function setLoading() {
    content.innerHTML = `<div class="${styles.loading}">Loading items…</div>`;
  }

  function itemRow(item) {
    const done = onList(item.text);
    return `
      <li class="${itemRowStyles['item-row']} item-row-readonly" data-cart-item="${item.id}">
        ${personaBadgeHtml(item.added_by)}
        <div class="${itemRowStyles['item-main']}">
          <div class="${itemRowStyles['item-text']}">${escapeHtml(item.text)}</div>
        </div>
        <div class="item-qty-readonly">×${item.quantity}</div>
        <button type="button" class="${styles['item-add']}${done ? ` ${styles.done}` : ''}" data-add-item="${item.id}" ${done ? 'disabled' : ''} aria-label="${done ? 'Already on the list' : 'Add to list'}">${done ? icon('check', { size: 16, strokeWidth: 2.5 }) : icon('plus', { size: 18, strokeWidth: 2.5 })}</button>
      </li>
    `;
  }

  function setItems(nextItems, isOnList) {
    items = nextItems;
    onList = isOnList;
    content.innerHTML = `
      <div class="${styles.actions}">
        <button type="button" class="${styles['add-all']}" data-add-all>Add all to list</button>
        <button type="button" class="${styles['icon-btn']}" data-rename title="Rename cart" aria-label="Rename cart">${icon('pencil', { size: 18 })}</button>
        <button type="button" class="${styles['icon-btn']} ${styles.danger}" data-delete title="Delete cart" aria-label="Delete cart">${icon('trash', { size: 18 })}</button>
      </div>
      <ul class="${styles.items}">${items.map(itemRow).join('')}</ul>
    `;

    const addAllBtn = content.querySelector('[data-add-all]');
    addAllBtn.addEventListener('click', async () => {
      addAllBtn.disabled = true;
      try {
        await onAddAll(current, items);
      } finally {
        addAllBtn.disabled = false;
      }
    });
    content.querySelector('[data-rename]').addEventListener('click', startRename);
    content.querySelector('[data-delete]').addEventListener('click', () => onDelete(current));
    content.querySelectorAll('[data-add-item]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await onAddItem(current, Number(btn.dataset.addItem));
        } finally {
          if (!btn.classList.contains(styles.done)) btn.disabled = false;
        }
      });
    });
  }

  function markAdded(itemIds) {
    for (const id of itemIds) {
      const btn = content.querySelector(`[data-add-item="${id}"]`);
      if (!btn || btn.classList.contains(styles.done)) continue;
      btn.innerHTML = icon('check', { size: 16, strokeWidth: 2.5 });
      btn.disabled = true;
      btn.setAttribute('aria-label', 'Already on the list');
      btn.classList.add(styles.done, styles.pop);
    }
  }

  function startRename() {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = styles['rename-input'];
    input.value = current.name || '';
    input.placeholder = cartTitle({ ...current, name: null });
    input.setAttribute('aria-label', 'Cart name');
    titleEl.replaceWith(input);
    input.focus();
    input.select();

    let committed = false;
    async function commit() {
      if (committed) return;
      committed = true;
      const next = input.value.trim();
      input.replaceWith(titleEl);
      if (next && next !== (current.name || '')) {
        const renamed = await onRename(current, next);
        if (renamed) {
          current = { ...current, ...renamed };
          titleEl.textContent = cartTitle(current);
        }
      }
    }
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        committed = true;
        input.replaceWith(titleEl);
      }
    });
    input.addEventListener('blur', commit);
    input.addEventListener('click', (e) => e.stopPropagation());
  }

  function setCount(count) {
    current = { ...current, item_count: count };
    subtitleEl.textContent = subtitleText();
  }

  return { el, cart: () => current, setExpanded, setLoading, setItems, markAdded, setCount };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
