import React, { useEffect, useState } from "react";
import { ReferencePreview, Screenshot } from "./ReviewReference.jsx";
import {
  changeReview,
  compareLayer,
  getReview,
  sampleLayers,
} from "./reviews.js";

const initialArea = { x: 0, y: 0, width: 100, height: 100 };

function ScreenshotArea({ reference, saved, note, onSave }) {
  const [area, setArea] = useState(saved || initialArea);
  const [finding, setFinding] = useState(note || "");
  const [corner, setCorner] = useState(null);
  const [marking, setMarking] = useState(false);
  const fields = ["x", "y", "width", "height"];
  const valid =
    fields.every((field) => Number.isFinite(area[field])) &&
    area.x >= 0 &&
    area.y >= 0 &&
    area.width > 0 &&
    area.height > 0 &&
    area.x + area.width <= 100 &&
    area.y + area.height <= 100;

  function mark(event) {
    if (!marking || event.detail === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.min(
      100,
      Math.max(
        0,
        Math.round((100 * (event.clientX - bounds.left)) / bounds.width),
      ),
    );
    const y = Math.min(
      100,
      Math.max(
        0,
        Math.round((100 * (event.clientY - bounds.top)) / bounds.height),
      ),
    );
    if (!corner) {
      setCorner({ x, y });
      return;
    }
    setArea({
      x: Math.min(x, corner.x),
      y: Math.min(y, corner.y),
      width: Math.abs(x - corner.x),
      height: Math.abs(y - corner.y),
    });
    setCorner(null);
  }

  return (
    <div className="review-fields">
      <h3>Screenshot reference</h3>
      <small>
        {reference.name} · {reference.width} × {reference.height} px
      </small>
      <div className="review-screenshot">
        <Screenshot reference={reference} />
        {(marking || saved) && valid && (
          <span
            className="review-area-mark"
            style={{
              left: `${area.x}%`,
              top: `${area.y}%`,
              width: `${area.width}%`,
              height: `${area.height}%`,
            }}
          />
        )}
        {marking && (
          <button
            type="button"
            tabIndex={-1}
            className="review-area-target"
            aria-label="Select two corners on the screenshot"
            onClick={mark}
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
          onClick={() => setMarking(true)}
        >
          {saved ? "Change marked area" : "Mark an area"}
        </button>
      ) : (
        <>
          <small role="status">
            {corner
              ? "Select the opposite corner."
              : "Select two corners on the screenshot."}
          </small>
          <details>
            <summary>Enter area coordinates</summary>
            <div className="review-coordinates">
              {fields.map((field) => (
                <label key={field}>
                  {field === "x" || field === "y" ? field.toUpperCase() : field}
                  <input
                    type="number"
                    min={0}
                    max={100}
                    aria-label={`${field} percent`}
                    value={Number.isFinite(area[field]) ? area[field] : ""}
                    onChange={(event) => {
                      setCorner(null);
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
              value={finding}
              onChange={(event) => setFinding(event.target.value)}
            />
          </label>
          <div className="studio-row">
            <button
              type="button"
              className="primary"
              disabled={!valid || !!corner}
              onClick={async () => {
                if (await onSave(area, finding.trim())) setMarking(false);
              }}
            >
              Save marked area
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setCorner(null);
                setArea(saved || initialArea);
                setFinding(note || "");
                setMarking(false);
              }}
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
