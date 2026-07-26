'use strict';
// Dispatches every call to either the real tailnet-backed implementation
// (api.real.js) or an in-memory demo implementation (api.fake.js), chosen
// per call via settings.isDemoMode() — so flipping demo mode on mid-session
// (no reload required) immediately switches every view's data source.
// Demo mode exists for design/interaction review without a live tailnet
// connection: seeded list, product catalog, and delivery slots, no network
// calls at all. See src/fakeData.js for the seed data.
import { isDemoMode } from './settings.js';
import * as real from './api.real.js';
import * as fake from './api.fake.js';

function impl() {
  return isDemoMode() ? fake : real;
}

export const getList = (...args) => impl().getList(...args);
export const addItem = (...args) => impl().addItem(...args);
export const removeItem = (...args) => impl().removeItem(...args);
export const setQuantity = (...args) => impl().setQuantity(...args);
export const setChecked = (...args) => impl().setChecked(...args);
export const setTrigger = (...args) => impl().setTrigger(...args);
export const fakeSend = (...args) => impl().fakeSend(...args);
export const resetList = (...args) => impl().resetList(...args);
export const search = (...args) => impl().search(...args);
export const resolve = (...args) => impl().resolve(...args);
export const confirm = (...args) => impl().confirm(...args);
export const getDeliveryTimesWide = (...args) => impl().getDeliveryTimesWide(...args);
export const chooseDeliveryTime = (...args) => impl().chooseDeliveryTime(...args);
export const healthCheck = (...args) => impl().healthCheck(...args);
