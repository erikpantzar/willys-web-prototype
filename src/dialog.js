'use strict';
// In-app confirm dialog, replacing native confirm() (see issue #3) — reuses
// the .confirm-dialog card styling already established for the delivery-time
// confirm step, as a centered modal instead of inline.
export function confirmDialog(message, { confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="confirm-dialog" role="alertdialog" aria-modal="true">
        <p>${escapeHtml(message)}</p>
        <div class="confirm-actions">
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
