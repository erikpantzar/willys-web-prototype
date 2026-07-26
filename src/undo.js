'use strict';
// Shared undo tracking for add/remove/qty changes across views.
// Single-slot undo (like the Telegram bot): only the most recent action can be undone.
import * as api from './api.js';
import { showToast } from './toast.js';

let lastAction = null;

export function recordAction(action) {
  // action: { type: 'add'|'remove'|'qty', itemId, previousValue?, text?, who? }
  lastAction = action;
}

export async function performUndo() {
  if (!lastAction) return;
  const action = lastAction;
  lastAction = null;
  try {
    if (action.type === 'add') {
      // Undo an add by removing (marking as done)
      await api.removeItem(action.itemId);
    } else if (action.type === 'remove') {
      // Undo a remove by re-adding with the same text and who
      await api.addItem(action.text, action.who);
    } else if (action.type === 'qty') {
      // Undo a qty change by setting back to previous value
      await api.setQuantity(action.itemId, action.previousValue);
    }
  } catch (err) {
    showToast(`Undo failed: ${err.message}`);
  }
}
