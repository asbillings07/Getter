import { legacyKeys } from './core/preferences.js';
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.enable().catch(() => console.error('Getter could not enable its toolbar action.'));
  // Never overwrite preferences during update, including when a popup is open.
  chrome.storage.local.get(null).then(values=>chrome.storage.local.remove(legacyKeys(values)))
    .catch(() => console.error('Getter cache cleanup failed. Reopen Getter to retry.'));
});
