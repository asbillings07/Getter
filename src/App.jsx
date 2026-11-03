import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ScanSession } from "./core/scan.js";
import { migrateStorage } from "./core/preferences.js";
import { colorLabel } from "./core/extract.js";
import {
  collectImages,
  DownloadTracker,
  EXPORT_LIMITS,
  makeZip,
} from "./core/downloads.js";

const api = globalThis.chrome;
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
};
const empty = { status: "loading", message: "Opening Getter…", data: null };
function Icon({ name }) {
  return (
    <span className="icon" aria-hidden="true">
      {
        { colors: "◉", fonts: "T", images: "▧", settings: "☷", refresh: "↻" }[
          name
        ]
      }
    </span>
  );
}
function ImageCard({ image, options, previews, onDownload }) {
  const [broken, setBroken] = useState(false),
    [size, setSize] = useState(null),
    [reading, setReading] = useState(false),
    [error, setError] = useState("");
  const controller = useRef();
  useEffect(() => () => controller.current?.abort(), []);
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
        setError("Size unavailable. The image host may block access.");
    } finally {
      if (!controller.current.signal.aborted) setReading(false);
    }
  }
  return (
    <article className="image-card">
      <div className="image-preview">
        {previews && !broken ? (
          <img
            src={image.src}
            alt={image.name || filename}
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <span>{broken ? "Preview unavailable" : "Preview off"}</span>
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
              disabled={reading}
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
      <button className="secondary" onClick={() => onDownload(image.src)}>
        Download
      </button>
    </article>
  );
}
function App() {
  const [view, setView] = useState("colors"),
    [scan, setScan] = useState(empty),
    [options, setOptions] = useState(null),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(false),
    [previews, setPreviews] = useState(false),
    [exporting, setExporting] = useState(false),
    [zipConfirm, setZipConfirm] = useState(false),
    [exportResult, setExportResult] = useState("");
  const scanner = useRef(),
    tracker = useRef(),
    exportController = useRef();
  useEffect(() => {
    let live = true,
      expired = false;
    const session = new ScanSession(api, (value) => {
      if (live) {
        setScan(value);
        setPreviews(false);
        setZipConfirm(false);
      }
    });
    scanner.current = session;
    session.start();
    const downloads = new DownloadTracker(
      api.downloads,
      (text) => live && setNotice(text),
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
    migrateStorage(api.storage.local)
      .then((value) => {
        if (live && !expired) {
          clearTimeout(timer);
          setOptions(value);
          session.scan();
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
      clearTimeout(timer);
      session.dispose();
      exportController.current?.abort();
      downloads.dispose();
    };
  }, []);
  useEffect(() => {
    setNotice("");
    setExportResult("");
    setZipConfirm(false);
    exportController.current?.abort();
  }, [scan.data]);
  async function saveOption(group, key, value) {
    const previous = options;
    const next = { ...options, [group]: { ...options[group], [key]: value } };
    setOptions(next);
    setSaving(true);
    try {
      await api.storage.local.set({ cssGetterOptions: next });
      setNotice("Preference saved.");
    } catch {
      setOptions(previous);
      setNotice("Preference was not saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`Copied ${value}.`);
    } catch {
      setNotice("Copy failed. Select and copy the displayed value manually.");
    }
  }
  async function download(url) {
    try {
      await tracker.current.start(url);
    } catch {
      setNotice(
        "Download could not be confirmed. Check browser downloads before retrying.",
      );
    }
  }
  async function exportZip() {
    setZipConfirm(false);
    setExporting(true);
    setExportResult("");
    const controller = new AbortController();
    exportController.current = controller;
    const timeout = setTimeout(() => controller.abort(), EXPORT_LIMITS.totalMs);
    try {
      const result = await makeZip(scan.data.images, {
        signal: controller.signal,
        onProgress: ({ done, total }) =>
          setExportResult(`Preparing ${done} of ${total} images…`),
      });
      const url = URL.createObjectURL(result.blob);
      await tracker.current.start(url, {
        blob: true,
        filename: "getter-images.zip",
      });
      setExportResult(
        `${result.entries.length} image(s) included; ${result.failed.length} unavailable; ${result.omitted} beyond the export limit.`,
      );
    } catch (error) {
      setExportResult(
        controller.signal.aborted
          ? "ZIP preparation cancelled."
          : error.message ||
              "ZIP preparation failed. Try individual downloads.",
      );
    } finally {
      clearTimeout(timeout);
      setExporting(false);
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
  const shownFonts = options?.fonts.detailed
    ? data?.fonts
    : (data?.fonts || []).filter(
        (font, index, all) =>
          all.findIndex((item) => item.tag === font.tag) === index,
      );
  return (
    <div className="window">
      <header className="top">
        <div>
          <div className="wordmark">
            Getter<span>.</span>
          </div>
          <p>Details worth discovering.</p>
        </div>
        <button
          className="icon-button"
          onClick={() => setView("settings")}
          aria-label="Settings"
          aria-pressed={view === "settings"}
        >
          <Icon name="settings" />
        </button>
      </header>
      <div className="context">
        <span title={scan.host}>{scan.host || "Your current page"}</span>
        <button
          className="text-button"
          disabled={!options || scan.status === "loading" || exporting}
          onClick={() => scanner.current.scan()}
        >
          <Icon name="refresh" /> Scan again
        </button>
      </div>
      <nav className="tabs" aria-label="Explore page">
        {["colors", "fonts", "images"].map((name) => (
          <button
            key={name}
            aria-pressed={view === name}
            onClick={() => setView(name)}
          >
            <Icon name={name} />
            {name[0].toUpperCase() + name.slice(1)}
          </button>
        ))}
      </nav>
      <main>
        {view === "about" ? (
          <>
            <h1>Getter</h1>
            <p className="about-lead">
              Discover the colors, typography and images that make a page feel
              like itself.
            </p>
            <p>
              <strong>Created by Aptelum Labs.</strong>
            </p>
            <p>Original design by Amanda Billings.</p>
            <p>
              <a
                href="https://github.com/asbillings07/Getter/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Support and feedback
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
            <p className="muted">
              Scans stay in this popup. Preferences are saved locally. Previews,
              file-size requests and downloads contact the image hosts only when
              you request them.
            </p>
          </>
        ) : view === "settings" ? (
          <>
            <h1>Display preferences</h1>
            {options ? (
              Object.entries(labels).map(([key, label]) => {
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
                      checked={options[group][key]}
                      disabled={saving}
                      onChange={(event) =>
                        saveOption(group, key, event.target.checked)
                      }
                    />
                    {label}
                  </label>
                );
              })
            ) : (
              <p>Preferences are unavailable. Close and reopen Getter.</p>
            )}
          </>
        ) : !ready ? (
          <section className="state" aria-live="polite">
            <h1>
              {
                {
                  loading: "Reading the page",
                  blocked: "This page cannot be inspected",
                  stale: "Scan again when ready",
                  error: "Unable to scan",
                }[scan.status]
              }
            </h1>
            <p>{scan.message}</p>
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
              <h1>
                {
                  {
                    colors: "Page palette",
                    fonts: "Typography",
                    images: "Images",
                  }[view]
                }
              </h1>
              <span>
                {view === "fonts" ? shownFonts?.length : current.length}{" "}
                {view === "fonts" ? "styles" : view}
              </span>
            </div>
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
                  {current.map((color) => {
                    const value = options.colors.hex
                      ? colorLabel(color.value)
                      : color.value;
                    return (
                      <button
                        key={color.value}
                        className="swatch"
                        onClick={() => copy(value)}
                        aria-label={`Copy ${value}`}
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
                          <small>
                            {color.kinds.join(" / ")} · {color.count}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="muted small">Select a color to copy its value.</p>
              </>
            ) : view === "fonts" ? (
              <div>
                {shownFonts.map((font, index) => (
                  <article className="font" key={index}>
                    <h2 style={{ fontFamily: font.fontFamily }}>
                      Design is in the details.
                    </h2>
                    <p>{font.tag.toUpperCase()}</p>
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
                    {options.fonts.fontFamily && (
                      <a
                        href={`https://fonts.google.com/?query=${encodeURIComponent(font.fontFamily.split(",")[0].replaceAll('"', "").replaceAll("'", ""))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Search font family
                      </a>
                    )}
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
                      checked={previews}
                      onChange={(event) => setPreviews(event.target.checked)}
                    />{" "}
                    Load previews
                  </label>
                  <button
                    className="secondary"
                    disabled={exporting}
                    onClick={() => setZipConfirm(true)}
                  >
                    Download ZIP
                  </button>
                </div>
                <p className="muted small">
                  Previews and file-size requests contact image hosts.
                  Individual downloads may use your browser’s site cookies.
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
                      block access will be skipped. Keep Getter open until the
                      download finishes.
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
                <div className="images">
                  {current.map((image) => (
                    <ImageCard
                      key={image.src}
                      image={image}
                      options={options.images}
                      previews={previews}
                      onDownload={download}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
        <p className="notice" role="status" aria-live="polite">
          {notice}
        </p>
      </main>
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
        <button className="text-button" onClick={() => setView("about")}>
          About Getter
        </button>
      </footer>
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
