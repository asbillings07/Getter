import React, { useEffect, useRef, useState } from "react";
import { ComponentShape } from "./AssetPreview.jsx";

export default function InspectComponentPreview({ component, loading }) {
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

  return (
    <section className="inspect-pro-preview" aria-label="Component preview">
      <div className="studio-row studio-between">
        <h2>Component preview</h2>
        <small>Page reconstruction</small>
      </div>
      <div className="inspect-pro-preview-stage" ref={stage}>
        {canRender && scale > 0 ? (
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
