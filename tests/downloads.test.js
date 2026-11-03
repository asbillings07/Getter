import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import {
  collectImages,
  isSecureImageUrl,
  imageFilename,
  makeZip,
  DownloadTracker,
} from "../src/core/downloads.js";
const images = [
  { src: "https://a.test/a.png" },
  { src: "https://b.test/b.webp" },
];
test("ZIP export preserves formats, deduplicates URLs and omits credentials", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(options);
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: {
        "content-type": url.endsWith("png") ? "image/png" : "image/webp",
      },
    });
  };
  const result = await makeZip([...images, images[0]], { fetcher });
  assert.equal(result.entries.length, 2);
  assert.ok(
    calls.every(
      (c) =>
        c.credentials === "omit" &&
        c.referrerPolicy === "no-referrer" &&
        c.redirect === "error",
    ),
  );
  const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
  assert.deepEqual(Object.keys(zip.files), ["01-a.png", "02-b.webp"]);
});
test("insecure, credential-bearing and non-network image URLs never reach fetch", async () => {
  const rejected = [
    "http://a.test/a.png",
    "https://user:pass@a.test/a.png",
    "data:image/png;base64,AA==",
    "blob:local",
    "javascript:alert(1)",
    "/relative.png",
    "not a url",
  ];
  assert.equal(isSecureImageUrl("https://a.test/a.png"), true);
  assert.ok(rejected.every((url) => !isSecureImageUrl(url)));
  let calls = 0;
  const result = await collectImages(
    rejected.map((src) => ({ src })),
    {
      fetcher: async () => {
        calls++;
        throw Error("Must not request");
      },
    },
  );
  assert.equal(calls, 0);
  assert.equal(result.entries.length, 0);
  assert.equal(result.failed.length, rejected.length);
});
test("streams enforce byte/count bounds; failures and omitted files remain explicit", async () => {
  const limits = { files: 2, fileBytes: 3, totalBytes: 4, fileMs: 100 };
  const result = await collectImages(
    [...images, { src: "https://c.test/c.png" }],
    {
      limits,
      fetcher: async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { "content-type": "image/png" },
        }),
    },
  );
  assert.equal(result.entries.length, 1);
  assert.equal(result.failed.length, 1);
  assert.equal(result.omitted, 1);
  assert.equal(result.bytes, 3);
});
test("unknown formats, HTTP failures and CORS denial do not become successful exports", async () => {
  assert.throws(() => imageFilename("https://a.test/a", "text/html", 0));
  const result = await collectImages(images, {
    fetcher: async () => {
      throw Error("CORS");
    },
  });
  assert.equal(result.entries.length, 0);
  assert.equal(result.failed.length, 2);
  await assert.rejects(
    makeZip(images, { fetcher: async () => new Response("", { status: 403 }) }),
    /No images/,
  );
});
test("cancellation stops before another request", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    collectImages(images, {
      signal: controller.signal,
      fetcher: async () => {
        calls++;
      },
    }),
  );
  assert.equal(calls, 0);
});
test("rejected response bodies are stopped before the next request", async () => {
  for (const responseOptions of [
    { status: 403 },
    { headers: { "content-type": "text/html" } },
    { headers: { "content-type": "image/png", "content-length": "99999" } },
  ]) {
    let previousSignal,
      cancelled = 0,
      calls = 0;
    const result = await collectImages(images, {
      limits: { files: 2, fileBytes: 10, totalBytes: 20, fileMs: 100 },
      fetcher: async (_url, { signal }) => {
        if (previousSignal) {
          assert.equal(previousSignal.aborted, true);
          assert.equal(cancelled, calls);
        }
        previousSignal = signal;
        calls++;
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([1]));
            },
            cancel() {
              cancelled++;
            },
          }),
          responseOptions,
        );
      },
    });
    assert.equal(result.failed.length, 2);
    assert.equal(previousSignal.aborted, true);
    assert.equal(cancelled, 2);
  }
});
function fixture(download = async () => 7) {
  const listeners = new Set(),
    messages = [],
    revoked = [];
  const api = {
    download,
    search: async () => [{ state: "in_progress" }],
    onChanged: {
      addListener: (f) => listeners.add(f),
      removeListener: (f) => listeners.delete(f),
    },
  };
  const t = new DownloadTracker(api, (s) => messages.push(s), {
    revokeObjectURL: (u) => revoked.push(u),
  });
  return {
    t,
    api,
    listeners,
    messages,
    revoked,
    fire: (delta) => [...listeners].forEach((f) => f(delta)),
  };
}
test("download start is separate from completion; owned object URLs are released", async () => {
  const f = fixture();
  await f.t.start("blob:owned", { blob: true });
  assert.deepEqual(f.messages, ["Download started."]);
  assert.deepEqual(f.revoked, []);
  f.fire({ id: 7, state: { current: "complete" } });
  assert.equal(f.messages.at(-1), "Download completed.");
  assert.deepEqual(f.revoked, ["blob:owned"]);
  f.t.dispose();
  assert.equal(f.listeners.size, 0);
  assert.equal(f.revoked.length, 1);
});
test("interrupted/denied download is not reported as completed", async () => {
  const f = fixture();
  await f.t.start("blob:owned", { blob: true });
  f.fire({ id: 7, state: { current: "interrupted" } });
  assert.match(f.messages.at(-1), /interrupted/);
  f.t.dispose();
  const denied = fixture(async () => {
    throw Error("denied");
  });
  await assert.rejects(denied.t.start("blob:owned", { blob: true }));
  assert.deepEqual(denied.revoked, ["blob:owned"]);
  assert.deepEqual(denied.messages, []);
  denied.t.dispose();
});
test("completion racing download acknowledgement is retained", async () => {
  let f;
  f = fixture(async () => {
    f.fire({ id: 7, state: { current: "complete" } });
    return 7;
  });
  await f.t.start("blob:owned", { blob: true });
  assert.equal(f.messages.at(-1), "Download completed.");
  assert.equal(f.t.owned.size, 0);
  f.t.dispose();
});
test("closing while start is pending cleans the late result without publishing state", async () => {
  let resolve;
  const f = fixture(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const pending = f.t.start("blob:owned", { blob: true });
  f.t.dispose();
  resolve(7);
  await pending;
  assert.deepEqual(f.revoked, ["blob:owned"]);
  assert.equal(f.t.owned.size, 0);
  assert.deepEqual(f.messages, []);
});

test("browser downloader accepts only prepared local blobs, including after disposal", async () => {
  let calls = 0;
  const f = fixture(async () => {
    calls++;
    return 7;
  });
  for (const url of [
    "http://a.test/a.png",
    "https://a.test/a.png",
    "data:image/png;base64,AA==",
  ]) {
    await assert.rejects(f.t.start(url));
    await assert.rejects(f.t.start(url, { blob: true }));
  }
  assert.equal(calls, 0);
  f.t.dispose();
  await assert.rejects(f.t.start("blob:late", { blob: true }));
  assert.deepEqual(f.revoked, ["blob:late"]);
});
