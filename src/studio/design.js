import { cleanName } from "./library.js";
import { safeStyleValue } from "./inspect.js";

export const formats = {
  website: { label: "Website layout", width: 1440, height: 900 },
  portrait: { label: "Campaign artwork · portrait", width: 1080, height: 1350 },
  square: { label: "Campaign artwork · square", width: 1080, height: 1080 },
  story: { label: "Story / cover · vertical", width: 1080, height: 1920 },
  brand: { label: "Brand board", width: 1200, height: 800 },
  blank: { label: "Blank canvas", width: 1200, height: 800 },
};
const { website, portrait, square, story, brand, blank } = formats;
export const startingLayouts = {
  website: { ...website, label: "Website · Simple navigation" },
  "website-newsletter": {
    ...website,
    label: "Website · Navigation + newsletter",
    format: "website",
    newsletter: true,
  },
  portrait,
  square,
  story,
  carousel: {
    ...portrait,
    label: "Campaign artwork · 3-slide carousel",
    format: "portrait",
  },
  brand,
  blank,
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

function newsletterLayers() {
  return [
    layer("shape", {
      name: "Newsletter background",
      x: 0,
      y: 652,
      width: 1440,
      height: 140,
      fill: accent,
      radius: 0,
    }),
    text(
      "Newsletter heading",
      "A little inspiration, occasionally.",
      78,
      677,
      655,
      46,
      34,
      true,
    ),
    text(
      "Newsletter description",
      "New ideas and fresh finds, in your inbox.",
      78,
      727,
      655,
      39,
      23,
    ),
    layer("shape", {
      name: "Email field background",
      x: 778,
      y: 695,
      width: 390,
      height: 55,
      fill: "#fffdf7",
    }),
    text("Email prompt", "Your email address", 802, 709, 345, 34, 22),
    layer("button", {
      name: "Newsletter button",
      text: "Join",
      x: 1184,
      y: 695,
      width: 177,
      height: 55,
      fontSize: 23,
    }),
  ];
}

const campaignCopy = [
  ["Make it a bright morning.", "Meet the new collection."],
  ["Good things take care.", "Discover the details behind each piece."],
  ["Make it part of your day.", "Explore the full collection."],
];

function campaignLayers(brand, height, copy) {
  const [headline, description] = copy;
  const artworkHeight = height - 570;
  return [
    text("Brand name", brand, 68, 58, 944, 50, 32, true),
    {
      ...text("Headline", headline, 68, 132, 944, 184, 76, true),
      compositionShift: (height - 550) / height,
    },
    layer("shape", {
      name: "Campaign artwork",
      x: 68,
      y: 348,
      width: 944,
      height: artworkHeight,
      compositionShift: -216 / height,
      fill: accent,
      radius: 26,
      placeholder: "artwork",
    }),
    {
      ...text(
        "Artwork label",
        "Campaign artwork",
        98,
        321 + artworkHeight / 2,
        884,
        84,
        50,
        true,
      ),
      align: "middle",
      compositionShift: -216 / height,
      placeholder: "artwork",
    },
    text("Supporting copy", description, 68, height - 192, 944, 90, 38),
    text("Campaign label", "NEW COLLECTION", 68, height - 81, 465, 41, 25),
    {
      ...text("Site or handle", "@yourbrand", 548, height - 81, 464, 41, 25),
      align: "end",
    },
  ];
}

function brandBoard(name) {
  const swatches = [
    ["Primary", green],
    ["Background", paper],
    ["Text", ink],
    ["Accent", accent],
  ].map(([name, fill], index) =>
    layer("shape", {
      name,
      fill,
      x: 60 + index * 277,
      y: 262,
      width: 249,
      height: 112,
      swatch: true,
      stroke: "#d6d0c3",
      strokeWidth: 1,
    }),
  );
  const [primary, background, inkSwatch, accentSwatch] = swatches;
  const content = [
    text("Brand name", name, 60, 42, 1080, 45, 29, true),
    text(
      "Brand headline",
      "Good things, slowly made.",
      60,
      99,
      1080,
      83,
      64,
      true,
    ),
    text(
      "Brand description",
      "Thoughtful details for everyday moments.",
      60,
      190,
      1080,
      43,
      30,
    ),
    text("Headings label", "HEADINGS", 60, 410, 490, 30, 19),
    text(
      "Heading sample",
      "Slow mornings. Good company.",
      60,
      448,
      490,
      115,
      43,
      true,
    ),
    text("Body label", "BODY", 620, 410, 520, 30, 19),
    text(
      "Body sample",
      "We believe the best days begin with something simple, made well.",
      620,
      451,
      520,
      81,
      27,
    ),
    text("Usage note", "Thoughtful details, everywhere.", 60, 609, 435, 58, 24),
  ].map((item) => ({ ...item, textColorSource: inkSwatch.id }));
  return {
    backgroundSource: background.id,
    composition: "classic",
    layers: [
      ...swatches.map((item) => ({ ...item, textColorSource: inkSwatch.id })),
      ...content,
      layer("button", {
        name: "Button sample",
        text: "Explore the collection",
        x: 60,
        y: 667,
        width: 380,
        height: 67,
        fontSize: 26,
        fillSource: primary.id,
      }),
      layer("shape", {
        name: "Brand artwork",
        x: 620,
        y: 570,
        width: 520,
        height: 170,
        fillSource: accentSwatch.id,
        placeholder: "artwork",
      }),
      {
        ...text("Artwork label", "Brand artwork", 630, 632, 500, 58, 35, true),
        align: "middle",
        textColorSource: inkSwatch.id,
        placeholder: "artwork",
      },
    ].map((item) => ({
      ...item,
      compositionShift:
        (item.y < 240 ? -8 : item.y < 400 ? 8 : item.y < 570 ? 18 : 28) /
        formats.brand.height,
    })),
  };
}

const compositions = [
  [
    ["headline-first", "Headline first"],
    ["image-first", "Image first"],
  ],
  [
    ["classic", "Classic brand board"],
    ["airy", "Airy brand board"],
  ],
];

export function compositionOptions(draft) {
  return compositions.find((options) =>
    options.some(([value]) => value === draft.composition),
  );
}

export function changeComposition(draft, composition) {
  const options = compositionOptions(draft);
  if (
    draft.composition === composition ||
    !options?.some(([value]) => value === composition)
  )
    return draft;
  const direction = composition === options[0][0] ? -1 : 1;
  return {
    ...draft,
    composition,
    layers: draft.layers.map((item) =>
      item.compositionShift
        ? {
            ...item,
            y:
              item.y +
              direction * Math.round(item.compositionShift * draft.height),
          }
        : item,
    ),
  };
}

export function changeDesignLayer(draft, selected, fields) {
  const updated = { ...selected, ...fields };
  const properties = ["fill", "textColor"];
  for (const property of properties) {
    if (updated[property] !== selected[property])
      delete updated[property + "Source"];
  }
  const changedSwatch = selected.swatch && updated.fill !== selected.fill;
  const layers = draft.layers.map((item) => {
    const next = item.id === selected.id ? updated : item;
    if (!changedSwatch) return next;
    const linked = properties.filter(
      (property) => next[property + "Source"] === selected.id,
    );
    return linked.length
      ? {
          ...next,
          ...Object.fromEntries(
            linked.map((property) => [property, updated.fill]),
          ),
        }
      : next;
  });
  const background =
    changedSwatch && draft.backgroundSource === selected.id
      ? updated.fill
      : draft.background;
  return { ...draft, layers, background };
}

function template(format, brand, newsletter) {
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
      text(
        "Eyebrow",
        "FEATURED COLLECTION",
        78,
        newsletter ? 164 : 204,
        520,
        44,
        22,
      ),
      text(
        "Headline",
        "Make room for your next idea.",
        74,
        newsletter ? 218 : 269,
        678,
        newsletter ? 180 : 220,
        76,
        true,
      ),
      text(
        "Description",
        "Tell people what makes your project special.",
        78,
        newsletter ? 410 : 503,
        590,
        110,
        31,
      ),
      layer("button", {
        name: "Call to action",
        x: 78,
        y: newsletter ? 542 : 638,
        width: 258,
        height: 70,
        fontSize: 28,
      }),
      layer("shape", {
        name: "Artwork background",
        x: 809,
        y: newsletter ? 142 : 180,
        width: 546,
        height: newsletter ? 474 : 540,
        fill: accent,
        radius: 22,
        placeholder: "artwork",
      }),
      {
        ...text(
          "Artwork label",
          "Artwork",
          848,
          newsletter ? 349 : 401,
          466,
          65,
          44,
          true,
        ),
        align: "middle",
        placeholder: "artwork",
      },
      ...(newsletter ? newsletterLayers() : []),
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
  return [];
}

export function createDraft(name, layout, brand) {
  if (!Object.hasOwn(startingLayouts, layout))
    throw Error("Choose a starting layout.");
  const {
    format = layout,
    width,
    height,
    newsletter,
  } = startingLayouts[layout];
  const draft = {
    version: 1,
    revision: 0,
    id: crypto.randomUUID(),
    name: cleanName(name),
    format,
    width,
    height,
    background: paper,
    layers: template(format, brand, newsletter),
  };
  if (format === "brand") return { ...draft, ...brandBoard(brand) };
  if (!["portrait", "square", "story"].includes(format)) return draft;
  draft.composition = "headline-first";
  draft.layers = campaignLayers(brand, height, campaignCopy[0]);
  if (layout === "carousel") {
    draft.additionalSlides = campaignCopy.slice(1).map((copy) => ({
      background: paper,
      composition: "headline-first",
      layers: campaignLayers(brand, height, copy),
    }));
  }
  return draft;
}

export function draftSlide(design, index) {
  if (!index) return design;
  return { ...design, ...design.additionalSlides[index - 1] };
}

export function replaceDraftSlide(design, index, view) {
  if (!index) return view;
  const { background, layers, composition, ...shared } = view;
  return {
    ...shared,
    background: design.background,
    layers: design.layers,
    composition: design.composition,
    additionalSlides: design.additionalSlides.map((slide, position) =>
      position === index - 1 ? { background, layers, composition } : slide,
    ),
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
      const { x, y, width, height, radius, compositionShift } = slot;
      return layer("image", {
        ...base,
        x,
        y,
        width,
        height,
        radius,
        compositionShift,
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
