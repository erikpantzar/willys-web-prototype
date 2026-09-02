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

export function formatShortDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function cartTitle(cart) {
  if (cart.name) return cart.name;
  return `${cart.kind === 'sent' ? 'Sent' : 'Saved'} ${formatShortDate(cart.created_at)}`;
}

export function addToListSummary(addedCount, skippedCount) {
  const parts = [];
  if (addedCount > 0) parts.push(`Added ${addedCount}`);
  if (skippedCount > 0) parts.push(`${skippedCount} already on list`);
  return parts.length ? parts.join(' · ') : 'Nothing to add';
}
