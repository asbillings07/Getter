import assert from "node:assert/strict";
import test from "node:test";
import {
  addCapture,
  fingerprint,
  mergeAssets,
  moveAsset,
  upgradeProject,
} from "../src/studio/library.js";
import {
  adobeExport,
  cssExport,
  figmaExport,
  includesAsset,
  namedItems,
  srgb,
} from "../src/studio/exports.js";
import { safeStyleValue } from "../src/studio/inspect.js";

const red = {
  type: "color",
  value: "rgb(255, 0, 0)",
  count: 3,
  kinds: ["Text"],
};
const blue = { ...red, value: "rgb(0, 0, 255)" };
const capture = (id, items) => ({
  id,
  scanId: id,
  kind: "selected-styles",
  source: { hostname: id + ".example" },
  savedAt: "2026-11-24T13:00:00.000Z",
  items,
});

test("old Studio saves up-convert to independent assets without changing capture values", () => {
  const original = {
    schemaVersion: 1,
    id: "p",
    collection: {
      id: "c",
      name: "Palette",
      captures: [capture("old", [red, blue])],
    },
  };
  const project = upgradeProject(original);
  const collection = project.collections[0];
  assert.equal(collection.id, "c");
  assert.equal(collection.assets.length, 2);
  assert.deepEqual(collection.assets[0].sources, [
    { captureId: "old", index: 0 },
  ]);
  collection.assets[0].name = "Primary";
  collection.assets[0].color = "#fc0000";
  assert.deepEqual(collection.captures[0].items, [red, blue]);
  assert.equal(original.schemaVersion, 1);
});

test("capture retries and exact merge retain sources and earlier versions", () => {
  const collection = { captures: [], assets: [] };
  assert.equal(addCapture(collection, capture("page-a", [red, blue])), false);
  assert.equal(addCapture(collection, capture("page-a", [red, blue])), true);
  const revision = { ...capture("page-b", [red]), previousId: "page-a" };
  assert.equal(addCapture(collection, revision), false);
  assert.equal(
    fingerprint(collection.assets[0]),
    fingerprint(collection.assets[2]),
  );
  assert.throws(
    () => mergeAssets(collection, "page-a:1", "page-b:0"),
    /matching/,
  );
  mergeAssets(collection, "page-a:0", "page-b:0");
  assert.equal(collection.assets[0].sources.length, 2);
  assert.ok(collection.assets[2].removedAt);
  assert.equal(collection.captures[1].previousId, "page-a");
  moveAsset(collection, "page-a:1", -1);
  assert.equal(collection.assets[0].id, "page-a:1");
});

test("export formats retain supported values and keep established color names independent", () => {
  const items = namedItems([
    { name: "Brand", value: red },
    { name: "Brand", value: blue, color: "#0080ff80" },
    {
      name: "Typography",
      value: { type: "font", fontFamily: "Georgia", fontSize: "32px" },
    },
  ]);
  assert.deepEqual(
    items.map(({ key }) => key),
    ["brand", "brand-2", "typography"],
  );
  assert.match(cssExport(items), /--getter-color-brand-2: #0080ff80/);
  assert.match(cssExport(items), /--getter-type-typography-font-size: 32px/);
  assert.deepEqual(figmaExport(items)["brand-2"].$value, srgb("#0080ff80"));
  assert.equal(figmaExport(items).typography.$value, "Georgia");
  assert.equal(includesAsset("adobe", items[1]), false);
  assert.equal(srgb("oklch(0.7 0.1 400)"), null);

  const bytes = new DataView(adobeExport([items[0]]));
  assert.equal(bytes.getUint32(0), 0x41534546);
  assert.equal(bytes.getUint16(4), 1);
  assert.equal(bytes.getUint32(8), 1);
  assert.equal(bytes.getUint16(12), 1);
  assert.equal(bytes.getUint32(14), bytes.byteLength - 18);
  assert.equal(bytes.getUint32(20 + ("Brand".length + 1) * 2), 0x52474220);
  assert.equal(bytes.getFloat32(bytes.byteLength - 14), 1);
});

test("styles that could fetch resources or escape a declaration are excluded", () => {
  for (const value of [
    "url(https://example.com/a)",
    '-webkit-image-set("https://example.com" 1x)',
    "red; width:1px",
    "var(--color)",
    "u\\72l(a)",
  ])
    assert.equal(safeStyleValue(value), false);
  for (const value of [
    "oklch(0.3 0.2 100)",
    "0 3px 4px rgba(0, 0, 0, 0.2)",
    '"Open Sans", sans-serif',
  ])
    assert.equal(safeStyleValue(value), true);
});
