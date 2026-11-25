import React, { useEffect, useRef, useState } from "react";
import { DownloadTracker } from "../core/downloads.js";
import { colorLabel } from "../core/extract.js";
import { assetKinds, cleanName } from "./library.js";
import { slug } from "./exports.js";
import { safeStyleValue } from "./inspect.js";
import {
  addFromAsset,
  applyFromAsset,
  checkColor,
  formats,
  layer,
  layerLabels,
  moveLayer,
  resizeCanvas,
} from "./design.js";
import DesignCanvas, { exportDesign } from "./DesignCanvas.jsx";

function Control({ label, children }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

function NumberField({ label, value, onChange, min, max, step = 1 }) {
  const [input, setInput] = useState(String(value));
  useEffect(() => setInput(String(value)), [value]);
  function commit() {
    const next = input.trim() ? Number(input) : value;
    const bounded = Number.isFinite(next)
      ? Math.min(max, Math.max(min, next))
      : value;
    setInput(String(bounded));
    if (bounded !== value) onChange(bounded);
  }
  return (
    <Control label={label}>
      <input
        type="number"
        value={input}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setInput(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </Control>
  );
}

function ColorField({ label, value, onChange, onError }) {
  const [input, setInput] = useState(value);
  useEffect(() => setInput(value), [value]);
  function commit() {
    try {
      const next = checkColor(input);
      if (next !== value) onChange(next);
    } catch (error) {
      onError(error.message);
      setInput(value);
    }
  }
  return (
    <Control label={label}>
      <span className="design-color-field">
        <span aria-hidden="true" style={{ backgroundColor: value }} />
        <input
          value={input}
          maxLength={128}
          onChange={(event) => setInput(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </span>
    </Control>
  );
}

function LayerProperties({
  selected,
  draft,
  changeLayer,
  changeDraft,
  onError,
}) {
  const number = (name, label, min, max, step) => (
    <NumberField
      key={name}
      label={label}
      value={selected[name]}
      min={min}
      max={max}
      step={step}
      onChange={(value) => changeLayer({ [name]: value })}
    />
  );
  const color = (name, label) => (
    <ColorField
      label={label}
      value={selected[name]}
      onChange={(value) => changeLayer({ [name]: value })}
      onError={onError}
    />
  );
  const text = selected && ["text", "button"].includes(selected.type);
  const surface = selected && ["shape", "button"].includes(selected.type);
  return (
    <aside
      className="studio-card studio-fields design-properties"
      aria-label="Design properties"
    >
      <h2>{selected ? "Layer properties" : "Design settings"}</h2>
      {selected ? (
        <>
          <Control label="Layer name">
            <input
              value={selected.name}
              maxLength={60}
              onChange={(event) =>
                changeLayer({ name: event.target.value }, "name")
              }
            />
          </Control>
          {text && (
            <Control label="Layer text">
              <textarea
                value={selected.text}
                maxLength={600}
                onChange={(event) =>
                  changeLayer({ text: event.target.value }, "text")
                }
              />
            </Control>
          )}
          <div className="design-number-grid">
            {number("x", "X position", -draft.width, draft.width * 2)}
            {number("y", "Y position", -draft.height, draft.height * 2)}
            {number("width", "Width", 1, draft.width * 2)}
            {number("height", "Height", 1, draft.height * 2)}
          </div>
          {surface && color("fill", "Fill")}
          {(surface || selected.type === "image") &&
            number("radius", "Corner radius", 0, 600)}
          {text && (
            <>
              {color("textColor", "Text color")}
              <Control label="Font family">
                <input
                  key={selected.fontFamily}
                  defaultValue={selected.fontFamily}
                  maxLength={180}
                  onBlur={(event) => {
                    const next = event.target.value.trim();
                    if (next === selected.fontFamily) return;
                    if (
                      safeStyleValue(next) &&
                      CSS.supports("font-family", next)
                    )
                      changeLayer({ fontFamily: next });
                    else {
                      event.target.value = selected.fontFamily;
                      onError("Enter a CSS font family.");
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </Control>
              <div className="design-number-grid">
                {number("fontSize", "Type size", 6, 240)}
                <Control label="Weight">
                  <select
                    value={selected.fontWeight}
                    onChange={(event) =>
                      changeLayer({ fontWeight: event.target.value })
                    }
                  >
                    {[
                      ...new Set([
                        "400",
                        "500",
                        "600",
                        "700",
                        selected.fontWeight,
                      ]),
                    ].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Control>
                {number("lineHeight", "Line height", 0.85, 3, 0.05)}
                {number("letterSpacing", "Letter spacing", -20, 80, 0.1)}
              </div>
              <Control label="Alignment">
                <select
                  value={selected.align}
                  onChange={(event) =>
                    changeLayer({ align: event.target.value })
                  }
                >
                  <option value="start">Left</option>
                  <option value="middle">Center</option>
                  <option value="end">Right</option>
                </select>
              </Control>
            </>
          )}
          {selected.type === "image" && (
            <Control label="Artwork fit">
              <select
                value={selected.fit}
                onChange={(event) => changeLayer({ fit: event.target.value })}
              >
                <option value="cover">Fill frame</option>
                <option value="contain">Fit inside</option>
              </select>
            </Control>
          )}
          {number("opacity", "Opacity", 0, 1, 0.05)}
        </>
      ) : (
        <>
          <Control label="Design name">
            <input
              maxLength={60}
              value={draft.name}
              onChange={(event) =>
                changeDraft({ name: event.target.value }, "draft-name")
              }
            />
          </Control>
          <Control label="Canvas format">
            <select
              value={draft.format}
              onChange={(event) =>
                changeDraft(resizeCanvas(draft, event.target.value))
              }
            >
              {Object.entries(formats).map(([id, format]) => (
                <option key={id} value={id}>
                  {format.label} ({format.width} × {format.height})
                </option>
              ))}
            </select>
          </Control>
          <ColorField
            label="Canvas background"
            value={draft.background}
            onChange={(value) => changeDraft({ background: value })}
            onError={onError}
          />
        </>
      )}
    </aside>
  );
}

function ExportDialog({ onClose, onDownload, pending, status }) {
  const element = useRef(null);
  const [format, setFormat] = useState("svg");
  useEffect(() => {
    element.current.showModal();
  }, []);
  return (
    <dialog
      ref={element}
      onClose={onClose}
      aria-label="Export draft"
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <h2>Export draft</h2>
      <div className="studio-fields">
        <Control label="File format">
          <select
            value={format}
            disabled={pending}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="svg">SVG · Text and shapes</option>
            <option value="png">PNG · Flattened image</option>
          </select>
        </Control>
      </div>
      <p>
        {format === "svg"
          ? "The SVG contains vector shapes, text, and embedded artwork. Fonts are referenced by name."
          : "The PNG uses the canvas dimensions."}
      </p>
      <div className="studio-row">
        <button
          className="secondary"
          disabled={pending}
          onClick={() => element.current.close()}
        >
          Done
        </button>
        <button
          className="primary"
          disabled={pending}
          onClick={() => onDownload(format)}
        >
          {pending ? "Preparing…" : `Download ${format.toUpperCase()}`}
        </button>
      </div>
      {status && <p role="status">{status}</p>}
    </dialog>
  );
}

const supported = (item, asset) =>
  asset.value.type === "color" ||
  (item &&
    ((["text", "button"].includes(item.type) && asset.value.type === "font") ||
      (["text", "button", "shape"].includes(item.type) &&
        ["element", "effect"].includes(asset.value.type))));

export default function DesignEditor({
  initial,
  collection,
  startingAsset,
  onSave,
  onBack,
}) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState(startingAsset?.name || "");
  const [typeFilter, setTypeFilter] = useState("");
  const [colorTarget, setColorTarget] = useState("");
  const [visible, setVisible] = useState(30);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [move, setMove] = useState(null);
  const history = useRef([]);
  const redo = useRef([]);
  const group = useRef(null);
  const revision = useRef(initial.revision);
  const savingTask = useRef(null);
  const tracker = useRef(null);
  const stage = useRef(null);
  const drag = useRef(null);
  const dirty = draft !== saved;
  const selected = draft.layers.find(({ id }) => id === selectedId);
  const chosenColorTarget =
    (selected || colorTarget === "background" ? colorTarget : "") ||
    (selected?.type === "text"
      ? "textColor"
      : selected && ["shape", "button"].includes(selected.type)
        ? "fill"
        : "background");
  const assets = collection.assets.filter(
    ({ removedAt, name, role, value }) =>
      !removedAt &&
      (!typeFilter || value.type === typeFilter) &&
      `${name} ${role || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    tracker.current = new DownloadTracker(
      globalThis.chrome.downloads,
      setExportStatus,
    );
    return () => tracker.current.dispose();
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const confirm = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", confirm);
    return () => window.removeEventListener("beforeunload", confirm);
  }, [dirty]);

  function change(next, field) {
    if (savingTask.current) return;
    const time = Date.now();
    if (
      !field ||
      group.current?.field !== field ||
      time - group.current.time > 650
    ) {
      history.current.push(draft);
      if (history.current.length > 80) history.current.shift();
    }
    group.current = field ? { field, time } : null;
    redo.current = [];
    setDraft(next);
    setStatus("");
  }

  function changeLayer(fields, field) {
    if (!selected) return;
    change(
      {
        ...draft,
        layers: draft.layers.map((item) =>
          item.id === selected.id ? { ...item, ...fields } : item,
        ),
      },
      field && `${selected.id}-${field}`,
    );
  }

  function select(id) {
    setSelectedId(id);
    setColorTarget("");
    group.current = null;
  }

  function undo() {
    if (!history.current.length) return;
    redo.current.push(draft);
    setDraft(history.current.pop());
    group.current = null;
  }

  function redoEdit() {
    if (!redo.current.length) return;
    history.current.push(draft);
    setDraft(redo.current.pop());
    group.current = null;
  }

  function add(item) {
    change({ ...draft, layers: [...draft.layers, item] });
    select(item.id);
  }

  function useAsset(asset) {
    try {
      const kind = asset.value.type;
      if (
        ["image", "component", "text"].includes(kind) &&
        !(kind === "image" && selected?.type === "image")
      ) {
        add(addFromAsset(asset, draft));
      } else if (kind === "color" && chosenColorTarget === "background") {
        change({
          ...draft,
          background: checkColor(asset.color || asset.value.value),
        });
      } else if (selected) {
        const updated = applyFromAsset(selected, asset, chosenColorTarget);
        changeLayer({ ...updated, assetId: asset.id });
      }
    } catch (error) {
      setStatus(error.message);
    }
  }

  function save() {
    if (savingTask.current) return savingTask.current;
    if (!dirty) return Promise.resolve(true);
    setSaving(true);
    group.current = null;
    setStatus("");
    const snapshot = draft;
    const work = Promise.resolve().then(async () => {
      try {
        const name = cleanName(snapshot.name);
        const nextRevision = await onSave(
          { ...snapshot, name },
          revision.current,
        );
        revision.current = nextRevision;
        setSaved(snapshot);
        return true;
      } catch (error) {
        setStatus(
          error?.name === "QuotaExceededError"
            ? "Chrome storage is full. This draft is still open."
            : error.message || "Couldn’t save the draft.",
        );
        return false;
      } finally {
        savingTask.current = null;
        setSaving(false);
      }
    });
    savingTask.current = work;
    return work;
  }

  async function leave() {
    if (await save()) onBack();
  }

  async function download(format) {
    setExporting(true);
    setExportStatus("");
    try {
      const blob = await exportDesign(stage.current, draft, format);
      await tracker.current.start(URL.createObjectURL(blob), {
        blob: true,
        filename: `${slug(draft.name)}.${format}`,
      });
    } catch (error) {
      setExportStatus(error.message || "Couldn’t export the draft.");
    } finally {
      setExporting(false);
    }
  }

  function coordinates(event) {
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(
      stage.current.getScreenCTM().inverse(),
    );
  }
  function startDrag(event, item, resize = false) {
    if (event.button !== 0 || saving) return;
    select(item?.id || null);
    if (!item) return;
    event.preventDefault();
    stage.current.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      item,
      start: coordinates(event),
      resize,
      next: null,
    };
  }
  function dragAt(event) {
    const active = drag.current;
    if (active?.id !== event.pointerId) return;
    const position = coordinates(event);
    const x = Math.round(position.x - active.start.x),
      y = Math.round(position.y - active.start.y);
    const item = active.item;
    if (!x && !y && !active.next) return;
    active.next = active.resize
      ? {
          width: Math.max(1, item.width + x),
          height: Math.max(1, item.height + y),
        }
      : { x: item.x + x, y: item.y + y };
    setMove({ id: item.id, ...active.next });
  }
  function finishDrag(event, cancel = false) {
    const active = drag.current;
    if (active?.id !== event.pointerId) return;
    drag.current = null;
    setMove(null);
    if (!cancel && active.next) {
      change({
        ...draft,
        layers: draft.layers.map((item) =>
          item.id === active.item.id ? { ...item, ...active.next } : item,
        ),
      });
    }
  }
  const canvas = move
    ? {
        ...draft,
        layers: draft.layers.map((item) =>
          item.id === move.id ? { ...item, ...move } : item,
        ),
      }
    : draft;
  const canvasSelected = canvas.layers.find(({ id }) => id === selectedId);
  const layerIndex = draft.layers.findIndex(({ id }) => id === selectedId);
  return (
    <section aria-label="Studio editor" className="design-editor">
      <div className="design-edit-head">
        <div>
          <button className="text-button" disabled={saving} onClick={leave}>
            ← Back to collection
          </button>
          <h1>{draft.name || "Untitled design"}</h1>
          <small role="status">
            {status ||
              (saving
                ? "Saving…"
                : dirty
                  ? "Unsaved changes"
                  : "Draft saved to collection")}
          </small>
        </div>
        <div className="studio-row">
          <button
            className="secondary"
            disabled={saving || !history.current.length}
            onClick={undo}
          >
            Undo
          </button>
          <button
            className="secondary"
            disabled={saving || !redo.current.length}
            onClick={redoEdit}
          >
            Redo
          </button>
          <button
            className="secondary"
            disabled={saving || !dirty}
            onClick={save}
          >
            Save draft
          </button>
          <button
            className="primary"
            onClick={() => {
              setExportStatus("");
              setExportOpen(true);
            }}
          >
            Export draft
          </button>
        </div>
      </div>
      <div className="design-editor-grid">
        <aside
          className="studio-card studio-fields design-sidebar"
          aria-label="Layers and collection assets"
        >
          <h2>Layers</h2>
          <div className="design-layer-list">
            <button
              className="secondary"
              aria-pressed={!selected}
              onClick={() => select(null)}
            >
              Canvas
            </button>
            {draft.layers.toReversed().map((item) => (
              <button
                className="secondary"
                key={item.id}
                aria-pressed={selectedId === item.id}
                onClick={() => select(item.id)}
              >
                {item.name || layerLabels[item.type]}
                {item.hidden ? " · hidden" : ""}
              </button>
            ))}
          </div>
          <div className="studio-row design-layer-actions">
            <button className="secondary" onClick={() => add(layer("text"))}>
              Add text
            </button>
            <button className="secondary" onClick={() => add(layer("shape"))}>
              Add shape
            </button>
            <button className="secondary" onClick={() => add(layer("button"))}>
              Add button
            </button>
          </div>
          {selected && (
            <div className="studio-row design-layer-actions">
              <button
                className="text-button"
                disabled={layerIndex === draft.layers.length - 1}
                onClick={() =>
                  change({
                    ...draft,
                    layers: moveLayer(draft.layers, selected.id, 1),
                  })
                }
              >
                Bring forward
              </button>
              <button
                className="text-button"
                disabled={layerIndex === 0}
                onClick={() =>
                  change({
                    ...draft,
                    layers: moveLayer(draft.layers, selected.id, -1),
                  })
                }
              >
                Send backward
              </button>
              <button
                className="text-button"
                onClick={() => changeLayer({ hidden: !selected.hidden })}
              >
                {selected.hidden ? "Show layer" : "Hide layer"}
              </button>
              <button
                className="text-button"
                onClick={() =>
                  add({
                    ...selected,
                    id: crypto.randomUUID(),
                    name: `${selected.name.slice(0, 55)} copy`,
                    x: selected.x + 16,
                    y: selected.y + 16,
                  })
                }
              >
                Duplicate
              </button>
              <button
                className="text-button"
                onClick={() => {
                  change({
                    ...draft,
                    layers: draft.layers.filter(({ id }) => id !== selected.id),
                  });
                  select(null);
                }}
              >
                Remove
              </button>
            </div>
          )}
          <h2 className="design-assets-title">Collection assets</h2>
          <Control label="Find collection assets">
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(30);
              }}
            />
          </Control>
          <Control label="Asset type">
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setVisible(30);
              }}
            >
              <option value="">All types</option>
              {Object.entries(assetKinds)
                .filter(([key]) => key !== "motion")
                .map(([type, label]) => (
                  <option key={type} value={type}>
                    {label}
                  </option>
                ))}
            </select>
          </Control>
          <Control label="Apply color to">
            <select
              value={chosenColorTarget}
              onChange={(event) => setColorTarget(event.target.value)}
            >
              <option value="background">Canvas background</option>
              {selected && ["button", "text"].includes(selected.type) && (
                <option value="textColor">Selected text</option>
              )}
              {selected && ["button", "shape"].includes(selected.type) && (
                <option value="fill">Selected fill</option>
              )}
            </select>
          </Control>
          <div className="design-asset-list">
            {assets.slice(0, visible).map((asset) => {
              const kind = asset.value.type;
              const action =
                ["component", "text"].includes(kind) ||
                (kind === "image" && selected?.type !== "image")
                  ? "Insert"
                  : kind === "image"
                    ? "Replace"
                    : "Apply";
              return (
                <div key={asset.id}>
                  {kind === "color" && (
                    <span
                      className="studio-side-swatch"
                      style={{
                        backgroundColor: asset.color || asset.value.value,
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {asset.name}
                    <small>
                      {kind === "color"
                        ? colorLabel(asset.color || asset.value.value)
                        : assetKinds[kind]}
                    </small>
                  </span>
                  <button
                    className="secondary"
                    aria-label={`${action} ${asset.name}`}
                    disabled={
                      saving ||
                      (!["image", "component", "text"].includes(kind) &&
                        !supported(selected, asset))
                    }
                    onClick={() => useAsset(asset)}
                  >
                    {action}
                  </button>
                </div>
              );
            })}
            {!assets.length && <p>No matching collection assets.</p>}
            {assets.length > visible && (
              <button
                className="secondary"
                onClick={() => setVisible((count) => count + 30)}
              >
                Show more assets
              </button>
            )}
          </div>
        </aside>
        <section className="design-stage" aria-label="Canvas workspace">
          <DesignCanvas
            ref={stage}
            draft={canvas}
            selected={canvasSelected}
            onStart={startDrag}
            onMove={dragAt}
            onEnd={finishDrag}
            onCancel={(event) => finishDrag(event, true)}
          />
          <small>
            {draft.width} × {draft.height}
          </small>
        </section>
        <LayerProperties
          key={selected?.id || "canvas"}
          selected={selected}
          draft={draft}
          changeLayer={changeLayer}
          changeDraft={(fields, key) => change({ ...draft, ...fields }, key)}
          onError={setStatus}
        />
      </div>
      {exportOpen && (
        <ExportDialog
          pending={exporting}
          onClose={() => setExportOpen(false)}
          status={exportStatus}
          onDownload={download}
        />
      )}
    </section>
  );
}
