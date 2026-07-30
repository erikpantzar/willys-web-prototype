'use strict';
// Known family members get a stable emoji + color pairing instead of just
// a name in small print — a bit of personality for a shared family list,
// and something the kids actually recognize as "theirs" on each item (see
// issue #30). Anyone else — a guest, a babysitter typing their name for
// the first time — still gets a persona, just one derived deterministically
// from their name (personaFor()'s fallback below) rather than left blank.
export const FAMILY_MEMBERS = [
  { name: 'Pappa', emoji: '🦸', color: 'oklch(48% 0.14 275)' },
  { name: 'Leia', emoji: '👑', color: 'oklch(60% 0.18 350)' },
  { name: 'Mila', emoji: '🦄', color: 'oklch(75% 0.15 85)' },
];

const GUEST_PERSONA = { name: 'Guest', emoji: '👤', color: 'oklch(55% 0.02 50)' };

// Deterministic (same name -> same look every time, no storage needed) but
// still varied, so a one-off guest name doesn't just default to the same
// generic icon every time.
const FALLBACK_EMOJIS = ['🐻', '🦊', '🐼', '🐸', '🐧', '🦁', '🐨', '🐰'];
const FALLBACK_COLORS = [
  'oklch(58% 0.14 15)',
  'oklch(58% 0.13 60)',
  'oklch(55% 0.13 200)',
  'oklch(58% 0.14 300)',
  'oklch(55% 0.12 130)',
];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export function personaFor(name) {
  const trimmed = String(name || '').trim();
  const known = FAMILY_MEMBERS.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  if (known) return known;
  if (!trimmed || trimmed.toLowerCase() === 'guest') return GUEST_PERSONA;
  const h = hashName(trimmed.toLowerCase());
  return {
    name: trimmed,
    emoji: FALLBACK_EMOJIS[h % FALLBACK_EMOJIS.length],
    color: FALLBACK_COLORS[h % FALLBACK_COLORS.length],
  };
}

// Small corner badge for an item row — see the position:relative on
// .item-row and .item-persona-badge in style.css. Replaces the old
// "added by <name>" caption entirely (issue #30): non-blocking, doesn't
// take any row width, just sits on the card corner.
export function personaBadgeHtml(addedBy) {
  const p = personaFor(addedBy);
  return `<div class="item-persona-badge" style="--persona-color:${p.color}" title="${escapeHtml(p.name)}">${p.emoji}</div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
