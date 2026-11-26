import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ScanSession } from "./core/scan.js";
import { migrateStorage, preferences } from "./core/preferences.js";
import TextView from "./components/TextView.jsx";
import InspectView from "./components/InspectView.jsx";
import Info from "./components/Info.jsx";
import WebsiteAccess from "./components/WebsiteAccess.jsx";
import StudioAccount, { AccountIcon } from "./components/StudioAccount.jsx";
import SidePanelCollect from "./studio/SidePanelCollect.jsx";
import { collectionLabels } from "./studio/library.js";
import { initialWorkspace, takeWorkspace } from "./core/workspace.js";
import { colorLabel } from "./core/extract.js";
import {
  displayedFonts,
  fontStyleKey,
  sortByUsage,
  totalUses,
  usagePercentage,
} from "./core/usage.js";
import {
  collectImages,
  isSecureImageUrl,
  DownloadTracker,
  EXPORT_LIMITS,
  makeZip,
} from "./core/downloads.js";

const api = globalThis.chrome;
const mode =
  document.documentElement.dataset.mode === "panel" ? "panel" : "popup";
const labels = {
  fontFamily: "Font family",
  fontWeight: "Font weight",
  fontSize: "Font size",
  letterSpacing: "Letter spacing",
  lineHeight: "Line height",
  detailed: "All font styles",
  hex: "Hex color values",
  buttonColor: "Color swatches",
  fileSize: "Image file size",
  imageDimensions: "Image dimensions",
  loadPreviews: "Load previews by default",
};
const empty = { status: "loading", message: "Opening Getter…", data: null };
function Icon({ name }) {
  return (
    <span className="icon" aria-hidden="true">
      {
        {
          colors: "◉",
          fonts: "T",
          images: "▧",
          text: "☷",
          inspect: "⌖",
          settings: "⚙︎",
          refresh: "↻",
        }[name]
      }
    </span>
  );
}
function ImageCard({ image, options, previews, onDownload, onCollect }) {
  const [broken, setBroken] = useState(false),
    [size, setSize] = useState(null),
    [reading, setReading] = useState(false),
    [downloading, setDownloading] = useState(false),
    [error, setError] = useState("");
  const controller = useRef(),
    downloadController = useRef();
  const secure = isSecureImageUrl(image.src);
  useEffect(
    () => () => {
      controller.current?.abort();
      downloadController.current?.abort();
    },
    [],
  );
  const filename = (() => {
    try {
      return (
        decodeURIComponent(new URL(image.src).pathname.split("/").pop()) ||
        "Image"
      );
    } catch {
      return "Image";
    }
  })();
  async function getSize() {
    controller.current = new AbortController();
    setReading(true);
    setError("");
    try {
      const result = await collectImages([image], {
        signal: controller.current.signal,
      });
      if (!result.entries.length) throw new Error();
      setSize(result.bytes);
    } catch {
      if (!controller.current.signal.aborted)
        setError(
          "Size unavailable. HTTPS and host access are required; redirects and oversized files are blocked.",
        );
    } finally {
      if (!controller.current.signal.aborted) setReading(false);
    }
  }
  async function downloadImage() {
    const pending = new AbortController();
    downloadController.current = pending;
    setDownloading(true);
    setError("");
    try {
      const result = await collectImages([image], { signal: pending.signal });
      pending.signal.throwIfAborted();
      if (!result.entries.length) throw new Error();
      const { data, type, filename } = result.entries[0];
      await onDownload(new Blob([data], { type }), filename);
    } catch {
      if (!pending.signal.aborted)
        setError(
          "Image unavailable. HTTPS and host access are required; redirects and oversized files are blocked.",
        );
    } finally {
      if (!pending.signal.aborted) setDownloading(false);
    }
  }
  return (
    <article className="image-card">
      <div className="image-preview">
        {previews && secure && !broken ? (
          <img
            src={image.src}
            alt={image.name || filename}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <span>
            {!secure
              ? "HTTPS image required"
              : broken
                ? "Preview unavailable"
                : "Preview off"}
          </span>
        )}
      </div>
      <h3>{image.name || filename}</h3>
      <p className="image-host">{new URL(image.src).hostname}</p>
      {options.imageDimensions && (
        <p>
          {image.width && image.height
            ? `${image.width} × ${image.height}`
            : "Dimensions unavailable"}
        </p>
      )}
      {options.fileSize && (
        <p>
          {size === null ? (
            <button
              className="text-button"
              disabled={reading || !secure}
              onClick={getSize}
            >
              {reading ? "Reading size…" : "Read file size"}
            </button>
          ) : (
            `${(size / 1024).toFixed(1)} KiB`
          )}
        </p>
      )}
      {error && (
        <p className="small error-text" role="status">
          {error}
        </p>
      )}
      <button
        className="secondary"
        disabled={downloading || !secure}
        onClick={downloadImage}
      >
        {downloading ? "Preparing image…" : "Download"}
      </button>
      {GETTER_STUDIO_WORKSPACE_QA && onCollect && (
        <button
          className="secondary studio-card-save studio-collection-button"
          onClick={onCollect}
          aria-label={`Save to collection: ${image.name || filename}`}
        >
          ＋ Save to collection
        </button>
      )}
    </article>
  );
}
function Notice({ id, text, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 2000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);
  return <p className="notice">{text}</p>;
}
function App() {
  const [collectionDraft, setCollectionDraft] = useState(null);
  const [features, setFeatures] = useState(initialWorkspace),
    [lastTool, setLastTool] = useState("colors"),
    [switching, setSwitching] = useState(false);
  const [view, setView] = useState("colors"),
    [accountEntry, setAccountEntry] = useState(null),
    [focusWebsiteAccess, setFocusWebsiteAccess] = useState(false),
    [scan, setScan] = useState(empty),
    [options, setOptions] = useState(null),
    [notices, setNotices] = useState([]),
    [saving, setSaving] = useState(false),
    [previews, setPreviews] = useState(false),
    [exporting, setExporting] = useState(false),
    [zipConfirm, setZipConfirm] = useState(false),
    [preparedZip, setPreparedZip] = useState(null),
    [savingZip, setSavingZip] = useState(false),
    [exportResult, setExportResult] = useState("");
  const scanner = useRef(),
    tracker = useRef(),
    exportController = useRef(),
    currentScan = useRef(empty),
    noticeId = useRef(0),
    optionsRef = useRef(null),
    workspaceWindow = useRef(null),
    accountOpener = useRef(null),
    restoreAccountFocus = useRef(false),
    returnView = useRef("colors");
  optionsRef.current = options;
  const accountOpen = accountEntry !== null;
  const addNotice = useCallback((text) => {
    const id = noticeId.current++;
    setNotices((current) => [...current, { id, text }].slice(-3));
  }, []);
  const dismissNotice = useCallback((id) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);
  useEffect(() => {
    document.documentElement.dataset.appearance =
      options?.appearance || "system";
  }, [options?.appearance]);
  useEffect(() => {
    let live = true,
      expired = false;
    api.windows.getCurrent().then((win) => (workspaceWindow.current = win.id));
    const session = new ScanSession(
      api,
      (value) => {
        if (live) {
          currentScan.current = value;
          exportController.current?.abort();
          exportController.current = null;
          setPreparedZip(null);
          setExporting(false);
          setExportResult("");
          setNotices([]);
          setScan(value);
          setPreviews(optionsRef.current?.images.loadPreviews || false);
          if (value.status !== "ready") setFeatures(initialWorkspace());
          setZipConfirm(false);
        }
      },
      {
        followTabs: mode === "panel",
        captureMetadata: GETTER_STUDIO_WORKSPACE_QA,
      },
    );
    scanner.current = session;
    session.start();
    const downloads = new DownloadTracker(
      api.downloads,
      (text) => live && addNotice(text),
    );
    tracker.current = downloads;
    const timer = setTimeout(() => {
      expired = true;
      if (live)
        setScan({
          status: "error",
          data: null,
          message:
            "Preferences are taking too long to load. Close and reopen Getter.",
        });
    }, 5000);
    let restoration;
    const restoreWorkspace = () => {
      if (restoration) return restoration;
      restoration = (async () => {
        const transfer = await takeWorkspace(api);
        if (!live || !transfer) return false;
        const adopted =
          transfer.scan?.status === "ready" &&
          (await session.adopt(transfer.scan));
        if (!live) return false;
        const next = [
          "colors",
          "fonts",
          "images",
          "text",
          "inspect",
          "settings",
          "about",
        ].includes(transfer.view)
          ? transfer.view
          : "colors";
        setView(
          mode === "popup" && next === "inspect"
            ? transfer.lastTool || "colors"
            : next,
        );
        setLastTool(transfer.lastTool || "colors");
        if (adopted) {
          setFeatures(transfer.features || initialWorkspace());
          setPreviews(
            transfer.previews ?? optionsRef.current.images.loadPreviews,
          );
        } else session.scan();
        return true;
      })().finally(() => {
        restoration = null;
      });
      return restoration;
    };
    const receiveWorkspace = (message, sender, respond) => {
      if (
        sender.id !== api.runtime.id ||
        message?.type !== "getter:workspace-ready" ||
        message.mode !== mode ||
        message.windowId !== workspaceWindow.current ||
        !optionsRef.current
      )
        return;
      // Only a native popup/panel receives one-off transfers, not an extension tab used for diagnostics.
      if (api.extension.getViews({ type: "tab" }).includes(window)) return;
      restoreWorkspace().then(
        () => respond({ ok: true }),
        () => respond({ ok: false }),
      );
      return true;
    };
    api.runtime.onMessage.addListener(receiveWorkspace);
    let receivedPreferences;
    const receivePreferences = (changes, area) => {
      if (!live || area !== "local" || !changes.cssGetterOptions) return;
      receivedPreferences = preferences(changes.cssGetterOptions.newValue);
      optionsRef.current = receivedPreferences;
      setOptions(receivedPreferences);
    };
    api.storage.onChanged.addListener(receivePreferences);
    migrateStorage(api.storage.local)
      .then(async (value) => {
        if (live && !expired) {
          clearTimeout(timer);
          const current = receivedPreferences || value;
          setOptions(current);
          optionsRef.current = current;
          let restored = false;
          try {
            restored = await restoreWorkspace();
          } catch {}
          if (live && !restored) session.scan();
        }
      })
      .catch(() => {
        if (live && !expired) {
          clearTimeout(timer);
          setScan({
            status: "error",
            data: null,
            message:
              "Getter could not load preferences. Close and reopen it to retry.",
          });
        }
      });
    return () => {
      live = false;
      currentScan.current = null;
      clearTimeout(timer);
      session.dispose();
      api.runtime.onMessage.removeListener(receiveWorkspace);
      api.storage.onChanged.removeListener(receivePreferences);
      exportController.current?.abort();
      exportController.current = null;
      downloads.dispose();
    };
  }, [addNotice]);
  useEffect(() => {
    if (options) setPreviews(options.images.loadPreviews);
  }, [options?.images.loadPreviews]);
  useEffect(() => {
    if (!accountOpen && restoreAccountFocus.current) {
      document.getElementById(accountOpener.current)?.focus();
      restoreAccountFocus.current = false;
    }
  }, [accountOpen]);
  function openAccount(event) {
    accountOpener.current = event.currentTarget.id;
    setAccountEntry(accountOpener.current);
  }
  function backFromAccount() {
    restoreAccountFocus.current = true;
    setAccountEntry(null);
  }
  async function switchWorkspace(nextMode, intent = view) {
    if (switching || !workspaceWindow.current) return;
    setSwitching(true);
    const nextView =
      nextMode === "popup" && intent === "inspect" ? lastTool : intent;
    try {
      const result = await api.runtime.sendMessage({
        type: "getter:switch",
        mode: nextMode,
        windowId: workspaceWindow.current,
        workspace: {
          scan: currentScan.current,
          view: nextView,
          lastTool,
          features,
          previews,
        },
      });
      if (!result?.ok) throw Error();
      setAccountEntry(null);
      if (mode === "popup") window.close();
    } catch {
      addNotice(
        "Could not switch views. Try again from the Getter toolbar icon.",
      );
    } finally {
      setSwitching(false);
    }
  }
  function chooseView(next) {
    if (next === "inspect" && mode === "popup") {
      switchWorkspace("panel", "inspect");
      return;
    }
    if (["colors", "fonts", "images", "text"].includes(next)) setLastTool(next);
    if (next === "images" && view !== "images")
      setPreviews(options?.images.loadPreviews || false);
    setView(next);
  }
  function openSettings(focusAccess = false) {
    setAccountEntry(null);
    returnView.current = view;
    setFocusWebsiteAccess(focusAccess);
    setView("settings");
  }
  function updateFeature(name, value) {
    setFeatures((current) => ({ ...current, [name]: value }));
  }
  async function saveOptions(next) {
    if (saving) return;
    const previous = options;
    setOptions(next);
    setSaving(true);
    try {
      await api.storage.local.set({ cssGetterOptions: next });
      addNotice("Preference saved.");
    } catch {
      setOptions((current) => (current === next ? previous : current));
      addNotice("Preference was not saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  async function copy(value, label, sourceScan) {
    if (sourceScan && currentScan.current !== sourceScan) return;
    try {
      await navigator.clipboard.writeText(value);
      addNotice(`Copied ${label || (value.length > 80 ? "value" : value)}.`);
    } catch {
      addNotice("Copy failed. Select and copy the displayed value manually.");
    }
  }
  async function download(blob, filename, sourceScan) {
    // Invalidation happens before React commits ImageCard's abort cleanup.
    if (currentScan.current !== sourceScan || sourceScan.status !== "ready")
      return;
    try {
      await tracker.current.start(URL.createObjectURL(blob), {
        blob: true,
        filename,
      });
    } catch {
      addNotice(
        "Download could not be confirmed. Check browser downloads before retrying.",
      );
    }
  }
  async function exportZip() {
    setZipConfirm(false);
    setExporting(true);
    setExportResult("");
    setPreparedZip(null);
    const controller = new AbortController();
    exportController.current = controller;
    const timeout = setTimeout(() => controller.abort(), EXPORT_LIMITS.totalMs);
    try {
      const result = await makeZip(scan.data.images, {
        signal: controller.signal,
        onProgress: ({ done, total }) => {
          if (exportController.current === controller)
            setExportResult(`Preparing ${done} of ${total} images…`);
        },
      });
      if (exportController.current !== controller) return;
      setPreparedZip(result.blob);
      setExportResult(
        `${result.entries.length} image(s) included; ${result.failed.length} unavailable; ${result.omitted} beyond the export limit.`,
      );
    } catch (error) {
      if (exportController.current === controller)
        setExportResult(
          controller.signal.aborted
            ? "ZIP preparation cancelled."
            : error.message ||
                "ZIP preparation failed. Check image access and try again.",
        );
    } finally {
      clearTimeout(timeout);
      if (exportController.current === controller) {
        exportController.current = null;
        setExporting(false);
      }
    }
  }
  async function saveZip() {
    if (!preparedZip || savingZip) return;
    const blob = preparedZip;
    setPreparedZip(null);
    setSavingZip(true);
    try {
      await tracker.current.start(URL.createObjectURL(blob), {
        blob: true,
        filename: "getter-images.zip",
      });
    } catch {
      addNotice(
        "ZIP download was not confirmed. Check browser downloads before preparing it again.",
      );
    } finally {
      setSavingZip(false);
    }
  }
  const data = scan.data,
    ready = scan.status === "ready",
    current =
      (view === "colors"
        ? data?.colors
        : view === "fonts"
          ? data?.fonts
          : data?.images) || [];
  const usageSort = features.usageSort || { colors: "most", fonts: "most" };
  const shownColors = sortByUsage(data?.colors, usageSort.colors);
  const shownFonts = displayedFonts(
    data?.fonts,
    options?.fonts.detailed,
    usageSort.fonts,
  );
  const bulk = GETTER_STUDIO_WORKSPACE_QA
    ? {
        colors: { entries: current, type: "color" },
        fonts: { entries: shownFonts, type: "font" },
        images: {
          entries:
            view === "images"
              ? current.filter(({ src }) => isSecureImageUrl(src))
              : [],
          type: "image",
        },
      }[view]
    : null;
  function collectAssets(items, { inspection, captureScope, bulk } = {}) {
    if (currentScan.current === scan)
      setCollectionDraft({
        scan,
        items,
        inspection,
        captureScope,
        bulk,
      });
  }
  const colorTotal = data?.usageTotals?.colors ?? totalUses(data?.colors);
  const fontTotal = data?.usageTotals?.fonts ?? totalUses(data?.fonts);
  return (
    <div
      className={
        GETTER_STUDIO_ACCOUNT_QA ? "window studio-account-qa" : "window"
      }
    >
      <header className="top">
        <div className="brand">
          <img
            className="product-mark"
            src="images/CSS-Getter-Icon-48px.png"
            alt=""
            width="24"
            height="24"
          />
          <div className="wordmark">Getter</div>
        </div>
        <div className="top-actions">
          {GETTER_STUDIO_ACCOUNT_QA && (
            <button
              className="settings-button studio-icon-button"
              id="getter-account-entry"
              aria-label="Account"
              title="Account"
              aria-pressed={accountOpen}
              onClick={accountOpen ? backFromAccount : openAccount}
            >
              <AccountIcon />
            </button>
          )}
          <button
            className="mode-button"
            disabled={
              !options || switching || exporting || !!preparedZip || savingZip
            }
            onClick={() =>
              switchWorkspace(mode === "popup" ? "panel" : "popup")
            }
          >
            {mode === "popup" ? "▥ Side panel" : "↗ Popup"}
          </button>
          {GETTER_STUDIO_WORKSPACE_QA ? (
            <button
              className="primary studio-entry-button"
              onClick={() =>
                api.runtime.openOptionsPage().catch(() => {
                  addNotice(
                    "Could not open Studio QA. Try opening Getter again.",
                  );
                })
              }
            >
              Open Studio QA
            </button>
          ) : (
            GETTER_STUDIO_ACCOUNT_QA && (
              <button
                id="getter-studio-entry"
                className="primary studio-entry-button"
                onClick={openAccount}
                aria-expanded={accountOpen}
              >
                Subscribe to Studio
              </button>
            )
          )}
          <button
            className={
              GETTER_STUDIO_ACCOUNT_QA
                ? "settings-button studio-icon-button"
                : "settings-button"
            }
            onClick={() => {
              if (accountOpen && view === "settings") setAccountEntry(null);
              else if (view === "settings") chooseView(returnView.current);
              else openSettings();
            }}
            aria-pressed={!accountOpen && view === "settings"}
            aria-label="Settings"
            title={GETTER_STUDIO_ACCOUNT_QA ? "Settings" : undefined}
          >
            <Icon name="settings" />
            {!GETTER_STUDIO_ACCOUNT_QA && "Settings"}
          </button>
        </div>
      </header>
      <div className="context" hidden={accountOpen}>
        <span className="site-identity" title={scan.host}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <path d="M3 12h18M5 6.5h14M5 17.5h14" />
          </svg>
          <span>{scan.host || "Your current page"}</span>
        </span>
        <button
          className="text-button"
          disabled={
            !options ||
            ["loading", "permission"].includes(scan.status) ||
            exporting
          }
          onClick={() => scanner.current.scan({ requestAccess: true })}
        >
          <Icon name="refresh" /> Scan again
        </button>
      </div>
      <nav className="tabs" aria-label="Explore page" hidden={accountOpen}>
        {["colors", "fonts", "images", "text", "inspect"].map((name) => (
          <button
            key={name}
            aria-pressed={view === name}
            onClick={() => chooseView(name)}
            disabled={switching}
            title={
              name === "inspect" && mode === "popup"
                ? "Open Inspect in the side panel"
                : undefined
            }
          >
            <Icon name={name} />
            {GETTER_STUDIO_ACCOUNT_QA && name === "inspect"
              ? "Quick Inspect"
              : name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </nav>
      <main
        className={
          accountOpen
            ? "studio-account-main"
            : view === "inspect" && ready
              ? "inspect-main"
              : view === "text" && ready
                ? "text-main"
                : view === "settings"
                  ? "settings-main"
                  : ""
        }
      >
        {GETTER_STUDIO_ACCOUNT_QA && accountOpen ? (
          <StudioAccount
            onBack={backFromAccount}
            focusOffer={accountEntry === "getter-studio-entry"}
          />
        ) : view === "about" ? (
          <>
            <h1>Getter</h1>
            <p className="about-lead">
              Explore a page’s colors, typography, images, text and element
              styles.
            </p>
            <p>
              <strong>Created by Aptelum Labs.</strong>
            </p>
            <p>
              <a href="mailto:support@aptelum.com">Contact support</a> ·{" "}
              <a
                href="https://github.com/asbillings07/Getter/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report a problem
              </a>{" "}
              ·{" "}
              <a
                href="https://github.com/asbillings07/Getter"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source and documentation
              </a>
            </p>
            <p>
              <a
                href="https://github.com/asbillings07/Getter/blob/main/PRIVACY.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy notice
              </a>
            </p>
            <p className="muted">
              Page data stays in the current workspace, with a short-lived
              transfer when switching views. Preferences are saved locally.
              Image previews contact their hosts when you enable them, including
              when you turn on “Load previews by default.” File-size requests
              and downloads contact image hosts when you request them.
            </p>
          </>
        ) : view === "settings" ? (
          <>
            <h1>Settings</h1>
            {GETTER_STUDIO_ACCOUNT_QA && (
              <button
                id="getter-settings-account"
                className="secondary studio-settings-account"
                onClick={openAccount}
              >
                <AccountIcon />
                <span>
                  Account &amp; plan <small>Getter Free · Signed out</small>
                </span>
                <span aria-hidden="true">›</span>
              </button>
            )}
            {options ? (
              <>
                <section className="workspace-setting">
                  <span>
                    Open Getter in{" "}
                    <Info label="About opening Getter">
                      Used when you click Getter in the toolbar. Inspect always
                      opens in the side panel.
                    </Info>
                  </span>
                  <div
                    className="appearance-options workspace-options"
                    role="radiogroup"
                    aria-label="Default Getter view"
                  >
                    {[
                      ["popup", "Popup"],
                      ["panel", "Side panel"],
                    ].map(([workspace, label]) => (
                      <label key={workspace}>
                        <input
                          type="radio"
                          name="workspace"
                          checked={options.workspace === workspace}
                          aria-disabled={saving}
                          onChange={() =>
                            saveOptions({ ...options, workspace })
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </section>
                <section className="appearance">
                  <span id="appearance-label">Appearance</span>
                  <div
                    className="appearance-options"
                    role="radiogroup"
                    aria-labelledby="appearance-label"
                  >
                    {["system", "light", "dark"].map((appearance) => (
                      <label key={appearance}>
                        <input
                          type="radio"
                          name="appearance"
                          value={appearance}
                          checked={options.appearance === appearance}
                          aria-disabled={saving}
                          onChange={() =>
                            saveOptions({ ...options, appearance })
                          }
                        />
                        <span>
                          {appearance[0].toUpperCase() + appearance.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
                <WebsiteAccess api={api} focusOnOpen={focusWebsiteAccess} />
                <div className="preferences">
                  {Object.entries(labels).map(([key, label]) => {
                    const group =
                      key in options.fonts
                        ? "fonts"
                        : key in options.colors
                          ? "colors"
                          : "images";
                    return (
                      <label className="setting" key={key}>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={options[group][key]}
                          aria-disabled={saving}
                          onChange={(event) =>
                            saveOptions({
                              ...options,
                              [group]: {
                                ...options[group],
                                [key]: event.target.checked,
                              },
                            })
                          }
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <p>Preferences are unavailable. Close and reopen Getter.</p>
            )}
          </>
        ) : ready && view === "text" ? (
          <TextView
            scan={scan}
            model={features.text}
            onChange={(value) => updateFeature("text", value)}
            onCopy={copy}
            onNotice={addNotice}
            onDownload={(blob, name) => download(blob, name, scan)}
            onCollect={
              GETTER_STUDIO_WORKSPACE_QA
                ? (text, scope) =>
                    collectAssets(
                      [
                        {
                          type: "text",
                          text,
                          scope,
                          name:
                            scope === "selection"
                              ? "Selected text"
                              : scope === "main"
                                ? "Main content"
                                : "Page text",
                        },
                      ],
                      { bulk: "text" },
                    )
                : undefined
            }
          />
        ) : ready && view === "inspect" ? (
          <InspectView
            scan={scan}
            model={features.inspect}
            onChange={(value) => updateFeature("inspect", value)}
            onCopy={copy}
            onNotice={addNotice}
            onCollect={
              GETTER_STUDIO_WORKSPACE_QA && mode === "panel"
                ? (capture, captureScope) =>
                    collectAssets([], { inspection: capture, captureScope })
                : undefined
            }
          />
        ) : !ready ? (
          <section className="state" aria-live="polite">
            <h1>
              {
                {
                  loading: "Reading the page",
                  blocked: "This page cannot be inspected",
                  stale: "Scan again when ready",
                  error: "Unable to scan",
                  access: "Ready to scan this site",
                  permission: "Waiting for site access",
                  denied: "Site access wasn’t allowed",
                }[scan.status]
              }
            </h1>
            <p>{scan.message}</p>
            {["access", "denied"].includes(scan.status) && (
              <>
                <a
                  className="access-settings-link"
                  href="#website-access"
                  onClick={(event) => {
                    event.preventDefault();
                    openSettings(true);
                  }}
                >
                  Enable for all sites in Settings{" "}
                  <span aria-hidden="true">→</span>
                </a>
                <div className="site-access-info">
                  <Info label="About site access">
                    Only this site is requested. Chrome remembers your choice;
                    you can remove access in Chrome’s extension settings. To
                    allow all websites, use Website access in Getter Settings.
                  </Info>
                  <span>About site access</span>
                </div>
              </>
            )}
            {scan.status === "loading" && options && (
              <button
                className="secondary"
                onClick={() => scanner.current.cancel()}
              >
                Cancel scan
              </button>
            )}
          </section>
        ) : (
          <>
            <div className="heading">
              <div className="title-with-info">
                <h1>
                  {
                    {
                      colors: "Page palette",
                      fonts: "Typography",
                      images: "Images",
                    }[view]
                  }
                </h1>
                {["colors", "fonts"].includes(view) && (
                  <Info label="About usage percentages">
                    Click a value to copy it.
                    {view === "colors"
                      ? " Each percentage is this color’s share of detected text and background color uses, not screen area. An inspected element can contribute one text color and one background color."
                      : " Each percentage is this font style’s share of captured font-style uses. The total includes all captured styles, even when some cards are hidden. Uses reflect inspected elements, not text length."}{" "}
                    Percentages are rounded. Partial scans cover only the
                    content Getter could read.
                  </Info>
                )}
              </div>
              <span>
                {view === "fonts" ? shownFonts.length : current.length}{" "}
                {view === "fonts" ? "styles" : view}
              </span>
            </div>
            {GETTER_STUDIO_WORKSPACE_QA && bulk?.entries.length > 0 && (
              <button
                type="button"
                className="secondary studio-batch-add studio-collection-button"
                onClick={() =>
                  collectAssets(
                    bulk.entries.map((item) => ({ ...item, type: bulk.type })),
                    { bulk: view },
                  )
                }
              >
                {collectionLabels[view]}
              </button>
            )}
            {["colors", "fonts"].includes(view) && current.length > 0 && (
              <div className="usage-order">
                <button
                  className="sort-button"
                  title={`Sort ${usageSort[view] === "least" ? "most" : "least"} used first`}
                  onClick={() =>
                    updateFeature("usageSort", {
                      ...usageSort,
                      [view]: usageSort[view] === "least" ? "most" : "least",
                    })
                  }
                >
                  <span aria-hidden="true">
                    {usageSort[view] === "least" ? "↑" : "↓"}
                  </span>
                  {usageSort[view] === "least" ? "Least" : "Most"} used first
                </button>
              </div>
            )}
            {scan.message && (
              <p className="scan-note" role="status">
                {scan.message}
              </p>
            )}
            {!current.length ? (
              <div className="state">
                <h2>No {view} found</h2>
                <p>
                  Getter reads visible elements in the permitted page frames.
                  Try another page or scan again after it loads.
                </p>
              </div>
            ) : view === "colors" ? (
              <>
                <div className="swatches">
                  {shownColors.map((color) => {
                    const value = options.colors.hex
                      ? colorLabel(color.value)
                      : color.value;
                    const card = (
                      <button
                        key={color.value}
                        className={
                          GETTER_STUDIO_WORKSPACE_QA
                            ? "studio-color-copy"
                            : "swatch"
                        }
                        onClick={() => copy(value)}
                        aria-label={`Copy ${value}`}
                        aria-description={`${usagePercentage(color.count, colorTotal)} of color uses`}
                      >
                        <span
                          className="color"
                          style={{
                            background: options.colors.buttonColor
                              ? color.value
                              : "transparent",
                          }}
                        />
                        <span className="color-label">
                          {value}
                          <small>{color.kinds.join(" / ")}</small>
                          <small className="usage-frequency">
                            {usagePercentage(color.count, colorTotal)} of color
                            uses
                          </small>
                        </span>
                      </button>
                    );
                    return GETTER_STUDIO_WORKSPACE_QA ? (
                      <article
                        className="swatch studio-color-card"
                        key={color.value}
                      >
                        {card}
                        <button
                          className="secondary studio-color-save"
                          aria-label={`Save to collection: ${value}`}
                          onClick={() =>
                            collectAssets([{ ...color, type: "color" }])
                          }
                        >
                          <span aria-hidden="true">＋ </span>Save to collection
                        </button>
                      </article>
                    ) : (
                      card
                    );
                  })}
                </div>
              </>
            ) : view === "fonts" ? (
              <div>
                {shownFonts.map((font) => (
                  <article className="font" key={fontStyleKey(font)}>
                    <div className="font-summary">
                      <h2 style={{ fontFamily: font.fontFamily }}>
                        Design is in the details.
                      </h2>
                      <p>
                        {font.tag.toUpperCase()}
                        <span className="usage-frequency">
                          {" · "}
                          {usagePercentage(font.count, fontTotal)} of font uses
                        </span>
                      </p>
                      <div
                        className={
                          GETTER_STUDIO_WORKSPACE_QA
                            ? "studio-font-actions"
                            : undefined
                        }
                      >
                        {options.fonts.fontFamily && (
                          <a
                            href={`https://fonts.google.com/?query=${encodeURIComponent(font.fontFamily.split(",")[0].replaceAll('"', "").replaceAll("'", ""))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Search font family
                          </a>
                        )}
                        {GETTER_STUDIO_WORKSPACE_QA && (
                          <button
                            className="secondary studio-card-save studio-collection-button"
                            aria-label={`Save to collection: ${font.fontFamily} ${font.tag}`}
                            onClick={() =>
                              collectAssets([{ ...font, type: "font" }])
                            }
                          >
                            ＋ Save to collection
                          </button>
                        )}
                      </div>
                    </div>
                    <dl>
                      {Object.entries(font)
                        .filter(
                          ([key]) => key in options.fonts && options.fonts[key],
                        )
                        .map(([key, value]) => (
                          <div key={key}>
                            <dt>{labels[key]}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                    </dl>
                  </article>
                ))}
                {!options.fonts.detailed && (
                  <p className="muted small">
                    One style per element type. Enable “All font styles” in
                    settings to see every captured style.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="image-actions">
                  <label>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={previews}
                      onChange={(event) => setPreviews(event.target.checked)}
                    />{" "}
                    Load previews
                  </label>
                  <button
                    className="secondary"
                    disabled={exporting || !!preparedZip || savingZip}
                    onClick={() => setZipConfirm(true)}
                  >
                    Download ZIP
                  </button>
                </div>
                <p className="muted small">
                  Image requests contact HTTPS hosts without cookies or a
                  referrer. Downloads are limited to 8 MiB per image; hosts that
                  block access and redirects are unavailable.
                </p>
                {zipConfirm && (
                  <section
                    className="export-confirm"
                    aria-label="Confirm ZIP export"
                  >
                    <h2>Prepare an image ZIP?</h2>
                    <p>
                      Fetch up to 40 images from their listed hosts, without
                      cookies. Limits: 8 MiB per image, 32 MiB total. Hosts that
                      block access will be skipped. Keep Getter open while it
                      prepares the ZIP, then review what is included before
                      saving.
                    </p>
                    <button className="primary" onClick={exportZip}>
                      Prepare ZIP
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setZipConfirm(false)}
                    >
                      Cancel
                    </button>
                  </section>
                )}
                {exporting && (
                  <button
                    className="secondary"
                    onClick={() => exportController.current?.abort()}
                  >
                    Cancel ZIP preparation
                  </button>
                )}
                {exportResult && (
                  <p className="scan-note" role="status">
                    {exportResult}
                  </p>
                )}
                {preparedZip && (
                  <section
                    className="export-confirm"
                    aria-label="Save prepared ZIP"
                  >
                    <h2>Your ZIP is ready</h2>
                    <p>
                      Save opens your browser's dialog and may close Getter.
                      Check browser downloads for the final outcome. Closing
                      Getter before saving discards this ZIP.
                    </p>
                    <button className="primary" onClick={saveZip}>
                      Save ZIP
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setPreparedZip(null);
                        setExportResult("Prepared ZIP discarded.");
                      }}
                    >
                      Discard
                    </button>
                  </section>
                )}
                <div className="images">
                  {current.map((image) => (
                    <ImageCard
                      key={image.src}
                      image={image}
                      options={options.images}
                      previews={previews}
                      onDownload={(blob, filename) =>
                        download(blob, filename, scan)
                      }
                      onCollect={
                        GETTER_STUDIO_WORKSPACE_QA &&
                        isSecureImageUrl(image.src)
                          ? () => collectAssets([{ ...image, type: "image" }])
                          : undefined
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      {GETTER_STUDIO_WORKSPACE_QA && collectionDraft && (
        <SidePanelCollect
          {...collectionDraft}
          isCurrent={() => currentScan.current === collectionDraft.scan}
          onClose={() => setCollectionDraft(null)}
        />
      )}
      <footer>
        <span>
          <img
            src="images/aptelum-mark.png"
            alt="Aptelum"
            width="28"
            height="28"
          />
          Created by Aptelum Labs
        </span>
        <button
          className="text-button"
          onClick={() => {
            setAccountEntry(null);
            setView("about");
          }}
        >
          About Getter
        </button>
      </footer>
      <div
        className="notices"
        role="status"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
      >
        {notices.map((notice) => (
          <Notice key={notice.id} {...notice} onDismiss={dismissNotice} />
        ))}
      </div>
    </div>
  );
}
class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal" role="alert">
        <h1>Getter could not display this page.</h1>
        <p>
          Close and reopen Getter to retry. No scan results have been saved.
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
