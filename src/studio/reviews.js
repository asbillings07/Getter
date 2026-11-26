import { transact } from "./projects.js";
import { websiteAddress } from "./sources.js";

const reviews = (mode, operation) => transact(mode, operation, "reviews");

export const sampleFrame = {
  kind: "sample-figma",
  name: "Product card · Sample Figma frame",
};

export const sampleScreenshot = {
  kind: "sample-screenshot",
  name: "Product card · Sample screenshot",
  width: 320,
  height: 176,
};

export const sampleLayers = [
  {
    id: "24:80",
    name: "Product card",
    type: "Frame",
    values: {
      "background-color": "rgb(255, 255, 255)",
      "border-top-left-radius": "16px",
      "padding-top": "24px",
    },
  },
  {
    id: "24:81",
    name: "Product card / Heading",
    type: "Text",
    values: {
      color: "rgb(27, 43, 36)",
      "font-size": "24px",
      "font-weight": "600",
      "line-height": "32px",
    },
  },
  {
    id: "24:82",
    name: "Product card / Shop now",
    type: "Button",
    values: {
      "background-color": "rgb(23, 105, 83)",
      color: "rgb(255, 255, 255)",
      "border-top-left-radius": "12px",
      "padding-top": "12px",
    },
  },
];

export function figmaReference(value) {
  try {
    const url = new URL(value.trim());
    const node = url.searchParams.get("node-id");
    if (
      url.protocol !== "https:" ||
      !["www.figma.com", "figma.com"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port ||
      !/^\/(design|file)\/[A-Za-z0-9]+(?:\/|$)/.test(url.pathname) ||
      !/^\d+[-:]\d+$/.test(node ?? "") ||
      value.length > 400
    )
      throw Error();
    return {
      kind: "figma",
      name: `Figma frame ${node}`,
      link: `${url.origin}${url.pathname}?node-id=${encodeURIComponent(node)}`,
    };
  } catch {
    throw Error("Paste a Figma Design link with a frame selected (node-id).");
  }
}

const screenshotTypes = ["image/png", "image/jpeg", "image/webp"];

export async function screenshotReference(file) {
  if (
    !screenshotTypes.includes(file.type) ||
    !file.size ||
    file.size > 10 * 1024 * 1024
  )
    throw Error("Choose a PNG, JPG, or WebP screenshot up to 10 MB.");

  try {
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width * bitmap.height > 32000000) throw Error();
      // Keep only raster pixels. The selected filename is used as plain text.
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      canvas.getContext("2d").drawImage(bitmap, 0, 0);
      const blob = await canvas.convertToBlob({
        type: "image/webp",
        quality: 1,
      });
      return {
        kind: "screenshot",
        name: file.name.slice(0, 100),
        width: bitmap.width,
        height: bitmap.height,
        blob,
      };
    } finally {
      bitmap.close();
    }
  } catch {
    throw Error("This screenshot could not be opened. Choose another image.");
  }
}

export function compareLayer(layer, snapshot) {
  return Object.entries(layer.values).map(([property, expected]) => {
    const observed = snapshot.css[property] || null;
    return {
      property,
      expected,
      observed,
      status:
        observed === null
          ? "Unavailable"
          : observed === expected
            ? "Matches"
            : "Different",
    };
  });
}

export function reviewSiteMatches(expected, observed) {
  try {
    return websiteAddress(expected).href === websiteAddress(observed).href;
  } catch {
    return false;
  }
}

export function listReviews() {
  return reviews("readonly", (store, finish) => {
    const request = store.getAll();
    request.onsuccess = () =>
      finish(
        request.result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
  });
}

export function getReview(id) {
  return reviews("readonly", (store, finish) => {
    const request = store.get(id);
    request.onsuccess = () => finish(request.result);
  });
}

export function createReview(fields) {
  return reviews("readwrite", (store, finish) => {
    const record = {
      ...fields,
      id: crypto.randomUUID(),
      referenceRevision: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    store.add(record);
    finish(record);
  });
}

export function changeReview(id, revision, update) {
  return reviews("readwrite", (store, finish, abort) => {
    const request = store.get(id);
    request.onsuccess = () => {
      try {
        const current = request.result;
        if (!current || current.referenceRevision !== revision)
          throw Error(
            "The review reference changed. Reopen the review to continue.",
          );
        const record = {
          ...current,
          ...update(current),
          updatedAt: new Date().toISOString(),
        };
        store.put(record);
        finish(record);
      } catch (error) {
        abort(error);
      }
    };
  });
}

export function replaceReviewReference(review, reference) {
  return changeReview(review.id, review.referenceRevision, () => ({
    reference,
    referenceRevision: crypto.randomUUID(),
    match: null,
    area: null,
    visualNote: "",
  }));
}
