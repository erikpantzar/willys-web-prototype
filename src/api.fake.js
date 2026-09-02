'use strict';
// In-memory stand-in for api.js's real fetch calls, for design/interaction
// review without a live tailnet connection — see settings.js's demo flag
// and api.js's dispatch at the bottom of this file's sibling. Mirrors the
// real module's exported function signatures exactly, mutating seeded
// state instead of hitting the network. A small artificial delay on every
// call so loading states (including the 8-bit loader) are actually visible
// during review, not just a flash.
import { CATALOG, seedListItems, seedListState, seedCarts, seedDeliveryAlternatives, demoConfirmedByQuery } from './fakeData.js';

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

let items = seedListItems();
let state = seedListState();
let nextId = Math.max(...items.map((i) => i.id)) + 1;
let nextResolutionId = 1;
const resolutions = new Map();
let carts = seedCarts();
let nextCartId = Math.max(...carts.map((c) => c.id)) + 1;
let nextCartItemId = Math.max(...carts.flatMap((c) => c.items.map((i) => i.id))) + 1;

function activeItems() {
  return items.filter((i) => !i.done);
}

// --- list ---
export async function getList() {
  await delay();
  return { state, items: activeItems() };
}

function newListItem(text, addedBy, { quantity = 1, productUrl = null } = {}) {
  const item = { id: nextId++, text, added_by: addedBy, added_at: new Date().toISOString(), done: 0, checked: 0, quantity, product_url: productUrl };
  items.push(item);
  return item;
}

export async function addItem(text, addedBy, productUrl) {
  await delay();
  return newListItem(text, addedBy, { productUrl });
}

export async function removeItem(id) {
  await delay(200);
  const item = items.find((i) => i.id === id);
  if (item) item.done = 1;
  return item;
}

export async function setQuantity(id, quantity) {
  await delay(200);
  const item = items.find((i) => i.id === id);
  if (item) item.quantity = quantity;
  return item;
}

export async function setChecked(id, checked) {
  await delay(200);
  const item = items.find((i) => i.id === id);
  if (item) item.checked = checked ? 1 : 0;
  return item;
}

export async function setTrigger(triggerAt, setBy) {
  await delay();
  state = { ...state, trigger_at: triggerAt, trigger_set_by: setBy, trigger_set_at: new Date().toISOString() };
  return state;
}

export async function fakeSend(sentBy) {
  await delay();
  if (activeItems().length > 0) snapshotCart(null, 'sent', sentBy);
  state = { ...state, status: 'sent', sent_at: new Date().toISOString(), sent_by: sentBy };
  return state;
}

export async function resetList() {
  await delay();
  items = [];
  state = { id: 1, trigger_at: null, trigger_set_by: null, trigger_set_at: null, status: 'open', sent_at: null, sent_by: null };
  return state;
}

// --- carts ---
function cartSummary(cart) {
  const { items: cartItems, ...rest } = cart;
  return { ...rest, item_count: cartItems.length };
}

function snapshotCart(name, kind, createdBy) {
  const cart = {
    id: nextCartId++,
    name,
    kind,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    items: activeItems().map((i, position) => ({
      id: nextCartItemId++,
      position,
      text: i.text,
      quantity: i.quantity,
      product_url: i.product_url || null,
      department_name: i.department_name || null,
      department_code: i.department_code || null,
      added_by: i.added_by,
    })),
  };
  carts.push(cart);
  return cart;
}

function findCart(id) {
  const cart = carts.find((c) => c.id === Number(id));
  if (!cart) throw new Error('cart not found');
  return cart;
}

export async function getCarts() {
  await delay();
  return carts
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(cartSummary);
}

export async function getCart(id) {
  await delay();
  const cart = findCart(id);
  return { ...cartSummary(cart), items: cart.items.slice() };
}

export async function saveCart(name, savedBy) {
  await delay();
  if (activeItems().length === 0) throw new Error('list is empty');
  const cart = snapshotCart(name || null, 'saved', savedBy);
  return cartSummary(cart);
}

export async function renameCart(id, name) {
  await delay(200);
  const cart = findCart(id);
  cart.name = name;
  return cartSummary(cart);
}

export async function deleteCart(id) {
  await delay(200);
  findCart(id);
  carts = carts.filter((c) => c.id !== Number(id));
  return null;
}

export async function addCartToList(id, addedBy, itemIds) {
  await delay();
  const cart = findCart(id);
  const wanted = itemIds ? cart.items.filter((i) => itemIds.includes(i.id)) : cart.items;
  const added = [];
  const skipped = [];
  for (const cartItem of wanted) {
    const existing = activeItems().find((i) => i.text.toLowerCase() === cartItem.text.toLowerCase());
    if (existing) {
      skipped.push({ cartItemId: cartItem.id, existingItemId: existing.id });
      continue;
    }
    added.push(newListItem(cartItem.text, addedBy, { quantity: cartItem.quantity, productUrl: cartItem.product_url }));
  }
  return { added, skipped };
}

// --- search / resolve / confirm ---
function rank(query) {
  const q = query.toLowerCase();
  return CATALOG.filter((c) => c.name.toLowerCase().includes(q) || q.split(/\s+/).some((w) => w.length > 2 && c.name.toLowerCase().includes(w)))
    .map((c, i) => ({ ...c, text: c.name, score: 10 - i, rank: i + 1 }));
}

export async function search(q, limit = 15) {
  await delay(400);
  const candidates = rank(q).slice(0, limit);
  // The real backend (/matcher/search) should return confirmedUrl (or a per-candidate
  // confirmed flag) to mark which candidate matches a previously-resolved query.
  // Demo data: lookup the confirmed URL for this normalized query.
  const confirmedUrl = demoConfirmedByQuery.get(q.toLowerCase().trim()) || null;
  return { query: q, source: candidates.length ? 'catalog' : 'none', candidates, confirmedUrl };
}

export async function resolve(query) {
  await delay(400);
  const candidates = rank(query);
  const resolutionId = nextResolutionId++;
  resolutions.set(resolutionId, { query, candidates });
  // See the same note on search() above — the real /matcher/resolve endpoint
  // should return this too so the confirmed-badge (issue #1) still works now
  // that search.js calls resolve() instead of search() (issue #5).
  const confirmedUrl = demoConfirmedByQuery.get(query.toLowerCase().trim()) || null;
  return { cached: false, resolutionId, query, candidates, confirmedUrl, liveAvailable: true };
}

export async function confirm(resolutionId, choice) {
  await delay(200);
  const resolution = resolutions.get(resolutionId);
  const candidate = resolution?.candidates.find((c) => c.rank === choice);
  if (!candidate) throw new Error('no candidate at that rank (demo data)');
  return { name: candidate.name, url: candidate.url, price: candidate.price, priceUnit: candidate.priceUnit, size: candidate.size, imageUrl: candidate.imageUrl };
}

// Demo mode has no real backend/GitHub token to actually file anything
// against — simulate success so the button/toast still behaves the same
// way a real report would, without pretending to have created a real
// issue anyone could click through to.
export async function reportProductIssue() {
  await delay(300);
  return { url: null };
}

// --- delivery ---
export async function getDeliveryTimesWide() {
  await delay(1800); // the real call launches a headless browser — slow enough that the loader matters
  return { alternatives: seedDeliveryAlternatives() };
}

export async function chooseDeliveryTime(slot) {
  await delay();
  return { ...slot, chosenAt: new Date().toISOString() };
}

export async function healthCheck() {
  await delay(150);
  return [
    { service: 'list', ok: true, kind: 'ok', detail: null },
    { service: 'matcher', ok: true, kind: 'ok', detail: null },
    { service: 'agent', ok: true, kind: 'ok', detail: null },
  ];
}
