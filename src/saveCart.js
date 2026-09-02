'use strict';
import * as api from './api.js';
import { promptDialog } from './dialog.js';
import { showToast } from './toast.js';
import { getIdentity } from './who.js';
import { formatShortDate } from './format.js';

export const CARTS_UNSUPPORTED_MESSAGE = 'Carts need the updated list API on the home server.';

export function isCartsUnsupported(err) {
  return err?.message === 'carts-unsupported';
}

export async function saveListAsCart({ onSaved } = {}) {
  const name = await promptDialog('Save the current list as a cart', {
    defaultValue: `Cart ${formatShortDate(new Date())}`,
    placeholder: 'Cart name',
    confirmLabel: 'Save',
  });
  if (name === null) return false;
  try {
    const cart = await api.saveCart(name, getIdentity());
    showToast('Cart saved', {
      type: 'success',
      actionLabel: 'View',
      onAction: () => (location.hash = '#carts'),
    });
    onSaved?.(cart);
    return true;
  } catch (err) {
    if (isCartsUnsupported(err)) showToast(CARTS_UNSUPPORTED_MESSAGE);
    else if (err.message === 'list is empty') showToast('The list is empty — nothing to save.');
    else showToast(`Could not save cart: ${err.message}`);
    return false;
  }
}
