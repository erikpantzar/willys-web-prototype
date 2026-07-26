'use strict';
import { getBaseUrl, setBaseUrl, isDemoMode, setDemoMode, isConnectionVerified, setConnectionVerified } from '../settings.js';
import { healthCheck } from '../api.js';

export function renderSettings(root) {
  const demo = isDemoMode();
  const currentUrl = getBaseUrl();
  // Strip https:// prefix if present for display in the input (without prefix)
  const urlHost = currentUrl.replace(/^https:\/\//i, '') || 'ep-precision-5570.tail5370f3.ts.net';
  const verified = isConnectionVerified();

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
          <div class="url-input-group">
            <span class="url-prefix">https://</span>
            <input id="base-url" type="text" value="${escapeHtml(urlHost)}" />
          </div>
        </label>
        ${verified ? `<div class="success">✓ Connection verified</div>` : ''}
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
      const hostValue = root.querySelector('#base-url').value.trim();
      // Prepend https:// when saving
      const fullUrl = `https://${hostValue}`;
      setBaseUrl(fullUrl);
      root.querySelector('#health-result').textContent = 'Saved.';
    });

    root.querySelector('#check-health').addEventListener('click', async () => {
      const result = root.querySelector('#health-result');
      result.textContent = 'Checking…';
      const ok = await healthCheck();
      if (ok) {
        setConnectionVerified(true);
        result.textContent = '✓ All three backends reachable.';
        // Navigate to list after successful connection verification
        setTimeout(() => {
          location.hash = '#list';
        }, 500);
      } else {
        result.textContent = '✕ Could not reach one or more backends — check the URL and your Tailscale connection.';
      }
    });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
