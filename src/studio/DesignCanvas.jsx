import React, { forwardRef, useEffect, useState } from "react";
import { safeStyleValue } from "./inspect.js";

export function dataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

let measurement;
function wrap(text, width, layer) {
  measurement ||= document.createElement("canvas").getContext("2d");
  const context = measurement;
  context.font = `${layer.fontStyle} ${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  if ("letterSpacing" in context)
    context.letterSpacing = `${layer.letterSpacing}px`;
  const result = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width <= width || !line) {
        line = next;
      } else {
        result.push(line);
        line = word;
      }
    }
    result.push(line);
  }
  return result;
}

function TextContent({ layer, centered }) {
  const inset = centered ? Math.min(14, layer.width / 10) : 0;
  const lines = wrap(layer.text, Math.max(1, layer.width - inset * 2), layer);
  const step = layer.fontSize * layer.lineHeight;
  const x =
    layer.align === "middle"
      ? layer.width / 2
      : layer.align === "end"
        ? layer.width - inset
        : inset;
  const start = centered
    ? Math.max(
        layer.fontSize,
        (layer.height - lines.length * step) / 2 + layer.fontSize * 0.86,
      )
    : layer.fontSize;
  return (
    <text
      textAnchor={layer.align}
      fill={layer.textColor}
      fontFamily={layer.fontFamily}
      fontSize={layer.fontSize}
      fontWeight={layer.fontWeight}
      fontStyle={layer.fontStyle}
      letterSpacing={layer.letterSpacing}
    >
      {lines.map((line, index) => (
        <tspan x={x} y={start + index * step} key={index}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function Artwork({ layer }) {
  const [href, setHref] = useState("");
  useEffect(() => {
    let live = true;
    setHref("");
    if (layer.blob)
      dataUrl(layer.blob)
        .then((url) => {
          if (live) setHref(url);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [layer.blob]);
  const clip = `image-${layer.id}`;
  return (
    <>
      <defs>
        <clipPath id={clip}>
          <rect width={layer.width} height={layer.height} rx={layer.radius} />
        </clipPath>
      </defs>
      <image
        data-artwork={layer.id}
        href={href || undefined}
        width={layer.width}
        height={layer.height}
        preserveAspectRatio={
          layer.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"
        }
        clipPath={`url(#${clip})`}
      />
    </>
  );
}

const metric = (value, otherwise) =>
  Number.isFinite(Number.parseFloat(value))
    ? Number.parseFloat(value)
    : otherwise;
const literalColor = (value, otherwise) =>
  safeStyleValue(value) && CSS.supports("color", value) ? value : otherwise;

function ComponentArtwork({ layer }) {
  const root = layer.tree;
  const [images, setImages] = useState([]);
  useEffect(() => {
    let live = true;
    setImages([]);
    if (layer.images?.length)
      Promise.all(
        layer.images.map(({ blob }) => dataUrl(blob).catch(() => "")),
      ).then((values) => {
        if (live) setImages(values);
      });
    return () => {
      live = false;
    };
  }, [layer.images]);
  const width = root.bounds?.width || metric(root.css.width, 320) || 320;
  const height = root.bounds?.height || metric(root.css.height, 160) || 160;
  function draw(node, fallback, key) {
    const box = node.bounds || fallback;
    const css = node.css;
    const row =
      css.display === "flex" && !css["flex-direction"]?.startsWith("column");
    const count = Math.max(1, node.children.length);
    const pad = Math.min(12, box.width * 0.04, box.height * 0.08);
    return (
      <g key={key}>
        <rect
          x={box.x}
          y={box.y}
          width={Math.max(1, box.width)}
          height={Math.max(1, box.height)}
          rx={Math.max(0, metric(css["border-radius"], 0))}
          fill={literalColor(css["background-color"], "transparent")}
        />
        {node.children.map((child, index) => {
          const innerWidth = Math.max(1, box.width - pad * 2);
          const innerHeight = Math.max(1, box.height - pad * 2);
          return draw(
            child,
            {
              x: box.x + pad + (row ? (innerWidth / count) * index : 0),
              y: box.y + pad + (row ? 0 : (innerHeight / count) * index),
              width: row ? innerWidth / count : innerWidth,
              height: row ? innerHeight : innerHeight / count,
            },
            index,
          );
        })}
        {images[node.imageIndex] ? (
          <image
            href={images[node.imageIndex]}
            x={box.x}
            y={box.y}
            width={Math.max(1, box.width)}
            height={Math.max(1, box.height)}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          (!node.children.length || node.text) && (
            <text
              x={box.x + pad + 2}
              y={box.y + Math.min(box.height * 0.7, 23)}
              fontFamily={
                safeStyleValue(css["font-family"])
                  ? css["font-family"]
                  : "Arial"
              }
              fontSize={Math.max(
                1,
                Math.min(24, metric(css["font-size"], 16), box.height * 0.6),
              )}
              fill={literalColor(css.color, "#27352e")}
            >
              {node.text || node.placeholder || node.tag}
            </text>
          )
        )}
      </g>
    );
  }
  return (
    <svg
      width={layer.width}
      height={layer.height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {draw(root, { x: 0, y: 0, width, height }, "root")}
    </svg>
  );
}

export default forwardRef(function DesignCanvas(
  { draft, selected, onStart, onMove, onEnd, onCancel },
  ref,
) {
  const interactive = !!onStart;
  const filled = new Set(
    draft.layers
      .filter(({ fills, hidden }) => fills && !hidden)
      .map(({ fills }) => fills),
  );
  return (
    <svg
      ref={ref}
      className="design-artboard"
      viewBox={`0 0 ${draft.width} ${draft.height}`}
      width={draft.width}
      height={draft.height}
      role="img"
      aria-label="Design canvas"
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onCancel}
      onLostPointerCapture={onCancel}
    >
      <rect
        width={draft.width}
        height={draft.height}
        fill={draft.background}
        onPointerDown={
          interactive ? (event) => onStart(event, null) : undefined
        }
      />
      {draft.layers
        .filter(
          ({ hidden, placeholder }) => !hidden && !filled.has(placeholder),
        )
        .map((layer) => (
          <g
            key={layer.id}
            transform={`translate(${layer.x} ${layer.y})`}
            opacity={layer.opacity}
            data-layer-id={layer.id}
            onPointerDown={
              interactive ? (event) => onStart(event, layer) : undefined
            }
          >
            {layer.shadow && (
              <defs>
                <filter
                  id={`shadow-${layer.id}`}
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feDropShadow
                    dx={layer.shadow.x}
                    dy={layer.shadow.y}
                    stdDeviation={layer.shadow.blur / 2}
                    floodColor={layer.shadow.color}
                  />
                </filter>
              </defs>
            )}
            {["shape", "button"].includes(layer.type) && (
              <rect
                width={layer.width}
                height={layer.height}
                rx={layer.radius}
                fill={layer.fill}
                stroke={layer.stroke}
                strokeWidth={layer.strokeWidth}
                filter={layer.shadow ? `url(#shadow-${layer.id})` : undefined}
              />
            )}
            {interactive && (
              <rect
                data-editor-only=""
                width={layer.width}
                height={layer.height}
                fill="transparent"
              />
            )}
            {["text", "button", "image", "component"].includes(layer.type) && (
              <svg
                width={layer.width}
                height={layer.height}
                viewBox={`0 0 ${layer.width} ${layer.height}`}
                pointerEvents="none"
              >
                {layer.type === "image" && <Artwork layer={layer} />}
                {layer.type === "component" && (
                  <ComponentArtwork layer={layer} />
                )}
                {["text", "button"].includes(layer.type) && (
                  <TextContent
                    layer={layer}
                    centered={layer.type === "button"}
                  />
                )}
              </svg>
            )}
          </g>
        ))}
      {interactive &&
        selected &&
        !selected.hidden &&
        !filled.has(selected.placeholder) && (
          <g data-editor-only="">
            <rect
              x={selected.x}
              y={selected.y}
              width={selected.width}
              height={selected.height}
              fill="none"
              stroke="#326cec"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <circle
              cx={selected.x + selected.width}
              cy={selected.y + selected.height}
              r={Math.max(8, draft.width / 120)}
              fill="#fff"
              stroke="#326cec"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              className="design-resize-handle"
              onPointerDown={(event) => onStart(event, selected, true)}
            />
          </g>
        )}
    </svg>
  );
});

export async function exportDesign(stage, draft, format) {
  const output = stage.cloneNode(true);
  output
    .querySelectorAll("[data-editor-only]")
    .forEach((element) => element.remove());
  output.removeAttribute("class");
  output.removeAttribute("role");
  output.removeAttribute("aria-label");
  for (const image of output.querySelectorAll("[data-artwork]")) {
    const layer = draft.layers.find(({ id }) => id === image.dataset.artwork);
    image.setAttribute("href", await dataUrl(layer.blob));
    image.removeAttribute("data-artwork");
  }
  output
    .querySelectorAll("[data-layer-id]")
    .forEach((item) => item.removeAttribute("data-layer-id"));
  const svg = new Blob([new XMLSerializer().serializeToString(output)], {
    type: "image/svg+xml;charset=utf-8",
  });
  if (format === "svg") return svg;
  const url = URL.createObjectURL(svg);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = draft.width;
    canvas.height = draft.height;
    canvas.getContext("2d").drawImage(image, 0, 0);
    return await new Promise((resolve, reject) =>
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(Error("Couldn’t render the PNG.")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
