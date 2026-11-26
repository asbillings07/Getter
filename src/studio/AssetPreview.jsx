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

export function ComponentShape({ node, images }) {
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
  playback = false,
  onSave,
  saveLabel = `Save ${item.kind}`,
}) {
  const sample = useRef(null);
  const animations = useRef([]);
  const clock = useRef(0);
  const [running, setRunning] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const duration = Math.min(
    10000,
    Math.max(1, ...item.animations.map((animation) => animation.duration)),
  );
  useEffect(
    () => () => {
      cancelAnimationFrame(clock.current);
      animations.current.forEach((animation) => animation.cancel());
    },
    [],
  );

  function setTime(value) {
    animations.current.forEach((animation) => {
      animation.currentTime = Math.min(
        value,
        animation.effect.getTiming().duration,
      );
    });
    setPosition(value);
  }

  function create(reduced = false) {
    animations.current.forEach((animation) => animation.cancel());
    animations.current = item.animations.map(
      ({ keyframes, duration, easing, direction }) =>
        sample.current.animate(keyframes, {
          duration: reduced ? 0 : Math.min(duration, 10000),
          easing,
          direction,
          iterations: 1,
          fill: "forwards",
        }),
    );
    animations.current.forEach((animation) => {
      animation.playbackRate = speed;
    });
  }

  function tick() {
    const time = Math.max(
      0,
      ...animations.current.map((animation) => animation.currentTime ?? 0),
    );
    setPosition(Math.min(duration, Math.round(time)));
    if (
      time < duration &&
      animations.current.some((animation) => animation.playState === "running")
    )
      clock.current = requestAnimationFrame(tick);
    else setRunning(false);
  }

  function play(replay = false) {
    cancelAnimationFrame(clock.current);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!playback) {
      create(reduce);
      return;
    }
    if (running && !replay) {
      animations.current.forEach((animation) => animation.pause());
      setRunning(false);
      return;
    }
    if (!animations.current.length || replay || position >= duration) {
      create();
      setTime(0);
    }
    if (reduce) {
      animations.current.forEach((animation) => animation.pause());
      setTime(duration);
      setRunning(false);
      return;
    }
    animations.current.forEach((animation) => animation.play());
    setRunning(true);
    clock.current = requestAnimationFrame(tick);
  }

  function scrub(value) {
    cancelAnimationFrame(clock.current);
    if (!animations.current.length) create();
    animations.current.forEach((animation) => animation.pause());
    setRunning(false);
    setTime(value);
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
          onClick={() => play()}
        >
          {running ? "Pause preview" : label}
        </button>
        {playback && (
          <button
            className="secondary"
            type="button"
            onClick={() => play(true)}
          >
            Replay
          </button>
        )}
        {onSave && (
          <button className="secondary" type="button" onClick={onSave}>
            {saveLabel}
          </button>
        )}
      </div>
      {playback && (
        <div className="inspect-pro-playback">
          <input
            type="range"
            min="0"
            max={duration}
            value={position}
            aria-label="Animation timeline in milliseconds"
            onChange={(event) => scrub(Number(event.target.value))}
          />
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSpeed(next);
              animations.current.forEach((animation) =>
                animation.updatePlaybackRate(next),
              );
            }}
          >
            <option value="1">1×</option>
            <option value="0.25">¼×</option>
          </select>
          <small>
            {position} / {duration} ms
          </small>
        </div>
      )}
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
        {item.observedMotion?.clip && (
          <VisualMotionPreview clip={item.observedMotion.clip} />
        )}
        {!!item.observedMotion?.animations.length &&
          !item.observedMotion.clip && (
            <MotionPreview item={item.observedMotion} />
          )}
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
