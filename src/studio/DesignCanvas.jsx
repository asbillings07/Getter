import JSZip from "jszip";
import React, { forwardRef, useEffect, useState } from "react";
import { colorLabel } from "../core/extract.js";
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

function Artwork({ layer, exportOnly }) {
  const [href, setHref] = useState("");
  useEffect(() => {
    let live = true;
    setHref("");
    if (!exportOnly && layer.blob)
      dataUrl(layer.blob)
        .then((url) => {
          if (live) setHref(url);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [layer.blob, exportOnly]);
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

function ComponentArtwork({ layer, exportOnly }) {
  const root = layer.tree;
  const [images, setImages] = useState([]);
  useEffect(() => {
    let live = true;
    setImages([]);
    if (!exportOnly && layer.images?.length)
      Promise.all(
        layer.images.map(({ blob }) => dataUrl(blob).catch(() => "")),
      ).then((values) => {
        if (live) setImages(values);
      });
    return () => {
      live = false;
    };
  }, [layer.images, exportOnly]);
  const width = root.bounds?.width || metric(root.css.width, 320) || 320;
  const height = root.bounds?.height || metric(root.css.height, 160) || 160;
  function draw(node, fallback, key) {
    const box = node.bounds || fallback;
    const css = node.css;
    const row =
      css.display === "flex" && !css["flex-direction"]?.startsWith("column");
    const count = Math.max(1, node.children.length);
    const pad = Math.min(12, box.width * 0.04, box.height * 0.08);
    const hasImage = Boolean(layer.images?.[node.imageIndex]?.blob);
    const href = hasImage ? images[node.imageIndex] : undefined;
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
        {hasImage && (
          <image
            data-artwork={layer.id}
            data-component-image={node.imageIndex}
            href={href || undefined}
            x={box.x}
            y={box.y}
            width={Math.max(1, box.width)}
            height={Math.max(1, box.height)}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {!href && (!node.children.length || node.text) && (
          <text
            data-editor-only={hasImage ? "" : undefined}
            x={box.x + pad + 2}
            y={box.y + Math.min(box.height * 0.7, 23)}
            fontFamily={
              safeStyleValue(css["font-family"]) ? css["font-family"] : "Arial"
            }
            fontSize={Math.max(
              1,
              Math.min(24, metric(css["font-size"], 16), box.height * 0.6),
            )}
            fill={literalColor(css.color, "#27352e")}
          >
            {node.text || node.placeholder || node.tag}
          </text>
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

function SwatchCaption({ layer }) {
  const value = colorLabel(layer.fill);
  return (
    <svg
      width={layer.width}
      height={layer.height}
      pointerEvents="none"
      fill={layer.textColor}
      fontFamily="Arial, sans-serif"
    >
      <text
        y={layer.height * 0.77}
        fontSize={Math.min(21, layer.height * 0.19)}
        fontWeight="700"
      >
        {layer.name}
      </text>
      <text
        y={layer.height * 0.96}
        fontSize={Math.min(
          17,
          layer.height * 0.16,
          layer.width / (value.length * 0.62),
        )}
      >
        {value.startsWith("#") ? value.toUpperCase() : value}
      </text>
    </svg>
  );
}

export default forwardRef(function DesignCanvas(
  {
    draft,
    selected,
    onStart,
    onMove,
    onEnd,
    onCancel,
    exportOnly = false,
    inlineText,
    onInlineEdit,
    onTextChange,
    onTextEnd,
  },
  ref,
) {
  const interactive = !!onStart;
  const filled = new Set(
    draft.layers
      .filter(({ fills, hidden }) => fills && !hidden)
      .map(({ fills }) => fills),
  );
  const byId = new Map(draft.layers.map((item) => [item.id, item]));
  function caption(item) {
    const specimen = byId.get(item.specimenFor);
    const metrics = byId.get(item.metricsFor);
    if (specimen)
      return `${item.text} · ${specimen.fontFamily.split(",")[0].toUpperCase()}`;
    if (metrics)
      return `${item.text} · ${metrics.fontSize} / ${Math.round(metrics.fontSize * metrics.lineHeight)}`;
    return item.text;
  }
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
            onDoubleClick={
              interactive &&
              onInlineEdit &&
              ["text", "button"].includes(layer.type)
                ? () => onInlineEdit(layer)
                : undefined
            }
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
                height={layer.swatch ? layer.height * 0.54 : layer.height}
                rx={layer.radius}
                fill={layer.fill}
                stroke={layer.stroke}
                strokeWidth={layer.strokeWidth}
                filter={layer.shadow ? `url(#shadow-${layer.id})` : undefined}
              />
            )}
            {layer.swatch && <SwatchCaption layer={layer} />}
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
                {layer.type === "image" && (
                  <Artwork layer={layer} exportOnly={exportOnly} />
                )}
                {layer.type === "component" && (
                  <ComponentArtwork layer={layer} exportOnly={exportOnly} />
                )}
                {["text", "button"].includes(layer.type) && (
                  <TextContent
                    layer={{ ...layer, text: caption(layer) }}
                    centered={layer.type === "button"}
                  />
                )}
              </svg>
            )}
            {inlineText === layer.id && (
              <foreignObject
                data-editor-only=""
                width={layer.width}
                height={layer.height}
              >
                <textarea
                  autoFocus
                  aria-label="Edit canvas text"
                  maxLength={600}
                  className="workspace-inline-text"
                  style={{
                    fontFamily: layer.fontFamily,
                    fontSize: layer.fontSize,
                    fontWeight: layer.fontWeight,
                    color: layer.textColor,
                  }}
                  value={layer.text}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onChange={(event) => onTextChange(event.target.value)}
                  onBlur={onTextEnd}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") onTextEnd();
                  }}
                />
              </foreignObject>
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
    const index = image.dataset.componentImage;
    const blob = index === undefined ? layer.blob : layer.images[index].blob;
    image.setAttribute("href", await dataUrl(blob));
    image.removeAttribute("data-artwork");
    image.removeAttribute("data-component-image");
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

export async function exportSlides(slides, format) {
  const zip = new JSZip();
  for (const [index, { stage, draft }] of slides.entries()) {
    const blob = await exportDesign(stage, draft, format);
    const number = String(index + 1).padStart(2, "0");
    zip.file(`slide-${number}.${format}`, await blob.arrayBuffer());
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
