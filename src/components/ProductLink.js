'use strict';
import styles from './ProductLink.module.css';
import { icon } from '../icons.js';

const WILLYS_ORIGIN = 'https://www.willys.se';

export function productUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return null;
  return WILLYS_ORIGIN + path;
}

export function productLinkHtml(path, { label, className = '' } = {}) {
  const href = productUrl(path);
  if (!href) return '';
  const aria = `Open ${label || 'product'} on willys.se`;
  return `<a class="${`${styles.link} ${className}`.trim()}" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer" data-product-link title="${escapeAttr(aria)}" aria-label="${escapeAttr(aria)}">${icon('external-link', { size: 16 })}</a>`;
}

export function wireProductLinks(root) {
  root.querySelectorAll('[data-product-link]').forEach((a) => {
    a.addEventListener('click', (e) => e.stopPropagation());
    a.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  });
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
