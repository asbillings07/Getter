import { fontStyleKey, totalUses } from "../core/usage.js";

function captureDetails({ id, source, savedAt, extractionVersion, coverage }) {
  return { id, source, savedAt, extractionVersion, coverage };
}

function compatibleViewport(before, after) {
  return (
    Number.isInteger(before?.width) &&
    Number.isInteger(before?.height) &&
    before.width > 0 &&
    before.height > 0 &&
    before.width === after?.width &&
    before.height === after?.height
  );
}

function completeCoverage({ coverage }) {
  return (
    coverage?.limited === false &&
    coverage.framesOmitted === 0 &&
    coverage.longValuesOmitted === 0
  );
}

function usageTotal(capture, items, category, complete) {
  const total = capture.coverage.usageTotals?.[category];
  return complete &&
    Number.isSafeInteger(total) &&
    total > 0 &&
    items.every(({ count }) => Number.isSafeInteger(count) && count > 0) &&
    total === totalUses(items)
    ? total
    : null;
}

function compareCategory(before, after, type, complete) {
  const category = type === "color" ? "colors" : "fonts";
  const keyFor = type === "color" ? (item) => item.value : fontStyleKey;
  const beforeItems = before.items.filter((item) => item.type === type);
  const afterItems = after.items.filter((item) => item.type === type);
  const beforeByKey = new Map(beforeItems.map((item) => [keyFor(item), item]));
  const afterByKey = new Map(afterItems.map((item) => [keyFor(item), item]));
  const beforeTotal = usageTotal(
    before,
    beforeItems,
    category,
    complete.before,
  );
  const afterTotal = usageTotal(after, afterItems, category, complete.after);
  const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);

  return [...keys].map((key) => {
    const previous = beforeByKey.get(key) ?? null;
    const current = afterByKey.get(key) ?? null;
    const usage =
      beforeTotal && afterTotal
        ? {
            beforeTotal,
            afterTotal,
            percentagePoints:
              (((current?.count ?? 0) * beforeTotal -
                (previous?.count ?? 0) * afterTotal) /
                (beforeTotal * afterTotal)) *
              100,
          }
        : null;
    const beforeRoles = previous?.kinds ?? [];
    const afterRoles = current?.kinds ?? [];
    // A missing role is conclusive only on the side with complete coverage.
    const rolesAdded = complete.before
      ? afterRoles.filter((role) => !beforeRoles.includes(role))
      : [];
    const rolesRemoved = complete.after
      ? beforeRoles.filter((role) => !afterRoles.includes(role))
      : [];

    let status = "unchanged";
    if (!previous) status = complete.before ? "added" : "unknown";
    else if (!current) status = complete.after ? "removed" : "unknown";
    else if (
      rolesAdded.length ||
      rolesRemoved.length ||
      usage?.percentagePoints
    )
      status = "changed";
    else if (
      beforeRoles.some((role) => !afterRoles.includes(role)) ||
      afterRoles.some((role) => !beforeRoles.includes(role))
    )
      status = "unknown";

    return {
      type,
      key,
      status,
      before: previous,
      after: current,
      rolesAdded,
      rolesRemoved,
      usage,
    };
  });
}

export function comparePageSnapshots(before, after) {
  if (
    ![before, after].every(
      (capture) =>
        capture?.kind === "page-styles" && Array.isArray(capture.items),
    )
  )
    return { status: "incompatible", reason: "page-snapshots-required" };

  const details = {
    before: captureDetails(before),
    after: captureDetails(after),
  };
  if (
    !Number.isInteger(before.extractionVersion) ||
    before.extractionVersion < 1 ||
    before.extractionVersion !== after.extractionVersion
  )
    return { ...details, status: "incompatible", reason: "extraction-version" };
  if (!compatibleViewport(before.coverage?.viewport, after.coverage?.viewport))
    return { ...details, status: "incompatible", reason: "viewport" };

  const complete = {
    before: completeCoverage(before),
    after: completeCoverage(after),
  };
  return {
    ...details,
    status: complete.before && complete.after ? "ready" : "partial",
    complete,
    rows: [
      ...compareCategory(before, after, "color", complete),
      ...compareCategory(before, after, "font", complete),
    ],
  };
}
