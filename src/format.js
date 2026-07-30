'use strict';
// Small pure helpers ported from willys-shopping-list-bot's bot/handlers.js
// and src/store.js — same behavior, re-implemented client-side (no shared
// npm package boundary between a Node service and a browser bundle).

const QUANTITY_LEADING_RE = /^(\d+)\s+(.+)$/;
const QUANTITY_TRAILING_RE = /^(.+?)\s*[x×]\s*(\d+)$/i;

// Mirrors store.js's parseQuantity — "2 gurka" / "gurka x2" -> { text, quantity }.
export function parseQuantity(text) {
  let m = text.match(QUANTITY_LEADING_RE);
  if (m) return { text: m[2].trim(), quantity: parseInt(m[1], 10) };
  m = text.match(QUANTITY_TRAILING_RE);
  if (m) return { text: m[1].trim(), quantity: parseInt(m[2], 10) };
  return { text, quantity: 1 };
}

// Splits on commas, newlines, or a standalone "and"/"och" — mirrors
// handlers.js's splitParts.
export function splitParts(text) {
  return text
    .split(/[,\n]|\s+(?:and|och)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Mirrors handlers.js's formatProduct — what gets stored as the list
// item's text (the list API has no separate price/size columns).
export function formatProduct({ name, price, priceUnit, size }, quantity = 1) {
  const sizePart = size ? ` (${size})` : '';
  const pricePart = price ? ` — ${price} kr${priceUnit === 'kg' ? '/kg' : ''}` : '';
  const base = `${name}${sizePart}${pricePart}`;
  return quantity > 1 ? `${quantity} ${base}` : base;
}

// Mirrors handlers.js's PRICE_SUFFIX_RE/extractPrice — pulls the price back
// out of a list item's stored text for the running total.
const PRICE_SUFFIX_RE = /—\s*(\d+(?:[.,]\d+)?)\s*kr(?:\/\w+)?$/;
export function extractPrice(text) {
  const m = text.match(PRICE_SUFFIX_RE);
  return m ? parseFloat(m[1].replace(',', '.')) : null;
}

export function isVariableWeight(text) {
  return /priced \/kg/.test(text);
}

export function formatSum(total) {
  return total.toFixed(2).replace('.', ',');
}

// Buckets items by `department_name` (see willys-item-matcher#1 — not
// populated on every item yet, only ones confirmed via the catalog path
// after that ships) into an "Övrigt" catch-all for anything without one,
// so a partially-migrated list never hides or breaks on missing data.
// Groups sort alphabetically (Swedish collation) with Övrigt always last —
// Willys' own site-menu order would be the ideal group order (see the
// issue), but that ordering isn't exposed to this client by any endpoint
// today, so this is the pragmatic stand-in until it is. Items keep their
// existing relative order within each group.
const UNCATEGORIZED = 'Övrigt';
export function groupByDepartment(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.department_name || UNCATEGORIZED;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const names = [...groups.keys()].filter((k) => k !== UNCATEGORIZED).sort((a, b) => a.localeCompare(b, 'sv'));
  if (groups.has(UNCATEGORIZED)) names.push(UNCATEGORIZED);
  return names.map((name) => ({ name, items: groups.get(name) }));
}
