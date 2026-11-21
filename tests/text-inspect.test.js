import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { extractText, textContent } from "../src/core/text.js";
import {
  snapshotElement,
  inspectGroups,
  cssSnippet,
} from "../src/core/inspect.js";
import { preferences } from "../src/core/preferences.js";
function fixture(body) {
  const dom = new JSDOM(`<!doctype html><body>${body}</body>`, {
    url: "https://fixture.test/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.HTMLElement.prototype.getClientRects = function () {
    return [{ width: 100, height: 20 }];
  };
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { width: 100, height: 20, left: 0, top: 0 };
  };
  return dom;
}
function read(dom, opts = {}) {
  return JSON.parse(
    JSON.stringify(
      dom.window.eval(
        `(${extractText.toString()})(${JSON.stringify({ maxMs: 3000, ...opts })})`,
      ),
    ),
  );
}
test("text preserves source order and inline spacing without duplicate ancestor text or hidden/form values", () => {
  const dom = fixture(
    '<nav>Menu</nav><main><h1>A heading</h1><p>Hello <strong>world</strong>!</p><p>Next<br>line</p><div hidden>Hidden</div><span style="display:none">Not visible</span><input value="secret"><textarea>private</textarea><script>private()</script></main>',
  );
  try {
    const before = dom.window.document.body.innerHTML;
    const result = read(dom);
    assert.deepEqual(
      result.blocks.map((b) => b.text),
      ["Menu", "A heading", "Hello world!", "Next\nline"],
    );
    assert.equal(dom.window.document.body.innerHTML, before);
    assert.equal(read(dom, { scope: "main" }).blocks[0].text, "A heading");
  } finally {
    dom.window.close();
  }
});
test("selection only includes the selected substring and empty selection is explicit", () => {
  const dom = fixture("<p>Hello <strong>world</strong>!</p>");
  try {
    assert.equal(read(dom, { scope: "selection" }).blocks.length, 0);
    const range = dom.window.document.createRange();
    range.setStart(dom.window.document.querySelector("p").firstChild, 2);
    range.setEnd(dom.window.document.querySelector("strong").firstChild, 3);
    dom.window.getSelection().addRange(range);
    assert.equal(textContent(read(dom, { scope: "selection" })), "llo wor");
  } finally {
    dom.window.close();
  }
});
test("text extraction discloses fallback and node/character caps", () => {
  const dom = fixture("<p>One paragraph with many letters</p><p>Two</p>");
  try {
    assert.equal(read(dom, { scope: "main" }).fallback, true);
    const capped = read(dom, { maxChars: 5 });
    assert.equal(capped.limited, true);
    assert.ok(textContent(capped).length <= 5);
    assert.equal(read(dom, { maxNodes: 1 }).limited, true);
  } finally {
    dom.window.close();
  }
});
test("element snapshot bounds attributes, keeps page identity unchanged, and excludes input values", () => {
  const dom = fixture(
    '<button id="original" class="action" aria-label="Start" style="display:flex;gap:8px">Start</button><input type="password" value="secret">',
  );
  try {
    const el = dom.window.document.querySelector("button"),
      before = dom.window.document.body.innerHTML;
    const result = snapshotElement(el);
    assert.match(result.selector, /#original/);
    assert.equal(result.css.display, "flex");
    assert.equal(result.text, "Start");
    assert.equal(dom.window.document.body.innerHTML, before);
    assert.ok(
      !snapshotElement(
        dom.window.document.querySelector("input"),
      ).attributes.some((a) => a.name === "value"),
    );
  } finally {
    dom.window.close();
  }
});
test("Inspect sections distinguish missing attributes, search hidden defaults, and keep CSS separate from attributes", () => {
  const value = {
    tag: "a",
    selector: "a.link",
    text: "A link",
    rect: { width: 100, height: 20 },
    attributes: [{ name: "href", value: "https://example.test/" }],
    css: {
      display: "inline",
      color: "rgb(1, 2, 3)",
      "font-size": "16px",
      opacity: "1",
      filter: "none",
      transform: "none",
      "box-shadow": "none",
      "background-image": "none",
      "border-radius": "0px",
      border: "0px none rgb(0, 0, 0)",
      outline: "rgb(0, 0, 0) none 0px",
    },
  };
  assert.equal(inspectGroups(value, "effects").length, 0);
  assert.equal(
    inspectGroups(value, "effects", false, "opacity")[0].rows[0].value,
    "1",
  );
  assert.equal(
    inspectGroups(value, "element")
      .find((g) => g.name === "Link attributes")
      .rows.find((r) => r.name === "target").value,
    null,
  );
  assert.match(cssSnippet(value), /display: inline/);
  assert.doesNotMatch(cssSnippet(value), /href|https:/);
});
test("workspace and preview defaults preserve false and existing preferences", () => {
  assert.equal(preferences({}).workspace, "popup");
  assert.equal(preferences({ workspace: "sideways" }).workspace, "popup");
  assert.equal(
    preferences({ workspace: "panel", images: { loadPreviews: true } }).images
      .loadPreviews,
    true,
  );
  assert.equal(
    preferences({ images: { loadPreviews: false } }).images.loadPreviews,
    false,
  );
});

test("Inspect searches stay within their section and asymmetric borders remain visible", () => {
  const value = {
    tag: "div",
    selector: "div",
    attributes: [],
    css: {
      color: "rgb(1, 2, 3)",
      display: "flex",
      "padding-top": "10px",
      border: "",
      "border-top": "2px solid rgb(1, 2, 3)",
      "border-left": "0px none rgb(1, 2, 3)",
      opacity: "1",
      "animation-name": "none",
    },
  };
  assert.equal(inspectGroups(value, "styles", true, "display").length, 0);
  assert.equal(inspectGroups(value, "layout", true, "opacity").length, 0);
  assert.equal(inspectGroups(value, "effects", true, "display").length, 0);
  assert.equal(
    inspectGroups(value, "layout", false, "padding-top")[0].rows[0].value,
    "10px",
  );
  assert.equal(inspectGroups(value, "effects")[0].rows[0].name, "border-top");
});

test("Inspect marks long values and text as partial", () => {
  const dom = fixture(
    `<div title="${"a".repeat(5000)}">${"b".repeat(5000)}</div>`,
  );
  try {
    const value = snapshotElement(dom.window.document.querySelector("div"));
    assert.equal(value.limited, true);
    assert.equal(value.text.length, 4000);
    assert.equal(value.attributes[0].value.length, 4096);
  } finally {
    dom.window.close();
  }
});
