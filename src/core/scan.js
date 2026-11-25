import { extractPage, aggregate } from "./extract.js";
import { activePage, siteOrigin, supportedPage } from "./access.js";
export { supportedPage } from "./access.js";
export class ScanSession {
  constructor(
    api,
    onState,
    { followTabs = false, captureMetadata = false } = {},
  ) {
    this.followTabs = followTabs;
    this.captureMetadata = captureMetadata;
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
      if (id === this.tabId && change.status === "complete")
        this.refreshTarget();
    };
    this.activated = ({ windowId } = {}) => {
      if (this.windowId && windowId && this.windowId !== windowId) return;
      this.invalidate(
        "The active tab changed. Scan again for the current page.",
      );
      if (this.followTabs) this.scan();
    };
    this.api.tabs.onUpdated.addListener(this.updated);
    this.api.tabs.onActivated.addListener(this.activated);
    this.added = () => {
      // The requesting scan owns its continuation after Chrome's prompt.
      if (!this.requestingAccess) this.scan();
    };
    this.removed = () => {
      this.invalidate(
        "Website access changed. Scan again for current results.",
      );
      this.refreshTarget();
    };
    this.api.permissions?.onAdded.addListener(this.added);
    this.api.permissions?.onRemoved.addListener(this.removed);
  }
  invalidate(message) {
    ++this.sequence;
    clearTimeout(this.timer);
    if (!this.disposed) this.onState({ status: "stale", message, data: null });
  }
  pageState(tab, status = "access", message) {
    return {
      status,
      message:
        message ||
        "Use Scan again to read this page. Chrome may ask for access to this site.",
      data: null,
      host:
        tab?.url && supportedPage(tab.url)
          ? new URL(tab.url).hostname
          : undefined,
      tabId: tab?.id,
      windowId: tab?.windowId,
      url: tab?.url,
    };
  }
  async refreshTarget() {
    const run = ++this.sequence;
    clearTimeout(this.timer);
    try {
      const tab = await activePage(this.api, this.windowId);
      if (this.disposed || run !== this.sequence) return;
      this.tabId = tab?.id;
      this.windowId = tab?.windowId;
      if (tab?.url && supportedPage(tab.url)) {
        this.onState(
          this.pageState(
            tab,
            tab.accessible ? "stale" : "access",
            tab.accessible
              ? "The page changed. Scan again for current results."
              : undefined,
          ),
        );
      } else {
        // Reuse normal restricted/unknown-page handling without requesting access.
        this.scan();
      }
    } catch {
      if (!this.disposed && run === this.sequence)
        this.invalidate("The page changed. Scan again for current results.");
    }
  }
  async scan({ requestAccess = false } = {}) {
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
      let tab = await activePage(this.api, this.windowId);
      if (!current()) return;
      this.tabId = tab?.id;
      this.windowId = tab?.windowId;
      if (!tab?.url) throw new Error("Current page unavailable");
      if (!supportedPage(tab.url)) {
        clearTimeout(this.timer);
        this.onState({
          status: "blocked",
          message:
            "Open a regular webpage to use Getter. Browser settings, the Web Store and local files cannot be inspected.",
          data: null,
        });
        return;
      }
      if (!tab.accessible) {
        clearTimeout(this.timer);
        if (!requestAccess) {
          this.onState(this.pageState(tab));
          return;
        }
        this.onState(
          this.pageState(
            tab,
            "permission",
            "Allow access in Chrome to start the scan.",
          ),
        );
        this.requestingAccess = true;
        let granted;
        try {
          granted = await this.api.permissions.request({
            origins: [siteOrigin(tab.url)],
          });
        } finally {
          this.requestingAccess = false;
        }
        if (!current()) return;
        if (!granted) {
          this.onState(
            this.pageState(
              tab,
              "denied",
              "Getter hasn’t read this page. Use Scan again to try again.",
            ),
          );
          return;
        }
        const now = await activePage(this.api, this.windowId);
        if (!current()) return;
        if (
          !now ||
          now.id !== tab.id ||
          now.url !== tab.url ||
          (tab.documentId && now.documentId !== tab.documentId)
        ) {
          this.invalidate("The page changed. Scan again for current results.");
          return;
        }
        // Navigation events also invalidate this run, including same-URL reloads.
        tab = now;
        this.onState(this.pageState(tab, "loading", "Reading this page…"));
        this.timer = setTimeout(() => {
          if (current())
            this.invalidate(
              "The scan timed out. Try a smaller page or scan again.",
            );
        }, 5000);
      }
      const results = await this.api.scripting.executeScript({
        target: {
          tabId: tab.id,
          ...(tab.documentId ? { documentIds: [tab.documentId] } : {}),
        },
        func: extractPage,
        args: [
          {
            maxNodes: 4000,
            maxMs: 100,
            maxItems: 500,
            ...(this.captureMetadata ? { captureMetadata: true } : {}),
          },
        ],
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
                  args: [
                    {
                      maxNodes: 1000,
                      maxMs: 40,
                      maxItems: 200,
                      ...(this.captureMetadata
                        ? { captureMetadata: true }
                        : {}),
                    },
                  ],
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
        tabId: tab.id,
        windowId: tab.windowId,
        documentId: main.documentId,
        url: tab.url,
        message: notes.join(" "),
        ...(this.captureMetadata
          ? {
              coverage: {
                viewport: main.result.viewport,
                framesOmitted: omitted,
              },
            }
          : {}),
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
  async adopt(value) {
    const run = ++this.sequence;
    this.tabId = value.tabId;
    this.windowId = value.windowId;
    const { verifyDocument } = await import("./workspace.js");
    if (
      this.disposed ||
      !(await verifyDocument(this.api, value)) ||
      this.disposed ||
      run !== this.sequence
    )
      return false;
    this.onState(value);
    return true;
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
    this.api.permissions?.onAdded.removeListener(this.added);
    this.api.permissions?.onRemoved.removeListener(this.removed);
  }
}
