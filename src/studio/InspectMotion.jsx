import React from "react";
import { MotionPreview, Properties } from "./AssetPreview.jsx";
import { motionAssets } from "./inspect.js";

export default function InspectMotion({ motion, snapshot, query, onSave }) {
  const items = motionAssets(motion);
  if (!items.length)
    return query ? null : (
      <p className="scan-note">No animation or transition on this element.</p>
    );
  return items
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
              caption={snapshot.text ? snapshot.text.slice(0, 60) : item.name}
              label={`Preview ${item.kind}`}
              onSave={() => onSave(item.kind)}
            />
          ) : (
            <p className="scan-note">
              Timing is available. Hover the element to record a transition, or
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
}
