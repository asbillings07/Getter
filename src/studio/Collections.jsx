import React, { useEffect, useRef, useState } from "react";
import AssetPreview, { Properties } from "./AssetPreview.jsx";
import { StyleValue } from "./CollectionCapture.jsx";
import { assetKinds, cleanName, fingerprint } from "./library.js";
import { safeStyleValue } from "./inspect.js";

export function EditorDialog({
  title,
  description,
  initial,
  fields,
  action,
  onClose,
  onSubmit,
  children,
}) {
  const dialog = useRef(null);
  const running = useRef(false);
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const titleId = React.useId();
  useEffect(() => {
    dialog.current.showModal();
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError("");
    try {
      await onSubmit(values);
      dialog.current?.close();
    } catch (error) {
      setError(
        error?.name === "QuotaExceededError"
          ? "Chrome storage is full. Your existing work is still saved."
          : error?.message || "Couldn’t save the changes.",
      );
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (running.current) event.preventDefault();
      }}
    >
      <h2 id={titleId}>{title}</h2>
      {description && <p>{description}</p>}
      {children}
      <form className="studio-form studio-fields" onSubmit={submit}>
        {fields
          .filter(({ visible }) => !visible || visible(values))
          .map(({ key, label, max, multiline, required, options, type }) => {
            if (options)
              return (
                <label key={key}>
                  {label}
                  <select
                    value={values[key]}
                    disabled={pending}
                    required={required}
                    onChange={(event) =>
                      setValues({ ...values, [key]: event.target.value })
                    }
                  >
                    {options.map(({ id, name }) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              );
            const Input = multiline ? "textarea" : "input";
            return (
              <label key={key}>
                {label}
                <Input
                  type={type}
                  required={required}
                  maxLength={max}
                  value={values[key]}
                  disabled={pending}
                  onChange={(event) =>
                    setValues({ ...values, [key]: event.target.value })
                  }
                />
              </label>
            );
          })}
        {error && <p role="alert">{error}</p>}
        <div className="studio-row">
          <button
            type="button"
            className="secondary"
            onClick={() => dialog.current.close()}
            disabled={pending}
          >
            Cancel
          </button>
          <button className="primary" disabled={pending}>
            {pending ? "Saving…" : action}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function AssetValue({ asset }) {
  const item = asset.value;
  if (item.type === "color" || item.type === "font")
    return (
      <StyleValue item={asset.color ? { ...item, value: asset.color } : item} />
    );
  return <AssetPreview item={item} />;
}

const nameField = { key: "name", label: "Name", max: 60, required: true };
const notesField = { key: "notes", label: "Notes", max: 600, multiline: true };
export const collectionFields = [nameField, notesField];

function ItemDetails({ asset, sources, onClose, changeAsset }) {
  const isColor = asset.value.type === "color";
  const fields = [
    nameField,
    { key: "role", label: "Role", max: 60 },
    notesField,
  ];
  if (isColor)
    fields.splice(2, 0, {
      key: "color",
      label: "Color in this collection",
      max: 128,
    });
  return (
    <EditorDialog
      title="Item details"
      initial={{
        name: asset.name,
        role: asset.role,
        notes: asset.notes,
        color: asset.color || "",
      }}
      fields={fields}
      action="Save item"
      onClose={onClose}
      onSubmit={({ name, role, notes, color }) => {
        const value = color.trim();
        if (
          isColor &&
          value &&
          (!safeStyleValue(value) ||
            !CSS.supports("color", value) ||
            /^(?:inherit|initial|unset|revert(?:-layer)?|currentcolor)$/i.test(
              value,
            ))
        ) {
          throw Error(
            "Enter an absolute CSS color or clear the field to use the captured value.",
          );
        }
        return changeAsset({
          name: cleanName(name),
          role: role.trim(),
          notes: notes.trim(),
          color: isColor && value ? value : undefined,
        });
      }}
    >
      <AssetValue asset={asset} />
      {isColor && (
        <p>
          Captured color <code>{asset.value.value}</code>. Clear the color field
          to use it.
        </p>
      )}
      {asset.value.css && (
        <details>
          <summary>Captured properties</summary>
          <Properties css={asset.value.css} />
        </details>
      )}
      {sources.length > 0 && <p>Sources · {sources.join(" · ")}</p>}
    </EditorDialog>
  );
}

export default function CollectionAssets({
  collection,
  destinations,
  onEdit,
  onMove,
  onRemove,
  onMerge,
  onCopy,
  onCollect,
  onExport,
  onDesign,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState("");
  const [copy, setCopy] = useState(null);
  const [visibleLimit, setVisibleLimit] = useState(48);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const current = collection.assets.filter((asset) => !asset.removedAt);
  const removed = collection.assets.filter((asset) => asset.removedAt);
  const lookup = new Map(
    collection.captures.map((item) => [item.id, item.source]),
  );
  const sources = (asset) => [
    ...new Set(
      asset.sources.map(({ captureId, source }) => {
        const origin = lookup.get(captureId) || source;
        return origin?.title || origin?.hostname || "Source unavailable";
      }),
    ),
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const visible = current.filter(
    (asset) =>
      (filter === "all" || asset.value.type === filter) &&
      [
        asset.name,
        asset.role,
        asset.notes,
        ...sources(asset),
        asset.color,
        asset.value.value,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery)),
  );
  const active = current.find((asset) => asset.id === detail);
  const duplicates = new Map();
  for (const item of current) {
    const key = fingerprint(item);
    if (key && !duplicates.has(key)) duplicates.set(key, item);
  }

  async function change(task, confirmation) {
    if (pending) return;
    setPending(true);
    setStatus("");
    try {
      await task();
      setStatus(confirmation);
    } catch (error) {
      setStatus(
        error?.name === "QuotaExceededError"
          ? "Chrome storage is full. Your existing work is still saved."
          : error?.message || "Couldn’t update this collection.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="assets-heading" className="studio-library">
      <h2 id="assets-heading" className="workspace-sr-only">
        Collection assets
      </h2>
      <div className="workspace-asset-filters">
        <div className="workspace-asset-tabs" aria-label="Asset types">
          {[
            ["all", "All"],
            ...Object.entries(assetKinds).map(([id, label]) => [
              id,
              id === "font" ? "Fonts" : id === "element" ? "Elements" : label,
            ]),
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => {
                setFilter(id);
                setVisibleLimit(48);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="workspace-asset-search">
          <span className="workspace-sr-only">Find assets</span>
          <input
            type="search"
            placeholder="Find assets"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleLimit(48);
            }}
          />
        </label>
      </div>
      {status && <p role="status">{status}</p>}
      {!collection.assets.length && (
        <div className="studio-card">
          <p>Add colors, typography, images, or a capture from the page.</p>
          <button className="primary studio-inline-action" onClick={onCollect}>
            Add assets
          </button>
        </div>
      )}
      {!!current.length && !visible.length && (
        <p>No assets match these filters.</p>
      )}
      <div className="studio-asset-grid">
        {visible.slice(0, visibleLimit).map((asset) => {
          const index = current.indexOf(asset);
          const match = duplicates.get(fingerprint(asset));
          return (
            <article
              className="studio-card studio-asset"
              key={asset.id}
              aria-label={asset.name}
            >
              {asset.value.type === "color" && (
                <span
                  className="studio-asset-color"
                  aria-hidden="true"
                  style={{ backgroundColor: asset.color || asset.value.value }}
                />
              )}
              {asset.value.type === "font" && (
                <span
                  className="studio-type-sample"
                  aria-hidden="true"
                  style={{
                    fontFamily: asset.value.fontFamily,
                    fontWeight: asset.value.fontWeight,
                    fontStyle: asset.value.fontStyle,
                    letterSpacing: asset.value.letterSpacing,
                  }}
                >
                  Aa
                </span>
              )}
              {asset.value.type === "image" && <AssetValue asset={asset} />}
              <h3>{asset.name}</h3>
              {asset.role && <p>{asset.role}</p>}
              {asset.value.type !== "image" && <AssetValue asset={asset} />}
              <small>{sources(asset).join(" · ")}</small>
              {asset.notes && <p>{asset.notes}</p>}
              <div className="studio-row">
                <button
                  className="secondary"
                  onClick={() => setDetail(asset.id)}
                >
                  <span className="workspace-sr-only">Item details</span>
                  <span aria-hidden="true">Edit</span>
                </button>
                <button
                  className="text-button"
                  disabled={pending}
                  onClick={() =>
                    change(
                      () => onRemove(asset.id, true),
                      "Item moved to Recently removed.",
                    )
                  }
                >
                  Remove
                </button>
              </div>
              <details className="workspace-asset-actions">
                <summary>More actions</summary>
                <div className="studio-row">
                  {asset.value.type !== "motion" && (
                    <button
                      className="text-button"
                      onClick={() => onDesign(asset)}
                    >
                      Use in editor
                    </button>
                  )}
                  {destinations.length > 0 && (
                    <button
                      className="text-button"
                      onClick={() => setCopy(asset)}
                    >
                      Copy to collection
                    </button>
                  )}
                  <button
                    className="text-button"
                    aria-label={`Move ${asset.name} earlier`}
                    disabled={pending || index === 0}
                    onClick={() =>
                      change(() => onMove(asset.id, -1), "Item moved.")
                    }
                  >
                    ↑
                  </button>
                  <button
                    className="text-button"
                    aria-label={`Move ${asset.name} later`}
                    disabled={pending || index === current.length - 1}
                    onClick={() =>
                      change(() => onMove(asset.id, 1), "Item moved.")
                    }
                  >
                    ↓
                  </button>
                </div>
              </details>
              {match && match.id !== asset.id && (
                <button
                  className="text-button"
                  disabled={pending}
                  onClick={() =>
                    change(
                      () => onMerge(match.id, asset.id),
                      "Matching items merged. The other item can be restored.",
                    )
                  }
                >
                  Merge with {match.name}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {visible.length > visibleLimit && (
        <button
          className="secondary studio-inline-action"
          onClick={() => setVisibleLimit((limit) => limit + 48)}
        >
          Show more assets
        </button>
      )}
      {!!removed.length && (
        <details className="studio-card studio-removed">
          <summary>Recently removed ({removed.length})</summary>
          {removed.map((asset) => (
            <div className="studio-row" key={asset.id}>
              <span>{asset.name}</span>
              <button
                className="text-button"
                disabled={pending}
                onClick={() =>
                  change(() => onRemove(asset.id, false), "Item restored.")
                }
              >
                Restore {asset.name}
              </button>
            </div>
          ))}
        </details>
      )}
      <div className="workspace-create">
        <div>
          <strong>Make something with this collection</strong>
          <p>Your saved assets stay available as you design.</p>
        </div>
        <div className="studio-row">
          {!!current.length && (
            <button className="text-button" onClick={onExport}>
              Use in design kit
            </button>
          )}
          <button className="secondary" onClick={() => onDesign()}>
            Create design
          </button>
          <button className="primary" onClick={() => onDesign(null, "brand")}>
            Create brand board
          </button>
          <button
            className="primary"
            onClick={() => onDesign(null, "portrait")}
          >
            Create campaign
          </button>
        </div>
      </div>
      {active && (
        <ItemDetails
          asset={active}
          sources={sources(active)}
          onClose={() => setDetail("")}
          changeAsset={(fields) => onEdit(active.id, fields)}
        />
      )}
      {copy && (
        <EditorDialog
          title="Copy item to collection"
          description={copy.name}
          fields={[
            {
              key: "destination",
              label: "Destination collection",
              options: destinations,
            },
          ]}
          initial={{ destination: destinations[0].id }}
          action="Copy item"
          onClose={() => setCopy(null)}
          onSubmit={async ({ destination }) => {
            await onCopy(copy.id, destination);
            setStatus("Item copied to the other collection.");
          }}
        />
      )}
    </section>
  );
}

export function CaptureHistory({ collection, onRecapture }) {
  return (
    <section className="studio-card" aria-labelledby="capture-history">
      <h2 id="capture-history">Captures</h2>
      {!collection.captures.length && (
        <p>The original values you capture will appear here.</p>
      )}
      {collection.captures.toReversed().map((capture) => {
        const source = capture.source.title || capture.source.hostname;
        return (
          <article className="studio-capture" key={capture.id}>
            <h3>{source}</h3>
            <p>
              {capture.kind === "page-styles"
                ? "Page style snapshot"
                : capture.kind === "palette"
                  ? "Color palette"
                  : assetKinds[capture.kind] || "Selected assets"}
              {" · "}
              {capture.items.length}{" "}
              {capture.items.length === 1 ? "item" : "items"}
              {" · "}
              <time dateTime={capture.savedAt}>
                {new Date(capture.savedAt).toLocaleString()}
              </time>
              {capture.previousId && " · New version"}
            </p>
            {capture.coverage?.viewport && (
              <p>
                Viewport {capture.coverage.viewport.width} ×{" "}
                {capture.coverage.viewport.height}
                {capture.coverage.limited && " · Partial scan"}
                {capture.coverage.framesOmitted
                  ? ` · ${capture.coverage.framesOmitted} embedded frames skipped`
                  : ""}
              </p>
            )}
            <details>
              <summary>View captured values</summary>
              <ul>
                {capture.items.map((item, index) => (
                  <li key={index}>
                    {item.type === "color" ||
                    item.type === "font" ||
                    item.type === "image" ? (
                      <StyleValue item={item} />
                    ) : (
                      item.name
                    )}
                  </li>
                ))}
              </ul>
            </details>
            {capture.coverage && capture.kind !== "text" && (
              <button
                className="secondary studio-inline-action"
                onClick={() => onRecapture(capture)}
              >
                Capture new version
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
