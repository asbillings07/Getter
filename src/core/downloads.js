import JSZip from "jszip";
export const EXPORT_LIMITS = Object.freeze({
  files: 40,
  fileBytes: 8 * 1024 * 1024,
  totalBytes: 32 * 1024 * 1024,
  fileMs: 8000,
  totalMs: 60000,
});
export function imageFilename(url, type, index) {
  const ext = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/x-icon": "ico",
  }[type];
  if (!ext) throw new Error("Unsupported image format");
  let name;
  try {
    name = decodeURIComponent(new URL(url).pathname.split("/").pop()).replace(
      /\.[^.]*$/,
      "",
    );
  } catch {
    name = "image";
  }
  name = (name || "image").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 70);
  return `${String(index + 1).padStart(2, "0")}-${name}.${ext}`;
}
export async function collectImages(
  images,
  {
    fetcher = fetch,
    signal,
    limits = EXPORT_LIMITS,
    onProgress = () => {},
  } = {},
) {
  const entries = [],
    failed = [];
  const chosen = [
    ...new Map(images.map((img) => [img.src, img])).values(),
  ].slice(0, limits.files);
  let bytes = 0;
  // Sequential streaming bounds simultaneous network and memory usage to one file.
  for (const [index, img] of chosen.entries()) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const combined = signal
      ? AbortSignal.any([signal, controller.signal])
      : controller.signal;
    const timeout = setTimeout(
      () => controller.abort(new Error("Image timed out")),
      limits.fileMs,
    );
    let reader, response;
    try {
      if (!/^https?:\/\//i.test(img.src))
        throw new Error("Unsupported image address");
      response = await fetcher(img.src, {
        signal: combined,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
      });
      if (!response.ok || !response.body) throw new Error("Image unavailable");
      const type = (response.headers.get("content-type") || "")
        .split(";")[0]
        .toLowerCase();
      const filename = imageFilename(img.src, type, index);
      if (
        Number(response.headers.get("content-length")) >
        Math.min(limits.fileBytes, limits.totalBytes - bytes)
      )
        throw new Error("Image exceeds export limit");
      reader = response.body.getReader();
      const chunks = [];
      let length = 0;
      while (true) {
        const part = await reader.read();
        combined.throwIfAborted();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > limits.fileBytes || bytes + length > limits.totalBytes)
          throw new Error("Image exceeds export limit");
        chunks.push(part.value);
      }
      const data = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        data.set(chunk, offset);
        offset += chunk.length;
      }
      entries.push({ filename, data });
      bytes += length;
    } catch {
      signal?.throwIfAborted();
      failed.push(index);
    } finally {
      // Header/MIME failures occur before a reader is acquired. Stop those bodies too.
      controller.abort();
      clearTimeout(timeout);
      if (reader) {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      } else {
        await response?.body?.cancel().catch(() => {});
      }
    }
    onProgress({ done: index + 1, total: chosen.length });
  }
  return {
    entries,
    failed,
    omitted: Math.max(0, images.length - chosen.length),
    bytes,
  };
}
export async function makeZip(images, options = {}) {
  const result = await collectImages(images, options);
  options.signal?.throwIfAborted();
  if (!result.entries.length)
    throw new Error(
      "No images could be included. Try individual downloads; some hosts block ZIP fetching.",
    );
  const zip = new JSZip();
  for (const entry of result.entries) zip.file(entry.filename, entry.data);
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  options.signal?.throwIfAborted();
  return { ...result, blob };
}
export class DownloadTracker {
  constructor(api, notify, urlApi = URL) {
    this.api = api;
    this.notify = notify;
    this.urls = urlApi;
    this.owned = new Map();
    this.early = new Map();
    this.pending = 0;
    this.disposed = false;
    this.changed = (delta) => this.handle(delta);
    api.onChanged.addListener(this.changed);
  }
  handle(delta) {
    if (!this.owned.has(delta.id)) {
      if (
        this.pending &&
        ["complete", "interrupted"].includes(delta.state?.current)
      ) {
        if (this.early.size >= 32)
          this.early.delete(this.early.keys().next().value);
        this.early.set(delta.id, delta);
      }
      return;
    }
    const state = delta.state?.current;
    if (!["complete", "interrupted"].includes(state)) return;
    const item = this.owned.get(delta.id);
    clearTimeout(item.timer);
    if (item.blob) this.urls.revokeObjectURL(item.url);
    this.owned.delete(delta.id);
    if (!this.disposed)
      this.notify(
        state === "complete"
          ? "Download completed."
          : "Download interrupted. Check your browser downloads.",
      );
  }
  async start(url, { blob = false, filename } = {}) {
    if (this.disposed) throw new Error("Getter is closed");
    if (!blob && !/^https?:\/\//i.test(url))
      throw new Error("This image address cannot be downloaded.");
    this.pending++;
    try {
      const id = await this.api.download({
        url,
        saveAs: true,
        conflictAction: "uniquify",
        ...(filename ? { filename } : {}),
      });
      if (!Number.isInteger(id)) throw new Error("Download did not start");
      if (this.disposed) {
        if (blob) this.urls.revokeObjectURL(url);
        return id;
      }
      const timer = setTimeout(() => {
        const item = this.owned.get(id);
        if (item) {
          if (item.blob) this.urls.revokeObjectURL(item.url);
          this.owned.delete(id);
          if (!this.disposed)
            this.notify(
              "Download status is unknown. Check your browser downloads.",
            );
        }
      }, 120000);
      this.owned.set(id, { url, blob, timer });
      if (!this.disposed) this.notify("Download started.");
      if (this.early.has(id)) {
        this.handle(this.early.get(id));
        this.early.delete(id);
      } else {
        try {
          const [item] = await this.api.search({ id });
          if (item) this.handle({ id, state: { current: item.state } });
        } catch {
          /* Starting is confirmed; completion remains unconfirmed. */
        }
      }
      return id;
    } catch (error) {
      if (blob) this.urls.revokeObjectURL(url);
      throw error;
    } finally {
      this.pending--;
      if (!this.pending) this.early.clear();
    }
  }
  dispose() {
    this.disposed = true;
    this.api.onChanged.removeListener(this.changed);
    for (const item of this.owned.values()) {
      clearTimeout(item.timer);
      if (item.blob) this.urls.revokeObjectURL(item.url);
    }
    this.owned.clear();
    this.early.clear();
  }
}
