import React, { useEffect, useRef, useState } from "react";
import { ReferencePreview, Screenshot } from "./ReviewReference.jsx";
import {
  changeReview,
  compareLayer,
  getReview,
  sampleLayers,
} from "./reviews.js";

const areaFields = ["x", "y", "width", "height"];

function validArea(area) {
  return (
    areaFields.every((field) => Number.isFinite(area?.[field])) &&
    area.x >= 0 &&
    area.y >= 0 &&
    area.width > 0 &&
    area.height > 0 &&
    area.x + area.width <= 100 + 1e-9 &&
    area.y + area.height <= 100 + 1e-9
  );
}

function areaPoint(event, { left, top, width, height }) {
  // Work in tenths of a percent so the drawn area survives panel resizing.
  const part = (value, origin, size) =>
    Math.round(Math.min(1000, Math.max(0, (1000 * (value - origin)) / size)));
  return {
    x: part(event.clientX, left, width),
    y: part(event.clientY, top, height),
  };
}

function areaBetween(start, end) {
  return {
    x: Math.min(start.x, end.x) / 10,
    y: Math.min(start.y, end.y) / 10,
    width: Math.abs(start.x - end.x) / 10,
    height: Math.abs(start.y - end.y) / 10,
  };
}

function ScreenshotArea({ reference, saved, note, onSave }) {
  const [area, setArea] = useState(saved ?? null);
  const [finding, setFinding] = useState(note || "");
  const [dragPreview, setDragPreview] = useState(null);
  const [marking, setMarking] = useState(false);
  const [saving, setSaving] = useState(false);
  const screenshot = useRef(null);
  const drag = useRef(null);
  const mark = marking ? (dragPreview ?? area) : saved;

  function startDrag(event) {
    if (
      !marking ||
      saving ||
      drag.current ||
      !event.isPrimary ||
      event.button !== 0
    )
      return;
    const target = event.currentTarget;
    const bounds = target.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    event.preventDefault();
    const start = areaPoint(event, bounds);
    target.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, start, target };
    setDragPreview(areaBetween(start, start));
  }

  function draggedArea(event) {
    return areaBetween(
      drag.current.start,
      areaPoint(event, event.currentTarget.getBoundingClientRect()),
    );
  }

  function moveDrag(event) {
    if (drag.current?.id === event.pointerId)
      setDragPreview(draggedArea(event));
  }

  function clearDrag() {
    const current = drag.current;
    drag.current = null;
    setDragPreview(null);
    if (current?.target.hasPointerCapture(current.id))
      current.target.releasePointerCapture(current.id);
  }

  function finishDrag(event) {
    if (drag.current?.id !== event.pointerId) return;
    const next = draggedArea(event);
    if (validArea(next)) setArea(next);
    clearDrag();
  }

  function cancelDrag(event) {
    if (drag.current?.id === event.pointerId) clearDrag();
  }

  function cancelMarking() {
    if (saving) return;
    clearDrag();
    setArea(saved ?? null);
    setFinding(note || "");
    setMarking(false);
  }

  async function saveMark() {
    if (saving || drag.current || !validArea(area)) return;
    setSaving(true);
    try {
      if (await onSave(area, finding.trim())) setMarking(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="review-fields"
      onKeyDown={(event) => {
        if (event.key === "Escape" && marking) cancelMarking();
      }}
    >
      <h3>Screenshot reference</h3>
      <small>
        {reference.name} · {reference.width} × {reference.height} px
      </small>
      <div
        className="review-screenshot"
        ref={screenshot}
        data-marking={marking || undefined}
        role="group"
        aria-label="Screenshot area"
        tabIndex={-1}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
      >
        <Screenshot reference={reference} />
        {validArea(mark) && (
          <span
            aria-hidden="true"
            className="review-area-mark"
            style={{
              left: `${mark.x}%`,
              top: `${mark.y}%`,
              width: `${mark.width}%`,
              height: `${mark.height}%`,
            }}
          />
        )}
      </div>
      <small>
        Compare the screenshot visually. Figma layers and exact design values
        are unavailable for screenshots.
      </small>
      {!marking ? (
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setMarking(true);
            screenshot.current.focus();
          }}
        >
          {saved ? "Change marked area" : "Mark an area"}
        </button>
      ) : (
        <>
          <small role="status">Drag over the screenshot to mark an area.</small>
          <details>
            <summary>Enter area coordinates</summary>
            <div className="review-coordinates">
              {areaFields.map((field) => (
                <label key={field}>
                  {field === "x" || field === "y" ? field.toUpperCase() : field}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    aria-label={`${field} percent`}
                    disabled={saving || Boolean(dragPreview)}
                    value={Number.isFinite(mark?.[field]) ? mark[field] : ""}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber;
                      setArea((previous) => ({ ...previous, [field]: value }));
                    }}
                  />
                </label>
              ))}
            </div>
          </details>
          <label>
            Visual difference · Optional
            <textarea
              maxLength={400}
              rows={3}
              disabled={saving}
              value={finding}
              onChange={(event) => setFinding(event.target.value)}
            />
          </label>
          <div className="studio-row">
            <button
              type="button"
              className="primary"
              disabled={!validArea(area) || Boolean(dragPreview) || saving}
              onClick={saveMark}
            >
              Save marked area
            </button>
            <button
              type="button"
              className="text-button"
              disabled={saving}
              onClick={cancelMarking}
            >
              Cancel
            </button>
          </div>
        </>
      )}
      {saved && !marking && <small role="status">Marked area saved.</small>}
      {note && !marking && <p>{note}</p>}
    </div>
  );
}

function LayerComparison({ snapshot, review, onSave }) {
  const matched =
    review.match?.selector === snapshot?.selector ? review.match : null;
  const [layerId, setLayerId] = useState(matched?.layerId || "");
  const layer = sampleLayers.find(({ id }) => id === layerId);
  return (
    <div className="review-fields">
      <h3>Match element to layer</h3>
      <div>
        <small>Website element</small>
        <div>
          {snapshot ? (
            <code>{snapshot.selector}</code>
          ) : (
            "Pick an element on the page."
          )}
        </div>
      </div>
      <label>
        Figma layer
        <select
          value={layerId}
          disabled={!snapshot}
          onChange={(event) => setLayerId(event.target.value)}
        >
          <option value="">Choose a layer in the frame</option>
          {sampleLayers.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.name} · {choice.type}
            </option>
          ))}
        </select>
      </label>
      <div className="studio-row">
        <button
          type="button"
          className="primary"
          disabled={!layer || !snapshot}
          onClick={() =>
            onSave({
              match: {
                layerId: layer.id,
                layerName: layer.name,
                selector: snapshot.selector,
                capturedAt: new Date().toISOString(),
                rows: compareLayer(layer, snapshot),
              },
            })
          }
        >
          {matched ? "Update match" : "Match layer"}
        </button>
      </div>
      {matched && (
        <>
          <p role="status">Matched to {matched.layerName}</p>
          <small>
            Saved values from {new Date(matched.capturedAt).toLocaleString()}
          </small>
          <ul className="review-values" aria-label="Compared values">
            {matched.rows.map(({ property, expected, observed, status }) => (
              <li key={property}>
                <strong>{property}</strong>
                <span>{status}</span>
                <div>
                  <small>Expected</small>
                  <code>{expected}</code>
                </div>
                <div>
                  <small>Observed</small>
                  <code>{observed ?? "Unavailable"}</code>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function InspectReview({ id, snapshot, isCurrent }) {
  const [review, setReview] = useState(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    getReview(id).then(
      (saved) => {
        if (live) setReview(saved || null);
      },
      () => {
        if (live) setReview(null);
      },
    );
    return () => {
      live = false;
    };
  }, [id]);

  async function save(fields) {
    if (!isCurrent()) return false;
    setError("");
    try {
      const saved = await changeReview(id, review.referenceRevision, () => {
        if (!isCurrent())
          throw Error("The page or selection changed. Pick it again.");
        return fields;
      });
      setReview(saved);
      return true;
    } catch (failure) {
      setError(failure.message || "Getter couldn’t save this comparison.");
      return false;
    }
  }

  if (review === undefined)
    return <p role="status">Opening approved reference…</p>;
  if (!review)
    return (
      <p role="alert">
        This review is unavailable. Reopen it from Getter Studio.
      </p>
    );
  return (
    <section
      className="studio-card review-fields inspect-review"
      aria-label="Design Review comparison"
    >
      <div>
        <small>Design Review</small>
        <h2>{review.ticket}</h2>
        <small>{review.viewport}</small>
      </div>
      {["screenshot", "sample-screenshot"].includes(review.reference.kind) ? (
        <ScreenshotArea
          key={review.referenceRevision}
          reference={review.reference}
          saved={review.area}
          note={review.visualNote}
          onSave={(area, visualNote) => save({ area, visualNote })}
        />
      ) : (
        <>
          <ReferencePreview reference={review.reference} />
          {review.reference.kind === "sample-figma" && (
            <LayerComparison
              key={snapshot?.selectionId ?? "empty"}
              snapshot={snapshot}
              review={review}
              onSave={save}
            />
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
