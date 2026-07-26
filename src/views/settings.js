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
      const services = await healthCheck();

      const allOk = services.every((s) => s.ok);
      let html = '';

      // Per-service status
      html += '<div class="health-services">';
      for (const service of services) {
        const icon = service.ok ? '✓' : '✕';
        const className = service.ok ? 'success' : 'error';
        const statusText = service.ok ? 'OK' : (service.kind === 'unreachable' ? 'Unreachable' : 'Error');
        html += `<div class="health-line"><span class="${className}">${icon} ${service.service}: ${statusText}</span>`;
        if (service.detail) {
          html += `<span class="muted" style="display: block; margin-top: 0.2rem; margin-left: 1.2rem; font-size: 0.75rem;">${escapeHtml(service.detail)}</span>`;
        }
        html += `</div>`;
      }
      html += '</div>';

      // Troubleshooting checklist if any service failed
      if (!allOk) {
        html += `
          <details class="troubleshooting" open>
            <summary>Troubleshooting checklist</summary>
            <ul class="checklist">
              <li>Tailscale app is open and connected on this device</li>
              <li>Base URL matches your home server's tailnet HTTPS address (from home-server/SPEC.md)</li>
              <li>No typos or trailing slash in the URL</li>
              <li>Home server backends are running and healthy</li>
              <li>Check your device's network connection</li>
            </ul>
          </details>
        `;
      }

      result.innerHTML = html;
    });
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
