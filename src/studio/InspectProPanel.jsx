import React, { useEffect, useRef, useState } from "react";
import InspectView from "../components/InspectView.jsx";
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
    let windowId;
    async function refresh() {
      const reading = ++read;
      try {
        const [tabs, saved] = await Promise.all([
          chrome.tabs.query({ active: true, windowId }),
          chrome.storage.session.get(key),
        ]);
        const current = saved[key];
        if (live && reading === read)
          setSession(current && current.tabId === tabs[0]?.id ? current : null);
      } catch {
        if (live && reading === read) setSession(null);
      }
    }
    const activate = (change) => {
      if (change.windowId === windowId) refresh();
    };
    const changed = (changes, area) => {
      if (area === "session" && changes[key]) refresh();
    };
    chrome.windows
      .getCurrent()
      .then((window) => {
        if (!live) return;
        windowId = window.id;
        key = inspectProKey(windowId);
        chrome.tabs.onActivated.addListener(activate);
        chrome.storage.onChanged.addListener(changed);
        refresh();
      })
      .catch(() => {
        if (live) setSession(null);
      });
    return () => {
      live = false;
      chrome.tabs.onActivated.removeListener(activate);
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
  const { tabId, documentId, hostname, origin } = session;
  const [destination, setDestination] = useState(session.destination);
  const scan = { tabId, documentId, host: hostname };
  const [status, setStatus] = useState("loading");
  const [model, setModel] = useState(() => ({
    ...initialWorkspace().inspect,
    section: "parts",
  }));
  const [notice, setNotice] = useState("");
  const [capture, setCapture] = useState(null);
  const [accessPending, setAccessPending] = useState(false);
  const latest = useRef();
  const check = useRef();
  const expiry = useRef();
  const current = useRef(false);
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
    const invalidate = (next) => {
      current.current = false;
      setStatus(next);
      setModel((value) => ({ ...value, snapshot: null }));
      setCapture(null);
    };
    async function refresh() {
      const reading = ++read;
      const [tabs, frame] = await Promise.all([
        chrome.tabs.query({ active: true, windowId }),
        chrome.webNavigation.getFrame({ tabId, frameId: 0 }).catch(() => null),
      ]);
      if (!live || reading !== read) return;
      if (tabs[0]?.id !== tabId || frame?.documentId !== documentId) {
        invalidate("stale");
        return;
      }
      const allowed = await verifyDocument(chrome, scan);
      if (!live || reading !== read) return;
      if (!allowed) invalidate("access");
      else {
        current.current = true;
        setStatus("ready");
      }
    }
    function retry() {
      refresh().catch(() => {
        if (live) invalidate("stale");
      });
    }
    check.current = retry;
    const committed = (details) => {
      if (
        details.tabId === tabId &&
        details.frameId === 0 &&
        details.documentId !== documentId
      ) {
        ++read;
        invalidate("stale");
      }
    };
    const permissionChanged = () => {
      // Close an open destination before a revoked grant can be reused.
      current.current = false;
      setCapture(null);
      retry();
    };
    chrome.webNavigation.onCommitted.addListener(committed);
    chrome.permissions.onRemoved.addListener(permissionChanged);
    chrome.permissions.onAdded.addListener(retry);
    chrome.windows
      .getCurrent()
      .then((window) => {
        if (!live) return;
        windowId = window.id;
        retry();
      })
      .catch(() => {
        if (live) invalidate("stale");
      });
    return () => {
      live = false;
      current.current = false;
      chrome.webNavigation.onCommitted.removeListener(committed);
      chrome.permissions.onRemoved.removeListener(permissionChanged);
      chrome.permissions.onAdded.removeListener(retry);
    };
  }, [tabId, documentId]);

  async function allow() {
    setAccessPending(true);
    try {
      if (await chrome.permissions.request({ origins: [origin] }))
        check.current?.();
      else notify("Site access wasn’t allowed.");
    } catch {
      notify("Getter couldn’t request site access. Try again.");
    } finally {
      setAccessPending(false);
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
    if (!current.current) return;
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
        <button className="text-button" type="button" onClick={exit}>
          Back to Getter
        </button>
      </header>
      <div className="context inspect-pro-context">
        <span>◎ {hostname}</span>
        <button
          className="text-button"
          type="button"
          onClick={() => openStudio()}
        >
          {status === "stale" ? "Choose site in Studio" : "Open Studio"}
        </button>
      </div>
      <main className="inspect-main">
        {status === "ready" ? (
          <InspectView
            pro
            scan={scan}
            model={model}
            onChange={setModel}
            onCopy={copy}
            onNotice={notify}
            onCollect={(inspection, captureScope, selectionId) =>
              setCapture({ inspection, captureScope, selectionId })
            }
          />
        ) : (
          <section className="state" aria-live="polite">
            <h2>
              {
                {
                  loading: "Connecting to this page…",
                  stale: "The page changed",
                  access: "Allow Inspect Pro on this site",
                }[status]
              }
            </h2>
            {status === "access" && (
              <>
                <p>
                  Grant Getter access to {hostname} to pick and preview
                  elements.
                </p>
                <button
                  className="primary"
                  onClick={allow}
                  disabled={accessPending}
                >
                  Allow site access
                </button>
              </>
            )}
            {status === "stale" && (
              <p>
                Choose the current page from Studio to start a fresh inspection.
              </p>
            )}
          </section>
        )}
      </main>
      <footer className="inspect-pro-footer">
        <span>Created by Aptelum Labs</span>
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
            current.current &&
            latest.current.snapshot?.selectionId === capture.selectionId
          }
          onClose={() => setCapture(null)}
        />
      )}
    </div>
  );
}
