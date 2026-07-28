'use strict';
import { isConnectionVerified, isDemoMode } from './settings.js';
import { renderList } from './views/list.js';
import { renderDelivery } from './views/delivery.js';
import { renderSettings } from './views/settings.js';

const app = document.getElementById('app');
const tabs = document.querySelectorAll('.tab');
const settingsBtn = document.querySelector('.settings-gear-btn');
const demoBanner = document.getElementById('demo-banner');
const viewTrack = document.getElementById('view-track');

// Order here is also swipe order (index 0 = swipe all the way right,
// last index = swipe all the way left), top-nav left-to-right order, and
// pane order in the DOM (index.html's .view-pane elements) — one array
// drives all four.
const ROUTE_ORDER = ['list', 'delivery', 'settings'];
const ROUTES = { list: renderList, delivery: renderDelivery, settings: renderSettings };
const panes = Object.fromEntries(ROUTE_ORDER.map((name) => [name, document.querySelector(`.view-pane[data-pane="${name}"]`)]));

function currentRoute() {
  const name = (location.hash || '#list').slice(1);
  return ROUTE_ORDER.includes(name) ? name : 'list';
}

// Panes are permanent (never torn down) and sit side by side in
// #view-track — "switching views" is really just sliding the track so a
// different pane is the one in the viewport, with a CSS transition on
// transform doing the actual slide animation.
function slideTo(name) {
  const idx = ROUTE_ORDER.indexOf(name);
  viewTrack.style.transform = `translateX(-${idx * 100}%)`;
}

function route() {
  const name = currentRoute();
  demoBanner.hidden = !isDemoMode();

  // Demo mode never needs a real base URL — it runs entirely on seeded data.
  // Non-demo mode requires connection to be verified before accessing app
  // features. Renders into the settings pane and slides there without
  // touching location.hash, so this doesn't fight whatever route the user
  // was actually headed to (they land right back on it once verified).
  if (!isDemoMode() && !isConnectionVerified() && name !== 'settings') {
    tabs.forEach((t) => t.classList.remove('active'));
    settingsBtn.classList.add('active');
    renderSettings(panes.settings);
    slideTo('settings');
    return;
  }
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.route === name));
  settingsBtn.classList.toggle('active', name === 'settings');
  ROUTES[name](panes[name]);
  slideTo(name);
}

tabs.forEach((btn) => btn.addEventListener('click', () => (location.hash = `#${btn.dataset.route}`)));
settingsBtn.addEventListener('click', () => (location.hash = `#${settingsBtn.dataset.route}`));

function navigateBy(delta) {
  const idx = ROUTE_ORDER.indexOf(currentRoute());
  const next = ROUTE_ORDER[Math.min(ROUTE_ORDER.length - 1, Math.max(0, idx + delta))];
  if (next !== ROUTE_ORDER[idx]) location.hash = `#${next}`;
}

// Swipe left/right between views (issue: the old fixed bottom tab bar got
// pushed up above the iOS keyboard while typing — moving nav to the top
// fixes that on its own, this is the other half of the ask). Threshold-
// based on release, not 1:1 drag-follow — simpler, and the CSS transition
// on #view-track's transform still gives a proper slide once the hash
// changes. Dominant-axis check (dx vs dy) keeps an ordinary vertical
// scroll from ever triggering a navigation. Listens on #app (the fixed
// viewport frame, always full height) rather than individual panes, so a
// short pane (e.g. Delivery's loading state) can't leave dead space where
// touches don't register.
const SWIPE_THRESHOLD_PX = 60;
let touchStartX = 0;
let touchStartY = 0;
let tracking = false;

app.addEventListener(
  'touchstart',
  (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    tracking = true;
  },
  { passive: true }
);

app.addEventListener(
  'touchend',
  (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigateBy(dx < 0 ? 1 : -1);
    }
  },
  { passive: true }
);

app.addEventListener('touchcancel', () => (tracking = false), { passive: true });

window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // import.meta.env.BASE_URL, not a literal '/sw.js' — this is served
    // from a GitHub Pages *project* site (/willys-web-prototype/...), so an
    // origin-root path would 404 and the SW would never register.
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
