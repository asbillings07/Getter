import { extractPage, aggregate } from "./extract.js";
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
export class ScanSession {
  constructor(api, onState) {
    this.api = api;
    this.onState = onState;
    this.sequence = 0;
    this.disposed = false;
    this.tabId = null;
    this.timer = null;
  }
  start() {
    this.updated = (id, change) => {
      if (id === this.tabId && (change.status === "loading" || change.url))
        this.invalidate("The page changed. Scan again for current results.");
    };
    this.activated = () =>
      this.invalidate(
        "The active tab changed. Reopen Getter on the page you want to inspect.",
      );
    this.api.tabs.onUpdated.addListener(this.updated);
    this.api.tabs.onActivated.addListener(this.activated);
  }
  invalidate(message) {
    ++this.sequence;
    clearTimeout(this.timer);
    if (!this.disposed) this.onState({ status: "stale", message, data: null });
  }
  async scan() {
    const run = ++this.sequence;
    clearTimeout(this.timer);
    const current = () => !this.disposed && run === this.sequence;
    this.onState({
      status: "loading",
      message: "Reading this page…",
      data: null,
    });
    this.timer = setTimeout(() => {
      if (current())
        this.invalidate(
          "The scan timed out. Try a smaller page or scan again.",
        );
    }, 5000);
    try {
      const [tab] = await this.api.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!current()) return;
      this.tabId = tab?.id;
      if (!tab || !supportedPage(tab.url)) {
        clearTimeout(this.timer);
        this.onState({
          status: "blocked",
          message:
            "Open a regular webpage to use Getter. Browser settings, the Web Store and local files cannot be inspected.",
          data: null,
        });
        return;
      }
      const results = await this.api.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPage,
        args: [{ maxNodes: 4000, maxMs: 100, maxItems: 500 }],
      });
      if (!current()) return;
      const main = results.find((r) => r.frameId === 0);
      if (!main?.documentId) throw new Error("Missing document identity");
      let omitted = 0;
      if (main.result.frames) {
        try {
          const frames = await this.api.webNavigation.getAllFrames({
            tabId: tab.id,
          });
          const origin = new URL(tab.url).origin;
          const all = (frames || []).filter((f) => f.frameId !== 0);
          const permitted = all
            .filter((f) => {
              try {
                return f.documentId && new URL(f.url).origin === origin;
              } catch {
                return false;
              }
            })
            .sort((a, b) => a.frameId - b.frameId)
            .slice(0, 7);
          omitted = all.length - permitted.length;
          for (const frame of permitted) {
            if (!current()) return;
            try {
              results.push(
                ...(await this.api.scripting.executeScript({
                  target: { tabId: tab.id, documentIds: [frame.documentId] },
                  func: extractPage,
                  args: [{ maxNodes: 1000, maxMs: 40, maxItems: 200 }],
                })),
              );
            } catch {
              omitted++;
            }
          }
        } catch {
          omitted = main.result.frames;
        }
      }
      // Pin the browser-provided document ID, including reloads of the same URL.
      const documents = results.map((r) => r.documentId);
      const verified = await this.api.scripting.executeScript({
        target: { tabId: tab.id, documentIds: documents },
        func: () => true,
      });
      if (
        documents.some(
          (id) =>
            !verified.some((r) => r.documentId === id && r.result === true),
        )
      )
        throw new Error("A document changed during the scan");
      if (!current()) return;
      const data = aggregate(results);
      clearTimeout(this.timer);
      const notes = [];
      if (omitted)
        notes.push(`${omitted} embedded frame(s) were not included.`);
      if (data.limited) notes.push("Showing a limited scan of this page.");
      this.onState({
        status: "ready",
        data,
        host: new URL(tab.url).hostname,
        message: notes.join(" "),
      });
    } catch {
      if (current()) {
        clearTimeout(this.timer);
        this.onState({
          status: "error",
          message:
            "Getter could not read this page. Reopen it from the toolbar on a regular webpage and try again.",
          data: null,
        });
      }
    }
  }
  cancel() {
    this.invalidate("Scan cancelled.");
  }
  dispose() {
    this.disposed = true;
    ++this.sequence;
    clearTimeout(this.timer);
    this.api.tabs.onUpdated.removeListener(this.updated);
    this.api.tabs.onActivated.removeListener(this.activated);
  }
}
