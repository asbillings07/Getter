import { cleanName } from "./library.js";
import { safeStyleValue } from "./inspect.js";

export const formats = {
  website: { label: "Website layout", width: 1440, height: 900 },
  portrait: { label: "Social post · portrait", width: 1080, height: 1350 },
  square: { label: "Social post · square", width: 1080, height: 1080 },
  brand: { label: "Brand board", width: 1200, height: 800 },
  blank: { label: "Blank canvas", width: 1200, height: 800 },
};
const ink = "#27352e";
const green = "#34584a";
const paper = "#f7f3e9";
const accent = "#bdcdab";

export const layerLabels = {
  text: "Text",
  button: "Button",
  shape: "Shape",
  image: "Image",
  component: "Component",
};

export function layer(type, fields = {}) {
  return {
    id: crypto.randomUUID(),
    type,
    name: layerLabels[type],
    x: 64,
    y: 64,
    width: 300,
    height: type === "text" || type === "button" ? 75 : 200,
    fill: type === "button" ? green : accent,
    textColor: type === "button" ? "#ffffff" : ink,
    text:
      type === "text"
        ? "Edit this text"
        : type === "button"
          ? "Learn more"
          : "",
    fontFamily: "Arial, sans-serif",
    fontSize: 32,
    fontWeight: "400",
    fontStyle: "normal",
    lineHeight: 1.16,
    letterSpacing: 0,
    align: type === "button" ? "middle" : "start",
    radius: 8,
    opacity: 1,
    stroke: "none",
    strokeWidth: 0,
    ...fields,
  };
}

function text(name, text, x, y, width, height, fontSize, emphasis = false) {
  return layer("text", {
    name,
    text,
    x,
    y,
    width,
    height,
    fontSize,
    fontWeight: emphasis ? "700" : "400",
    fontFamily: emphasis ? "Georgia, serif" : "Arial, sans-serif",
  });
}

function template(format, brand) {
  if (format === "website")
    return [
      layer("shape", {
        name: "Header background",
        x: 0,
        y: 0,
        width: 1440,
        height: 104,
        fill: "#fffdf7",
        radius: 0,
      }),
      text("Brand name", brand, 68, 23, 620, 63, 38, true),
      text("About link", "About", 994, 35, 89, 43, 22),
      text("Collection link", "Collection", 1110, 35, 125, 43, 22),
      text("Contact link", "Contact", 1260, 35, 110, 43, 22),
      text("Eyebrow", "FEATURED COLLECTION", 78, 204, 520, 44, 22),
      text(
        "Headline",
        "Make room for your next idea.",
        74,
        269,
        678,
        220,
        76,
        true,
      ),
      text(
        "Description",
        "Tell people what makes your project special.",
        78,
        503,
        590,
        110,
        31,
      ),
      layer("button", {
        name: "Call to action",
        x: 78,
        y: 638,
        width: 258,
        height: 70,
        fontSize: 28,
      }),
      layer("shape", {
        name: "Artwork background",
        x: 809,
        y: 180,
        width: 546,
        height: 540,
        fill: accent,
        radius: 22,
        placeholder: "artwork",
      }),
      {
        ...text("Artwork label", "Artwork", 848, 401, 466, 65, 44, true),
        align: "middle",
        placeholder: "artwork",
      },
      layer("shape", {
        name: "Footer background",
        x: 0,
        y: 792,
        width: 1440,
        height: 108,
        fill: green,
        radius: 0,
      }),
      {
        ...text("Footer brand", brand, 72, 828, 650, 48, 23),
        textColor: "#ffffff",
      },
      {
        ...text("Footer contact", "Contact", 1126, 828, 95, 48, 23),
        textColor: "#ffffff",
      },
      {
        ...text("Footer privacy", "Privacy", 1260, 828, 110, 48, 23),
        textColor: "#ffffff",
      },
    ];
  if (format === "portrait" || format === "square") {
    const height = formats[format].height;
    return [
      text("Brand name", brand, 70, 62, 940, 55, 30, true),
      text(
        "Headline",
        "Share something worth remembering.",
        68,
        151,
        946,
        178,
        70,
        true,
      ),
      layer("shape", {
        name: "Artwork background",
        x: 68,
        y: 364,
        width: 944,
        height: height - 613,
        fill: accent,
        radius: 26,
        placeholder: "artwork",
      }),
      {
        ...text(
          "Artwork label",
          "Artwork",
          98,
          (height + 70) / 2,
          886,
          78,
          56,
          true,
        ),
        align: "middle",
        placeholder: "artwork",
      },
      text(
        "Supporting copy",
        "Add a short message for your audience.",
        70,
        height - 198,
        928,
        94,
        36,
      ),
      text("Site or handle", "@yourbrand", 70, height - 88, 922, 46, 25),
    ];
  }
  if (format === "brand")
    return [
      text("Brand name", brand, 64, 48, 1060, 77, 48, true),
      text(
        "Headline sample",
        "Your brand, in its own words.",
        64,
        152,
        1040,
        164,
        62,
        true,
      ),
      text(
        "Body sample",
        "Add a description that sets the tone for your brand.",
        64,
        330,
        1040,
        80,
        31,
      ),
      ...[green, accent, "#d6aa83", "#e8ddca"].map((fill, index) =>
        layer("shape", {
          name: `Palette swatch ${index + 1}`,
          x: 64 + index * 272,
          y: 440,
          width: 241,
          height: 156,
          fill,
          radius: 12,
        }),
      ),
      layer("button", {
        name: "Button sample",
        x: 64,
        y: 652,
        width: 265,
        height: 71,
        fontSize: 25,
      }),
      text(
        "Usage note",
        "Add a usage note for the team.",
        394,
        665,
        700,
        66,
        25,
      ),
    ];
  return [];
}

export function createDraft(name, format, brand) {
  if (!Object.hasOwn(formats, format)) throw Error("Choose a starting layout.");
  const { width, height } = formats[format];
  return {
    version: 1,
    revision: 0,
    id: crypto.randomUUID(),
    name: cleanName(name),
    format,
    width,
    height,
    background: paper,
    layers: template(format, brand),
  };
}

export function moveLayer(layers, id, offset) {
  const position = layers.findIndex((item) => item.id === id);
  const next = position + offset;
  if (position < 0 || next < 0 || next >= layers.length) return layers;
  const result = [...layers];
  [result[position], result[next]] = [result[next], result[position]];
  return result;
}

export function resizeCanvas(draft, format) {
  const { width, height } = formats[format];
  return {
    ...draft,
    format,
    width,
    height,
    layers: draft.layers.map((item) => ({
      ...item,
      x: Math.round((item.x * width) / draft.width),
      y: Math.round((item.y * height) / draft.height),
      width: Math.max(1, Math.round((item.width * width) / draft.width)),
      height: Math.max(1, Math.round((item.height * height) / draft.height)),
    })),
  };
}

function cssColor(value) {
  return (
    safeStyleValue(value) &&
    !/^(?:inherit|initial|unset|revert(?:-layer)?|currentcolor)$/i.test(
      value,
    ) &&
    CSS.supports("color", value)
  );
}

export function checkColor(value) {
  const next = value.trim();
  if (!cssColor(next))
    throw Error("Enter an absolute CSS color, such as #34584A.");
  return next;
}

const px = (value) =>
  /^-?[\d.]+px$/.test(value || "") ? Number.parseFloat(value) : undefined;

export function capturedStyle(css) {
  const update = {};
  if (cssColor(css.color)) update.textColor = css.color;
  if (cssColor(css["background-color"])) update.fill = css["background-color"];
  if (safeStyleValue(css["font-family"]))
    update.fontFamily = css["font-family"];
  if (px(css["font-size"]) > 0)
    update.fontSize = Math.min(180, px(css["font-size"]));
  if (["normal", "italic", "oblique"].includes(css["font-style"]))
    update.fontStyle = css["font-style"];
  if (/^(normal|bold|[1-9]00)$/.test(css["font-weight"] || ""))
    update.fontWeight = css["font-weight"];
  if (px(css["letter-spacing"]) !== undefined)
    update.letterSpacing = px(css["letter-spacing"]);
  if (px(css["border-radius"]) >= 0) update.radius = px(css["border-radius"]);
  if (px(css["line-height"]) > 0 && update.fontSize)
    update.lineHeight = Math.max(
      0.85,
      Math.min(3, px(css["line-height"]) / update.fontSize),
    );
  if (
    css.opacity !== undefined &&
    css.opacity !== "" &&
    Number(css.opacity) >= 0 &&
    Number(css.opacity) <= 1
  )
    update.opacity = Number(css.opacity);
  const shadow =
    /^(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+0px)?$/i.exec(
      css["box-shadow"] || "",
    );
  if (shadow && cssColor(shadow[1]))
    update.shadow = {
      color: shadow[1],
      x: Number(shadow[2]),
      y: Number(shadow[3]),
      blur: Number(shadow[4]),
    };
  return update;
}

export function addFromAsset(asset, draft) {
  const kind = asset.value.type;
  const width = Math.round(draft.width * 0.34);
  const base = {
    name: asset.name,
    assetId: asset.id,
    x: Math.round(draft.width * 0.27),
    y: Math.round(draft.height * 0.3),
    width,
    height: Math.round(draft.height * 0.27),
  };
  if (kind === "image") {
    const slot = draft.layers.some(
      (item) => item.fills === "artwork" && !item.hidden,
    )
      ? null
      : draft.layers.find(
          (item) => item.type === "shape" && item.placeholder === "artwork",
        );
    if (slot) {
      const { x, y, width, height, radius } = slot;
      return layer("image", {
        ...base,
        x,
        y,
        width,
        height,
        radius,
        fills: "artwork",
        blob: asset.value.blob,
        fit: "cover",
      });
    }
    return layer("image", { ...base, blob: asset.value.blob, fit: "cover" });
  }
  if (kind === "component")
    return layer("component", {
      ...base,
      tree: asset.value.tree,
      images: asset.value.images,
    });
  if (kind === "text")
    return layer("text", { ...base, text: asset.value.text, fontSize: 24 });
  throw Error("Choose text, an image, or a component to insert.");
}

export function applyFromAsset(item, asset, target) {
  if (asset.value.type === "color")
    return { ...item, [target]: checkColor(asset.color || asset.value.value) };
  const value = asset.value;
  if (value.type === "font")
    return {
      ...item,
      ...capturedStyle({
        "font-family": value.fontFamily,
        "font-size": value.fontSize,
        "font-weight": value.fontWeight,
        "font-style": value.fontStyle,
        "letter-spacing": value.letterSpacing,
        "line-height": value.lineHeight,
      }),
    };
  if (value.type === "image") return { ...item, blob: value.blob };
  if (value.type === "element" || value.type === "effect")
    return { ...item, ...capturedStyle(value.css) };
  throw Error("This asset cannot be applied to the selected layer.");
}
