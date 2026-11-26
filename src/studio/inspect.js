import { extractText, textContent } from "../core/text.js";

// Capture reusable styles and explicitly selected visible content without
// copying markup, executable content, or form values.
export const effectProperties = [
  "background-image",
  "box-shadow",
  "text-shadow",
  "opacity",
  "filter",
  "backdrop-filter",
  "transform",
  "transform-origin",
  "mix-blend-mode",
  "clip-path",
];
export const motionProperties = [
  "transition-property",
  "transition-duration",
  "transition-timing-function",
  "transition-delay",
  "animation-name",
  "animation-duration",
  "animation-timing-function",
  "animation-delay",
  "animation-iteration-count",
];
const designProperties = [
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
  "padding",
  "margin",
  "display",
  "gap",
  "row-gap",
  "column-gap",
  "justify-content",
  "align-items",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "grid-template-columns",
  "border",
  "border-radius",
  "box-sizing",
  "width",
  "height",
  "max-width",
  "min-width",
  ...effectProperties,
];
const movingProperties = [
  "opacity",
  "transform",
  "translate",
  "rotate",
  "scale",
  "filter",
  "backgroundColor",
  "color",
  "borderRadius",
];

const textField =
  "script,style,noscript,template,input,textarea,select,option,[contenteditable]:not([contenteditable=false])";
const skippedNodes = new Set([
  "script",
  "style",
  "link",
  "iframe",
  "frame",
  "canvas",
  "svg",
  "input",
  "select",
  "textarea",
  "video",
  "audio",
  "object",
  "embed",
]);

const previewMedia = new Set(["img", "video", "iframe", "frame", "canvas"]);

export const componentParent = (node) =>
  node.assignedSlot || node.parentElement || node.getRootNode().host;

function componentChildren(node) {
  if (node.localName === "slot") {
    const assigned = node.assignedElements();
    if (assigned.length) return assigned;
  }
  return (node.shadowRoot || node).children;
}

export function safeStyleValue(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    !/[;{}<>\\]|\b(?:url|image-set|cross-fade|paint|element|attr|var)\s*\(/i.test(
      value,
    )
  );
}

function properties(node, names, onOmitted = () => {}) {
  const style = node.ownerDocument.defaultView.getComputedStyle(node);
  return Object.fromEntries(
    names.flatMap((name) => {
      const value = style.getPropertyValue(name).trim();
      if (!value) return [];
      if (safeStyleValue(value)) return [[name, value]];
      onOmitted();
      return [];
    }),
  );
}

function frameValues(frame) {
  return Object.fromEntries(
    movingProperties.flatMap((key) =>
      safeStyleValue(frame[key]) ? [[key, frame[key]]] : [],
    ),
  );
}

export function readActiveMotion(node) {
  const animations = [];
  for (const animation of (node.getAnimations?.() || []).slice(0, 4)) {
    const { effect, animationName, transitionProperty } = animation;
    if (!effect || effect.target !== node || effect.pseudoElement) continue;
    const timing = effect.getTiming();
    if (typeof timing.duration !== "number" || timing.duration <= 0) continue;
    const sourceFrames = effect.getKeyframes();
    if (sourceFrames.length > 16) continue;
    const keyframes = sourceFrames.map((frame) => ({
      offset: frame.computedOffset,
      easing: safeStyleValue(frame.easing) ? frame.easing : "linear",
      ...frameValues(frame),
    }));
    if (keyframes.every((frame) => Object.keys(frame).length <= 2)) continue;
    animations.push({
      kind: transitionProperty ? "transition" : "animation",
      name: (transitionProperty || animationName || "Element animation").slice(
        0,
        120,
      ),
      keyframes,
      duration: timing.duration,
      easing: safeStyleValue(timing.easing) ? timing.easing : "linear",
      delay: timing.delay,
      iterations: Number.isFinite(timing.iterations)
        ? timing.iterations
        : "infinite",
      direction: timing.direction,
      fill: timing.fill,
    });
  }
  return animations;
}

function cssRuleKeys(node, names) {
  const root = node.getRootNode();
  const win = node.ownerDocument.defaultView;
  const started = performance.now();
  const found = new Map();
  let visited = 0;
  function scan(rules) {
    for (const rule of rules) {
      if (++visited > 1500 || performance.now() - started > 35) return;
      if (rule.type === 7 && names.includes(rule.name))
        found.set(rule.name, rule);
      else if (rule.styleSheet) readSheet(rule.styleSheet);
      else if (
        rule.cssRules &&
        (rule.constructor.name === "CSSLayerBlockRule" ||
          (rule.type === 4 && win.matchMedia(rule.conditionText).matches) ||
          (rule.type === 12 && win.CSS.supports(rule.conditionText)))
      )
        scan(rule.cssRules);
    }
  }
  function readSheet(sheet) {
    try {
      if (
        !sheet.disabled &&
        (!sheet.media?.mediaText ||
          win.matchMedia(sheet.media.mediaText).matches)
      )
        scan(sheet.cssRules);
    } catch {}
  }
  for (const sheet of [
    ...(root.styleSheets || []),
    ...(root.adoptedStyleSheets || []),
  ]) {
    if (visited > 1500 || performance.now() - started > 35) break;
    readSheet(sheet);
  }
  return found;
}

const cssList = (value) =>
  (value || "").split(/,(?![^()]*\))/).map((entry) => entry.trim());
const timeMs = (value) =>
  Number.parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
const cssName = (name) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

export function readMotion(node, transitions = [], findKeyframes = true) {
  const css = properties(node, motionProperties);
  const animations = readActiveMotion(node);
  for (const transition of transitions) {
    if (
      !animations.some(
        ({ kind, name }) => kind === "transition" && name === transition.name,
      )
    )
      animations.push(transition);
  }
  const names = cssList(css["animation-name"]);
  const missing = names.filter(
    (name) =>
      name &&
      name !== "none" &&
      !animations.some(
        (motion) => motion.kind === "animation" && motion.name === name,
      ),
  );
  const rules =
    findKeyframes && missing.length ? cssRuleKeys(node, missing) : new Map();
  const delays = cssList(css["animation-delay"]);
  const durations = cssList(css["animation-duration"]);
  const easings = cssList(css["animation-timing-function"]);
  const iterations = cssList(css["animation-iteration-count"]);
  for (const [index, name] of names.entries()) {
    const rule = rules.get(name);
    if (!rule || rule.cssRules.length > 16) continue;
    const duration = timeMs(durations[index % durations.length]);
    if (!Number.isFinite(duration) || duration <= 0) continue;
    const keyframes = [];
    for (const frame of rule.cssRules) {
      const values = frameValues(
        Object.fromEntries(
          movingProperties.map((key) => [
            key,
            frame.style.getPropertyValue(cssName(key)),
          ]),
        ),
      );
      if (!Object.keys(values).length) continue;
      for (const offset of frame.keyText.split(",")) {
        const position = Number.parseFloat(offset) / 100;
        if (position >= 0 && position <= 1)
          keyframes.push({
            ...values,
            offset: position,
            easing:
              frame.style.animationTimingFunction ||
              easings[index % easings.length] ||
              "ease",
          });
      }
    }
    if (keyframes.length < 2 || keyframes.length > 16) continue;
    animations.push({
      kind: "animation",
      name,
      keyframes: keyframes.sort((a, b) => a.offset - b.offset),
      duration,
      easing: "linear",
      delay: timeMs(delays[index % delays.length]) || 0,
      iterations:
        Number(iterations[index % iterations.length]) ||
        (iterations[index % iterations.length] === "infinite" ? "infinite" : 1),
      direction: "normal",
      fill: "none",
    });
  }
  return { css, animations: animations.slice(0, 8) };
}

export function motionAssets({ css, animations }) {
  return ["animation", "transition"].flatMap((kind) => {
    const entries = animations.filter(
      (animation) => (animation.kind || "animation") === kind,
    );
    const timing = Object.fromEntries(
      Object.entries(css).filter(([name]) => name.startsWith(kind + "-")),
    );
    if (
      !entries.length &&
      !cssList(timing[kind + "-duration"]).some((value) => timeMs(value) > 0)
    )
      return [];
    if (
      !entries.length &&
      (timing[kind + "-name"] || timing[kind + "-property"]) === "none"
    )
      return [];
    return [
      {
        type: "motion",
        kind,
        name:
          entries[0]?.name ||
          (kind === "animation" ? "Animation timing" : "Transition timing"),
        css: timing,
        animations: entries,
      },
    ];
  });
}

export function captureComponent(
  root,
  {
    withAssets = false,
    transitions = () => [],
    preview = false,
    expanded = preview,
    onNode,
  } = {},
) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const started = performance.now();
  const rootBounds = root.getBoundingClientRect();
  const maxNodes = expanded ? 160 : 32;
  const maxDepth = expanded ? 18 : 5;
  const maxMs = expanded ? 220 : 100;
  const exhausted = () =>
    visited >= maxNodes || performance.now() - started >= maxMs;
  const measure = (rect) => ({
    x: Math.round(rect.x - rootBounds.x),
    y: Math.round(rect.y - rootBounds.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  });
  let visited = 0;
  let limited = false;
  let resourcesOmitted = false;
  const images = new Map();
  const fonts = new Map();
  const markOmitted = () => {
    resourcesOmitted = true;
  };
  if (withAssets) {
    for (let ancestor = root; ancestor; ancestor = componentParent(ancestor)) {
      if (Number(win.getComputedStyle(ancestor).opacity) === 0)
        throw Error("This element is unavailable.");
    }
  }
  function captureNode(node, depth) {
    if (exhausted() || depth >= maxDepth) {
      limited = true;
      return null;
    }
    const style = win.getComputedStyle(node);
    if (style.display === "none") return null;
    if (withAssets) {
      if (
        node.hidden ||
        style.visibility !== "visible" ||
        Number(style.opacity) === 0
      )
        return null;
    }
    visited++;
    const css = properties(node, designProperties, markOmitted);
    const children = [];
    const media = preview && previewMedia.has(node.localName);
    const descendants = media
      ? []
      : expanded
        ? componentChildren(node)
        : node.children;
    for (const child of descendants) {
      if (
        skippedNodes.has(child.localName) &&
        !(withAssets && child.localName === "input") &&
        !(preview && previewMedia.has(child.localName))
      ) {
        resourcesOmitted = true;
        continue;
      }
      const captured = captureNode(child, depth + 1);
      if (captured) children.push(captured);
      if (exhausted()) {
        limited = true;
        break;
      }
    }
    const rect = node.getBoundingClientRect();
    const captured = {
      tag: node.localName.slice(0, 60),
      css,
      children,
      bounds: measure(rect),
    };
    if (preview) {
      if (media) captured.media = node.localName;
      if (!captured.bounds.width || !captured.bounds.height) {
        captured.unboxed = true;
        const bounds = children
          .map((child) => child.bounds)
          .filter((part) => part.width && part.height);
        if (bounds.length) {
          const x = Math.min(...bounds.map((part) => part.x));
          const y = Math.min(...bounds.map((part) => part.y));
          captured.bounds = {
            x,
            y,
            width: Math.max(...bounds.map((part) => part.x + part.width)) - x,
            height: Math.max(...bounds.map((part) => part.y + part.height)) - y,
          };
        }
      }
      captured.objectFit = style.objectFit;
      captured.objectPosition = style.objectPosition;
    }
    if (withAssets) {
      const directText =
        media || node.isContentEditable || node.closest(textField)
          ? []
          : [...node.childNodes].filter((child) => child.nodeType === 3);
      const content = directText
        .map((child) => child.nodeValue)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      if (content) {
        captured.text = content.slice(0, 1000);
        limited ||= content.length > captured.text.length;
        if (preview) {
          const range = doc.createRange();
          captured.textRuns = directText.slice(0, 12).flatMap((child) => {
            const text = child.nodeValue.replace(/\s+/g, " ").trim();
            if (!text) return [];
            range.selectNodeContents(child);
            const bounds = measure(range.getBoundingClientRect());
            return bounds.width && bounds.height
              ? [
                  {
                    text: text.slice(0, 1000),
                    bounds,
                    multiline: range.getClientRects().length > 1,
                  },
                ]
              : [];
          });
        }
        const font = {
          type: "font",
          tag: node.localName.slice(0, 60),
          ...Object.fromEntries(
            [
              "font-family",
              "font-size",
              "font-weight",
              "font-style",
              "line-height",
              "letter-spacing",
            ].map((name) => [
              name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
              css[name] || "",
            ]),
          ),
        };
        if (font.fontFamily && font.fontSize)
          fonts.set(JSON.stringify(font), font);
      }
      if (node.localName === "input" && node.type !== "password") {
        const placeholder = node.getAttribute("placeholder")?.trim();
        if (placeholder) captured.placeholder = placeholder.slice(0, 120);
      }
      if (node.localName === "img") {
        const src = node.currentSrc || node.src;
        if (
          src?.startsWith("https://") &&
          src.length <= 4096 &&
          (images.has(src) || images.size < 8)
        ) {
          if (!images.has(src))
            images.set(src, {
              type: "image",
              index: images.size,
              src,
              name: (node.alt || "").slice(0, 60),
              width: node.naturalWidth,
              height: node.naturalHeight,
            });
          captured.imageIndex = images.get(src).index;
        } else resourcesOmitted = true;
      }
      if (!preview) {
        const assets = motionAssets(
          readMotion(node, transitions(node), node === root),
        );
        if (assets.length) captured.motions = assets;
      }
    }
    onNode?.(node, captured);
    return captured;
  }
  const component = captureNode(root, 0);
  if (!component) throw Error("This element is unavailable.");
  if (preview) return { component, limited };
  const extracted = withAssets
    ? extractText({
        rootElement: root,
        maxChars: 4000,
        maxNodes: 300,
        maxBlocks: 90,
        maxMs: 40,
      })
    : null;
  limited ||= Boolean(extracted?.limited);
  const { css: motion, animations } = readMotion(root, transitions(root));
  return {
    component,
    effects: capturableEffects(component.css),
    motion,
    animations,
    ...(withAssets
      ? {
          images: [...images.values()],
          fonts: [...fonts.values()],
          text: textContent(extracted),
        }
      : {}),
    visited,
    limited,
    resourcesOmitted,
    viewport: { width: win.innerWidth, height: win.innerHeight },
    title: doc.title.trim().slice(0, 120),
  };
}

export function capturableEffects(css) {
  return Object.fromEntries(
    effectProperties.flatMap((name) => {
      const value = css[name];
      return value && !["none", "normal", "auto", "1"].includes(value)
        ? [[name, value]]
        : [];
    }),
  );
}
