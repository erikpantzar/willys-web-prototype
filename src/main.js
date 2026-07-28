'use strict';
import { isConnectionVerified, isDemoMode, isTestingOpen } from './settings.js';
import { initWho } from './who.js';
import { renderList } from './views/list.js';
import { renderDelivery } from './views/delivery.js';
import { renderSettings } from './views/settings.js';

const app = document.getElementById('app');
const tabs = document.querySelectorAll('.tab');
const demoBanner = document.getElementById('demo-banner');

const ROUTES = { list: renderList, delivery: renderDelivery };

function currentRoute() {
  return (location.hash || '#list').slice(1);
}

function route() {
  const name = currentRoute();
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.route === name));
  demoBanner.hidden = !isDemoMode();

  // Demo mode never needs a real base URL — it runs entirely on seeded data.
  // Non-demo mode requires connection to be verified before accessing app
  // features, unless testing mode is open (see docs/testing-mode-plan.md —
  // a temporary bypass for kid testing, not a permanent removal: Settings
  // is still reachable via the gear icon, and a saved base URL is still
  // required for real API calls to work, testing mode just skips being
  // forced through the verify screen first).
  if (!isDemoMode() && !isTestingOpen() && !isConnectionVerified() && name !== 'settings') {
    renderSettings(app);
  } else {
    (ROUTES[name] || renderList)(app);
  }
  // Harmless if the current view has no #who-badge (e.g. settings) — list.js
  // and delivery.js also call this themselves after their own re-renders.
  initWho();
}

tabs.forEach((btn) => btn.addEventListener('click', () => (location.hash = `#${btn.dataset.route}`)));
// Settings button is re-created on every render (it lives in each view's
// hero now), so it's wired via delegation on #app rather than a one-time
// direct listener.
app.addEventListener('click', (e) => {
  if (e.target.closest('#settings-btn')) renderSettings(app);
});

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
