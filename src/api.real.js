'use strict';
// Thin fetch wrappers for the three tailnet-mounted backends (see
// tailscale serve mounts in home-server/SPEC.md: /list, /matcher, /agent
// under one HTTPS origin). All state lives server-side — this file has no
// caching of its own beyond what the service worker does for images.
import { getBaseUrl } from './settings.js';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `${method} ${path} failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// --- list (willys-shopping-list-bot) ---
export const getList = () => request('/list/list');
export const addItem = (text, addedBy) => request('/list/items', { method: 'POST', body: { text, addedBy } });
export const removeItem = (id) => request(`/list/items/${id}/done`, { method: 'PATCH', body: { done: true } });
export const setQuantity = (id, quantity) => request(`/list/items/${id}/quantity`, { method: 'PATCH', body: { quantity } });
export const setChecked = (id, checked) => request(`/list/items/${id}/checked`, { method: 'PATCH', body: { checked } });
export const setTrigger = (triggerAt, setBy) => request('/list/list/trigger', { method: 'POST', body: { triggerAt, setBy } });
export const fakeSend = (sentBy) => request('/list/list/fake-send', { method: 'POST', body: { sentBy } });
export const resetList = () => request('/list/list/reset', { method: 'POST' });

// --- search / resolve (willys-item-matcher) ---
export const search = (q, limit = 15) => request(`/matcher/search?q=${encodeURIComponent(q)}&limit=${limit}`);
export const resolve = (query) => request('/matcher/resolve', { method: 'POST', body: { query } });
export const confirm = (resolutionId, choice) => request('/matcher/confirm', { method: 'POST', body: { resolutionId, choice } });

// --- delivery times (willys-shopping-agent) ---
export const getDeliveryTimesWide = () => request('/agent/delivery-times/wide');
export const chooseDeliveryTime = (slot) => request('/agent/delivery-times/choose', { method: 'POST', body: slot });

async function healthCheckService(path, serviceName) {
  try {
    const res = await fetch(`${getBaseUrl()}${path}`);
    if (!res.ok) {
      return { service: serviceName, ok: false, kind: 'error', detail: `HTTP ${res.status} ${res.statusText}` };
    }
    return { service: serviceName, ok: true, kind: 'ok', detail: null };
  } catch (err) {
    // TypeError from fetch means network-level failure (DNS, CORS, Tailscale unreachable, etc.)
    if (err instanceof TypeError) {
      return { service: serviceName, ok: false, kind: 'unreachable', detail: 'Cannot reach host — check URL, Tailscale connection, and network access' };
    }
    return { service: serviceName, ok: false, kind: 'error', detail: err.message };
  }
}

export async function healthCheck() {
  const results = await Promise.all([
    healthCheckService('/list/health', 'list'),
    healthCheckService('/matcher/health', 'matcher'),
    healthCheckService('/agent/health', 'agent'),
  ]);
  return results;
}
