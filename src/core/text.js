// Serialized by scripting.executeScript. All helpers must remain inside this function.
export function extractText({
  scope = "page",
  maxNodes = 12000,
  maxChars = 150000,
  maxBlocks = 1000,
  maxMs = 180,
} = {}) {
  const start = performance.now(),
    blocks = [],
    stack = [];
  let visited = 0,
    chars = 0,
    limited = false,
    omitted = 0,
    fallback = false;
  const excluded = new Set([
    "script",
    "style",
    "noscript",
    "template",
    "textarea",
    "input",
    "select",
    "option",
    "head",
    "getter-inspection-overlay",
  ]);
  const semantic = new Set([
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "a",
    "button",
    "blockquote",
    "pre",
    "td",
    "th",
    "dt",
    "dd",
    "figcaption",
  ]);
  const selection = window.getSelection();
  let range =
    scope === "selection" && selection?.rangeCount
      ? selection.getRangeAt(0)
      : null;
  if (scope === "selection" && (!range || range.collapsed))
    return { blocks: [], scope, limited: false, omitted: 0, fallback: false };
  let root = document.body || document.documentElement;
  if (scope === "main") {
    const main = document.querySelector('main,[role="main"],article');
    if (main) root = main;
    else fallback = true;
  }
  if (range)
    root =
      range.commonAncestorContainer.nodeType === 1
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
  const styleCache = new WeakMap();
  const style = (el) => {
    if (!styleCache.has(el))
      styleCache.set(el, el.ownerDocument.defaultView.getComputedStyle(el));
    return styleCache.get(el);
  };
  const owner = (el) => {
    let p = el;
    while (p && p !== root) {
      if (
        semantic.has(p.localName) ||
        ["block", "flex", "grid", "list-item", "table-cell"].includes(
          style(p).display,
        )
      )
        return p;
      p = p.parentElement;
    }
    return root;
  };
  let previousOwner;
  const append = (text, el) => {
    if (!text) return;
    const room = maxChars - chars;
    if (text.length > room) {
      text = text.slice(0, room);
      limited = true;
    }
    chars += text.length;
    const parent = owner(el),
      tag = parent?.localName || "p";
    if (previousOwner !== parent) {
      if (blocks.length >= maxBlocks) {
        limited = true;
        return;
      }
      blocks.push({
        kind: /^h[1-6]$/.test(tag)
          ? `Heading ${tag[1]}`
          : {
              a: "Link",
              button: "Button",
              li: "List item",
              pre: "Code",
              blockquote: "Quote",
              td: "Table cell",
              th: "Table heading",
            }[tag] || "Paragraph",
        text: "",
      });
      previousOwner = parent;
    }
    blocks.at(-1).text += text;
  };
  // Exclude invisible ancestors when extracting a selection or a nested main region.
  for (let p = root?.parentElement; p; p = p.parentElement)
    if (
      excluded.has(p.localName) ||
      style(p).display === "none" ||
      Number(style(p).opacity) === 0
    )
      return { blocks: [], scope, limited: false, omitted: 0, fallback };
  if (root) stack.push(root);
  while (stack.length) {
    if (
      visited++ >= maxNodes ||
      chars >= maxChars ||
      blocks.length >= maxBlocks ||
      performance.now() - start > maxMs
    ) {
      limited = true;
      break;
    }
    const node = stack.pop();
    if (range && !range.intersectsNode(node)) continue;
    if (node.nodeType === 3) {
      const el = node.parentElement;
      if (
        !el ||
        !el.getClientRects().length ||
        style(el).visibility === "hidden" ||
        style(el).visibility === "collapse"
      )
        continue;
      let text = node.nodeValue;
      if (range) {
        if (node === range.endContainer) text = text.slice(0, range.endOffset);
        if (node === range.startContainer) text = text.slice(range.startOffset);
      }
      if (!["pre", "pre-wrap", "break-spaces"].includes(style(el).whiteSpace)) {
        text =
          style(el).whiteSpace === "pre-line"
            ? text.replace(/[^\S\n]+/g, " ")
            : text.replace(/\s+/g, " ");
      }
      append(text, el);
      continue;
    }
    if (node.nodeType !== 1) continue;
    if (
      excluded.has(node.localName) ||
      node.hidden ||
      style(node).display === "none" ||
      Number(style(node).opacity) === 0
    )
      continue;
    if (node.localName === "br") {
      append("\n", node.parentElement);
      continue;
    }
    if (node.localName === "iframe" || node.localName === "frame") {
      if (
        range ||
        style(node).visibility === "hidden" ||
        style(node).visibility === "collapse"
      )
        continue;
      try {
        const child = node.contentDocument;
        if (
          !child?.body ||
          child.location.origin !== location.origin ||
          !node.getClientRects().length
        )
          throw Error();
        stack.push(child.body);
      } catch {
        omitted++;
      }
      continue;
    }
    for (let i = node.childNodes.length - 1; i >= 0; i--)
      stack.push(node.childNodes[i]);
  }
  return {
    blocks: blocks
      .map((b) => ({
        ...b,
        text: b.text
          .replace(/[\t\r\f ]+/g, " ")
          .replace(/ *\n */g, "\n")
          .trim(),
      }))
      .filter((b) => b.text),
    scope,
    limited,
    omitted,
    fallback,
  };
}
export function textContent(result) {
  return (result?.blocks || []).map((b) => b.text).join("\n\n");
}
