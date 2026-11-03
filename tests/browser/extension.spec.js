import { test, expect, chromium } from "@playwright/test";
import { createServer } from "node:http";
import { cp, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
let server, origin;
let insecureHits = 0;
const imageOrigin = "https://images.fixture.test";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
  "base64",
);
test.beforeAll(async () => {
  server = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === "/insecure-leak.png") {
      insecureHits++;
      res.setHeader("Content-Type", "image/png");
      res.end(png);
      return;
    }
    if (req.url === "/denied.png") {
      res.writeHead(403);
      res.end("Unavailable fixture");
      return;
    }
    if (req.url === "/image.png") {
      res.setHeader("Content-Type", "image/png");
      res.end(png);
      return;
    }
    if (req.url === "/frame") {
      res.setHeader("Content-Type", "text/html");
      res.end('<p style="color:rgb(10,20,30)">Frame text</p>');
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<!doctype html><html><head><title>Synthetic Getter fixture</title></head><body style="color:rgb(18,52,86);background:white;font-family:Arial"><h1 id="unchanged" style="font-family:Georgia;font-size:32px">A test page</h1><p>Visible text</p><img alt="Sample image" src="${imageOrigin}/image.png" width="80" height="80"><iframe src="/frame"></iframe><iframe src="${origin.replace("127.0.0.1", "localhost")}/frame"></iframe><iframe sandbox src="/frame"></iframe></body></html>`,
    );
  });
  await new Promise((resolve) => server.listen(0, "0.0.0.0", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => {
  server?.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});
async function launch(testInfo, { staleImageRace = false } = {}) {
  const extension = testInfo.outputPath("extension");
  await mkdir(extension, { recursive: true });
  await cp("dist", extension, { recursive: true });
  const manifest = JSON.parse(
    await readFile(path.join(extension, "manifest.json"), "utf8"),
  );
  // Test-only grants let an inactive popup exercise real injection against owned fixtures.
  // The shipping manifest is checked separately and has NO host permissions.
  manifest.host_permissions = ["http://127.0.0.1/*", "http://localhost/*"];
  await writeFile(
    path.join(extension, "manifest.json"),
    JSON.stringify(manifest),
  );
  const context = await chromium.launchPersistentContext(
    testInfo.outputPath("profile"),
    {
      channel: "chromium",
      headless: true,
      acceptDownloads: true,
      downloadsPath: testInfo.outputPath("downloads"),
      args: [
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
      ],
    },
  );
  // HTTPS fixture routes exercise browser URL/CSP/redirect behavior without
  // depending on a public host. Fulfilment is synthetic, not a TLS-server test.
  await context.route(`${imageOrigin}/**`, async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const headers = {
      "access-control-allow-origin": "*",
      "content-type": "image/png",
    };
    if (pathname === "/redirect.png") {
      await route.fulfill({
        status: 302,
        headers: { ...headers, location: `${origin}/insecure-leak.png` },
        body: "",
      });
    } else if (pathname === "/denied.png") {
      await route.fulfill({ status: 403, headers, body: "Unavailable" });
    } else {
      await route.fulfill({ status: 200, headers, body: png });
    }
  });
  if (staleImageRace) {
    await context.addInitScript(() => {
      if (!globalThis.chrome?.tabs) return;
      const add = chrome.tabs.onUpdated.addListener.bind(chrome.tabs.onUpdated);
      chrome.tabs.onUpdated.addListener = (listener) => {
        window.invalidateScanForTest = (id) =>
          listener(id, { status: "loading" });
        add(listener);
      };
      const fetchImage = window.fetch.bind(window);
      window.fetch = (url, options) =>
        String(url).startsWith("https://images.fixture.test/")
          ? new Promise((resolve) => {
              window.releaseImageForTest = () =>
                resolve(
                  new Response(new Uint8Array([1, 2, 3]), {
                    headers: { "content-type": "image/png" },
                  }),
                );
            })
          : fetchImage(url, options);
      window.imageSaveAttempts = { objectUrls: 0, downloads: 0 };
      const create = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob) => {
        window.imageSaveAttempts.objectUrls++;
        return create(blob);
      };
      const download = chrome.downloads.download.bind(chrome.downloads);
      chrome.downloads.download = (options) => {
        window.imageSaveAttempts.downloads++;
        return download(options);
      };
    });
  }
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent("serviceworker");
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(origin);
  await page.bringToFront();
  await page.waitForLoadState("networkidle");
  const before = await page.locator("html").evaluate((el) => el.outerHTML);
  const openPopup = async () => {
    const newPage = context.waitForEvent("page");
    await worker.evaluate(
      (url) => chrome.tabs.create({ url, active: false }),
      `chrome-extension://${id}/popup.html`,
    );
    const popup = await newPage;
    await popup.waitForLoadState();
    return popup;
  };
  return { context, worker, page, before, openPopup };
}
test("production UI scans fixtures without altering the page and retains approved branding", async ({}, info) => {
  const app = await launch(info);
  try {
    const popup = await app.openPopup();
    const errors = [];
    popup.on("pageerror", (error) => errors.push(error.message));
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await expect(
      popup.getByRole("button", { name: "Copy #123456", exact: true }),
    ).toBeVisible();
    await expect(
      popup.getByText("Created by Aptelum Labs", { exact: true }),
    ).toBeVisible();
    expect(await app.page.locator("html").evaluate((el) => el.outerHTML)).toBe(
      app.before,
    );
    await expect(
      popup.getByText(/embedded frame\(s\) were not included/),
    ).toBeVisible();
    await popup.getByRole("button", { name: "Fonts", exact: true }).click();
    await expect(popup.getByText("Georgia", { exact: true })).toBeVisible();
    await popup.getByRole("button", { name: "Settings", exact: true }).click();
    await popup.getByLabel("Font size", { exact: true }).uncheck();
    await expect(
      popup.getByText("Preference saved.", { exact: true }),
    ).toBeVisible();
    await popup.close();
    const reopened = await app.openPopup();
    await reopened
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await expect(
      reopened.getByLabel("Font size", { exact: true }),
    ).not.toBeChecked();
    await reopened
      .getByRole("button", { name: "About Getter", exact: true })
      .click();
    await expect(
      reopened.getByText("Created by Aptelum Labs.", { exact: true }),
    ).toBeVisible();
    await expect(
      reopened.getByRole("link", { name: "Contact support", exact: true }),
    ).toHaveAttribute("href", "mailto:support@aptelum.com");
    await expect(
      reopened.getByRole("link", { name: "Privacy notice", exact: true }),
    ).toHaveAttribute(
      "href",
      "https://github.com/asbillings07/Getter/blob/main/PRIVACY.md",
    );
    const stored = await app.worker.evaluate(() =>
      chrome.storage.local.get(null),
    );
    expect(Object.keys(stored)).toEqual(["cssGetterOptions"]);
    expect(errors).toEqual([]);
  } finally {
    await app.context.close();
  }
});
test("images load only on request; ZIP has a real download outcome", async ({}, info) => {
  const app = await launch(info);
  try {
    const popup = await app.openPopup();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.getByRole("button", { name: "Images", exact: true }).click();
    await expect(popup.getByText("Preview off", { exact: true })).toBeVisible();
    await popup.getByLabel("Load previews", { exact: true }).check();
    await expect(
      popup.getByRole("img", { name: "Sample image", exact: true }),
    ).toBeVisible();
    await popup
      .getByRole("button", { name: "Read file size", exact: true })
      .click();
    await expect(popup.getByText(/KiB/)).toBeVisible();
    // Observe, without replacing, the real download API call. Playwright's
    // allowAndName policy controls disk names and bypasses the native Save As UI.
    await popup.evaluate(() => {
      const original = chrome.downloads.download.bind(chrome.downloads);
      window.downloadRequests = [];
      chrome.downloads.download = (options) => {
        window.downloadRequests.push(options);
        return original(options);
      };
    });
    const imageDownloadEvent = popup.waitForEvent("download");
    await popup.getByRole("button", { name: "Download", exact: true }).click();
    const imageDownload = await imageDownloadEvent;
    expect(await imageDownload.failure()).toBeNull();
    expect(await readFile(await imageDownload.path())).toEqual(png);
    const requests = await popup.evaluate(() => window.downloadRequests);
    expect(requests).toEqual([
      expect.objectContaining({
        url: expect.stringMatching(/^blob:/),
        filename: "01-image.png",
        saveAs: true,
      }),
    ]);
    await popup.evaluate(() => {
      window.downloadRequests = [];
    });
    await popup
      .getByRole("button", { name: "Download ZIP", exact: true })
      .click();
    await popup
      .getByRole("button", { name: "Prepare ZIP", exact: true })
      .click();
    await expect(
      popup.getByText(
        "1 image(s) included; 0 unavailable; 0 beyond the export limit.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(await popup.evaluate(() => window.downloadRequests)).toEqual([]);
    const downloadEvent = popup.waitForEvent("download");
    await popup.getByRole("button", { name: "Save ZIP", exact: true }).click();
    const download = await downloadEvent;
    expect(await download.failure()).toBeNull();
    expect(await popup.evaluate(() => window.downloadRequests)).toEqual([
      expect.objectContaining({ filename: "getter-images.zip", saveAs: true }),
    ]);
    const zip = await JSZip.loadAsync(await readFile(await download.path()));
    expect(Object.keys(zip.files)).toEqual(["01-image.png"]);
    expect(await zip.file("01-image.png").async("nodebuffer")).toEqual(png);
    await expect(
      popup.getByText("Download completed.", { exact: true }),
    ).toBeVisible();
  } finally {
    await app.context.close();
  }
});
test("roomier popup keeps labeled Settings and preferences visible in both appearances", async ({}, info) => {
  const app = await launch(info);
  try {
    const popup = await app.openPopup();
    await popup.setViewportSize({ width: 720, height: 600 });
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    for (const colorScheme of ["light", "dark"]) {
      await popup.emulateMedia({ colorScheme });
      const settings = popup.getByRole("button", {
        name: "Settings",
        exact: true,
      });
      // A label in the accessibility tree alone would not fix the owner's concern.
      await expect(settings).toContainText("Settings");
      await expect(popup.locator(".product-mark")).toHaveJSProperty(
        "naturalWidth",
        48,
      );
      await settings.click();
      await expect(settings).toHaveAttribute("aria-pressed", "true");
      const bounds = await popup.evaluate(() => {
        const main = document.querySelector("main").getBoundingClientRect();
        const preferences = [...document.querySelectorAll(".setting")].map(
          (el) => el.getBoundingClientRect(),
        );
        return {
          width: document.body.getBoundingClientRect().width,
          height: document.querySelector(".window").getBoundingClientRect()
            .height,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
          visiblePreferences: preferences.filter(
            (rect) => rect.top >= main.top && rect.bottom <= main.bottom,
          ).length,
          preferenceCount: preferences.length,
        };
      });
      expect(bounds).toEqual({
        width: 720,
        height: 600,
        horizontalOverflow: false,
        visiblePreferences: 10,
        preferenceCount: 10,
      });
      await popup.screenshot({
        path: info.outputPath(`settings-${colorScheme}.png`),
      });
      await settings.click();
      await expect(
        popup.getByRole("heading", { name: "Page palette", exact: true }),
      ).toBeVisible();
    }
    await popup.setViewportSize({ width: 360, height: 600 });
    await popup.getByRole("button", { name: "Settings", exact: true }).click();
    await popup
      .getByLabel("Image dimensions", { exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      popup.getByLabel("Image dimensions", { exact: true }),
    ).toBeInViewport();
    expect(
      await popup.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await app.context.close();
  }
});
test("partial ZIP counts precede saving; discard and navigation cannot save stale preparation", async ({}, info) => {
  const app = await launch(info);
  try {
    await app.page.evaluate(() => {
      const img = document.createElement("img");
      img.src = "https://images.fixture.test/denied.png";
      img.alt = "Unavailable image";
      img.width = img.height = 80;
      document.body.append(img);
    });
    const popup = await app.openPopup();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.evaluate(() => {
      const original = chrome.downloads.download.bind(chrome.downloads);
      window.downloadRequests = [];
      chrome.downloads.download = (options) => {
        window.downloadRequests.push(options);
        return original(options);
      };
    });
    await popup.getByRole("button", { name: "Images", exact: true }).click();
    const prepare = async () => {
      await popup
        .getByRole("button", { name: "Download ZIP", exact: true })
        .click();
      await popup
        .getByRole("button", { name: "Prepare ZIP", exact: true })
        .click();
      await expect(
        popup.getByText(
          "1 image(s) included; 1 unavailable; 0 beyond the export limit.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(
        popup.getByRole("button", { name: "Save ZIP", exact: true }),
      ).toBeVisible();
    };
    await prepare();
    expect(await popup.evaluate(() => window.downloadRequests)).toEqual([]);
    await popup.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(
      popup.getByText("Prepared ZIP discarded.", { exact: true }),
    ).toBeVisible();
    await expect(
      popup.getByRole("button", { name: "Save ZIP", exact: true }),
    ).toHaveCount(0);
    await prepare();
    await app.page.reload();
    await expect(
      popup.getByRole("heading", {
        name: "Scan again when ready",
        exact: true,
      }),
    ).toBeVisible();
    await popup.getByRole("button", { name: /Scan again/ }).click();
    await expect(
      popup.getByRole("heading", { name: "Images", exact: true }),
    ).toBeVisible();
    await expect(
      popup.getByRole("button", { name: "Save ZIP", exact: true }),
    ).toHaveCount(0);
    expect(await popup.evaluate(() => window.downloadRequests)).toEqual([]);
  } finally {
    await app.context.close();
  }
});
test("same-URL navigation clears data; a fresh scan does not reuse the old document", async ({}, info) => {
  const app = await launch(info);
  try {
    const popup = await app.openPopup();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await app.page.reload();
    await expect(
      popup.getByRole("heading", {
        name: "Scan again when ready",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      popup.getByRole("button", { name: "Copy #123456", exact: true }),
    ).toHaveCount(0);
    await popup.getByRole("button", { name: /Scan again/ }).click();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
  } finally {
    await app.context.close();
  }
});

test("insecure images, redirect downgrades and denied hosts cannot become downloads", async ({}, info) => {
  const app = await launch(info);
  try {
    const beforeFixture = insecureHits;
    await app.page.evaluate(
      async ({ imageOrigin, origin }) => {
        document.querySelectorAll("img").forEach((img) => img.remove());
        const loaded = [];
        for (const [name, src] of [
          ["Insecure", `${origin}/insecure-leak.png`],
          ["Redirect", `${imageOrigin}/redirect.png`],
          ["Denied", `${imageOrigin}/denied.png`],
        ]) {
          const img = document.createElement("img");
          loaded.push(
            new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            }),
          );
          img.alt = name;
          img.src = src;
          img.width = img.height = 80;
          document.body.append(img);
        }
        await Promise.all(loaded);
      },
      { imageOrigin, origin },
    );
    // The page itself loads these HTTP examples. Finish those requests before
    // measuring whether the extension makes any additional insecure requests.
    expect(insecureHits).toBe(beforeFixture + 2);
    const baseline = insecureHits;
    const popup = await app.openPopup();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.evaluate(() => {
      const original = chrome.downloads.download.bind(chrome.downloads);
      window.downloadRequests = [];
      chrome.downloads.download = (options) => {
        window.downloadRequests.push(options);
        return original(options);
      };
    });
    await popup.getByRole("button", { name: "Images", exact: true }).click();
    await popup.getByLabel("Load previews", { exact: true }).check();
    const insecure = popup.getByRole("article").filter({
      has: popup.getByRole("heading", { name: "Insecure", exact: true }),
    });
    await expect(
      insecure.getByText("HTTPS image required", { exact: true }),
    ).toBeVisible();
    await expect(
      insecure.getByRole("button", { name: "Download", exact: true }),
    ).toBeDisabled();
    for (const name of ["Redirect", "Denied"]) {
      const card = popup
        .getByRole("article")
        .filter({ has: popup.getByRole("heading", { name, exact: true }) });
      await expect(
        card.getByText("Preview unavailable", { exact: true }),
      ).toBeVisible();
      await card.getByRole("button", { name: "Download", exact: true }).click();
      await expect(card.getByText(/Image unavailable/)).toBeVisible();
    }
    await popup
      .getByRole("button", { name: "Download ZIP", exact: true })
      .click();
    await popup
      .getByRole("button", { name: "Prepare ZIP", exact: true })
      .click();
    await expect(popup.getByText(/No images could be included/)).toBeVisible();
    expect(await popup.evaluate(() => window.downloadRequests)).toEqual([]);
    expect(insecureHits).toBe(baseline);
  } finally {
    await app.context.close();
  }
});

test("navigation invalidation rejects an image completing before React cleanup", async ({}, info) => {
  const app = await launch(info, { staleImageRace: true });
  try {
    const popup = await app.openPopup();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.getByRole("button", { name: "Images", exact: true }).click();
    await popup.getByRole("button", { name: "Download", exact: true }).click();
    await expect(
      popup.getByRole("button", { name: "Preparing image…", exact: true }),
    ).toBeVisible();
    await popup.evaluate(async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      // Invalidate and resolve in the SAME task: React has not committed cleanup.
      window.invalidateScanForTest(tab.id);
      window.releaseImageForTest();
    });
    await expect(
      popup.getByRole("heading", {
        name: "Scan again when ready",
        exact: true,
      }),
    ).toBeVisible();
    expect(await popup.evaluate(() => window.imageSaveAttempts)).toEqual({
      objectUrls: 0,
      downloads: 0,
    });
  } finally {
    await app.context.close();
  }
});
