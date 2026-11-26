import { colorLabel } from "../core/extract.js";

export const collectionLabels = {
  colors: "Save palette to collection",
  fonts: "Save all typography to collection",
  images: "Save all images to collection",
  text: "Save all text to collection",
};

export const assetKinds = {
  color: "Colors",
  font: "Typography",
  image: "Images",
  text: "Text",
  element: "Element styles",
  component: "Components",
  effect: "Effects",
  motion: "Motion",
};

export function assetName(item) {
  if (item.name) return item.name;
  if (item.type === "color") return colorLabel(item.value);
  if (item.type === "font") return `${item.fontFamily} · ${item.tag}`;
  return assetKinds[item.type];
}

export function styleAsset(capture, item, index) {
  const { count, kinds, ...value } = item;
  return {
    id: `${capture.id}:${index}`,
    name: assetName(item),
    role: "",
    notes: "",
    value,
    sources: [{ captureId: capture.id, index }],
  };
}

export function newCollection(name) {
  return { id: crypto.randomUUID(), name, notes: "", captures: [], assets: [] };
}

export function upgradeProject(project) {
  if (project.schemaVersion === 2) return project;
  if (project.schemaVersion !== 1 || !project.collection)
    throw Error("This version of Getter cannot read the project.");
  const { collection, ...rest } = project;
  return {
    ...rest,
    schemaVersion: 2,
    collections: [
      {
        ...collection,
        notes: "",
        assets: collection.captures.flatMap((capture) =>
          capture.items.map((item, index) => styleAsset(capture, item, index)),
        ),
      },
    ],
  };
}

export function addCapture(collection, capture) {
  const duplicate = collection.captures.some(
    (saved) =>
      saved.id === capture.id ||
      (saved.scanId === capture.scanId &&
        saved.kind === capture.kind &&
        saved.previousId === capture.previousId &&
        JSON.stringify(saved.selection) === JSON.stringify(capture.selection) &&
        JSON.stringify(saved.items) === JSON.stringify(capture.items) &&
        JSON.stringify(saved.source) === JSON.stringify(capture.source)),
  );
  if (duplicate) return true;
  if (
    capture.previousId &&
    !collection.captures.some((saved) => saved.id === capture.previousId)
  )
    throw Error("The previous capture is unavailable.");
  collection.captures.push(capture);
  const reuseColors = capture.kind === "palette" || capture.kind === "color";
  const sameScan = reuseColors
    ? new Set(
        collection.captures
          .filter(
            ({ scanId, id }) => scanId === capture.scanId && id !== capture.id,
          )
          .map(({ id }) => id),
      )
    : null;
  capture.items.forEach((item, index) => {
    const asset = styleAsset(capture, item, index);
    const existing =
      sameScan &&
      item.type === "color" &&
      collection.assets.find(
        ({ value, color, removedAt, sources }) =>
          !removedAt &&
          !color &&
          value.type === "color" &&
          value.value === item.value &&
          sources.some(({ captureId }) => sameScan.has(captureId)),
      );
    if (existing) existing.sources.push(...asset.sources);
    else collection.assets.push(asset);
  });
  return false;
}

export function savedAsset(collection, id) {
  const asset = collection.assets.find((entry) => entry.id === id);
  if (!asset) throw Error("This item is unavailable. Reopen the collection.");
  return asset;
}

export function fingerprint(asset) {
  const value = asset.value;
  if (value.type === "color")
    return JSON.stringify([value.type, asset.color || value.value]);
  if (value.type === "font")
    return JSON.stringify([
      value.type,
      value.fontFamily,
      value.fontSize,
      value.fontWeight,
      value.fontStyle,
      value.lineHeight,
      value.letterSpacing,
    ]);
  return null;
}

export function mergeAssets(collection, targetId, sourceId) {
  const target = savedAsset(collection, targetId);
  const source = savedAsset(collection, sourceId);
  if (
    target === source ||
    target.removedAt ||
    source.removedAt ||
    !fingerprint(target) ||
    fingerprint(target) !== fingerprint(source)
  )
    throw Error("These items no longer have matching values.");
  // The removed entry retains its own details and can be restored.
  for (const ref of source.sources) {
    if (
      !target.sources.some(
        (entry) =>
          entry.captureId === ref.captureId && entry.index === ref.index,
      )
    )
      target.sources.push(ref);
  }
  source.removedAt = new Date().toISOString();
}

export function moveAsset(collection, id, step) {
  const item = savedAsset(collection, id);
  const active = collection.assets.filter((asset) => !asset.removedAt);
  const neighbor = active[active.indexOf(item) + step];
  if (!neighbor || item.removedAt) return;
  const from = collection.assets.indexOf(item);
  const to = collection.assets.indexOf(neighbor);
  [collection.assets[from], collection.assets[to]] = [
    collection.assets[to],
    collection.assets[from],
  ];
}

export function cleanName(value, max = 60) {
  const name = value.trim();
  if (!name || name.length > max)
    throw Error(`Enter a name of up to ${max} characters.`);
  return name;
}
