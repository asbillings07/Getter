import React, { useState } from "react";
import AssetPreview, { Properties } from "./AssetPreview.jsx";
import { assetKinds } from "./library.js";

export default function ElementDraft({
  capture,
  versionKind,
  onSave,
  pending,
}) {
  const [type, setType] = useState(versionKind || "element");
  const [name, setName] = useState("");
  const element = capture.component;
  const supportsMotion =
    capture.animations.length ||
    ["animation-duration", "transition-duration"].some((key) =>
      capture.motion[key]
        ?.split(",")
        .some((value) => Number.parseFloat(value) > 0),
    );
  const scopes = [
    { type: "element", css: element.css },
    ...(element.children.length ? [{ type: "component", tree: element }] : []),
    ...(Object.keys(capture.effects).length
      ? [{ type: "effect", css: capture.effects }]
      : []),
    ...(supportsMotion
      ? [
          {
            type: "motion",
            css: capture.motion,
            animations: capture.animations,
          },
        ]
      : []),
  ];
  const item = scopes.find((entry) => entry.type === type);
  if (!item)
    return (
      <p role="status">
        This element does not contain the earlier capture scope. Pick another
        element.
      </p>
    );
  const suggested =
    type === "element" ? `${element.tag} style` : `${element.tag} ${type}`;
  return (
    <div className="studio-card studio-element-draft">
      <h3>Review selected {element.tag}</h3>
      <div className="studio-row studio-fields">
        <label>
          Capture scope
          <select
            disabled={pending || !!versionKind}
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {scopes.map(({ type }) => (
              <option key={type} value={type}>
                {assetKinds[type]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Name
          <input
            maxLength={60}
            placeholder={suggested}
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      </div>
      {type === "component" && (
        <p>Structure and styles preview. Page content is excluded.</p>
      )}
      <AssetPreview key={type} item={item} />
      {item.css && (
        <details>
          <summary>Captured properties</summary>
          <Properties css={item.css} />
        </details>
      )}
      {type === "motion" && !capture.animations.length && (
        <p>
          Timing is saved for reference. This selection has no playable
          keyframes.
        </p>
      )}
      {capture.limited && <p>The component exceeded the capture bounds.</p>}
      {capture.resourcesOmitted && (
        <p>Embedded content and external style resources were skipped.</p>
      )}
      <button
        type="button"
        className="primary"
        disabled={pending}
        onClick={() => onSave({ ...item, name: name.trim() || suggested })}
      >
        Save capture
      </button>
    </div>
  );
}
