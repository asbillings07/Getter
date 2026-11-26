import React, { useEffect, useRef, useState } from "react";
import { styleObject } from "./AssetPreview.jsx";

const mediaPlaceholders = {
  img: "Image unavailable",
  video: "Video frame unavailable",
  iframe: "Embedded frame",
  frame: "Embedded frame",
  canvas: "Canvas artwork unavailable",
};

const place = ({ x, y, width, height }) => ({ left: x, top: y, width, height });

function PreviewPart({ node }) {
  const css = styleObject(node.css);
  const thumbnail = node.thumbnail;
  const textStyle = {
    color: css.color,
    fontFamily: css.fontFamily,
    fontSize: css.fontSize,
    fontWeight: css.fontWeight,
    fontStyle: css.fontStyle,
    letterSpacing: css.letterSpacing,
    textDecoration: css.textDecoration,
  };
  return (
    <>
      {!node.unboxed && (
        <div
          className="inspect-pro-part"
          style={{
            ...place(node.bounds),
            ...textStyle,
            backgroundColor: css.backgroundColor,
            backgroundImage: css.backgroundImage,
            border: css.border,
            borderRadius: css.borderRadius,
            boxShadow: css.boxShadow,
          }}
        >
          {thumbnail?.data.startsWith("data:image/webp;base64,") ? (
            <img
              className="studio-component-thumbnail"
              src={thumbnail.data}
              alt={thumbnail.alt}
              style={{
                objectFit: node.objectFit,
                objectPosition: node.objectPosition,
              }}
            />
          ) : mediaPlaceholders[node.media] ? (
            <span className="inspect-pro-media-placeholder">
              {mediaPlaceholders[node.media]}
            </span>
          ) : node.placeholder ? (
            <span className="inspect-pro-placeholder">{node.placeholder}</span>
          ) : null}
        </div>
      )}
      {node.textRuns?.map(({ text, bounds }, index) => (
        <span
          key={index}
          className="inspect-pro-text-run"
          style={{ ...place(bounds), ...textStyle }}
        >
          {text}
        </span>
      ))}
      {node.children.map((child) => (
        <PreviewPart key={child.id} node={child} />
      ))}
    </>
  );
}

export default function InspectComponentPreview({
  component,
  artwork,
  loading,
}) {
  const stage = useRef(null);
  const frame = useRef(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const target = stage.current;
    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const node = component?.component;
  const { x = 0, y = 0, width = 0, height = 0 } = node?.bounds || {};
  const scale = width ? Math.min(1, availableWidth / width) : 0;
  const selected = component?.selected;
  useEffect(() => {
    const viewport = frame.current;
    if (!viewport || !selected || selected.id === node.id) return;
    const top = (selected.bounds.y - y) * scale;
    const bottom = top + selected.bounds.height * scale;
    if (
      top < viewport.scrollTop ||
      bottom > viewport.scrollTop + viewport.clientHeight
    )
      viewport.scrollTop = Math.max(0, top - viewport.clientHeight / 4);
  }, [node, selected, scale, y]);
  const background = node?.css["background-color"];
  const canRender =
    node &&
    width > 0 &&
    height > 0 &&
    (node.children.length ||
      node.text ||
      node.placeholder ||
      node.thumbnail ||
      node.media ||
      (background &&
        !["transparent", "rgba(0, 0, 0, 0)"].includes(background)));
  const showArtwork =
    artwork &&
    (!canRender ||
      (node.id === component.selected?.id &&
        (artwork.kind !== "media" || node.media)));
  const artworkLabel =
    artwork?.kind === "scene" ? "Entire scene" : "Selected artwork";

  return (
    <section className="inspect-pro-preview" aria-label="Component preview">
      <div className="studio-row studio-between">
        <h2>Component preview</h2>
        <small>{showArtwork ? artworkLabel : "Page reconstruction"}</small>
      </div>
      <div className="inspect-pro-preview-stage" ref={stage}>
        {showArtwork ? (
          <img
            className="inspect-pro-artwork"
            src={artwork.src}
            alt={`${artworkLabel} preview`}
            style={{
              width: `min(100%, ${artwork.width}px, ${(180 * artwork.width) / artwork.height}px)`,
            }}
          />
        ) : canRender && scale > 0 ? (
          <div
            className="inspect-pro-preview-frame"
            ref={frame}
            style={{
              width: width * scale,
              height: Math.min(220, height * scale),
              backgroundColor: component.background,
            }}
          >
            <div
              className="inspect-pro-preview-sheet"
              style={{ height: height * scale }}
            >
              <div
                className="inspect-pro-preview-canvas"
                style={{ width, height, transform: `scale(${scale})` }}
              >
                <div
                  className="inspect-pro-preview-origin"
                  style={{ left: -x, top: -y }}
                >
                  <PreviewPart node={node} />
                  {selected && (
                    <div
                      data-highlighted-part={selected.id}
                      aria-hidden="true"
                      className="inspect-pro-part-outline"
                      style={place(selected.bounds)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : !canRender ? (
          <p className="scan-note">
            {loading
              ? "Loading component preview…"
              : "No visible component preview for this selection."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
