'use strict';
import { getBaseUrl, setBaseUrl, isDemoMode, setDemoMode } from '../settings.js';
import { healthCheck } from '../api.js';

export function renderSettings(root) {
  const demo = isDemoMode();
  root.innerHTML = `
    <div class="settings-panel">
      <h2>Settings</h2>

      <label>
        <span>Demo mode</span>
        <button id="toggle-demo">${demo ? '✓ On — showing sample data' : 'Off — try it with sample data'}</button>
      </label>
      <p class="muted">Runs entirely on seeded sample data, no tailnet connection needed — for trying out the
      interactions and design. Turn it off to connect to your real list.</p>

      ${demo ? '' : `
        <p class="muted">This only works on a device connected to your Tailscale network — the base URL is your home server's tailnet HTTPS address (see home-server/SPEC.md).</p>
        <label>Backend base URL
          <input id="base-url" type="text" value="${escapeHtml(getBaseUrl())}" placeholder="https://ep-precision-5570.tail5370f3.ts.net" />
        </label>
        <div class="settings-actions">
          <button id="save-url">Save</button>
          <button id="check-health">Test connection</button>
        </div>
        <div id="health-result"></div>
      `}
    </div>
  `;

  root.querySelector('#toggle-demo').addEventListener('click', () => {
    setDemoMode(!demo);
    renderSettings(root);
  });

  if (!demo) {
    root.querySelector('#save-url').addEventListener('click', () => {
      setBaseUrl(root.querySelector('#base-url').value.trim());
      root.querySelector('#health-result').textContent = 'Saved.';
    });

    root.querySelector('#check-health').addEventListener('click', async () => {
      const result = root.querySelector('#health-result');
      result.textContent = 'Checking…';
      const ok = await healthCheck();
      result.textContent = ok ? '✓ All three backends reachable.' : '✕ Could not reach one or more backends — check the URL and your Tailscale connection.';
    });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
