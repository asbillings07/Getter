import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { aggregate, extractPage } from "../src/core/extract.js";
import {
  displayedFonts,
  sortByUsage,
  totalUses,
  usagePercentage,
} from "../src/core/usage.js";

test("usage sorting is deterministic, reverses frequency only, and leaves scan data unchanged", () => {
  const colors = [
    { value: "c", count: 1 },
    { value: "b", count: 4 },
    { value: "a", count: 4 },
  ];
  const before = structuredClone(colors);
  assert.deepEqual(
    sortByUsage(colors).map((c) => c.value),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    sortByUsage(colors, "least").map((c) => c.value),
    ["c", "a", "b"],
  );
  assert.deepEqual(colors, before);
});

test("font summary keeps the most used style per tag in either sort direction and shares the full denominator", () => {
  const fonts = [
    { tag: "p", fontFamily: "Georgia", count: 2 },
    { tag: "p", fontFamily: "Arial", count: 6 },
    { tag: "h2", fontFamily: "Georgia", count: 1 },
  ];
  assert.equal(displayedFonts(fonts, false, "most")[0].fontFamily, "Arial");
  assert.deepEqual(
    displayedFonts(fonts, false, "least").map((f) => f.count),
    [1, 6],
  );
  assert.deepEqual(
    displayedFonts(fonts, true, "most").map((f) => f.count),
    [6, 2, 1],
  );
  assert.equal(usagePercentage(6, totalUses(fonts)), "66.7%");
  assert.equal(usagePercentage(1, 4000), "<0.1%");
  assert.equal(usagePercentage(0, 0), "0%");
});

test("extraction totals include uses omitted by the item cap and exclude transparent backgrounds", () => {
  const dom = new JSDOM(
    '<body style="color:rgb(1,2,3)"><p style="color:rgb(4,5,6)">One</p><p style="color:rgb(4,5,6)">Two</p></body>',
    { runScripts: "outside-only", pretendToBeVisual: true },
  );
  try {
    dom.window.HTMLElement.prototype.getClientRects = () => [
      { width: 10, height: 10 },
    ];
    const result = dom.window.eval(
      `(${extractPage.toString()})({maxItems:1,maxMs:2000})`,
    );
    assert.equal(result.limited, true);
    assert.equal(result.colors.length, 1);
    assert.equal(result.fonts.length, 1);
    assert.equal(result.usageTotals.colors, 3);
    assert.equal(result.usageTotals.fonts, 3);
    assert.equal(
      usagePercentage(result.colors[0].count, result.usageTotals.colors),
      "33.3%",
    );
  } finally {
    dom.window.close();
  }
});

test("frame aggregation adds full usage totals and ranks frequent fonts before the global cap", () => {
  const result = {
    colors: [{ value: "rgb(1, 2, 3)", count: 2, kinds: ["Text"] }],
    fonts: Array.from({ length: 500 }, (_, i) => ({
      tag: "p",
      fontFamily: `Font ${i}`,
      count: 1,
    })),
    images: [],
    visited: 502,
    frames: 0,
    limited: false,
    usageTotals: { colors: 7, fonts: 500 },
  };
  const combined = aggregate([
    { frameId: 0, result },
    {
      frameId: 2,
      result: {
        ...result,
        fonts: [{ tag: "h1", fontFamily: "Frequent", count: 40 }],
        usageTotals: { colors: 5, fonts: 40 },
      },
    },
  ]);
  assert.deepEqual(combined.usageTotals, { colors: 12, fonts: 540 });
  assert.equal(combined.colors[0].count, 4);
  assert.equal(usagePercentage(4, combined.usageTotals.colors), "33.3%");
  assert.equal(combined.fonts.length, 500);
  assert.equal(combined.fonts[0].fontFamily, "Frequent");
  assert.equal(combined.limited, true);
  assert.equal(totalUses(combined.fonts), 539);
});
