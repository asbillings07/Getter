import React, { useEffect, useRef, useState } from "react";
import { colorLabel } from "../core/extract.js";
import { verifyDocument } from "../core/workspace.js";
import { fontStyleKey } from "../core/usage.js";
import { assetKinds, cleanName, collectionLabels } from "./library.js";
import { EXPORT_LIMITS } from "../core/downloads.js";
import {
  listProjects,
  projectCollectionEntries,
  saveFromPage,
} from "./projects.js";
import { websiteImages } from "./images.js";
import AssetPreview, { Properties } from "./AssetPreview.jsx";
import { motionAssets } from "./inspect.js";

const api = globalThis.chrome;
const idFor = (asset) =>
  asset.type === "color"
    ? asset.value
    : asset.type === "font"
      ? fontStyleKey(asset)
      : asset.src || asset.name;

function labelFor(asset) {
  if (asset.type === "color") return colorLabel(asset.value);
  if (asset.type === "font")
    return `${asset.fontFamily} · ${asset.tag} · ${asset.fontSize} · ${asset.fontWeight}${asset.fontStyle && asset.fontStyle !== "normal" ? ` · ${asset.fontStyle}` : ""}`;
  return asset.name || "Website image";
}

function inspectionItems(capture, includeObservedMotion) {
  const tree = capture.component;
  if (!tree) return capture.observedMotion ? [capture.observedMotion] : [];
  const text = capture.text;
  return [
    {
      type: "component",
      name: `${tree.tag} component`,
      tree,
      imageCandidates: capture.images || [],
      ...(includeObservedMotion && capture.observedMotion
        ? { observedMotion: capture.observedMotion }
        : {}),
    },
    ...(capture.fonts || []),
    ...(capture.images || []),
    ...(text ? [{ type: "text", name: `${tree.tag} text`, text }] : []),
    { type: "element", name: `${tree.tag} style`, css: tree.css },
    ...(Object.keys(capture.effects).length
      ? [{ type: "effect", name: `${tree.tag} effect`, css: capture.effects }]
      : []),
    ...motionAssets({ css: capture.motion, animations: capture.animations }),
    ...(capture.observedMotion ? [capture.observedMotion] : []),
  ];
}

const scopeLabel = (asset) => {
  if (asset.type === "motion")
    return ["visual", "scripted"].includes(asset.kind) ? "motion" : asset.kind;
  return {
    component: "component",
    font: "font",
    image: "image",
    text: "text",
    element: "element styles",
    effect: "effect",
    color: "color",
  }[asset.type];
};

export function openCollectionWorkspace({ projectId, collectionId }) {
  const url = new URL(api.runtime.getURL("studio.html"));
  url.search = new URLSearchParams({
    project: projectId,
    collection: collectionId,
  }).toString();
  return api.tabs.create({ url: url.href });
}

export default function SidePanelCollect({
  scan,
  items,
  inspection,
  captureScope,
  bulk,
  preferredDestination,
  includeObservedMotion,
  isCurrent,
  onSaved,
  onClose,
}) {
  const id = React.useId();
  const dialog = useRef(null);
  const control = useRef(null);
  const [projects, setProjects] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [projectName, setProjectName] = useState("");
  const palette = bulk === "colors";
  const defaultCollection =
    palette || items[0]?.type === "color"
      ? "Colors"
      : bulk === "fonts"
        ? "Typography"
        : "Assets";
  const [collectionName, setCollectionName] = useState(defaultCollection);
  const [choices] = useState(() =>
    inspection ? inspectionItems(inspection, includeObservedMotion) : [],
  );
  const [choice, setChoice] = useState(
    () =>
      choices.find(
        (item) => captureScope && (item.kind || item.type) === captureScope,
      ) || null,
  );
  const [itemName, setItemName] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const [selected, setSelected] = useState(() => new Set(items.map(idFor)));
  const [saved, setSaved] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [unavailableImages, setUnavailableImages] = useState([]);
  const project = projects?.find((entry) => entry.id === projectId);
  const choosing = captureScope === "individual" && !choice;
  const choiceMissing = inspection && !choice && !choosing;
  const single = choice || (!bulk && items.length === 1 ? items[0] : null);
  const count = selected.size;
  const overImageLimit = bulk === "images" && count > EXPORT_LIMITS.files;
  const confirmLabel = palette
    ? "Save palette"
    : bulk === "text"
      ? "Save all text"
      : bulk === "fonts" && count === items.length
        ? `Save all ${count} styles`
        : bulk === "images" && count === items.length
          ? `Save ${count} ${count === 1 ? "image" : "images"}`
          : single
            ? `Save ${scopeLabel(single)}`
            : `Save selected (${count})`;
  const valid =
    !!projects &&
    (projectId || projectName.trim()) &&
    (collectionId || collectionName.trim());

  useEffect(() => {
    dialog.current.showModal();
    let live = true;
    Promise.all([
      listProjects(),
      api.storage.session.get("studioDestination").catch(() => ({})),
    ])
      .then(([records, { studioDestination }]) => {
        if (!live) return;
        const values = records.map((record) => ({
          id: record.id,
          name: record.name,
          collections: projectCollectionEntries(record, records).map(
            ({ id, name, ownerId }) => ({ id, name, ownerId }),
          ),
        }));
        const target = preferredDestination || studioDestination;
        const remembered =
          values.find(({ id }) => id === target?.projectId) || values[0];
        setProjects(values);
        setProjectId(remembered?.id || "");
        setCollectionId(
          remembered?.collections.find(({ id }) => id === target?.collectionId)
            ?.id ||
            remembered?.collections[0]?.id ||
            "",
        );
      })
      .catch(() => {
        if (live) setError("Couldn’t load collections. Close and try again.");
      });
    return () => {
      live = false;
      control.current?.abort();
    };
  }, []);

  async function save() {
    if (control.current || !valid || overImageLimit || choiceMissing) return;
    const task = new AbortController();
    control.current = task;
    setPending(true);
    setError("");
    const requireCurrent = async () => {
      task.signal.throwIfAborted();
      if (!isCurrent() || !(await verifyDocument(api, scan)) || !isCurrent())
        throw Error(
          "The page changed. Reopen this dialog on the current page.",
        );
      task.signal.throwIfAborted();
    };
    try {
      const ownerId = project?.collections.find(
        ({ id }) => id === collectionId,
      )?.ownerId;
      const destination = {
        projectId: ownerId || projectId,
        collectionId,
        projectName: projectId ? undefined : cleanName(projectName, 50),
        collectionName:
          collectionId || !collectionName.trim()
            ? undefined
            : cleanName(collectionName),
      };
      await requireCurrent();
      const indices = items.flatMap((item, index) =>
        selected.has(idFor(item)) ? [index] : [],
      );
      const chosen = palette
        ? items
        : choice
          ? [
              {
                ...choice,
                ...(itemName.trim() ? { name: cleanName(itemName) } : {}),
              },
            ]
          : indices.map((index) => items[index]);
      if (
        chosen.some((item) =>
          Object.entries(item).some(
            ([key, value]) =>
              !["src", "text"].includes(key) &&
              typeof value === "string" &&
              value.length > 512,
          ),
        )
      )
        throw Error(
          "A style value is too long to save. Deselect it and try again.",
        );
      const images = await websiteImages(
        chosen.filter(({ type }) => type === "image"),
        { signal: task.signal },
      );
      const savedItems = await Promise.all(
        chosen
          .filter(({ type }) => type !== "image")
          .map(async (entry) => {
            const { imageCandidates, ...item } = entry;
            if (!imageCandidates?.length || !includeImages) return item;
            return {
              ...item,
              images: await websiteImages(imageCandidates, {
                signal: task.signal,
              }),
            };
          }),
      );
      const blobs = [
        ...images,
        ...savedItems.flatMap((item) => item.images || []),
      ];
      const selection = blobs.length
        ? await Promise.all(
            blobs.map(async ({ blob }) =>
              Array.from(
                new Uint8Array(
                  await crypto.subtle.digest(
                    "SHA-256",
                    await blob.arrayBuffer(),
                  ),
                ),
              ),
            ),
          )
        : undefined;
      await requireCurrent();
      const saved = await saveFromPage(destination, {
        id: crypto.randomUUID(),
        scanId: scan.documentId,
        extractionVersion: 2,
        kind: palette
          ? "palette"
          : bulk === "text"
            ? "text"
            : single?.type || "selected-styles",
        savedAt: new Date().toISOString(),
        source: { hostname: scan.host },
        selection,
        coverage: inspection
          ? {
              viewport: inspection.viewport,
              visited: inspection.visited,
              limited: inspection.limited,
              resourcesOmitted: inspection.resourcesOmitted,
            }
          : {
              ...scan.coverage,
              limited: scan.data.limited,
              visited: scan.data.visited,
              usageTotals: scan.data.usageTotals,
            },
        items: [...savedItems, ...images],
      });
      if (task.signal.aborted) return;
      const target = ownerId ? { ...saved, projectId } : saved;
      api.storage.session
        .set({
          studioDestination: {
            projectId: target.projectId,
            collectionId: saved.collectionId,
          },
        })
        .catch(() => {});
      setSaved(target);
      onSaved?.(target);
    } catch (error) {
      if (!task.signal.aborted) {
        if (bulk === "images" && error.unavailableImages?.length) {
          setUnavailableImages(error.unavailableImages);
          setError("Deselect the images marked unavailable, then save again.");
        } else {
          setError(
            error?.name === "QuotaExceededError"
              ? "Chrome storage is full. Your saved collections are still available."
              : error.message,
          );
        }
      }
    } finally {
      control.current = null;
      if (!task.signal.aborted) setPending(false);
    }
  }

  const pickItems = (
    <div
      className="studio-side-options"
      role="group"
      aria-label="Assets to save"
    >
      {items.map((asset) => {
        const key = idFor(asset);
        return (
          <label key={key}>
            <input
              type="checkbox"
              checked={selected.has(key)}
              disabled={pending}
              onChange={(event) => {
                const checked = event.target.checked;
                setSelected((current) => {
                  const next = new Set(current);
                  if (checked) next.add(key);
                  else next.delete(key);
                  return next;
                });
              }}
            />
            {asset.type === "color" && (
              <span
                className="studio-side-swatch"
                style={{ backgroundColor: asset.value }}
                aria-hidden="true"
              />
            )}
            <span>
              {labelFor(asset)}
              {unavailableImages.includes(asset.src) && " · Unavailable"}
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <dialog
      className="studio-side-dialog"
      ref={dialog}
      onClose={onClose}
      aria-labelledby={id}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <h2 id={id}>
        {bulk
          ? collectionLabels[bulk]
          : choosing
            ? "Save an individual asset"
            : choice
              ? `Save ${scopeLabel(choice)} to collection`
              : "Save to collection"}
      </h2>
      {saved ? (
        <>
          <p role="status">
            {saved.duplicate ? "Already saved in" : "Saved to"}{" "}
            <strong>{saved.name}</strong>.
          </p>
          <div className="studio-side-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => dialog.current.close()}
            >
              {inspection ? "Keep inspecting" : "Keep browsing"}
            </button>
            <button
              type="button"
              className="primary"
              onClick={() =>
                openCollectionWorkspace(saved)
                  .then(() => dialog.current?.close())
                  .catch(() =>
                    setError("Couldn’t open Studio. Your collection is saved."),
                  )
              }
            >
              Open collection
            </button>
          </div>
        </>
      ) : choiceMissing ? (
        <>
          <p role="status">
            This capture is no longer available. Select the element again.
          </p>
          <button
            type="button"
            className="secondary"
            onClick={() => dialog.current.close()}
          >
            Close
          </button>
        </>
      ) : choosing ? (
        <>
          <p>
            {inspection.component.tag} · {scan.host}
          </p>
          <div className="studio-capture-choices" aria-label="Capture choices">
            {choices
              .filter(({ type }) => type !== "component")
              .map((asset, index) => (
                <div className="studio-capture-choice" key={index}>
                  <span>
                    <small>
                      {asset.type === "motion"
                        ? scopeLabel(asset)
                        : assetKinds[asset.type]}
                    </small>
                    <strong>{labelFor(asset)}</strong>
                  </span>
                  <button
                    type="button"
                    className="secondary"
                    aria-label={`Save ${scopeLabel(asset)}: ${labelFor(asset)}`}
                    onClick={() => {
                      setChoice(asset);
                      setItemName("");
                      setIncludeImages(true);
                    }}
                  >
                    Save {scopeLabel(asset)}
                  </button>
                </div>
              ))}
          </div>
          <div className="studio-side-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => dialog.current.close()}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          {choice && captureScope === "individual" && (
            <button
              type="button"
              className="text-button"
              disabled={pending}
              onClick={() => {
                setChoice(null);
                setError("");
              }}
            >
              ← Back to capture choices
            </button>
          )}
          <p>{scan.host}</p>
          {palette && <p>{items.length} colors from this scan</p>}
          {projects?.length > 0 && (
            <label>
              Project
              <select
                value={projectId}
                disabled={pending}
                onChange={(event) => {
                  const next = projects.find(
                    ({ id }) => id === event.target.value,
                  );
                  setProjectId(event.target.value);
                  setCollectionId(next?.collections[0]?.id || "");
                }}
              >
                {projects.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
                <option value="">New project</option>
              </select>
            </label>
          )}
          {projects && !projectId && (
            <label>
              Project name
              <input
                maxLength={50}
                placeholder="e.g. Summer campaign"
                value={projectName}
                disabled={pending}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </label>
          )}
          {project && (
            <label>
              Collection
              <select
                value={collectionId}
                disabled={pending}
                onChange={(event) => setCollectionId(event.target.value)}
              >
                {project.collections.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
                <option value="">New collection</option>
              </select>
            </label>
          )}
          {projects && !collectionId && (
            <label>
              Collection name
              <input
                maxLength={60}
                value={collectionName}
                disabled={pending}
                onChange={(event) => setCollectionName(event.target.value)}
              />
            </label>
          )}
          {choice ? (
            <div className="studio-card studio-element-draft">
              <h3>{labelFor(choice)}</h3>
              <label>
                Name
                <input
                  maxLength={60}
                  value={itemName}
                  placeholder={labelFor(choice)}
                  disabled={pending}
                  onChange={(event) => setItemName(event.target.value)}
                />
              </label>
              {choice.clip?.scope === "scene" && (
                <p className="scan-note">Entire scene</p>
              )}
              {choice.type === "image" ? (
                <span>
                  {choice.width} × {choice.height}
                </span>
              ) : (
                <AssetPreview item={choice} />
              )}
              {!!choice.imageCandidates?.length && (
                <label>
                  <input
                    type="checkbox"
                    checked={includeImages}
                    disabled={pending}
                    onChange={(event) => setIncludeImages(event.target.checked)}
                  />{" "}
                  Include {choice.imageCandidates.length}{" "}
                  {choice.imageCandidates.length === 1 ? "image" : "images"}
                </label>
              )}
              {choice.css && (
                <details>
                  <summary>Captured properties</summary>
                  <Properties css={choice.css} />
                </details>
              )}
              {inspection.limited && (
                <p>Some component content exceeded the capture bounds.</p>
              )}
              {inspection.resourcesOmitted && (
                <p>Some embedded content or external resources were skipped.</p>
              )}
            </div>
          ) : palette ? (
            <div
              className="studio-palette-preview"
              aria-label="Colors in the palette"
            >
              {items.map(({ value }) => (
                <span
                  key={value}
                  style={{ backgroundColor: value }}
                  title={colorLabel(value)}
                />
              ))}
            </div>
          ) : bulk === "text" ? (
            <AssetPreview item={items[0]} />
          ) : bulk === "fonts" || bulk === "images" ? (
            <details
              className="studio-bulk-review"
              open={overImageLimit || unavailableImages.length > 0 || undefined}
            >
              <summary>
                Review {bulk === "fonts" ? "styles" : "images"} · {count} of{" "}
                {items.length} selected
              </summary>
              {overImageLimit && (
                <p>Choose up to {EXPORT_LIMITS.files} images per save.</p>
              )}
              {pickItems}
            </details>
          ) : (
            pickItems
          )}
          <div className="studio-side-actions">
            <button
              type="button"
              className="secondary"
              disabled={pending}
              onClick={() => dialog.current.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="primary"
              disabled={
                pending || !valid || overImageLimit || !(choice || count)
              }
              onClick={() => save()}
            >
              {pending
                ? "Saving…"
                : !projectId
                  ? "Create and save"
                  : confirmLabel}
            </button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}
