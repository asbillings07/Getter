import { legacyKeys } from "./core/preferences.js";
import { inspectProKey } from "./studio/inspect-workspace.js";
chrome.runtime.onInstalled.addListener(() => {
  chrome.action
    .enable()
    .catch(() => console.error("Getter could not enable its toolbar action."));
  // Never overwrite preferences during update, including when a popup is open.
  chrome.storage.local
    .get(null)
    .then((values) => chrome.storage.local.remove(legacyKeys(values)))
    .catch(() =>
      console.error("Getter cache cleanup failed. Reopen Getter to retry."),
    );
});

// View transfers are short-lived and held in browser-session memory, never local storage.
const transfers = new Map();
const transferKey = (id) => `getter.transfer.${id}`;
async function configureAction() {
  const { cssGetterOptions } =
    await chrome.storage.local.get("cssGetterOptions");
  const panel = cssGetterOptions?.workspace === "panel";
  await chrome.action.setPopup({ popup: panel ? "" : "popup.html" });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: panel });
}
chrome.runtime.onInstalled.addListener(() =>
  configureAction().catch(console.error),
);
chrome.runtime.onStartup.addListener(() =>
  configureAction().catch(console.error),
);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.cssGetterOptions)
    configureAction().catch(console.error);
});
configureAction().catch(console.error);
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const page = sender.url && new URL(sender.url);
  if (
    sender.id !== chrome.runtime.id ||
    page?.protocol !== "chrome-extension:" ||
    !["/popup.html", "/sidepanel.html"].includes(page.pathname)
  )
    return;
  if (!Number.isInteger(message?.windowId)) return;
  const key = transferKey(message.windowId);
  if (message.type === "getter:take-workspace") {
    (async () => {
      const saved =
        transfers.get(message.windowId) ||
        (await chrome.storage.session.get(key))[key];
      const recipient = page.pathname === "/popup.html" ? "popup" : "panel";
      if (saved?.mode !== recipient) return null;
      transfers.delete(message.windowId);
      await chrome.storage.session.remove(key);
      return Date.now() - saved.time < 30000 ? saved.workspace : null;
    })().then(respond, () => respond(null));
    return true;
  }
  if (
    message.type !== "getter:switch" ||
    !["panel", "popup"].includes(message.mode)
  )
    return;
  const record = {
    time: Date.now(),
    mode: message.mode,
    workspace: message.workspace,
  };
  transfers.set(message.windowId, record);
  const saved = chrome.storage.session
    .set({ [key]: record })
    .then(() =>
      GETTER_STUDIO_WORKSPACE_QA && message.mode === "panel"
        ? chrome.storage.session.remove(inspectProKey(message.windowId))
        : undefined,
    );
  setTimeout(() => {
    if (transfers.get(message.windowId) === record)
      transfers.delete(message.windowId);
    chrome.storage.session
      .get(key)
      .then(
        (v) =>
          v[key]?.time === record.time && chrome.storage.session.remove(key),
      )
      .catch(() => {});
  }, 31000);
  // Call open synchronously from the user's message to retain the gesture.
  const opened =
    message.mode === "panel"
      ? chrome.sidePanel.open({ windowId: message.windowId })
      : (async () => {
          await saved;
          await chrome.action.setPopup({ popup: "popup.html" });
          try {
            await chrome.action.openPopup({ windowId: message.windowId });
            await chrome.sidePanel.close({ windowId: message.windowId });
          } finally {
            await configureAction();
          }
        })();
  Promise.all([saved, opened]).then(
    async () => {
      // Chrome can retain a hidden side panel instead of mounting a new document.
      await chrome.runtime
        .sendMessage({
          type: "getter:workspace-ready",
          mode: message.mode,
          windowId: message.windowId,
        })
        .catch(() => {});
      respond({ ok: true });
    },
    () => {
      transfers.delete(message.windowId);
      chrome.storage.session.remove(key).catch(() => {});
      respond({ ok: false });
    },
  );
  return true;
});
