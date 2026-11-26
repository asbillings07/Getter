import { siteOrigin, supportedPage } from "../core/access.js";

export const inspectProKey = (windowId) => `getter.inspectPro.${windowId}`;

async function loadedWebsite(api, tabId) {
  return new Promise((resolve, reject) => {
    function finish(error, frame) {
      clearTimeout(timeout);
      api.tabs.onUpdated.removeListener(check);
      api.tabs.onRemoved.removeListener(closed);
      if (error) reject(error);
      else resolve(frame);
    }
    const closed = (id) => {
      if (id === tabId) finish(Error("The selected tab was closed."));
    };
    async function check(id) {
      if (id !== tabId) return;
      try {
        const tab = await api.tabs.get(id);
        if (tab.status !== "complete") return;
        const frame = await api.webNavigation.getFrame({ tabId, frameId: 0 });
        if (!frame?.documentId || !supportedPage(frame.url))
          throw Error("This page cannot be inspected. Choose another website.");
        finish(null, frame);
      } catch (error) {
        finish(error);
      }
    }
    const timeout = setTimeout(
      () =>
        finish(
          Error(
            "The website is still loading. Choose its open tab when it is ready.",
          ),
        ),
      25000,
    );
    api.tabs.onUpdated.addListener(check);
    api.tabs.onRemoved.addListener(closed);
    check(tabId);
  });
}

// Open during the submit gesture. The panel switches modes after the chosen
// tab and top document have been verified and recorded for this window.
export async function launchInspectPro(
  api,
  { windowId, address, source, destination },
) {
  const opening = api.sidePanel.open({ windowId });
  await opening;
  const tabId = address
    ? (await api.tabs.create({ windowId, url: address, active: false })).id
    : source.id;
  const frame = await loadedWebsite(api, tabId);
  if (source && source.documentId !== frame.documentId)
    throw Error("That tab changed. Choose its current page and try again.");
  const { hostname } = new URL(frame.url);
  const key = inspectProKey(windowId);
  const session = {
    id: crypto.randomUUID(),
    tabId,
    documentId: frame.documentId,
    origin: siteOrigin(frame.url),
    hostname,
    destination,
  };
  await api.storage.session.set({ [key]: session });
  try {
    await api.tabs.update(tabId, { active: true });
  } catch (error) {
    if ((await api.storage.session.get(key))[key]?.id === session.id)
      await api.storage.session.remove(key);
    throw error;
  }
}
