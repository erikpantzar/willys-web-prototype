'use strict';

const dot = (cx, cy, r = 1.4) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;

const PATHS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  pencil: '<path d="M15.2 4.8a2.3 2.3 0 013.3 3.3L8.5 18.1 4 19.3l1.2-4.5z"/><path d="M13.5 6.5l3.3 3.3"/>',
  trash: '<path d="M4 7h16M10 7V5.5A1.5 1.5 0 0111.5 4h1A1.5 1.5 0 0114 5.5V7M6 7l.9 12a2 2 0 002 1.8h6.2a2 2 0 002-1.8L18 7"/><path d="M10 11v5M14 11v5"/>',
  'chevron-down': '<path d="M6 9.5l6 6 6-6"/>',
  'chevron-up': '<path d="M6 14.5l6-6 6 6"/>',
  'chevron-right': '<path d="M9.5 6l6 6-6 6"/>',
  sort: '<path d="M7.5 4.5v15M7.5 19.5l-3-3M7.5 19.5l3-3M16.5 19.5v-15M16.5 4.5l-3 3M16.5 4.5l3 3"/>',
  filter: '<path d="M4 6.5h16M7 12h10M10 17.5h4"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  warning: '<path d="M10.3 4.7L3.3 17a2 2 0 001.7 3h14a2 2 0 001.7-3l-7-12.3a2 2 0 00-3.4 0z"/><path d="M12 9.5v4"/>' + dot(12, 16.8, 1.1),
  cart: '<path d="M3 4h2l2.3 10.6a2 2 0 002 1.4h8.4a2 2 0 002-1.4L21 8H6"/>' + dot(9.5, 20) + dot(17, 20),
  'save-cart': '<path d="M3 4h2l2.3 10.6a2 2 0 002 1.4h8.4a2 2 0 002-1.4L21 8H6"/><path d="M13.5 9.5v4M11.5 11.5h4"/>' + dot(9.5, 20) + dot(17, 20),
  basket: '<path d="M4 9.5h16l-1.7 8.6a2 2 0 01-2 1.6H7.7a2 2 0 01-2-1.6z"/><path d="M8 9.5a4 4 0 018 0"/><path d="M9 13.5v3M12 13.5v3M15 13.5v3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>' + dot(8, 14.8, 1.1) + dot(12, 14.8, 1.1) + dot(16, 14.8, 1.1),
  share: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6 11.5v6.5a2.5 2.5 0 002.5 2.5h7a2.5 2.5 0 002.5-2.5v-6.5"/>',
  undo: '<path d="M8.5 14L4 9.5 8.5 5"/><path d="M4 9.5h10a5.5 5.5 0 010 11H10"/>',
  refresh: '<path d="M4.5 12a7.5 7.5 0 0113-5.2M19.5 12a7.5 7.5 0 01-13 5.2"/><path d="M18 3.5v4h-4M6 20.5v-4h4"/>',
  truck: '<path d="M3 8a2 2 0 012-2h9v9.5H3z"/><path d="M14 9h4a2 2 0 011.6.8l1.6 2.1a2 2 0 01.4 1.2v2.4h-7.6"/>' + dot(7, 18, 2) + dot(17, 18, 2),
  zap: '<path d="M13 3L5 13.5h6l-1 7.5 8-10.5h-6z"/>',
  wifi: '<path d="M2.5 9C7.5 4 16.5 4 21.5 9"/><path d="M6 12.5c3.5-3.3 8.5-3.3 12 0"/><path d="M9.3 16c1.6-1.5 3.8-1.5 5.4 0"/>' + dot(12, 19.5),
  list: '<path d="M9 6h11M9 12h11M9 18h11"/>' + dot(4.5, 6, 1.5) + dot(4.5, 12, 1.5) + dot(4.5, 18, 1.5),
  'external-link': '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13.5V18a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4.5"/>',
};

export const ICON_NAMES = Object.keys(PATHS);

export function icon(name, { size = 20, strokeWidth = 2, label } = {}) {
  const paths = PATHS[name];
  if (!paths) throw new Error(`Unknown icon: ${name}`);
  const a11y = label ? `role="img" aria-label="${escapeAttr(label)}"` : 'aria-hidden="true"';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${paths}</svg>`;
}

export function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, { size: Number(el.dataset.iconSize) || 18 });
  });
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
