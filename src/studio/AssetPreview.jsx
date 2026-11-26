import React, { useEffect, useRef, useState } from "react";
import { safeStyleValue } from "./inspect.js";

const camel = (name) =>
  name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

function styleObject(css) {
  return Object.fromEntries(
    Object.entries(css)
      .filter(([, value]) => safeStyleValue(value))
      .map(([name, value]) => [camel(name), value]),
  );
}

function ComponentShape({ node, images }) {
  const style = styleObject(node.css);
  return (
    <div
      className="studio-node"
      style={{
        ...style,
        boxSizing: "border-box",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      {images?.[node.imageIndex]?.blob ? (
        <ImagePreview image={images[node.imageIndex]} />
      ) : (
        node.text ||
        node.placeholder ||
        (node.children.length ? null : node.tag)
      )}
      {node.children.map((child, index) => (
        <ComponentShape key={index} node={child} images={images} />
      ))}
    </div>
  );
}

function ImagePreview({ image }) {
  const canvas = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    createImageBitmap(image.blob, { resizeWidth: 320, resizeQuality: "medium" })
      .then((bitmap) => {
        if (live) {
          const element = canvas.current;
          const scale = Math.min(1, 160 / bitmap.height);
          element.width = Math.max(1, Math.round(bitmap.width * scale));
          element.height = Math.max(1, Math.round(bitmap.height * scale));
          element
            .getContext("2d")
            .drawImage(bitmap, 0, 0, element.width, element.height);
        }
        bitmap.close();
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [image.blob]);
  return failed ? (
    <p>Image preview unavailable.</p>
  ) : (
    <canvas
      ref={canvas}
      role="img"
      aria-label={image.name}
      className="studio-image-preview"
    />
  );
}

export function Properties({ css }) {
  return (
    <dl className="studio-properties">
      {Object.entries(css).map(([name, value]) => (
        <div key={name}>
          <dt>{name}</dt>
          <dd>
            <code>{value}</code>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MotionPreview({
  item,
  label = "Play motion",
  caption = "Motion preview",
  css,
  onSave,
  saveLabel = `Save ${item.kind}`,
}) {
  const sample = useRef(null);
  const animations = useRef([]);
  useEffect(
    () => () => animations.current.forEach((animation) => animation.cancel()),
    [],
  );
  function play() {
    animations.current.forEach((animation) => animation.cancel());
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    animations.current = item.animations.map(
      ({ keyframes, duration, easing, direction }) =>
        sample.current.animate(keyframes, {
          duration: reduce ? 0 : Math.min(duration, 10000),
          easing,
          direction,
          iterations: 1,
          fill: "forwards",
        }),
    );
  }
  return (
    <div className="studio-motion-preview">
      <div
        className="studio-sample"
        ref={sample}
        style={styleObject(css || {})}
      >
        {caption}
      </div>
      <div className="studio-row">
        <button
          className={onSave ? "primary" : "secondary"}
          type="button"
          onClick={play}
        >
          {label}
        </button>
        {onSave && (
          <button className="secondary" type="button" onClick={onSave}>
            {saveLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function VisualMotionPreview({ clip, onSave }) {
  const animation = useRef(0);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("");
  const frame = clip.frames[index] || clip.frames[0];
  const source = clip.sources[frame.image];
  useEffect(() => () => cancelAnimationFrame(animation.current), [clip]);

  function play() {
    cancelAnimationFrame(animation.current);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIndex(clip.frames.length - 1);
      setStatus("End frame shown. Reduced motion is on.");
      return;
    }
    const start = performance.now();
    let next = 0;
    setIndex(0);
    setStatus("Playing motion preview…");
    function tick(now) {
      const elapsed = now - start;
      while (
        next + 1 < clip.frames.length &&
        clip.frames[next + 1].at <= elapsed
      )
        next++;
      setIndex(next);
      if (elapsed < clip.duration)
        animation.current = requestAnimationFrame(tick);
      else setStatus("Preview complete.");
    }
    animation.current = requestAnimationFrame(tick);
  }

  return (
    <div className="studio-motion-preview studio-visual-motion">
      <div
        role="img"
        aria-label="Visual motion preview"
        className="studio-visual-stage"
        style={{
          aspectRatio: `${clip.width} / ${clip.height}`,
          width: `min(100%, ${clip.scope === "scene" ? 384 : 256}px, ${(180 * clip.width) / clip.height}px)`,
        }}
      >
        {source?.startsWith("data:image/webp;base64,") && (
          <img
            alt=""
            src={source}
            style={{
              left: `${frame.left}%`,
              top: `${frame.top}%`,
              width: `${frame.width}%`,
              height: `${frame.height}%`,
            }}
          />
        )}
      </div>
      <div className="studio-row">
        <button
          type="button"
          className={onSave ? "primary" : "secondary"}
          onClick={play}
        >
          Preview motion
        </button>
        {onSave && (
          <button type="button" className="secondary" onClick={onSave}>
            Save motion
          </button>
        )}
      </div>
      {status && <p role="status">{status}</p>}
    </div>
  );
}

export default function AssetPreview({ item }) {
  if (item.type === "image") return <ImagePreview image={item} />;
  if (item.type === "text")
    return <p className="studio-text-preview">{item.text}</p>;
  if (item.type === "component") {
    const allMotion = (node) => [
      ...(node.motions || []),
      ...node.children.flatMap(allMotion),
    ];
    const motion = allMotion(item.tree);
    return (
      <>
        <div
          className="studio-component-preview"
          aria-label="Component structure preview"
        >
          <ComponentShape node={item.tree} images={item.images} />
        </div>
        {!!motion.length && (
          <details>
            <summary>Captured motion ({motion.length})</summary>
            <ul>
              {motion.map((asset, index) => (
                <li key={index}>
                  <strong>{asset.name}</strong>
                  <Properties css={asset.css} />
                </li>
              ))}
            </ul>
          </details>
        )}
      </>
    );
  }
  if (item.type === "effect")
    return (
      <div className="studio-sample" style={styleObject(item.css)}>
        Effect preview
      </div>
    );
  if (item.type === "motion") {
    if (item.clip) return <VisualMotionPreview clip={item.clip} />;
    if (item.animations.length) return <MotionPreview item={item} />;
  }
  return null;
}
