'use strict';
// In-app confirm dialog, replacing native confirm() (see issue #3) — reuses
// the .confirm-dialog card styling already established for the delivery-time
// confirm step, as a centered modal instead of inline.
import styles from './dialog.module.css';

export function confirmDialog(message, { confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = styles['modal-backdrop'];
    backdrop.innerHTML = `
      <div class="${styles['confirm-dialog']}">
        <p>${escapeHtml(message)}</p>
        <div class="${styles['confirm-actions']}">
          <button id="dialog-yes" class="${danger ? 'danger' : ''}">${escapeHtml(confirmLabel)}</button>
          <button id="dialog-no">${escapeHtml(cancelLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    function close(result) {
      backdrop.remove();
      resolve(result);
    }
    backdrop.querySelector('#dialog-yes').addEventListener('click', () => close(true));
    backdrop.querySelector('#dialog-no').addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
  });
}

export function promptDialog(message, { defaultValue = '', placeholder = '', confirmLabel = 'Save', cancelLabel = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = styles['modal-backdrop'];
    backdrop.innerHTML = `
      <form class="${styles['confirm-dialog']}">
        <p>${escapeHtml(message)}</p>
        <input id="dialog-input" type="text" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" />
        <div class="${styles['confirm-actions']}">
          <button type="submit" id="dialog-yes" class="${styles['primary']}">${escapeHtml(confirmLabel)}</button>
          <button type="button" id="dialog-no">${escapeHtml(cancelLabel)}</button>
        </div>
      </form>
    `;
    document.body.appendChild(backdrop);
    const input = backdrop.querySelector('#dialog-input');

    function close(result) {
      backdrop.remove();
      resolve(result);
    }
    backdrop.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      close(input.value.trim());
    });
    backdrop.querySelector('#dialog-no').addEventListener('click', () => close(null));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(null);
    });
    input.focus();
    input.select();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
