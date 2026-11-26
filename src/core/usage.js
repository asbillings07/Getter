export function fontStyleKey(font) {
  return JSON.stringify([
    font.fontFamily,
    font.tag,
    font.fontSize,
    font.fontWeight,
    font.fontStyle || "",
    font.letterSpacing,
    font.lineHeight,
  ]);
}

export function totalUses(items = []) {
  return items.reduce((total, item) => total + item.count, 0);
}

export function usagePercentage(count, total) {
  if (!total || !count) return "0%";
  const percentage = (count / total) * 100;
  return percentage < 0.05 ? "<0.1%" : `${percentage.toFixed(1)}%`;
}

export function sortByUsage(items = [], direction = "most") {
  return [...items].sort(
    (a, b) =>
      (direction === "least" ? a.count - b.count : b.count - a.count) ||
      (a.value || fontStyleKey(a)).localeCompare(b.value || fontStyleKey(b)),
  );
}

export function displayedFonts(fonts = [], detailed, direction) {
  // Pick the most-used style for each element type before changing display order.
  // Toggling sort must reorder the same cards, not select different styles.
  const ranked = sortByUsage(fonts);
  const seen = new Set();
  return sortByUsage(
    detailed
      ? ranked
      : ranked.filter(({ tag }) => {
          if (seen.has(tag)) return false;
          seen.add(tag);
          return true;
        }),
    direction,
  );
}
