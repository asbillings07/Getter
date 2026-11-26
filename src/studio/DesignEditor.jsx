import React, { useEffect, useRef, useState } from "react";
import { CreativeExport } from "./CreativeExport.jsx";
import { WorkspaceSteps } from "./Workspace.jsx";
import { DownloadTracker } from "../core/downloads.js";
import { colorLabel } from "../core/extract.js";
import { assetKinds, cleanName } from "./library.js";
import { slug } from "./exports.js";
import { safeStyleValue } from "./inspect.js";
import {
  addFromAsset,
  applyFromAsset,
  changeArtworkFormat,
  changeComposition,
  changeCreativeColor,
  changeDesignLayer,
  changeSpacing,
  creativeColors,
  checkColor,
  compositionOptions,
  draftSlide,
  formats,
  layer,
  layerLabels,
  moveLayer,
  replaceDraftSlide,
  resizeCanvas,
} from "./design.js";
import DesignCanvas, { exportDesign, exportSlides } from "./DesignCanvas.jsx";

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
  carousel,
  compact = false,
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
  const compositions = compositionOptions(draft);
  return (
    <aside
      className="studio-card studio-fields design-properties"
      aria-label={compact ? "Advanced layer properties" : "Design properties"}
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
          {!carousel && (
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
          )}
          {compositions && !compact && (
            <Control label="Composition">
              <select
                value={draft.composition}
                onChange={(event) =>
                  changeDraft(changeComposition(draft, event.target.value))
                }
              >
                {compositions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Control>
          )}
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

const artworkFormats = [
  ["portrait", "Portrait post · 4:5"],
  ["square", "Square post · 1:1"],
  ["story", "Story / cover · 9:16"],
  ["carousel", "Carousel · 3 slides"],
];

function CreativeProperties({
  selected,
  draft,
  assets,
  onLayer,
  onFamily,
  onColor,
  onError,
  onDesign,
  showPalette,
  onPalette,
  onAsset,
  advanced,
}) {
  const compositions = compositionOptions(draft);
  const colors = creativeColors(draft);
  const fonts = [
    ...new Set([
      "Georgia, serif",
      "Arial, sans-serif",
      ...assets
        .filter(({ value }) => value.type === "font")
        .map(({ value }) => value.fontFamily),
      ...(selected?.fontFamily ? [selected.fontFamily] : []),
    ]),
  ];
  const art = selected?.type === "image" || selected?.placeholder === "artwork";
  const images = assets.filter(({ value }) => value.type === "image");
  const text = ["text", "button"].includes(selected?.type);
  return (
    <aside
      className="studio-fields workspace-inspector"
      aria-label="Design properties"
    >
      <h2>
        {showPalette
          ? "Shared brand colors"
          : art
            ? "Artwork"
            : selected?.name || "Canvas"}
      </h2>
      {showPalette ? (
        <>
          {Object.entries(colors).map(([role, value]) => (
            <ColorField
              key={role}
              label={role[0].toUpperCase() + role.slice(1)}
              value={value}
              onChange={(next) => onColor(role, next)}
              onError={onError}
            />
          ))}
          <p>Updates the elements that use these colors.</p>
        </>
      ) : art ? (
        <>
          <Control label="Image">
            <select
              value={selected.assetId || ""}
              onChange={(event) => {
                const asset = images.find(
                  ({ id }) => id === event.target.value,
                );
                if (asset) onAsset(asset);
              }}
            >
              <option value="" disabled>
                Choose collection artwork
              </option>
              {images.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </Control>
          <Control label={`Corner radius · ${selected.radius} px`}>
            <input
              type="range"
              min="0"
              max={Math.max(120, selected.radius)}
              value={selected.radius}
              onChange={(event) =>
                onLayer({ radius: Number(event.target.value) }, "radius")
              }
            />
          </Control>
        </>
      ) : text ? (
        <>
          <Control label="Text">
            <textarea
              value={selected.text}
              maxLength={600}
              rows={3}
              onChange={(event) =>
                onLayer({ text: event.target.value }, "text")
              }
            />
          </Control>
          <Control label="Typeface">
            <select
              value={selected.fontFamily}
              onChange={(event) => onFamily(event.target.value)}
            >
              {fonts.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </Control>
          <Control label={`Type size · ${selected.fontSize} px`}>
            <input
              type="range"
              min="6"
              max="160"
              value={selected.fontSize}
              onChange={(event) =>
                onLayer({ fontSize: Number(event.target.value) }, "font-size")
              }
            />
          </Control>
          <Control label="Alignment">
            <select
              value={selected.align}
              onChange={(event) => onLayer({ align: event.target.value })}
            >
              <option value="start">Left</option>
              <option value="middle">Center</option>
              <option value="end">Right</option>
            </select>
          </Control>
        </>
      ) : selected?.type === "shape" ? (
        <ColorField
          label="Fill"
          value={selected.fill}
          onError={onError}
          onChange={(fill) => onLayer({ fill })}
        />
      ) : null}
      <div className="workspace-design-controls">
        <h2>Design</h2>
        <button
          className="secondary"
          type="button"
          aria-pressed={showPalette}
          onClick={onPalette}
        >
          Brand colors
        </button>
        {compositions && (
          <Control label="Composition">
            <select
              value={draft.composition}
              onChange={(event) =>
                onDesign(changeComposition(draft, event.target.value))
              }
            >
              {compositions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Control>
        )}
        <Control label={`Spacing · ${draft.spacing ?? 20} px`}>
          <input
            type="range"
            min="12"
            max="36"
            value={draft.spacing ?? 20}
            onChange={(event) =>
              onDesign(
                changeSpacing(draft, Number(event.target.value)),
                "spacing",
              )
            }
          />
        </Control>
      </div>
      <details className="workspace-advanced">
        <summary>Layer details</summary>
        {advanced}
      </details>
    </aside>
  );
}

function ExportDialog({ onClose, onDownload, pending, status, carousel }) {
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
            <option value="svg">
              {carousel
                ? "SVG ZIP · One SVG per slide"
                : "SVG · Text and shapes"}
            </option>
            <option value="png">
              {carousel
                ? "PNG ZIP · One PNG per slide"
                : "PNG · Flattened image"}
            </option>
          </select>
        </Control>
      </div>
      <p>
        {format === "svg"
          ? "The SVG contains vector shapes, text, and embedded artwork. Fonts are referenced by name."
          : "The PNG uses the canvas dimensions."}{" "}
        {carousel && "The ZIP includes every slide in order."}
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
          {pending
            ? "Preparing…"
            : `Download ${format.toUpperCase()}${carousel ? " ZIP" : ""}`}
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
  const [design, setDesign] = useState(initial);
  const [slide, setSlide] = useState(0);
  const [saved, setSaved] = useState(initial);
  const [selectedId, setSelectedId] = useState(() =>
    ["brand", "portrait", "square", "story"].includes(initial.format)
      ? initial.layers.find(({ name }) =>
          ["Headline", "Brand headline"].includes(name),
        )?.id || null
      : null,
  );
  const [showPalette, setShowPalette] = useState(false);
  const [inlineText, setInlineText] = useState(null);
  const [exportFormat, setExportFormat] = useState("svg");
  const [substituteFont, setSubstituteFont] = useState("");
  const [exportTarget, setExportTarget] = useState(
    initial.format === "brand" ? "Figma" : "Canva",
  );
  const [continued, setContinued] = useState(false);
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
  const otherStages = useRef([]);
  const drag = useRef(null);
  const draft = draftSlide(design, slide);
  const artworkFormat =
    design.artworkFormat ||
    (design.additionalSlides?.length ? "carousel" : design.format);
  const carousel = artworkFormat === "carousel";
  const slides = [
    0,
    ...(carousel ? design.additionalSlides || [] : []).map(
      (_, index) => index + 1,
    ),
  ];
  const campaign = ["portrait", "square", "story"].includes(draft.format);
  const creative = campaign || draft.format === "brand";
  const kind = campaign ? "Campaign artwork" : "Brand board";
  const dirty = design !== saved;
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

  function change(next, field, wholeDesign = false) {
    if (savingTask.current) return;
    const time = Date.now();
    if (
      !field ||
      group.current?.field !== field ||
      time - group.current.time > 650
    ) {
      history.current.push({ design, slide });
      if (history.current.length > 80) history.current.shift();
    }
    group.current = field ? { field, time } : null;
    redo.current = [];
    setDesign(wholeDesign ? next : replaceDraftSlide(design, slide, next));
    setStatus("");
  }

  function changeLayer(fields, field) {
    if (!selected) return;
    change(
      changeDesignLayer(draft, selected, fields),
      field && `${selected.id}-${field}`,
    );
  }

  function select(id) {
    setInlineText(null);
    setShowPalette(false);
    setSelectedId(id);
    setColorTarget("");
    group.current = null;
  }

  function openSlide(index) {
    setSlide(index);
    select(null);
    drag.current = null;
    setMove(null);
  }

  function restoreEdit(edit) {
    setDesign(edit.design);
    if (edit.slide !== slide) openSlide(edit.slide);
    group.current = null;
  }

  function undo() {
    if (!history.current.length) return;
    const previous = history.current.pop();
    redo.current.push({ design, slide: previous.slide });
    restoreEdit(previous);
  }

  function redoEdit() {
    if (!redo.current.length) return;
    const next = redo.current.pop();
    history.current.push({ design, slide: next.slide });
    restoreEdit(next);
  }

  function changeCanvas(fields, key) {
    const next = { ...draft, ...fields };
    if (next.background !== draft.background) delete next.backgroundSource;
    change(next, key);
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
        changeCanvas({
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
    const snapshot = design;
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

  async function leave(next = "assets") {
    if (await save()) onBack(next);
  }

  function openExport() {
    setInlineText(null);
    setExportStatus("");
    setContinued(false);
    setExportOpen(true);
  }

  function selectFormat(format) {
    if (format === artworkFormat) return;
    change(changeArtworkFormat(design, format), undefined, true);
    openSlide(0);
  }

  function changeFamily(fontFamily) {
    if (!selected?.typeRole) {
      changeLayer({ fontFamily });
      return;
    }
    const role = selected.typeRole;
    const apply = (view) => ({
      ...view,
      layers: view.layers.map((item) =>
        item.typeRole === role ? { ...item, fontFamily } : item,
      ),
    });
    const updated = apply(design);
    if (design.additionalSlides)
      updated.additionalSlides = design.additionalSlides.map(apply);
    change(updated, undefined, true);
  }

  function changePalette(role, value) {
    const updated = changeCreativeColor(design, role, value);
    if (design.additionalSlides) {
      updated.additionalSlides = design.additionalSlides.map((item, index) => {
        const { background, layers } = changeCreativeColor(
          draftSlide(design, index + 1),
          role,
          value,
        );
        return { ...item, background, layers };
      });
    }
    change(updated, `color-${role}`, true);
  }

  async function download(format) {
    setExporting(true);
    setExportStatus("");
    try {
      const blob = carousel
        ? await exportSlides(
            slides.map((index) => ({
              stage:
                index === slide ? stage.current : otherStages.current[index],
              draft: draftSlide(design, index),
            })),
            format,
          )
        : await exportDesign(stage.current, draft, format);
      await tracker.current.start(URL.createObjectURL(blob), {
        blob: true,
        filename: `${slug(draft.name)}.${carousel ? "zip" : format}`,
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
  function exportView(view) {
    if (!creative || !exportOpen || exportFormat !== "svg" || !substituteFont)
      return view;
    return {
      ...view,
      layers: view.layers.map((item) =>
        item.typeRole === "heading"
          ? { ...item, fontFamily: substituteFont }
          : item,
      ),
    };
  }
  const artwork = (
    <DesignCanvas
      ref={stage}
      draft={exportView(canvas)}
      selected={exportOpen ? null : canvasSelected}
      onStart={exportOpen && creative ? undefined : startDrag}
      onMove={dragAt}
      onEnd={finishDrag}
      onCancel={(event) => finishDrag(event, true)}
      inlineText={creative && !exportOpen ? inlineText : null}
      onInlineEdit={(item) => {
        select(item.id);
        setInlineText(item.id);
      }}
      onTextChange={(text) => changeLayer({ text }, "text")}
      onTextEnd={() => setInlineText(null)}
    />
  );
  const slidesControls = carousel && (
    <div
      className="studio-row design-slides"
      role="group"
      aria-label="Carousel slides"
    >
      {slides.map((index) => (
        <button
          key={index}
          type="button"
          className="secondary"
          aria-pressed={slide === index}
          disabled={saving || exporting}
          onClick={() => openSlide(index)}
        >
          Slide {index + 1}
        </button>
      ))}
    </div>
  );
  const layerProperties = (
    <LayerProperties
      key={selected?.id || "canvas"}
      selected={selected}
      draft={draft}
      changeLayer={changeLayer}
      changeDraft={changeCanvas}
      onError={setStatus}
      carousel={carousel}
      compact={creative}
    />
  );
  const showEditor = !creative || !exportOpen;
  const canContinue = exportStatus === "Download completed.";
  const primaryLayers = campaign
    ? ["Wordmark", "Headline", "Product artwork", "Supporting copy"]
    : [
        "Brand headline",
        "Brand description",
        "Palette",
        "Typography",
        "Button",
        "Artwork",
      ];
  function selectPrimary(name) {
    if (name === "Palette") {
      setShowPalette(true);
      return;
    }
    const item = ["Product artwork", "Artwork"].includes(name)
      ? draft.layers.find(({ fills }) => fills === "artwork") ||
        draft.layers.find(
          ({ type, placeholder }) =>
            type === "shape" && placeholder === "artwork",
        )
      : draft.layers.find(
          (item) =>
            item.name ===
            ({ Typography: "Heading sample", Button: "Button sample" }[name] ||
              name),
        );
    if (item) select(item.id);
  }
  return (
    <section
      aria-label="Studio editor"
      className={`design-editor${creative ? " workspace-creative" : ""}`}
      data-artwork={campaign ? artworkFormat : creative ? "brand" : undefined}
    >
      {creative && (
        <WorkspaceSteps
          active={exportOpen ? (continued ? "continue" : "export") : "designs"}
          actions={{
            collect: () => leave("collect"),
            assets: () => leave(),
            designs: () => {
              if (!exporting) setExportOpen(false);
            },
            export: openExport,
            continue: canContinue
              ? () => {
                  setExportOpen(true);
                  setContinued(true);
                }
              : undefined,
          }}
        />
      )}
      {showEditor && (
        <>
          <div className="design-edit-head">
            <div>
              {!creative && (
                <button
                  className="text-button"
                  disabled={saving}
                  onClick={() => leave()}
                >
                  ← Back to collection
                </button>
              )}
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
              <button className="primary" onClick={openExport}>
                <span aria-hidden="true">
                  {creative ? "↗ Export" : "Export draft"}
                </span>
                <span className="workspace-sr-only">Export draft</span>
              </button>
            </div>
          </div>
          <div className="design-editor-grid">
            <aside
              className="studio-card studio-fields design-sidebar"
              aria-label="Layers and collection assets"
            >
              <h2>Layers</h2>
              {creative && (
                <div className="workspace-layer-groups">
                  {primaryLayers.map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={
                        name === "Palette"
                          ? showPalette
                          : selected?.name === name ||
                            (name === "Typography" &&
                              selected?.name === "Heading sample") ||
                            (name === "Button" &&
                              selected?.name === "Button sample") ||
                            (["Product artwork", "Artwork"].includes(name) &&
                              (selected?.fills === "artwork" ||
                                selected?.placeholder === "artwork"))
                      }
                      onClick={() => selectPrimary(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              <details
                className="workspace-layer-tools"
                open={creative ? undefined : true}
              >
                <summary hidden={!creative}>All layers</summary>
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
                  <button
                    className="secondary"
                    onClick={() => add(layer("text"))}
                  >
                    Add text
                  </button>
                  <button
                    className="secondary"
                    onClick={() => add(layer("shape"))}
                  >
                    Add shape
                  </button>
                  <button
                    className="secondary"
                    onClick={() => add(layer("button"))}
                  >
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
                          layers: draft.layers.filter(
                            ({ id }) => id !== selected.id,
                          ),
                        });
                        select(null);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </details>
              <h2 className="design-assets-title">Collection assets</h2>
              <details
                className="workspace-asset-tools"
                open={creative ? undefined : true}
              >
                <summary hidden={!creative}>Filter or apply to</summary>
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
                    {selected &&
                      ["button", "shape"].includes(selected.type) && (
                        <option value="fill">Selected fill</option>
                      )}
                  </select>
                </Control>
              </details>
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
                    <div
                      key={asset.id}
                      className={creative ? "workspace-asset-row" : undefined}
                    >
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
                        {creative ? <span aria-hidden="true">＋</span> : action}
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
              {creative && (
                <button
                  className="text-button workspace-back-collection"
                  aria-label="Back to collection"
                  onClick={() => leave()}
                >
                  View collection ↗
                </button>
              )}
            </aside>
            <section className="design-stage" aria-label="Canvas workspace">
              {creative && (
                <div className="workspace-artboard-toolbar">
                  <strong>{kind}</strong>
                  {campaign ? (
                    <select
                      aria-label="Artwork format"
                      value={artworkFormat}
                      onChange={(event) => selectFormat(event.target.value)}
                    >
                      {artworkFormats.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <small>Fit to canvas</small>
                  )}
                </div>
              )}
              {artwork}
              {slidesControls}
              <small>
                {campaign
                  ? "Static artwork · text and images are editable"
                  : creative
                    ? "Select a layer to edit · double-click text to type"
                    : `${draft.width} × ${draft.height}`}
              </small>
            </section>
            {creative ? (
              <CreativeProperties
                key={selected?.id || "canvas"}
                selected={selected}
                draft={draft}
                assets={collection.assets.filter(({ removedAt }) => !removedAt)}
                onLayer={changeLayer}
                onFamily={changeFamily}
                onColor={changePalette}
                onError={setStatus}
                onDesign={changeCanvas}
                onPalette={() => setShowPalette(!showPalette)}
                showPalette={showPalette}
                onAsset={useAsset}
                advanced={layerProperties}
              />
            ) : (
              layerProperties
            )}
          </div>
        </>
      )}
      {exportOpen && (
        <>
          {carousel && (
            <div hidden>
              {slides
                .filter((index) => index !== slide)
                .map((index) => (
                  <DesignCanvas
                    key={index}
                    ref={(node) => {
                      otherStages.current[index] = node;
                    }}
                    draft={exportView(draftSlide(design, index))}
                    exportOnly
                  />
                ))}
            </div>
          )}
          {creative ? (
            <CreativeExport
              name={draft.name}
              kind={kind}
              target={exportTarget}
              onTarget={setExportTarget}
              format={exportFormat}
              onFormat={setExportFormat}
              carousel={carousel}
              exporting={exporting}
              status={exportStatus}
              continued={continued}
              substituteFont={substituteFont}
              onSubstituteFont={setSubstituteFont}
              onBack={() => setExportOpen(false)}
              onDownload={() => download(exportFormat)}
            >
              {artwork}
              {slidesControls}
            </CreativeExport>
          ) : (
            <ExportDialog
              pending={exporting}
              onClose={() => setExportOpen(false)}
              status={exportStatus}
              onDownload={download}
              carousel={carousel}
            />
          )}
        </>
      )}
    </section>
  );
}
