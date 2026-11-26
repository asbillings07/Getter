import React, { useEffect, useRef, useState } from "react";
import { ComponentShape } from "./AssetPreview.jsx";

export default function InspectComponentPreview({
  component,
  artwork,
  loading,
}) {
  const stage = useRef(null);
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
  const { width = 0, height = 0 } = node?.bounds || {};
  const scale = Math.min(1, availableWidth / width, 180 / height);
  const background = node?.css["background-color"];
  const canRender =
    node &&
    width > 0 &&
    height > 0 &&
    (node.children.length ||
      node.text ||
      node.placeholder ||
      node.thumbnail ||
      (background &&
        !["transparent", "rgba(0, 0, 0, 0)"].includes(background)));
  const showArtwork =
    artwork &&
    (!canRender ||
      (artwork.kind !== "media" && node.id === component.selected?.id));
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
            style={{
              width: width * scale,
              height: height * scale,
              backgroundColor: component.background,
            }}
          >
            <div style={{ width, height, transform: `scale(${scale})` }}>
              <ComponentShape
                node={node}
                selectedId={component.selected?.id}
                previewRoot
              />
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
