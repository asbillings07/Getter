export const DEFAULTS = Object.freeze({
  fonts: {
    fontFamily: true,
    fontWeight: true,
    fontSize: true,
    letterSpacing: true,
    lineHeight: true,
    detailed: false,
  },
  colors: { hex: true, buttonColor: true },
  images: { fileSize: true, imageDimensions: true },
});
const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
export function preferences(value) {
  const result = record(value) ? { ...value } : {};
  for (const [group, defaults] of Object.entries(DEFAULTS)) {
    result[group] = { ...(record(result[group]) ? result[group] : {}) };
    for (const [key, fallback] of Object.entries(defaults)) {
      if (typeof result[group][key] !== "boolean")
        result[group][key] = fallback;
    }
  }
  return result;
}
export function legacyKeys(values) {
  const known = [
    "currentResults",
    "hasScriptRunOnPage",
    "currentTab",
    "currentImage",
    "pageRefreshed",
    "debug",
  ];
  return Object.keys(values).filter((key) => {
    if (known.includes(key)) return true;
    if (!/^https?:\/\//.test(key) || !record(values[key])) return false;
    const keys = Object.keys(values[key]);
    return (
      keys.length > 0 &&
      keys.every(
        (name) =>
          (["fonts", "colors", "images"].includes(name) &&
            record(values[key][name])) ||
          (name === "images" && Array.isArray(values[key][name])),
      )
    );
  });
}
export async function migrateStorage(storage) {
  const values = await storage.get(null);
  const normalized = preferences(values.cssGetterOptions);
  await storage.set({ cssGetterOptions: normalized });
  const obsolete = legacyKeys(values);
  if (obsolete.length) await storage.remove(obsolete);
  return normalized;
}
