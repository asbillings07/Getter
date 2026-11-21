export const sections = [
  ["styles", "Styles"],
  ["layout", "Layout"],
  ["effects", "Effects"],
  ["element", "Element"],
];
export const layoutNames = [
  "display",
  "box-sizing",
  "width",
  "height",
  "min-width",
  "max-width",
  "min-height",
  "max-height",
  "padding",
  "margin",
  "border-width",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "align-content",
  "justify-content",
  "gap",
  "row-gap",
  "column-gap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "order",
  "grid-template-columns",
  "grid-template-rows",
  "grid-auto-flow",
  "grid-auto-columns",
  "grid-auto-rows",
  "grid-column",
  "grid-row",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "overflow",
  "overflow-x",
  "overflow-y",
  "object-fit",
  "object-position",
];
export const effectNames = [
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "box-shadow",
  "text-shadow",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-radius",
  "outline",
  "opacity",
  "filter",
  "backdrop-filter",
  "transform",
  "transform-origin",
  "mix-blend-mode",
  "clip-path",
];
export const styleNames = [
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration",
  "text-transform",
  "word-spacing",
  "white-space",
  "text-overflow",
  "cursor",
];
export function snapshotElement(element) {
  const win = element.ownerDocument.defaultView,
    computed = win.getComputedStyle(element),
    rect = element.getBoundingClientRect();
  const css = {},
    start = performance.now();
  let length = 0,
    limited = false;
  const names = [
    ...new Set([
      ...styleNames,
      ...layoutNames,
      ...effectNames,
      ...Array.from(computed),
    ]),
  ];
  for (const name of names) {
    if (
      Object.keys(css).length >= 600 ||
      length >= 180000 ||
      performance.now() - start > 150
    ) {
      limited = true;
      break;
    }
    const raw = computed.getPropertyValue(name);
    const value = raw.slice(0, 4096);
    limited ||= raw.length > value.length;
    css[name] = value;
    length += name.length + value.length;
  }
  const escape =
    win.CSS?.escape ||
    ((value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => "\\" + c));
  const piece = (node) =>
    node.localName +
    (node.id
      ? "#" + escape(node.id)
      : [...node.classList]
          .slice(0, 2)
          .map((c) => "." + escape(c))
          .join(""));
  let selector = piece(element);
  const root = element.getRootNode();
  try {
    if (root.querySelectorAll(selector).length !== 1) {
      const parts = [];
      let node = element;
      while (node && parts.length < 5) {
        let part = piece(node);
        if (!node.id && node.parentElement) {
          const siblings = [...node.parentElement.children].filter(
            (x) => x.localName === node.localName,
          );
          if (siblings.length > 1)
            part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
        parts.unshift(part);
        selector = parts.join(" > ");
        if (root.querySelectorAll(selector).length === 1) break;
        node = node.parentElement;
      }
    }
  } catch {
    selector = element.localName;
  }
  const attributes = [];
  for (const attr of [...element.attributes].slice(0, 80)) {
    if (
      ["input", "textarea", "select"].includes(element.localName) &&
      attr.name === "value"
    )
      continue;
    attributes.push({ name: attr.name, value: attr.value.slice(0, 4096) });
    limited ||= attr.value.length > 4096;
  }
  limited ||= element.attributes.length > 80;
  const path = [];
  let ancestor = element;
  while (ancestor && path.length < 5) {
    const segment = piece(ancestor);
    path.unshift(segment.slice(0, 2048));
    limited ||= segment.length > 2048;
    ancestor = ancestor.parentElement;
  }
  // Text nodes only: never read password/form field values.
  let text = "";
  const walker = element.ownerDocument.createTreeWalker(
    element,
    win.NodeFilter.SHOW_TEXT,
  );
  let node,
    count = 0;
  while ((node = walker.nextNode()) && count++ < 500 && text.length < 4000) {
    if (node.parentElement.closest("script,style,textarea,input,select"))
      continue;
    text += node.nodeValue;
  }
  limited ||= !!node || text.length > 4000 || selector.length > 2048;
  const rounded = (v) => Math.round(v * 100) / 100;
  return {
    selector: selector.slice(0, 2048),
    tag: element.localName,
    path,
    text: text.replace(/\s+/g, " ").trim().slice(0, 4000),
    attributes,
    css,
    rect: { width: rounded(rect.width), height: rounded(rect.height) },
    box: {
      width: element.offsetWidth ?? rect.width,
      height: element.offsetHeight ?? rect.height,
    },
    image:
      element.localName === "img"
        ? {
            src: element.currentSrc || element.src,
            alt: element.getAttribute("alt"),
            width: element.naturalWidth,
            height: element.naturalHeight,
          }
        : null,
    limited,
    shadow: root !== element.ownerDocument,
  };
}
const row = (name, value) => ({ name, value });
const group = (name, rows, open = true) => ({ name, rows, open });
const propertySection = (name) => {
  if (
    layoutNames.includes(name) ||
    /^(margin|padding|inset|flex|grid|align|justify|place|overflow|column|row-gap|block-size|inline-size|min-block|max-block|min-inline|max-inline)/.test(
      name,
    )
  )
    return "layout";
  if (
    effectNames.includes(name) ||
    (name !== "background-color" &&
      /^(background|border|outline|mask|clip|transform|translate|rotate|scale|perspective|animation|transition)/.test(
        name,
      ))
  )
    return "effects";
  return "styles";
};
const neutral = (name, value) =>
  !value ||
  ["none", "normal", "auto", "0px", "0", "1", "0px none rgb(0, 0, 0)"].includes(
    value,
  ) ||
  ((name.startsWith("border") || name === "outline") &&
    /\b(?:none|hidden)\b/.test(value));
export function inspectGroups(snapshot, section, all = false, query = "") {
  if (!snapshot) return [];
  const { css, attributes } = snapshot;
  const rows = (names) =>
    names
      .filter((name) => css[name] !== undefined)
      .map((name) => row(name, css[name]));
  const common = (names, always = []) =>
    rows(names).filter(
      (r) =>
        all || query || always.includes(r.name) || !neutral(r.name, r.value),
    );
  let groups;
  if (section === "layout") {
    const display = css.display || "";
    groups = [
      group(
        display.includes("grid")
          ? "Grid layout"
          : display.includes("flex")
            ? "Flex layout"
            : "Layout",
        rows([
          "display",
          ...(display.includes("grid")
            ? [
                "grid-template-columns",
                "grid-template-rows",
                "grid-auto-flow",
                "row-gap",
                "column-gap",
              ]
            : display.includes("flex")
              ? [
                  "flex-direction",
                  "flex-wrap",
                  "align-items",
                  "justify-content",
                  "gap",
                ]
              : []),
        ]),
      ),
      group(
        "Size & spacing",
        common(
          [
            "width",
            "height",
            "padding",
            "margin",
            "border-width",
            "box-sizing",
            "min-width",
            "max-width",
            "min-height",
            "max-height",
          ],
          ["width", "height", "padding", "margin"],
        ),
        false,
      ),
      group(
        "Position & overflow",
        common(
          [
            "position",
            "top",
            "right",
            "bottom",
            "left",
            "z-index",
            "overflow",
            "overflow-x",
            "overflow-y",
          ],
          ["position", "overflow"],
        ),
        false,
      ),
    ];
    if (all || query)
      groups.push(
        group(
          "Additional layout properties",
          rows(
            [
              ...new Set([
                ...layoutNames,
                ...Object.keys(css).filter(
                  (n) => propertySection(n) === "layout",
                ),
              ]),
            ].filter(
              (n) => !groups.some((g) => g.rows.some((r) => r.name === n)),
            ),
          ),
          false,
        ),
      );
  } else if (section === "effects") {
    groups = [
      group(
        "Background & shadow",
        common(["background-image", "box-shadow", "text-shadow"]),
      ),
      group(
        "Borders & transparency",
        common([
          "border",
          ...(!css.border
            ? ["border-top", "border-right", "border-bottom", "border-left"]
            : []),
          "border-radius",
          "outline",
          "opacity",
        ]),
      ),
      group(
        "Filters & transforms",
        common([
          "filter",
          "backdrop-filter",
          "transform",
          "mix-blend-mode",
          "clip-path",
        ]),
      ),
    ];
    if (all || query)
      groups.push(
        group(
          "Additional effects",
          rows([
            ...new Set([
              "background-size",
              "background-position",
              "background-repeat",
              "transform-origin",
              ...Object.keys(css).filter(
                (n) =>
                  propertySection(n) === "effects" &&
                  !groups.some((g) => g.rows.some((r) => r.name === n)),
              ),
            ]),
          ]),
          false,
        ),
      );
  } else if (section === "element") {
    const attr = (name) =>
      attributes.find((a) => a.name === name)?.value ?? null;
    const identity = group(
      "Element details",
      [
        row("tag", snapshot.tag),
        row("id", attr("id")),
        row("class", attr("class")),
        row("selector", snapshot.selector),
      ],
      !["a", "img"].includes(snapshot.tag),
    );
    groups = [];
    if (snapshot.tag === "a")
      groups.push(
        group(
          "Link attributes",
          ["href", "target", "rel", "aria-label"]
            .map((n) => row(n, attr(n)))
            .filter(
              (r) =>
                all ||
                query ||
                ["href", "target"].includes(r.name) ||
                r.value !== null,
            ),
        ),
      );
    if (snapshot.image)
      groups.push(
        group("Image", [
          row("src", snapshot.image.src),
          row("alt", snapshot.image.alt),
          row(
            "rendered size",
            `${snapshot.rect.width} × ${snapshot.rect.height} px`,
          ),
          row(
            "original size",
            `${snapshot.image.width} × ${snapshot.image.height} px`,
          ),
          row("object-fit", css["object-fit"]),
        ]),
      );
    groups.push(identity);
    if (snapshot.text)
      groups.push(
        group(
          "Text content",
          [row("text", snapshot.text)],
          /^h[1-6]$/.test(snapshot.tag),
        ),
      );
    const used = new Set(groups.flatMap((g) => g.rows.map((r) => r.name)));
    groups.push(
      group(
        "Attributes",
        attributes.filter(
          (a) =>
            !used.has(a.name) &&
            (all ||
              query ||
              ["role", "title", "type", "placeholder"].includes(a.name) ||
              a.name.startsWith("aria-")),
        ),
        false,
      ),
    );
  } else {
    groups = [
      group("Appearance", rows(["color", "background-color"])),
      group(
        "Typography",
        rows([
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "letter-spacing",
        ]),
      ),
    ];
    if (all || query)
      groups.push(
        group(
          "Additional properties",
          rows(
            Object.keys(css).filter(
              (n) =>
                propertySection(n) === "styles" &&
                !groups.some((g) => g.rows.some((r) => r.name === n)),
            ),
          ),
          false,
        ),
      );
  }
  const term = query.trim().toLowerCase();
  return groups
    .map((g) => ({
      ...g,
      open: g.open || !!term,
      rows: g.rows.filter(
        (r) =>
          !term ||
          `${r.name} ${r.value ?? "Not set"}`.toLowerCase().includes(term),
      ),
    }))
    .filter((g) => g.rows.length);
}
export function cssSnippet(snapshot) {
  if (!snapshot) return "";
  const names = [...new Set([...styleNames, ...layoutNames, ...effectNames])];
  return `${snapshot.selector} {\n${names
    .filter((n) => snapshot.css[n])
    .map((n) => `  ${n}: ${snapshot.css[n]};`)
    .join("\n")}\n}`;
}
