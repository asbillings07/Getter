import React, { useCallback, useEffect, useRef, useState } from "react";
import { colorLabel } from "../core/extract.js";
import { usagePercentage } from "../core/usage.js";
import {
  confirmSource,
  openWebsites,
  pickElement,
  scanStyles,
  websiteAddress,
} from "./sources.js";
import { saveCapture } from "./projects.js";
import { localImage, websiteImages } from "./images.js";
import ElementDraft from "./ElementDraft.jsx";

const api = globalThis.chrome;

export function StyleValue({ item }) {
  if (item.type === "image")
    return (
      <span className="studio-value">
        <strong>{item.name || "Website image"}</strong>
        <small>
          {item.width && item.height ? `${item.width} × ${item.height}` : ""}
        </small>
      </span>
    );
  return item.type === "color" ? (
    <span className="studio-value">
      <span
        aria-hidden="true"
        className="studio-swatch"
        style={{ backgroundColor: item.value }}
      />
      <code>{colorLabel(item.value)}</code>
      {item.kinds?.length > 0 && <small>{item.kinds.join(", ")}</small>}
    </span>
  ) : (
    <span className="studio-value">
      <strong>{item.fontFamily}</strong>
      <small>
        {item.tag} · {item.fontSize} · Weight {item.fontWeight}
        {item.fontStyle !== "normal" && item.fontStyle
          ? ` · ${item.fontStyle}`
          : ""}
        {" · Line height "}
        {item.lineHeight}
        {" · Letter spacing "}
        {item.letterSpacing}
      </small>
    </span>
  );
}

function coverageNotes(coverage) {
  const notes = [];
  if (coverage.limited) notes.push("Page scan reached its limits.");
  if (coverage.framesOmitted)
    notes.push(`${coverage.framesOmitted} embedded frame(s) skipped.`);
  if (coverage.longValuesOmitted)
    notes.push(`${coverage.longValuesOmitted} long style value(s) skipped.`);
  return notes.join(" ");
}

export default function CollectionCapture({
  projectId,
  collectionId,
  version,
  site,
  onSave,
}) {
  const [tabs, setTabs] = useState([]);
  const [tabId, setTabId] = useState(site?.tabId || "");
  const [address, setAddress] = useState(site?.address || "");
  const [review, setReview] = useState(null);
  const [element, setElement] = useState(null);
  const [selected, setSelected] = useState([]);
  const [reference, setReference] = useState("hostname");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const running = useRef(false);
  const picker = useRef(null);
  const tabsRequest = useRef(0);
  const source = tabs.find((tab) => String(tab.id) === tabId);
  const ready = review && review.source.documentId === source?.documentId;
  const currentElement =
    element && element.source.documentId === source?.documentId;
  const elementVersion =
    version &&
    ["element", "component", "effect", "motion"].includes(version.kind);
  const paletteVersion = version?.kind === "palette";
  const fullVersion = paletteVersion || version?.kind === "page-styles";
  const refreshTabs = useCallback(async () => {
    const run = ++tabsRequest.current;
    try {
      const list = await openWebsites(api);
      if (run !== tabsRequest.current) return;
      setTabs(list);
      setTabId((current) =>
        current === site?.tabId &&
        !list.some(
          ({ id, hostname }) =>
            String(id) === current && hostname === site.hostname,
        )
          ? ""
          : current,
      );
    } catch {
      if (run === tabsRequest.current)
        setStatus("Open tabs are unavailable. Refresh to try again.");
    }
  }, [site?.tabId, site?.hostname]);
  useEffect(() => {
    const updated = (id, change) => {
      if (change.status === "loading") {
        ++tabsRequest.current;
        setTabs((current) => current.filter((tab) => tab.id !== id));
      }
      if (change.status === "complete") refreshTabs();
    };
    const revoked = () => {
      picker.current?.abort();
      setReview(null);
      setElement(null);
      setSelected([]);
      setStatus(
        "Site access changed. Scan the page again to select current styles.",
      );
      refreshTabs();
    };
    refreshTabs();
    api.tabs.onUpdated.addListener(updated);
    api.tabs.onRemoved.addListener(refreshTabs);
    api.permissions.onAdded.addListener(refreshTabs);
    api.permissions.onRemoved.addListener(revoked);
    return () => {
      picker.current?.abort();
      ++tabsRequest.current;
      api.tabs.onUpdated.removeListener(updated);
      api.tabs.onRemoved.removeListener(refreshTabs);
      api.permissions.onAdded.removeListener(refreshTabs);
      api.permissions.onRemoved.removeListener(revoked);
    };
  }, [refreshTabs]);

  async function run(action) {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setStatus("");
    try {
      await action();
    } catch (error) {
      setStatus(
        error?.name === "QuotaExceededError"
          ? "Chrome storage is full. Your existing collection is still saved."
          : error?.message ||
              "Chrome could not complete this action. Try again.",
      );
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  function openWebsite(event) {
    event.preventDefault();
    run(async () => {
      let url;
      try {
        url = websiteAddress(address);
      } catch {
        throw Error(
          "Enter a regular HTTP or HTTPS website address without credentials.",
        );
      }
      const tab = await api.tabs.create({ url: url.href, active: false });
      setReview(null);
      setElement(null);
      setSelected([]);
      setTabId(String(tab.id));
      setAddress("");
      await refreshTabs();
      setStatus("Website opened. Scan styles once the tab has loaded.");
    });
  }

  function scan() {
    run(async () => {
      setReview(null);
      setElement(null);
      setSelected([]);
      setReference("hostname");
      const result = await scanStyles(api, source);
      const images = result.images.map((item) => ({ ...item, type: "image" }));
      const types =
        version?.kind === "selected-styles" &&
        new Set(version.items.map(({ type }) => type));
      const items = [...result.items, ...images].filter(
        ({ type }) =>
          (!types || types.has(type)) &&
          (!fullVersion ||
            (paletteVersion ? type === "color" : type !== "image")),
      );
      setReview({ ...result, items, id: crypto.randomUUID() });
      if (!items.length) setStatus("This scan found no assets to save.");
    });
  }

  function inspect() {
    run(async () => {
      setReview(null);
      setElement(null);
      setSelected([]);
      setReference("hostname");
      const control = new AbortController();
      picker.current = control;
      try {
        const result = await pickElement(api, source, control.signal);
        if (result) setElement({ ...result, id: crypto.randomUUID(), source });
      } finally {
        picker.current = null;
      }
    });
  }

  function sourceReference(scan) {
    return reference === "title" && scan.title
      ? { title: scan.title }
      : { hostname: scan.source.hostname };
  }

  async function record({ items, kind, ...data }) {
    const { project, result: duplicate } = await saveCapture(
      projectId,
      collectionId,
      {
        ...data,
        items,
        kind,
        id: crypto.randomUUID(),
        previousId: version?.id,
        extractionVersion: 2,
        savedAt: new Date().toISOString(),
      },
    );
    onSave(project);
    setSelected([]);
    setStatus(
      duplicate
        ? "These styles are already saved from this scan."
        : "Saved to the collection on this device.",
    );
  }

  function save(snapshot = false) {
    run(async () => {
      await confirmSource(api, review.source);
      const chosen = snapshot
        ? review.items.filter((item) => item.type !== "image")
        : review.items.filter((_, index) => selected.includes(index));
      const styles = chosen.filter((item) => item.type !== "image");
      const images = await websiteImages(
        chosen.filter((item) => item.type === "image"),
      );
      await confirmSource(api, review.source);
      await record({
        scanId: review.id,
        selection: snapshot ? undefined : [...selected].sort((a, b) => a - b),
        kind: paletteVersion
          ? "palette"
          : snapshot
            ? "page-styles"
            : "selected-styles",
        source: sourceReference(review),
        coverage: review.coverage,
        items: [...styles, ...images],
      });
    });
  }

  function saveElement(item) {
    run(async () => {
      await confirmSource(api, element.source);
      const { viewport, visited, limited, resourcesOmitted } = element;
      await record({
        scanId: element.id,
        kind: item.type,
        items: [item],
        source: sourceReference(element),
        coverage: { viewport, visited, limited, resourcesOmitted },
      });
    });
  }

  function upload(event) {
    const [file] = event.target.files;
    event.target.value = "";
    if (file)
      run(async () =>
        record({
          scanId: crypto.randomUUID(),
          kind: "image",
          source: { title: "Local image" },
          items: [await localImage(file)],
        }),
      );
  }

  function referencePicker(scan) {
    return (
      <label>
        Source reference
        <select
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          disabled={pending}
        >
          <option value="hostname">
            Website hostname · {scan.source.hostname}
          </option>
          {scan.title && (
            <option value="title">Page title only · {scan.title}</option>
          )}
        </select>
      </label>
    );
  }

  return (
    <section aria-labelledby="collect-heading" className="studio-card">
      <h2 id="collect-heading">Collect from a website</h2>
      {version && (
        <p>
          Capture a new version of{" "}
          {version.source.title || version.source.hostname}. Review the source
          and scope before saving.
        </p>
      )}
      <form onSubmit={openWebsite} className="studio-row studio-site-picker">
        <label>
          Website address
          <input
            type="url"
            placeholder="https://example.com"
            maxLength={2048}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            required
            disabled={pending}
          />
        </label>
        <button className="secondary" disabled={pending}>
          Open website
        </button>
      </form>
      <div className="studio-row studio-site-picker">
        <label>
          Open tabs
          <select
            value={source ? tabId : ""}
            disabled={pending}
            onChange={(event) => {
              setTabId(event.target.value);
              setReview(null);
              setElement(null);
              setSelected([]);
              setStatus("");
            }}
          >
            <option value="">Choose a tab in this window</option>
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary" disabled={pending} onClick={refreshTabs}>
          Refresh tabs
        </button>
        <button
          className="primary"
          disabled={pending || !source || elementVersion}
          onClick={scan}
        >
          Scan styles
        </button>
        <button
          className="secondary"
          disabled={pending || !source || (!!version && !elementVersion)}
          onClick={inspect}
        >
          Pick an element
        </button>
      </div>
      {!version && (
        <label className="studio-file-field">
          Add a local image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp"
            disabled={pending}
            onChange={upload}
          />
        </label>
      )}
      {((review && !ready) || (element && !currentElement)) && (
        <p role="status">
          The page changed or closed. Scan the current page before saving.
        </p>
      )}
      {currentElement && (
        <>
          <div className="studio-fields">{referencePicker(element)}</div>
          <ElementDraft
            key={element.id}
            capture={element}
            versionKind={elementVersion ? version.kind : undefined}
            onSave={saveElement}
            pending={pending}
          />
        </>
      )}
      {ready && review.items.length > 0 && (
        <>
          <div className="studio-scan-heading">
            <h3>
              {paletteVersion
                ? "Palette colors to save"
                : fullVersion
                  ? "Page styles to save"
                  : "Select styles and images"}
            </h3>
            <p>{coverageNotes(review.coverage)}</p>
          </div>
          <div
            className="studio-style-list"
            role="group"
            aria-label="Styles found on this page"
          >
            {review.items.map((item, index) => (
              <label key={index}>
                <input
                  type="checkbox"
                  disabled={pending || fullVersion}
                  checked={fullVersion || selected.includes(index)}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setSelected((current) =>
                      checked
                        ? [...current, index]
                        : current.filter((key) => key !== index),
                    );
                  }}
                />
                <StyleValue item={item} />
                {item.type !== "image" && (
                  <small>
                    {usagePercentage(
                      item.count,
                      review.coverage.usageTotals[
                        item.type === "color" ? "colors" : "fonts"
                      ],
                    )}{" "}
                    of {item.type} uses
                  </small>
                )}
              </label>
            ))}
          </div>
          <div className="studio-row studio-site-picker">
            {referencePicker(review)}
            {!fullVersion && (
              <button
                className="primary"
                disabled={pending || !selected.length}
                onClick={() => save()}
              >
                Save selected ({selected.length})
              </button>
            )}
            {(!version || fullVersion) && (
              <button
                className="secondary"
                disabled={
                  pending || !review.items.some((item) => item.type !== "image")
                }
                onClick={() => save(true)}
              >
                {paletteVersion ? "Save palette" : "Save page styles"}
              </button>
            )}
          </div>
        </>
      )}
      <p role="status">{pending ? "Working…" : status}</p>
    </section>
  );
}
