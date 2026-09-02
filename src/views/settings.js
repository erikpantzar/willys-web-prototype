'use strict';
import { getBaseUrl, setBaseUrl, isDemoMode, setDemoMode, isConnectionVerified, setConnectionVerified } from '../settings.js';
import { healthCheck } from '../api.js';
import styles from '../components/SettingsForm.module.css';

export function renderSettings(root) {
  const demo = isDemoMode();
  const currentUrl = getBaseUrl();
  // Strip https:// prefix if present for display in the input (without prefix)
  const urlHost = currentUrl.replace(/^https:\/\//i, '') || 'ep-precision-5570.tail5370f3.ts.net';
  const verified = isConnectionVerified();

  root.innerHTML = `
    <div class="setup-screen">
      <div class="setup-icon">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
          <path d="M2 8.5C7 3.5 17 3.5 22 8.5" stroke="var(--delivery-btn)" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M5.5 12C9 8.7 15 8.7 18.5 12" stroke="var(--delivery-btn)" stroke-width="1.8" stroke-linecap="round"></path>
          <path d="M9 15.5C10.7 13.9 13.3 13.9 15 15.5" stroke="var(--delivery-btn)" stroke-width="1.8" stroke-linecap="round"></path>
          <circle cx="12" cy="19" r="1.6" fill="var(--delivery-btn)"></circle>
        </svg>
      </div>
      <div class="setup-title">Settings</div>
      <div class="setup-subtitle">Connect this device to your family's shopping hub, or try the sample data first.</div>

      <div class="setup-form">
        <label>Demo mode</label>
        <button id="toggle-demo" style="width: 100%">${demo ? '✓ On — showing sample data' : 'Off — try it with sample data'}</button>
        <p class="muted" style="margin-top: 0.5rem">Runs entirely on seeded sample data, no tailnet connection needed — for trying out the
        interactions and design. Turn it off to connect to your real list.</p>

        ${demo ? '' : `
          <p class="muted">This only works on a device connected to your Tailscale network — the base URL is your home server's tailnet HTTPS address (see home-server/SPEC.md).</p>
          <label style="margin-top: 1rem">Backend base URL</label>
          <div class="${styles['url-input-group']}">
            <span class="${styles['url-prefix']}">https://</span>
            <input id="base-url" type="text" value="${escapeHtml(urlHost)}" />
          </div>
          ${verified ? `<div class="success">✓ Connection verified</div>` : ''}
          <div class="${styles['settings-actions']}" style="margin-top: 0.85rem">
            <button id="save-url">Save</button>
            <button id="check-health">Test connection</button>
          </div>
          <div id="health-result"></div>
        `}
      </div>
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
      const fullUrl = /^https?:\/\//i.test(hostValue) ? hostValue : `https://${hostValue}`;
      setBaseUrl(fullUrl);
      root.querySelector('#health-result').textContent = 'Saved.';
    });

    root.querySelector('#check-health').addEventListener('click', async () => {
      const result = root.querySelector('#health-result');
      result.textContent = 'Checking…';
      const services = await healthCheck();

      const allOk = services.every((s) => s.ok);
      let html = '';

      // Per-service status
      html += `<div class="${styles['health-services']}">`;
      for (const service of services) {
        const icon = service.ok ? '✓' : '✕';
        const className = service.ok ? 'success' : 'error';
        const statusText = service.ok ? 'OK' : (service.kind === 'unreachable' ? 'Unreachable' : 'Error');
        html += `<div class="${styles['health-line']}"><span class="${className}">${icon} ${service.service}: ${statusText}</span>`;
        if (service.detail) {
          html += `<span class="muted" style="display: block; margin-top: 0.2rem; margin-left: 1.2rem; font-size: 0.75rem;">${escapeHtml(service.detail)}</span>`;
        }
        html += `</div>`;
      }
      html += '</div>';

      if (allOk) {
        setConnectionVerified(true);
        // Navigate to list after successful connection verification
        setTimeout(() => {
          location.hash = '#list';
        }, 500);
      } else {
        // Troubleshooting checklist if any service failed
        html += `
          <details class="${styles['troubleshooting']}" open>
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
