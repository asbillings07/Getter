import { supportedPage, siteOrigin } from "../core/access.js";
import { extractPage } from "../core/extract.js";
import { sortByUsage } from "../core/usage.js";
import { isSecureImageUrl } from "../core/downloads.js";

export function websiteAddress(value) {
  const url = new URL(value);
  if (!supportedPage(url.href) || url.username || url.password)
    throw new Error(
      "Enter a regular HTTP or HTTPS website address without credentials.",
    );
  return url;
}

export async function openWebsites(api) {
  const tabs = await api.tabs.query({ currentWindow: true });
  const websites = await Promise.all(
    tabs.map(async (tab) => {
      if (tab.status !== "complete" || tab.discarded) return null;
      const frame = await api.webNavigation
        .getFrame({ tabId: tab.id, frameId: 0 })
        .catch(() => null);
      if (!frame?.documentId || !supportedPage(frame.url)) return null;
      const { hostname } = new URL(frame.url);
      return {
        id: tab.id,
        documentId: frame.documentId,
        origin: siteOrigin(frame.url),
        hostname,
        label: tab.title
          ? `${tab.title} · ${hostname}`
          : `${hostname} · Tab ${tab.index + 1}`,
        hasAccess: Boolean(tab.url),
      };
    }),
  );
  return websites.filter(Boolean);
}

async function checkSource(api, source) {
  const [tab, frame] = await Promise.all([
    api.tabs.get(source.id).catch(() => null),
    api.webNavigation
      .getFrame({ tabId: source.id, frameId: 0 })
      .catch(() => null),
  ]);
  if (
    tab?.status !== "complete" ||
    tab.discarded ||
    frame?.documentId !== source.documentId
  )
    throw new Error(
      "The page changed or closed. Scan the current page before saving.",
    );
}

export async function confirmSource(api, source) {
  try {
    const [verified] = await api.scripting.executeScript({
      target: { tabId: source.id, documentIds: [source.documentId] },
      func: () => true,
    });
    if (verified?.documentId !== source.documentId || verified.result !== true)
      throw Error("The source is unavailable.");
  } catch {
    throw Error(
      "The page changed or site access ended. Scan it again before saving.",
    );
  }
  await checkSource(api, source);
}

export async function allowSource(api, source) {
  if (!source.hasAccess) {
    const allowed = await api.permissions.request({ origins: [source.origin] });
    if (!allowed)
      throw new Error(
        "Site access was declined. Your collection is unchanged.",
      );
  }
  await checkSource(api, source);
}

export async function scanStyles(api, source) {
  await allowSource(api, source);
  const [scan] = await api.scripting.executeScript({
    target: { tabId: source.id, documentIds: [source.documentId] },
    func: extractPage,
    args: [
      {
        maxNodes: 4000,
        maxMs: 100,
        maxItems: 500,
        stylesOnly: true,
        includeImageCandidates: true,
      },
    ],
  });
  if (scan?.documentId !== source.documentId || !scan.result)
    throw new Error("The page changed. Scan again for the current styles.");
  await checkSource(api, source);
  const {
    colors,
    fonts,
    images,
    viewport,
    title,
    frames,
    limited,
    visited,
    usageTotals,
  } = scan.result;
  const values = [
    ...sortByUsage(colors).map(({ value, kinds, count }) => ({
      type: "color",
      value,
      kinds,
      count,
    })),
    ...sortByUsage(fonts).map(
      ({
        tag,
        fontFamily,
        fontWeight,
        fontStyle,
        fontSize,
        lineHeight,
        letterSpacing,
        count,
      }) => ({
        type: "font",
        tag,
        fontFamily,
        fontWeight,
        fontStyle,
        fontSize,
        lineHeight,
        letterSpacing,
        count,
      }),
    ),
  ];
  const items = values.filter((entry) =>
    Object.values(entry).every(
      (part) => typeof part !== "string" || part.length <= 512,
    ),
  );
  return {
    source,
    title,
    items,
    images: images.filter(({ src }) => isSecureImageUrl(src)),
    coverage: {
      framesOmitted: frames,
      limited,
      visited,
      usageTotals,
      viewport,
      longValuesOmitted: values.length - items.length,
    },
  };
}

export async function pickElement(api, source, signal) {
  await allowSource(api, source);
  signal.throwIfAborted();
  const studio = await api.tabs.getCurrent();
  await api.scripting.executeScript({
    target: { tabId: source.id, documentIds: [source.documentId] },
    files: ["inspect.js"],
  });
  await checkSource(api, source);
  signal.throwIfAborted();
  const captured = await new Promise((resolve, reject) => {
    let settled = false;
    const port = api.tabs.connect(source.id, {
      name: "getter-studio-inspect",
      documentId: source.documentId,
    });
    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener("abort", cancel);
      port.onDisconnect.removeListener(disconnected);
      port.disconnect();
      if (error) reject(error);
      else resolve(result);
    }
    const disconnected = () => {
      void api.runtime.lastError;
      finish(Error("The source page changed. Pick an element again."));
    };
    const cancel = () => finish(signal.reason);
    const timeout = setTimeout(
      () => finish(Error("The element picker timed out.")),
      120000,
    );
    signal.addEventListener("abort", cancel, { once: true });
    port.onDisconnect.addListener(disconnected);
    port.onMessage.addListener((message) => {
      if (message.type === "connected") {
        port.postMessage({ type: "start" });
        api.tabs
          .update(source.id, { active: true })
          .catch((error) => finish(error));
      }
      if (message.type === "studio-capture" || message.type === "paused") {
        if (studio?.id)
          api.tabs.update(studio.id, { active: true }).catch(() => {});
        finish(null, message.capture);
      }
      if (message.type === "error") {
        if (studio?.id)
          api.tabs.update(studio.id, { active: true }).catch(() => {});
        finish(Error(message.message));
      }
    });
  });
  if (captured) await checkSource(api, source);
  return captured;
}
