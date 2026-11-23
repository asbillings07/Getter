export const websiteOrigins = ["http://*/*", "https://*/*"];

export function supportedPage(url) {
  try {
    const u = new URL(url);
    return (
      ["http:", "https:"].includes(u.protocol) &&
      u.hostname !== "chromewebstore.google.com" &&
      !(
        u.hostname === "chrome.google.com" && u.pathname.startsWith("/webstore")
      )
    );
  } catch {
    return false;
  }
}

export function siteOrigin(url) {
  if (!supportedPage(url)) throw new Error("Unsupported page");
  const u = new URL(url);
  // Chrome host patterns apply to every port on this exact scheme/hostname.
  return `${u.protocol}//${u.hostname}/*`;
}

export async function activePage(api, windowId) {
  const [tab] = await api.tabs.query({
    active: true,
    ...(Number.isInteger(windowId) ? { windowId } : { currentWindow: true }),
  });
  if (!tab) return null;
  // Without a host/activeTab grant, tabs.query omits the URL. The existing
  // webNavigation permission can identify the current page without reading it.
  const frame =
    !tab.url || supportedPage(tab.url)
      ? await api.webNavigation.getFrame?.({ tabId: tab.id, frameId: 0 })
      : null;
  return {
    ...tab,
    url: frame?.url || tab.url,
    documentId: frame?.documentId,
    accessible: Boolean(tab.url),
  };
}
