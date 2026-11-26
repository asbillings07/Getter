import {
  collectImages,
  EXPORT_LIMITS,
  imageFilename,
} from "../core/downloads.js";

const rasterTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
]);
const usableType = (type) => rasterTypes.has(type);

async function verifyImage(blob) {
  try {
    const bitmap = await createImageBitmap(blob, {
      resizeWidth: 32,
      resizeHeight: 32,
    });
    bitmap.close();
    return blob;
  } catch {
    throw Error(
      "This image could not be decoded. Choose another image to save.",
    );
  }
}

export async function websiteImages(candidates, { signal } = {}) {
  if (!candidates.length) return [];
  if (candidates.length > EXPORT_LIMITS.files)
    throw Error(`Select at most ${EXPORT_LIMITS.files} images at a time.`);
  const result = await collectImages(candidates, { signal });
  const failed = new Set(result.failed);
  const images = [];
  let received = 0;
  for (const [index, candidate] of candidates.entries()) {
    if (failed.has(index)) continue;
    signal?.throwIfAborted();
    const entry = result.entries[received++];
    try {
      if (!entry || !usableType(entry.type)) throw Error();
      const { data, type, filename } = entry;
      images.push({
        type: "image",
        name: (candidate.name || filename).slice(0, 60),
        width: candidate.width,
        height: candidate.height,
        filename,
        blob: await verifyImage(new Blob([data], { type })),
      });
    } catch {
      failed.add(index);
    }
  }
  if (failed.size) {
    const error = Error(
      "An image couldn’t be loaded as a supported HTTPS image. Choose another image or add a local copy.",
    );
    error.unavailableImages = [...failed].map((index) => candidates[index].src);
    throw error;
  }
  return images;
}

export async function localImage(file) {
  if (
    !usableType(file.type) ||
    !file.size ||
    file.size > EXPORT_LIMITS.fileBytes
  )
    throw Error(
      "Choose a PNG, JPEG, WebP, GIF, AVIF, or BMP image under 8 MB.",
    );
  const filename = imageFilename(
    `https://local.invalid/${encodeURIComponent(file.name)}`,
    file.type,
    0,
  );
  return {
    type: "image",
    name: file.name.slice(0, 60),
    filename,
    blob: await verifyImage(file.slice(0, file.size, file.type)),
  };
}
