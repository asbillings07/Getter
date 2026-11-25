import JSZip from "jszip";
import { EXPORT_LIMITS } from "../core/downloads.js";
import { safeStyleValue } from "./inspect.js";

export const formatInfo = {
  bundle: [
    "Design kit ZIP",
    "Includes CSS, structured asset data, and any selected image files.",
  ],
  css: [
    "CSS",
    "Includes colors, typography, element styles, effects, and recorded motion.",
  ],
  figma: [
    "Figma variables",
    "Import the JSON in Figma’s Variables view. Includes sRGB colors and single font-family names.",
  ],
  adobe: [
    "Adobe swatches",
    "Load the ASE file from the Swatches panel. Includes opaque sRGB colors.",
  ],
  canva: [
    "Canva brand guide",
    "Save the guide as a PDF and upload it to Canva’s Brand Kit Builder. Review the colors and fonts Canva extracts.",
  ],
};

export function slug(value) {
  return (
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "getter"
  );
}

export function namedItems(items) {
  const used = new Set();
  return items.map((item) => {
    const base = slug(item.name);
    let key = base;
    let serial = 2;
    while (used.has(key)) key = `${base}-${serial++}`;
    used.add(key);
    return { ...item, key };
  });
}

export function srgb(value) {
  if (/^#[\da-f]{3,4}$/i.test(value))
    value = `#${Array.from(value.slice(1), (digit) => digit.repeat(2)).join("")}`;
  if (/^#[\da-f]{6}([\da-f]{2})?$/i.test(value)) {
    const channels = value
      .slice(1)
      .match(/../g)
      .map((hex) => parseInt(hex, 16) / 255);
    return {
      colorSpace: "srgb",
      components: channels.slice(0, 3),
      alpha: channels[3] ?? 1,
    };
  }
  if (!/^rgba?\([\d.%, /+-]+\)$/i.test(value)) return null;
  const channels = value
    .slice(value.indexOf("(") + 1, -1)
    .trim()
    .split(/[,\s/]+/);
  if (![3, 4].includes(channels.length)) return null;
  const component = (part, max) =>
    part.endsWith("%") ? Number(part.slice(0, -1)) / 100 : Number(part) / max;
  const components = channels
    .slice(0, 3)
    .map((channel) => component(channel, 255));
  const alpha = channels.length === 4 ? component(channels[3], 1) : 1;
  if (
    [...components, alpha].some(
      (channel) => !Number.isFinite(channel) || channel < 0 || channel > 1,
    )
  )
    return null;
  return { colorSpace: "srgb", components, alpha };
}

export function colorValue(item) {
  return item.color || item.value.value;
}

const cssName = (name) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const cssEntries = (css) =>
  Object.entries(css).filter(
    ([name, value]) => /^[a-z][a-z-]*$/.test(name) && safeStyleValue(value),
  );
const declarations = (css) =>
  cssEntries(css)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
const fontValues = ({
  fontFamily,
  fontSize,
  fontWeight,
  fontStyle,
  lineHeight,
  letterSpacing,
}) => ({
  "font-family": fontFamily,
  "font-size": fontSize,
  "font-weight": fontWeight,
  "font-style": fontStyle,
  "line-height": lineHeight,
  "letter-spacing": letterSpacing,
});

export function includesAsset(format, item) {
  const { type, fontFamily } = item.value;
  if (format === "figma")
    return type === "color"
      ? !!srgb(colorValue(item))
      : type === "font" && !!fontFamily.trim() && !fontFamily.includes(",");
  if (format === "adobe")
    return type === "color" && srgb(colorValue(item))?.alpha === 1;
  if (format === "css")
    return type === "color"
      ? safeStyleValue(colorValue(item))
      : type === "motion"
        ? item.value.animations.length > 0 ||
          (item.value.kind === "transition" &&
            cssEntries(item.value.css || {}).length > 0)
        : ["font", "element", "effect"].includes(type);
  return true;
}

export function cssExport(items) {
  const variables = {};
  const rules = [];
  for (const item of items) {
    const { key, value } = item;
    if (value.type === "color")
      variables[`getter-color-${key}`] = colorValue(item);
    if (value.type === "font") {
      for (const [property, propertyValue] of cssEntries(fontValues(value)))
        variables[`getter-type-${key}-${property}`] = propertyValue;
    }
    if (["element", "effect"].includes(value.type))
      rules.push(`.getter-${key} {\n${declarations(value.css)}\n}`);
    if (value.type === "motion") {
      if (value.kind === "transition" && cssEntries(value.css || {}).length)
        rules.push(`.getter-${key} {\n${declarations(value.css)}\n}`);
      const animations = [];
      for (const [index, motion] of value.animations.entries()) {
        const name = `getter-${key}-${index + 1}`;
        const frames = motion.keyframes.map(
          ({ offset, easing, ...css }) =>
            `  ${offset * 100}% {\n${declarations({
              ...Object.fromEntries(
                Object.entries(css).map(([key, value]) => [
                  cssName(key),
                  value,
                ]),
              ),
              "animation-timing-function": easing,
            })
              .split("\n")
              .map((line) => `  ${line}`)
              .join("\n")}\n  }`,
        );
        rules.push(`@keyframes ${name} {\n${frames.join("\n")}\n}`);
        const easing = safeStyleValue(motion.easing) ? motion.easing : "linear";
        animations.push(
          `${name} ${motion.duration}ms ${easing} ${motion.delay}ms ${motion.iterations} ${motion.direction} ${motion.fill}`,
        );
      }
      if (animations.length)
        rules.push(
          `.getter-${key} {\n  animation: ${animations.join(", ")};\n}`,
        );
    }
  }
  const custom = Object.entries(variables)
    .filter(([, value]) => safeStyleValue(value))
    .map(([key, value]) => `  --${key}: ${value};`);
  return (
    [custom.length ? `:root {\n${custom.join("\n")}\n}` : "", ...rules]
      .filter(Boolean)
      .join("\n\n") + "\n"
  );
}

export function figmaExport(items) {
  return Object.fromEntries(
    items.map((item) => [
      item.key,
      item.value.type === "color"
        ? { $type: "color", $value: srgb(colorValue(item)) }
        : {
            $type: "fontFamily",
            $value: item.value.fontFamily.trim().replace(/^["']|["']$/g, ""),
          },
    ]),
  );
}

export function adobeExport(items) {
  const byteLength =
    12 + items.reduce((total, { name }) => total + 28 + name.length * 2, 0);
  const bytes = new DataView(new ArrayBuffer(byteLength));
  bytes.setUint32(0, 0x41534546);
  bytes.setUint16(4, 1);
  bytes.setUint32(8, items.length);
  let cursor = 12;
  for (const item of items) {
    const name = item.name.replace(/[\u0000-\u001f]/g, " ");
    bytes.setUint16(cursor, 1);
    bytes.setUint32(cursor + 2, 22 + name.length * 2);
    bytes.setUint16(cursor + 6, name.length + 1);
    cursor += 8;
    for (let i = 0; i < name.length; i++, cursor += 2)
      bytes.setUint16(cursor, name.charCodeAt(i));
    cursor += 2;
    bytes.setUint32(cursor, 0x52474220);
    cursor += 4;
    for (const channel of srgb(colorValue(item)).components) {
      bytes.setFloat32(cursor, channel);
      cursor += 4;
    }
    bytes.setUint16(cursor, 2);
    cursor += 2;
  }
  return bytes.buffer;
}

const json = (value) => JSON.stringify(value, null, 2) + "\n";

export async function prepareExport({
  name,
  format,
  items,
  includeSources,
  captures,
}) {
  const eligible = namedItems(
    items.filter((item) => includesAsset(format, item)),
  );
  if (!eligible.length)
    throw Error("Choose at least one item supported by this format.");
  const base = slug(name);
  if (format === "css")
    return {
      filename: `${base}.css`,
      blob: new Blob([cssExport(eligible)], { type: "text/css" }),
    };
  if (format === "figma")
    return {
      filename: `${base}-figma.json`,
      blob: new Blob([json(figmaExport(eligible))], {
        type: "application/json",
      }),
    };
  if (format === "adobe")
    return {
      filename: `${base}.ase`,
      blob: new Blob([adobeExport(eligible)], {
        type: "application/octet-stream",
      }),
    };
  if (format !== "bundle") throw Error("This format uses the print dialog.");
  const zip = new JSZip();
  const date = new Date("1980-01-01T00:00:00Z");
  const sourceById = new Map(captures.map(({ id, source }) => [id, source]));
  let bytes = 0;
  function addImage(blob, filename) {
    bytes += blob.size;
    if (bytes > EXPORT_LIMITS.totalBytes)
      throw Error("The selected images exceed 32 MB. Export a smaller set.");
    zip.file(filename, blob, { date, createFolders: false });
    return filename;
  }
  const assets = eligible.map((asset, index) => {
    const { blob, ...value } = asset.value;
    if (blob)
      value.filename = addImage(blob, `images/${index + 1}-${value.filename}`);
    if (value.images?.length)
      value.images = value.images.map(({ blob, ...image }, i) => ({
        ...image,
        filename: addImage(
          blob,
          `images/${index + 1}-part-${i + 1}-${image.filename}`,
        ),
      }));
    if (asset.color) value.value = asset.color;
    return {
      name: asset.name,
      role: asset.role,
      notes: asset.notes,
      key: asset.key,
      value,
      ...(includeSources
        ? {
            sources: asset.sources
              .map(
                ({ captureId, source }) => sourceById.get(captureId) || source,
              )
              .filter(Boolean),
          }
        : {}),
    };
  });
  zip.file("collection.json", json({ schemaVersion: 1, name, assets }), {
    date,
  });
  zip.file("styles.css", cssExport(eligible), { date });
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  return { filename: `${base}-design-kit.zip`, blob };
}
