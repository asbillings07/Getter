import React, { useEffect, useRef, useState } from "react";
import InspectView from "../components/InspectView.jsx";
import InspectorIcon from "./InspectorIcon.jsx";
import { activePage, siteOrigin, supportedPage } from "../core/access.js";
import { initialWorkspace, verifyDocument } from "../core/workspace.js";
import SidePanelCollect, {
  openCollectionWorkspace,
} from "./SidePanelCollect.jsx";
import { inspectProKey } from "./inspect-workspace.js";

export default function InspectProRouter({ children }) {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    let live = true;
    let read = 0;
    let key;
    async function refresh() {
      const reading = ++read;
      try {
        const saved = await chrome.storage.session.get(key);
        if (live && reading === read) setSession(saved[key] || null);
      } catch {
        if (live && reading === read) setSession(null);
      }
    }
    const changed = (changes, area) => {
      if (area === "session" && changes[key]) refresh();
    };
    chrome.windows
      .getCurrent()
      .then((window) => {
        if (!live) return;
        key = inspectProKey(window.id);
        chrome.storage.onChanged.addListener(changed);
        refresh();
      })
      .catch(() => {
        if (live) setSession(null);
      });
    return () => {
      live = false;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);

  if (session === undefined) return null;
  return session ? (
    <InspectProPanel key={session.id} session={session} />
  ) : (
    children
  );
}

function InspectProPanel({ session }) {
  const [destination, setDestination] = useState(session.destination);
  const [page, setPage] = useState({ status: "loading" });
  const { status, scan, origin } = page;
  const [model, setModel] = useState(() => ({
    ...initialWorkspace().inspect,
    section: "parts",
  }));
  const [notice, setNotice] = useState("");
  const [capture, setCapture] = useState(null);
  const [accessPending, setAccessPending] = useState(null);
  const latest = useRef();
  const check = useRef();
  const expiry = useRef();
  const current = useRef(null);
  const documentInPanel = useRef(null);
  latest.current = model;
  const notify = (message) => {
    clearTimeout(expiry.current);
    setNotice(message);
    expiry.current = setTimeout(() => setNotice(""), 4000);
  };
  useEffect(() => () => clearTimeout(expiry.current), []);
  useEffect(() => {
    let live = true;
    function appearance(options) {
      const value = options?.appearance;
      document.documentElement.dataset.appearance = ["dark", "light"].includes(
        value,
      )
        ? value
        : "system";
    }
    function changed(changes, area) {
      if (area === "local" && changes.cssGetterOptions)
        appearance(changes.cssGetterOptions.newValue);
    }
    chrome.storage.onChanged.addListener(changed);
    chrome.storage.local
      .get("cssGetterOptions")
      .then(({ cssGetterOptions }) => {
        if (live) appearance(cssGetterOptions);
      })
      .catch(() => {});
    return () => {
      live = false;
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);
  useEffect(() => {
    let live = true;
    let read = 0;
    let windowId;
    let activeTabId;
    const clearSelection = () => {
      current.current = null;
      documentInPanel.current = null;
      setModel((value) => ({
        ...value,
        snapshot: null,
        section: "parts",
        query: "",
      }));
      setCapture(null);
      setNotice("");
    };
    const invalidate = (status = "loading") => {
      ++read;
      clearSelection();
      setPage({ status });
    };
    async function refresh() {
      const reading = ++read;
      const fresh = () => live && reading === read;
      try {
        const tab = await activePage(chrome, windowId);
        if (!fresh()) return;
        activeTabId = tab?.id;
        if (!supportedPage(tab?.url) || !tab.documentId) {
          invalidate(tab?.status === "loading" ? "loading" : "unsupported");
          return;
        }
        const next = {
          tabId: tab.id,
          documentId: tab.documentId,
          host: new URL(tab.url).hostname,
        };
        if (current.current?.documentId === next.documentId) return;
        const allowed = tab.accessible && (await verifyDocument(chrome, next));
        if (!fresh()) return;
        if (documentInPanel.current !== next.documentId) clearSelection();
        documentInPanel.current = next.documentId;
        current.current = allowed ? next : null;
        setPage({
          status: allowed ? "ready" : "access",
          scan: next,
          origin: siteOrigin(tab.url),
        });
      } catch {
        if (fresh()) invalidate("unsupported");
      }
    }
    const activated = (change) => {
      if (change.windowId !== windowId) return;
      activeTabId = change.tabId;
      invalidate();
      refresh();
    };
    const updated = (tabId, change) => {
      if (tabId !== activeTabId) return;
      if (change.status === "loading") invalidate();
      if (change.status === "complete") refresh();
    };
    const committed = ({ tabId, frameId, documentId }) => {
      if (tabId !== activeTabId || frameId !== 0) return;
      if (current.current?.documentId !== documentId) invalidate();
      refresh();
    };
    const permissionChanged = () => {
      invalidate();
      refresh();
    };
    chrome.windows
      .getCurrent()
      .then((window) => {
        if (!live) return;
        windowId = window.id;
        check.current = refresh;
        chrome.tabs.onActivated.addListener(activated);
        chrome.tabs.onUpdated.addListener(updated);
        chrome.webNavigation.onCommitted.addListener(committed);
        chrome.permissions.onRemoved.addListener(permissionChanged);
        chrome.permissions.onAdded.addListener(refresh);
        refresh();
      })
      .catch(() => {
        if (live) invalidate("unsupported");
      });
    return () => {
      live = false;
      current.current = null;
      check.current = null;
      chrome.tabs.onActivated.removeListener(activated);
      chrome.tabs.onUpdated.removeListener(updated);
      chrome.webNavigation.onCommitted.removeListener(committed);
      chrome.permissions.onRemoved.removeListener(permissionChanged);
      chrome.permissions.onAdded.removeListener(refresh);
    };
  }, []);

  async function allow() {
    setAccessPending(scan.documentId);
    try {
      if (await chrome.permissions.request({ origins: [origin] }))
        check.current?.();
      else if (documentInPanel.current === scan.documentId)
        notify("Site access wasn’t allowed.");
    } catch {
      if (documentInPanel.current === scan.documentId)
        notify("Getter couldn’t request site access. Try again.");
    } finally {
      setAccessPending((value) => (value === scan.documentId ? null : value));
    }
  }

  async function exit() {
    try {
      const window = await chrome.windows.getCurrent();
      const key = inspectProKey(window.id);
      if ((await chrome.storage.session.get(key))[key]?.id === session.id)
        await chrome.storage.session.remove(key);
    } catch {
      notify("Couldn’t leave Inspect Pro. Reopen Getter and try again.");
    }
  }

  async function copy(value, label) {
    if (current.current !== scan) return;
    try {
      await navigator.clipboard.writeText(value);
      notify(`Copied ${label || "value"}.`);
    } catch {
      notify("Copy failed. Select and copy the displayed value manually.");
    }
  }

  function openStudio(useCollection = false) {
    (useCollection && destination
      ? openCollectionWorkspace(destination)
      : chrome.tabs.create({ url: chrome.runtime.getURL("studio.html") })
    ).catch(() => notify("Couldn’t open Getter Studio. Try again."));
  }

  return (
    <div className="window inspect-pro-window">
      <header className="top inspect-pro-header">
        <div className="brand">
          <img
            src="images/CSS-Getter-Icon-48px.png"
            alt=""
            width="24"
            height="24"
          />
          <h1>Inspect Pro</h1>
        </div>
        <button
          className="text-button inspect-pro-label"
          type="button"
          onClick={exit}
        >
          <InspectorIcon name="back" />
          Back to Getter
        </button>
      </header>
      <div className="context inspect-pro-context">
        <span className="inspect-pro-label">
          <InspectorIcon name="site" />
          {scan?.host || "Current tab"}
        </span>
        <button
          className="text-button"
          type="button"
          onClick={() => openStudio()}
        >
          Open Studio
        </button>
      </div>
      <main className="inspect-main">
        {status === "ready" ? (
          <InspectView
            key={scan.documentId}
            pro
            scan={scan}
            model={model}
            onChange={(next) => {
              if (current.current === scan) setModel(next);
            }}
            onCopy={copy}
            onNotice={notify}
            onCollect={(inspection, captureScope, selectionId) => {
              if (current.current === scan)
                setCapture({ inspection, captureScope, selectionId });
            }}
          />
        ) : (
          <section className="state" aria-live="polite">
            <h2>
              {
                {
                  loading: "Connecting to this page…",
                  unsupported: "Open a website to inspect",
                  access: "Allow Inspect Pro on this site",
                }[status]
              }
            </h2>
            {status === "access" && (
              <>
                <p>
                  Grant Getter access to {scan.host} to pick and preview
                  elements.
                </p>
                <button
                  className="primary"
                  onClick={allow}
                  disabled={accessPending === scan.documentId}
                >
                  Allow site access
                </button>
              </>
            )}
            {status === "unsupported" && (
              <p>Switch to a website or open one in this window to continue.</p>
            )}
          </section>
        )}
      </main>
      <footer className="inspect-pro-footer">
        <span className="inspect-pro-label">
          <img src="images/aptelum-mark.png" alt="" width="19" height="19" />
          Created by Aptelum Labs
        </span>
        {destination && (
          <button
            className="text-button"
            type="button"
            onClick={() => openStudio(true)}
          >
            Open collection
          </button>
        )}
      </footer>
      {notice && (
        <div className="notices">
          <p className="scan-note" role="status">
            {notice}
          </p>
        </div>
      )}
      {capture && (
        <SidePanelCollect
          scan={scan}
          items={[]}
          inspection={capture.inspection}
          captureScope={capture.captureScope}
          preferredDestination={destination}
          includeObservedMotion
          onSaved={setDestination}
          isCurrent={() =>
            current.current === scan &&
            latest.current.snapshot?.selectionId === capture.selectionId
          }
          onClose={() => setCapture(null)}
        />
      )}
    </div>
  );
}
