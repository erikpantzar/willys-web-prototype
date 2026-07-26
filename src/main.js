'use strict';
import { hasBaseUrl, isDemoMode } from './settings.js';
import { renderList } from './views/list.js';
import { renderSearch } from './views/search.js';
import { renderDelivery } from './views/delivery.js';
import { renderSettings } from './views/settings.js';

const app = document.getElementById('app');
const tabs = document.querySelectorAll('.tab');
const settingsBtn = document.getElementById('settings-btn');
const demoBanner = document.getElementById('demo-banner');

const ROUTES = { list: renderList, search: renderSearch, delivery: renderDelivery };

function currentRoute() {
  return (location.hash || '#list').slice(1);
}

function route() {
  const name = currentRoute();
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.route === name));
  demoBanner.hidden = !isDemoMode();

  // Demo mode never needs a real base URL — it runs entirely on seeded data.
  if (!isDemoMode() && !hasBaseUrl() && name !== 'settings') {
    renderSettings(app);
    return;
  }
  (ROUTES[name] || renderList)(app);
}

tabs.forEach((btn) => btn.addEventListener('click', () => (location.hash = `#${btn.dataset.route}`)));
settingsBtn.addEventListener('click', () => renderSettings(app));

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
