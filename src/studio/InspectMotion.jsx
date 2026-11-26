import React from "react";
import {
  ComponentShape,
  MotionPreview,
  Properties,
  VisualMotionPreview,
} from "./AssetPreview.jsx";
import { motionAssets } from "./inspect.js";

export default function InspectMotion({
  motion,
  observed,
  snapshot,
  component,
  playback,
  query,
  onSave,
}) {
  const selectArtwork = observed?.status === "select-artwork";
  const items = motion && !selectArtwork ? motionAssets(motion) : [];
  const captured = observed?.asset;
  const entireScene = captured?.clip?.scope === "scene";
  const showCaptured =
    captured &&
    (!query ||
      `${entireScene ? "Canvas motion " : ""}${captured.name} animation preview`
        .toLowerCase()
        .includes(query.trim().toLowerCase()));
  let note;
  if (!query && !captured && !items.length) {
    if (selectArtwork)
      note = "Select artwork on the page to preview its motion.";
    else if (!observed || observed.status === "checking")
      note = "Checking the selected element for motion…";
    else if (observed.status === "unavailable")
      note = "This motion can’t be previewed from the selected element.";
    else if (motion)
      note =
        "No motion detected. If it starts on hover or scroll, try that on the page.";
  }
  const declared = items
    .filter(
      (item) =>
        !query ||
        [item.kind, item.name, ...Object.entries(item.css).flat()].some(
          (value) => value.toLowerCase().includes(query.trim().toLowerCase()),
        ),
    )
    .map((item) => {
      const label = item.kind === "animation" ? "Animation" : "Transition";
      const duration = item.animations
        .map(({ duration }) => `${duration} ms`)
        .join(" · ");
      const surface = snapshot.css["background-color"];
      const css =
        surface && surface !== "rgba(0, 0, 0, 0)"
          ? {
              color: snapshot.css.color,
              "background-color": surface,
              "border-radius": snapshot.css["border-radius"],
            }
          : {};
      return (
        <section
          className="studio-inspect-motion"
          aria-label={`Studio ${item.kind}`}
          key={item.kind}
        >
          <div className="studio-row studio-between">
            <h3>{label}</h3>
            <small>Studio</small>
          </div>
          <p>
            <strong>{item.name}</strong>
            {duration && ` · ${duration}`}
          </p>
          {item.animations.length ? (
            <MotionPreview
              item={item}
              css={css}
              caption={
                component ? (
                  <ComponentShape node={component} />
                ) : snapshot.text ? (
                  snapshot.text.slice(0, 60)
                ) : (
                  item.name
                )
              }
              playback={playback}
              label={`Preview ${item.kind}`}
              onSave={() => onSave(item.kind)}
            />
          ) : (
            <p className="scan-note">
              Timing is available. Hover the element to preview a transition, or
              select it while its animation is active.
            </p>
          )}
          {!item.animations.length && (
            <button className="secondary" onClick={() => onSave(item.kind)}>
              Save {item.kind}
            </button>
          )}
          <details>
            <summary>
              {item.kind === "animation"
                ? "Keyframes and timing"
                : "States and timing"}
            </summary>
            <Properties css={item.css} />
            {item.animations.map(({ keyframes, name }, index) => (
              <dl className="studio-properties" key={index} aria-label={name}>
                {keyframes.map(({ offset, easing, ...css }, frame) => (
                  <div key={frame}>
                    <dt>{Math.round(offset * 100)}%</dt>
                    <dd>
                      {Object.entries(css)
                        .map(([name, value]) => `${name}: ${value}`)
                        .join(" · ")}
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </details>
        </section>
      );
    });
  return (
    <>
      {note && (
        <p className="scan-note" role="status">
          {note}
        </p>
      )}
      {showCaptured && (
        <section
          className="studio-inspect-motion"
          aria-label="Studio observed motion"
        >
          <div className="studio-row studio-between">
            <h3>{entireScene ? "Canvas motion" : captured.name}</h3>
            <small>Studio</small>
          </div>
          <p className="scan-note">
            {entireScene
              ? "Entire scene"
              : observed.selectedArtwork
                ? "Selected artwork"
                : observed.canvasWithinSelection
                  ? "Canvas in selection"
                  : "Motion detected"}{" "}
            · {captured.clip ? "2-second visual reference" : "2-second sample"}
          </p>
          {captured.clip ? (
            <VisualMotionPreview
              key={observed.sampleId}
              clip={captured.clip}
              onSave={() => onSave(captured.kind, observed.sampleId)}
            />
          ) : (
            <MotionPreview
              item={captured}
              playback={playback}
              caption={
                component ? <ComponentShape node={component} /> : undefined
              }
              label="Preview motion"
              saveLabel="Save motion"
              onSave={() => onSave(captured.kind, observed.sampleId)}
            />
          )}
        </section>
      )}
      {declared}
    </>
  );
}
