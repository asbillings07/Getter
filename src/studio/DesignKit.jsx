import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DownloadTracker } from "../core/downloads.js";
import { AssetValue } from "./Collections.jsx";
import { assetKinds, cleanName } from "./library.js";
import { formatInfo, includesAsset, prepareExport } from "./exports.js";

function Guide({ name, items }) {
  return (
    <section className="studio-guide">
      <h2>{name}</h2>
      {Object.entries(assetKinds).map(([type, label]) => {
        const group = items.filter(({ value }) => value.type === type);
        if (!group.length) return null;
        return (
          <section key={type}>
            <h3>{label}</h3>
            <ul>
              {group.map((asset) => (
                <li key={asset.id}>
                  <strong>{asset.name}</strong>
                  {asset.role && <span> · {asset.role}</span>}
                  <AssetValue asset={asset} />
                  {asset.notes && <p>{asset.notes}</p>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}

export default function DesignKit({ collection, onSave }) {
  const current = collection.assets.filter(({ removedAt }) => !removedAt);
  const kits = collection.kits || [];
  const [kitId, setKitId] = useState("");
  const [name, setName] = useState(collection.name.slice(0, 60));
  const [format, setFormat] = useState("bundle");
  const [selected, setSelected] = useState(
    () => new Set(current.map(({ id }) => id)),
  );
  const [includeSources, setIncludeSources] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const tracker = useRef(null);
  const activeKit = kits.find(({ id }) => id === kitId);
  const candidates = new Map(current.map((item) => [item.id, item]));
  for (const item of activeKit?.items || []) candidates.set(item.id, item);
  const options = [...candidates.values()];
  const items = options.filter(({ id }) => selected.has(id));
  const eligible = items.filter((item) => includesAsset(format, item));
  const unchangedSources = format === "bundle" && includeSources;
  const omitted = items.length - eligible.length;
  useEffect(() => {
    tracker.current = new DownloadTracker(
      globalThis.chrome.downloads,
      setStatus,
    );
    return () => tracker.current.dispose();
  }, []);

  function chooseKit(id) {
    const kit = kits.find((item) => item.id === id);
    setKitId(id);
    setName(kit?.name || collection.name.slice(0, 60));
    setFormat(kit?.format || "bundle");
    setIncludeSources(kit?.includeSources || false);
    setSelected(new Set((kit?.items || current).map((item) => item.id)));
    setStatus("");
  }

  async function action(task) {
    if (pending) return;
    setStatus("");
    setPending(true);
    try {
      await task();
    } catch (error) {
      setStatus(
        error?.name === "QuotaExceededError"
          ? "Chrome storage is full. Your existing work is still saved."
          : error?.message || "Couldn’t complete the design kit.",
      );
    } finally {
      setPending(false);
    }
  }

  function save() {
    action(async () => {
      const id = kitId || crypto.randomUUID();
      await onSave({
        id,
        name: cleanName(name),
        format,
        includeSources: unchangedSources,
        items,
        savedAt: new Date().toISOString(),
      });
      setKitId(id);
      setStatus("Design kit saved on this device.");
    });
  }

  function download() {
    action(async () => {
      if (format === "canva") {
        window.print();
        return;
      }
      const { blob, filename } = await prepareExport({
        name: cleanName(name),
        format,
        items,
        includeSources: unchangedSources,
        captures: collection.captures,
      });
      await tracker.current.start(URL.createObjectURL(blob), {
        blob: true,
        filename,
      });
    });
  }

  return (
    <div className="studio-collection-grid">
      <section className="studio-card" aria-labelledby="kit-heading">
        <h2 id="kit-heading">Design kit</h2>
        <div className="studio-fields">
          {kits.length > 0 && (
            <label>
              Saved design kits
              <select
                value={kitId}
                disabled={pending}
                onChange={(event) => chooseKit(event.target.value)}
              >
                <option value="">New design kit</option>
                {kits.map((kit) => (
                  <option key={kit.id} value={kit.id}>
                    {kit.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Kit name
            <input
              value={name}
              maxLength={60}
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Destination
            <select
              value={format}
              disabled={pending}
              onChange={(event) => setFormat(event.target.value)}
            >
              {Object.entries(formatInfo).map(([value, [label]]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="studio-style-list"
          role="group"
          aria-label="Select assets for design kit"
        >
          {options.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                disabled={pending}
                checked={selected.has(item.id)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((previous) => {
                    const next = new Set(previous);
                    if (checked) next.add(item.id);
                    else next.delete(item.id);
                    return next;
                  });
                }}
              />
              <strong>{item.name}</strong>
              <small>{assetKinds[item.value.type]}</small>
            </label>
          ))}
        </div>
        {format === "bundle" && (
          <label className="studio-inline-action">
            <input
              type="checkbox"
              checked={includeSources}
              disabled={pending}
              onChange={(event) => setIncludeSources(event.target.checked)}
            />{" "}
            Include source references
          </label>
        )}
        <div className="studio-row studio-inline-action">
          <button
            className="secondary"
            disabled={pending || !items.length || !name.trim()}
            onClick={save}
          >
            Save design kit
          </button>
          <button
            className="primary"
            disabled={pending || !eligible.length || !name.trim()}
            onClick={download}
          >
            {format === "canva" ? "Print or save PDF" : "Download export"}
          </button>
        </div>
        {status && <p role="status">{status}</p>}
      </section>
      <section className="studio-card" aria-labelledby="export-review">
        <h2 id="export-review">Review export</h2>
        <p>{formatInfo[format][1]}</p>
        <p>
          {eligible.length} of {items.length} selected items will transfer.
        </p>
        {!!omitted && (
          <details>
            <summary>Skipped items ({omitted})</summary>
            <ul>
              {items
                .filter((item) => !includesAsset(format, item))
                .map((item) => (
                  <li key={item.id}>{item.name}</li>
                ))}
            </ul>
          </details>
        )}
        {format === "canva" && eligible.length > 0 ? (
          <Guide name={name.trim() || collection.name} items={eligible} />
        ) : (
          <ul>
            {eligible.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        )}
      </section>
      {format === "canva" &&
        createPortal(
          <div className="studio-print-guide">
            <Guide name={name.trim() || collection.name} items={eligible} />
          </div>,
          document.body,
        )}
    </div>
  );
}
