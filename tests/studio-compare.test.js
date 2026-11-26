import assert from "node:assert/strict";
import test from "node:test";
import { comparePageSnapshots } from "../src/studio/compare.js";

const red = {
  type: "color",
  value: "rgb(255, 0, 0)",
  kinds: ["Text"],
  count: 3,
};
const blue = { ...red, value: "oklch(0.7 0.15 250 / 0.75)", count: 1 };
const green = { ...red, value: "rgb(0, 128, 0)", count: 2 };
const headline = {
  type: "font",
  tag: "h1",
  fontFamily: "Inter, sans-serif",
  fontSize: "32px",
  fontWeight: "700",
  fontStyle: "normal",
  lineHeight: "40px",
  letterSpacing: "normal",
  count: 1,
};
const smallHeadline = { ...headline, fontSize: "28px" };

function snapshot(id, items, coverage = {}) {
  return {
    id,
    kind: "page-styles",
    extractionVersion: 2,
    savedAt: "2026-11-25T12:00:00.000Z",
    source: { hostname: "example.com" },
    items,
    coverage: {
      viewport: { width: 1280, height: 900 },
      limited: false,
      framesOmitted: 0,
      longValuesOmitted: 0,
      usageTotals: Object.fromEntries(
        [
          ["colors", "color"],
          ["fonts", "font"],
        ].map(([category, type]) => [
          category,
          items.reduce(
            (total, item) => total + (item.type === type ? item.count : 0),
            0,
          ),
        ]),
      ),
      ...coverage,
    },
  };
}

test("page comparison keeps original values, compares color roles and uses saved denominators", () => {
  const before = snapshot("a", [red, blue, headline]);
  const afterRed = { ...red, kinds: ["Text", "Background"], count: 2 };
  const after = snapshot("b", [green, afterRed, smallHeadline]);
  const original = structuredClone([before, after]);
  const result = comparePageSnapshots(before, after);

  assert.equal(result.status, "ready");
  assert.equal(result.before.savedAt, before.savedAt);
  assert.deepEqual(
    result.rows.map((row) => row.status),
    ["changed", "removed", "added", "removed", "added"],
  );
  assert.deepEqual(result.rows[0].rolesAdded, ["Background"]);
  assert.deepEqual(result.rows[0].usage, {
    beforeTotal: 4,
    afterTotal: 4,
    percentagePoints: -25,
  });
  assert.equal(result.rows[1].before.value, blue.value);
  assert.equal(result.rows[3].before.fontFamily, headline.fontFamily);
  assert.deepEqual([before, after], original);

  const sameRoles = { ...afterRed, kinds: [...afterRed.kinds].reverse() };
  const reordered = snapshot("c", [sameRoles, green, smallHeadline]);
  assert.ok(
    comparePageSnapshots(after, reordered).rows.every(
      ({ status }) => status === "unchanged",
    ),
  );
});

test("a missing color or role counts as unknown when that side has partial coverage", () => {
  const beforeRed = { ...red, kinds: ["Background", "Text"] };
  const before = snapshot("a", [beforeRed, blue]);
  for (const coverage of [
    { limited: true },
    { framesOmitted: 1 },
    { longValuesOmitted: 1 },
    { limited: undefined },
  ]) {
    const after = snapshot("b", [red, green], coverage);
    const result = comparePageSnapshots(before, after);
    assert.equal(result.status, "partial");
    assert.deepEqual(
      result.rows.map(({ status }) => status),
      ["unknown", "unknown", "added"],
    );
    assert.deepEqual(result.rows[0].rolesRemoved, []);
    assert.ok(result.rows.every(({ usage }) => usage === null));
    assert.deepEqual(
      comparePageSnapshots(after, before).rows.map(({ status }) => status),
      ["unknown", "removed", "unknown"],
    );
  }
});

test("usage comparison requires complete valid totals for each category", () => {
  const before = snapshot("a", [red, headline]);
  const after = snapshot("b", [{ ...red, count: 5 }, headline], {
    usageTotals: { colors: 7, fonts: 1 },
  });
  const { rows } = comparePageSnapshots(before, after);
  assert.equal(rows[0].usage, null);
  assert.equal(rows[1].usage.percentagePoints, 0);
  assert.equal(
    comparePageSnapshots(snapshot("empty", []), before).rows[0].usage,
    null,
  );
});

test("page comparison refuses selected clips, different versions and different viewports", () => {
  const before = snapshot("a", [red]);
  assert.equal(
    comparePageSnapshots(before, { ...before, kind: "selected-styles" }).reason,
    "page-snapshots-required",
  );
  assert.equal(
    comparePageSnapshots(before, { ...before, extractionVersion: 1 }).reason,
    "extraction-version",
  );
  assert.equal(
    comparePageSnapshots(
      before,
      snapshot("b", [red], { viewport: { width: 600, height: 900 } }),
    ).reason,
    "viewport",
  );
});
