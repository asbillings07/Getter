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
    if (req.url === "/hidden-frame") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<p style="visibility:visible">Hidden embedded confidential marker</p>',
      );
      return;
    }
    if (req.url === "/frame") {
      res.setHeader("Content-Type", "text/html");
      res.end('<p style="color:rgb(10,20,30)">Frame text</p>');
      return;
    }
    if (req.url === "/usage") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html><head><title>Usage fixture</title><style>
        body{color:#17253b;background:#fff;font:16px Arial}
        p{color:#187c70}p.alternate{color:#2059be;font-family:Georgia}
        h2{font-family:Georgia}
        </style></head><body>${"<p>Frequent style</p>".repeat(6)}${'<p class="alternate">Alternate style</p>'.repeat(2)}<h2>Heading</h2></body></html>`);
      return;
    }
    if (req.url === "/mixed-colors") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html><head><title>Mixed color labels</title></head><body style="color:#000;font:16px Arial">
        ${'<p style="color:oklch(0.717 0.1648 250.794)">Blue</p>'.repeat(8)}
        ${'<p style="color:#000">Black</p>'.repeat(6)}
        ${'<p style="color:#7d7d7d">Gray</p>'.repeat(6)}
        ${'<p style="color:oklch(0.6936 0.2223 3.91)">Pink</p>'.repeat(5)}
        ${'<p style="color:oklch(0.731 0.2158 148.29)">Green</p>'.repeat(4)}
        ${'<p style="color:#1f1f1f">Dark</p>'.repeat(3)}
        ${'<p style="color:oklch(0.6987 0.2037 309.51)">Purple</p>'.repeat(2)}
        </body></html>`);
      return;
    }
    if (req.url === "/workbench") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html><head><title>Getter workspace fixture</title><style>
        body{font:16px Arial;margin:40px;color:#123456}main{max-width:650px}
        #card{display:flex;gap:24px;padding:24px;border:1px solid #ced8e8;border-radius:18px;background:linear-gradient(135deg,#edf4ff,#fff);box-shadow:0 8px 24px #12345622}
        #action{padding:12px 20px;background:#2468df;color:white;border:0;border-radius:8px;cursor:pointer}
        #plain{border:0;background:none;box-shadow:none;outline:none}
      </style></head><body><nav>Fixture navigation</nav><main><h1 id="title">Design in the details</h1><p id="intro">Hello <strong>readable world</strong>!</p><div hidden>Hidden secret</div><textarea>Private form value</textarea><input type="password" value="private-password"><section id="card" aria-label="Feature card"><span>Flexible spacing</span><button id="action" onclick="window.actionClicks=(window.actionClicks||0)+1">Try Getter</button></section><p id="plain">Plain content</p><a id="long-link" href="https://example.test/a/very/long/path/that/must/wrap/inside/the/side/panel?fixture=long-value">Read the guide</a><img id="sample" alt="Sample artwork" src="${imageOrigin}/image.png" width="80" height="60"><div id="shadow-host"></div></main><footer>Fixture footer</footer><iframe src="/frame"></iframe><iframe sandbox src="/frame"></iframe><script>document.querySelector('#shadow-host').attachShadow({mode:'open'}).innerHTML='<button id="shadow-button">Shadow action</button>';</script></body></html>`);
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
async function launch(
  testInfo,
  {
    staleImageRace = false,
    nativePopup = false,
    popupScreen = "1600x1200",
  } = {},
) {
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
      headless: process.env.GETTER_HEADED !== "1",
      // Native popup sizing must not inherit Playwright's device-metrics viewport.
      ...(nativePopup ? { viewport: null } : {}),
      acceptDownloads: true,
      downloadsPath: testInfo.outputPath("downloads"),
      args: [
        ...(nativePopup
          ? ["--window-size=1280,900", `--screen-info={${popupScreen}}`]
          : []),
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
  const openPopup = async (filename = "popup.html") => {
    const newPage = context.waitForEvent("page");
    await worker.evaluate(
      (url) => chrome.tabs.create({ url, active: false }),
      `chrome-extension://${id}/${filename}`,
    );
    const popup = await newPage;
    await popup.waitForLoadState();
    return popup;
  };
  return {
    context,
    worker,
    page,
    before,
    openPopup,
    openPanel: () => openPopup("sidepanel.html"),
  };
}
test("toolbar popup sizes itself without a test-supplied viewport", async ({}, info) => {
  const app = await launch(info, { nativePopup: true });
  try {
    // This inactive tab only observes the separate toolbar view. It does not size it.
    // Playwright does not expose Chrome's action popup as a normal Page target.
    const control = await app.openPopup();
    await app.worker.evaluate(() => chrome.action.openPopup());
    await expect
      .poll(() =>
        control.evaluate(() => {
          const views = chrome.extension.getViews({ type: "popup" });
          const [popup] = views;
          return (
            popup && {
              count: views.length,
              width: popup.innerWidth,
              height: popup.innerHeight,
            }
          );
        }),
      )
      .toEqual({ count: 1, width: 720, height: 600 });
    const palette = await control.evaluate(() => {
      const popup = chrome.extension.getViews({ type: "popup" })[0];
      const doc = popup.document;
      const main = doc.querySelector("main").getBoundingClientRect();
      return {
        width: popup.innerWidth,
        height: popup.innerHeight,
        resultsHeight: main.height,
        horizontalOverflow: doc.documentElement.scrollWidth > popup.innerWidth,
        footerVisible:
          doc.querySelector("footer").getBoundingClientRect().bottom <=
          popup.innerHeight,
      };
    });
    expect(palette.resultsHeight).toBeGreaterThan(350);
    expect(palette.horizontalOverflow).toBe(false);
    expect(palette.footerVisible).toBe(true);
    await control.evaluate(() =>
      chrome.extension
        .getViews({ type: "popup" })[0]
        .document.querySelector(".settings-button")
        .click(),
    );
    await expect
      .poll(() =>
        control.evaluate(() => {
          const doc = chrome.extension.getViews({ type: "popup" })[0].document;
          const main = doc.querySelector("main").getBoundingClientRect();
          return [...doc.querySelectorAll(".setting")].filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top >= main.top && rect.bottom <= main.bottom;
          }).length;
        }),
      )
      .toBe(11);
    await writeFile(
      info.outputPath("toolbar-sizing.json"),
      JSON.stringify({ palette, visiblePreferences: 11 }, null, 2),
    );
  } finally {
    await app.context.close();
  }
});
test("screen-limited toolbar popup keeps preferences and image actions reachable", async ({}, info) => {
  const app = await launch(info, { nativePopup: true, popupScreen: "800x600" });
  try {
    const control = await app.openPopup();
    await app.worker.evaluate(() => chrome.action.openPopup());
    await expect
      .poll(() =>
        control.evaluate(() => {
          const popup = chrome.extension.getViews({ type: "popup" })[0];
          return popup?.document.querySelector(".swatch") !== null && !!popup;
        }),
      )
      .toBe(true);
    const height = await control.evaluate(
      () => chrome.extension.getViews({ type: "popup" })[0].innerHeight,
    );
    expect(height).toBeLessThan(600);
    expect(height).toBeGreaterThan(300);
    const reach = async (selector) => {
      await expect
        .poll(() =>
          control.evaluate((selector) => {
            const popup = chrome.extension.getViews({ type: "popup" })[0];
            const el = popup.document.querySelector(selector);
            if (!el)
              return {
                visible: false,
                missing: selector,
                text: popup.document.querySelector("main").textContent,
              };
            el.scrollIntoView({ block: "center", inline: "nearest" });
            // Native scroll offsets round fractional layout pixels.
            const rect = el.getBoundingClientRect();
            return {
              top: rect.top,
              bottom: rect.bottom,
              viewport: popup.innerHeight,
              visible:
                rect.top >= -1 &&
                rect.bottom <= popup.innerHeight + 1 &&
                rect.left >= -1 &&
                rect.right <= popup.innerWidth + 1,
            };
          }, selector),
        )
        .toMatchObject({ visible: true });
    };
    await control.evaluate(() =>
      chrome.extension
        .getViews({ type: "popup" })[0]
        .document.querySelector(".settings-button")
        .click(),
    );
    await reach(".setting:last-child");
    await control.evaluate(() => {
      const doc = chrome.extension.getViews({ type: "popup" })[0].document;
      [...doc.querySelectorAll(".tabs button")]
        .find((el) => el.textContent.includes("Images"))
        .click();
    });
    await reach(".image-card > button.secondary");
    await reach(".image-actions button");
    await reach("footer button");
  } finally {
    await app.context.close();
  }
});
for (const popupScreen of ["1600x1200", "800x600"]) {
  test(`notifications stay in the toolbar viewport on a ${popupScreen} screen`, async ({}, info) => {
    const app = await launch(info, { nativePopup: true, popupScreen });
    try {
      await app.page.evaluate(() => {
        for (let i = 0; i < 60; i++) {
          const item = document.createElement("p");
          item.style.color = `rgb(${i}, 80, 120)`;
          item.textContent = `Palette fixture ${i}`;
          document.body.append(item);
        }
      });
      const control = await app.openPopup();
      await app.worker.evaluate(() => chrome.action.openPopup());
      await expect
        .poll(() =>
          control.evaluate(
            () =>
              chrome.extension
                .getViews({ type: "popup" })[0]
                ?.document.querySelectorAll(".swatch").length,
          ),
        )
        .toBeGreaterThan(60);
      const before = await control.evaluate(() => {
        const popup = chrome.extension.getViews({ type: "popup" })[0];
        const main = popup.document.querySelector("main");
        // A deterministic clipboard outcome tests the real copy handler without
        // requiring a trusted gesture or changing the system clipboard.
        popup.navigator.clipboard.writeText = async (value) => {
          popup.copiedValue = value;
        };
        popup.document.querySelector(".swatch").click();
        return {
          width: popup.innerWidth,
          height: popup.innerHeight,
          mainHeight: main.clientHeight,
          scrollTop: main.scrollTop,
          scrollHeight: main.scrollHeight,
        };
      });
      expect(before.scrollHeight).toBeGreaterThan(before.mainHeight);
      const readNotice = () =>
        control.evaluate(() => {
          const popup = chrome.extension.getViews({ type: "popup" })[0];
          const notices = [...popup.document.querySelectorAll(".notice")];
          const rect = popup.document
            .querySelector(".notices")
            .getBoundingClientRect();
          const main = popup.document.querySelector("main");
          return {
            text: notices.at(-1)?.textContent || "",
            count: notices.length,
            stacked: notices.every(
              (notice, index) =>
                !index ||
                notices[index - 1].getBoundingClientRect().bottom <
                  notice.getBoundingClientRect().top,
            ),
            copiedValue: popup.copiedValue,
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              rect.top >= 0 &&
              rect.left >= 0 &&
              rect.bottom <= popup.innerHeight &&
              rect.right <= popup.innerWidth,
            width: popup.innerWidth,
            height: popup.innerHeight,
            mainHeight: main.clientHeight,
            scrollTop: main.scrollTop,
            scrollHeight: main.scrollHeight,
            horizontalOverflow:
              popup.document.documentElement.scrollWidth > popup.innerWidth,
          };
        });
      await expect.poll(readNotice).toMatchObject({
        ...before,
        text: "Copied #123456.",
        copiedValue: "#123456",
        visible: true,
        horizontalOverflow: false,
      });
      await control.evaluate(() => {
        const popup = chrome.extension.getViews({ type: "popup" })[0];
        const main = popup.document.querySelector("main");
        main.scrollTop = main.scrollHeight;
        popup.scrollTo(0, popup.document.documentElement.scrollHeight);
      });
      await expect.poll(readNotice).toMatchObject({ visible: true });
      expect((await readNotice()).scrollTop).toBeGreaterThan(0);
      await control.evaluate(() => {
        const popup = chrome.extension.getViews({ type: "popup" })[0];
        popup.navigator.clipboard.writeText = async () => {
          throw new Error("Synthetic clipboard denial");
        };
        for (let i = 0; i < 3; i++)
          popup.document.querySelector(".swatch:last-child").click();
      });
      await expect.poll(readNotice).toMatchObject({
        text: "Copy failed. Select and copy the displayed value manually.",
        count: 3,
        stacked: true,
        visible: true,
        horizontalOverflow: false,
      });
      await control.evaluate(() => {
        const popup = chrome.extension.getViews({ type: "popup" })[0];
        popup.document.querySelector(".settings-button").click();
      });
      await expect
        .poll(() =>
          control.evaluate(() => {
            const popup = chrome.extension.getViews({ type: "popup" })[0];
            return popup.document.querySelectorAll(".setting").length;
          }),
        )
        .toBe(11);
      await control.evaluate(() => {
        const popup = chrome.extension.getViews({ type: "popup" })[0];
        popup.document.querySelector(".setting input").click();
      });
      await expect.poll(readNotice).toMatchObject({
        text: "Preference saved.",
        visible: true,
      });
      await writeFile(
        info.outputPath("notification-viewport.json"),
        JSON.stringify({ before, after: await readNotice() }, null, 2),
      );
      await expect.poll(readNotice).toMatchObject({ count: 0, visible: false });
    } finally {
      await app.context.close();
    }
  });
}
test("notifications keep the newest three and expire independently after two seconds", async ({}, info) => {
  const app = await launch(info);
  try {
    await app.context.clock.install({ time: "2026-01-01T00:00:00Z" });
    const popup = await app.openPopup();
    await popup.setViewportSize({ width: 720, height: 498 });
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await app.context.clock.pauseAt("2026-01-01T01:00:00Z");
    await popup.evaluate(() => {
      navigator.clipboard.writeText = async () => {};
    });
    const notices = popup.locator(".notice");
    const copy = (value) =>
      popup
        .getByRole("button", { name: `Copy ${value}`, exact: true })
        .dispatchEvent("click");
    await copy("#123456");
    await expect(notices).toHaveText(["Copied #123456."]);
    await app.context.clock.runFor(500);
    await copy("#000000");
    await expect(notices).toHaveCount(2);
    await app.context.clock.runFor(500);
    await copy("#0A141E");
    await expect(notices).toHaveCount(3);
    await app.context.clock.runFor(500);
    await copy("#123456");
    const newest = ["Copied #000000.", "Copied #0A141E.", "Copied #123456."];
    await expect(notices).toHaveText(newest);
    for (const colorScheme of ["light", "dark"]) {
      await popup.emulateMedia({ colorScheme });
      await expect(popup.locator(".notices")).toBeInViewport({ ratio: 1 });
      await popup.screenshot({
        path: info.outputPath(`notifications-${colorScheme}.png`),
      });
    }
    // Evicting the first message must not leave a timer that removes newer ones.
    await app.context.clock.runFor(500);
    await expect(notices).toHaveText(newest);
    await app.context.clock.runFor(499);
    await expect(notices).toHaveText(newest);
    await app.context.clock.runFor(1);
    await expect(notices).toHaveText(newest.slice(1));
    await app.context.clock.runFor(500);
    await expect(notices).toHaveText(newest.slice(2));
    await app.context.clock.runFor(499);
    await expect(notices).toHaveCount(1);
    await app.context.clock.runFor(1);
    await expect(notices).toHaveCount(0);
    await expect(popup.locator(".notices")).toHaveAttribute(
      "aria-live",
      "polite",
    );

    // Identical text still represents two separate copy actions and lifetimes.
    await copy("#123456");
    await expect(notices).toHaveCount(1);
    await app.context.clock.runFor(500);
    await copy("#123456");
    await expect(notices).toHaveText(["Copied #123456.", "Copied #123456."]);
    await app.context.clock.runFor(1500);
    await expect(notices).toHaveText(["Copied #123456."]);
    await app.context.clock.runFor(500);
    await expect(notices).toHaveCount(0);

    // A new scan clears old notices without affecting the next notice's timer.
    await copy("#123456");
    await expect(notices).toHaveCount(1);
    await app.context.clock.runFor(1000);
    await popup
      .getByRole("button", { name: /Scan again/ })
      .dispatchEvent("click");
    await expect(notices).toHaveCount(0);
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await copy("#000000");
    await expect(notices).toHaveText(["Copied #000000."]);
    await app.context.clock.runFor(1000);
    await expect(notices).toHaveText(["Copied #000000."]);
    await app.context.clock.runFor(1000);
    await expect(notices).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});
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
      popup.getByText("Download completed.", { exact: true }).last(),
    ).toBeVisible();
    await expect(popup.locator(".notices")).toBeInViewport({ ratio: 1 });
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
      await expect(popup.getByRole("switch")).toHaveCount(11);
      await expect(
        popup.getByRole("radiogroup", { name: "Appearance" }),
      ).toBeInViewport({ ratio: 1 });
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
        visiblePreferences: 11,
        preferenceCount: 11,
      });
      await popup.getByLabel("Font size", { exact: true }).click();
      await expect(popup.locator(".notice").last()).toHaveText(
        "Preference saved.",
      );
      await expect(popup.locator(".notices")).toBeInViewport({ ratio: 1 });
      await popup.screenshot({
        path: info.outputPath(`settings-${colorScheme}.png`),
      });
      await settings.click();
      await expect(
        popup.getByRole("heading", { name: "Page palette", exact: true }),
      ).toBeVisible();
    }
  } finally {
    await app.context.close();
  }
});
test("appearance follows System, overrides either system scheme, and persists with keyboard-operated switches", async ({}, info) => {
  const app = await launch(info);
  try {
    let popup = await app.openPopup();
    await popup.setViewportSize({ width: 720, height: 600 });
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await expect(popup.locator(".site-identity > span")).toHaveText(
      new URL(origin).hostname,
    );
    await expect(popup.locator(".site-identity svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await popup.getByRole("button", { name: "Settings", exact: true }).click();
    const appearance = (name) =>
      popup.getByRole("radio", { name, exact: true });
    const choose = async (name) => {
      await popup
        .locator(".appearance-options label")
        .filter({ hasText: name })
        .click();
      await expect(appearance(name)).toBeChecked();
      await expect(appearance(name)).toBeEnabled();
    };
    const scheme = async (name) => {
      await expect(popup.locator("html")).toHaveCSS("color-scheme", name);
      await expect(popup.locator(".window")).toHaveCSS(
        "background-color",
        name === "dark" ? "rgb(12, 18, 32)" : "rgb(244, 247, 252)",
      );
    };
    await expect(appearance("System")).toBeChecked();
    await popup.emulateMedia({ colorScheme: "dark" });
    await scheme("dark");
    await popup.emulateMedia({ colorScheme: "light" });
    await scheme("light");
    // Slow real writes must not blur controls or allow overlapping saves.
    await popup.evaluate(() => {
      const save = chrome.storage.local.set.bind(chrome.storage.local);
      window.preferenceWrites = 0;
      window.holdPreferenceSaves = true;
      chrome.storage.local.set = async (values) => {
        window.preferenceWrites++;
        if (window.holdPreferenceSaves) {
          await new Promise((resolve) => {
            window.releasePreferenceSave = () => {
              window.holdPreferenceSaves = false;
              resolve();
            };
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        return save(values);
      };
    });
    await appearance("System").focus();
    await popup.keyboard.press("ArrowRight");
    await expect(appearance("Light")).toBeChecked();
    await expect(appearance("Light")).toBeDisabled();
    // DOM activation deliberately bypasses Playwright's aria-disabled guard.
    await popup.evaluate(() =>
      document.querySelector('input[value="dark"]').click(),
    );
    await expect(appearance("Light")).toBeChecked();
    await popup.evaluate(() => window.releasePreferenceSave());
    await expect(appearance("Light")).toBeEnabled();
    expect(await popup.evaluate(() => window.preferenceWrites)).toBe(1);
    await expect(appearance("Light")).toBeFocused();
    await popup.keyboard.press("ArrowRight");
    await expect(appearance("Dark")).toBeChecked();
    await expect(appearance("Dark")).toBeEnabled();
    await expect(appearance("Dark")).toBeFocused();
    await popup.keyboard.press("ArrowLeft");
    await expect(appearance("Light")).toBeChecked();
    await expect(appearance("Light")).toBeEnabled();
    await expect(appearance("Light")).toBeFocused();
    await popup.emulateMedia({ colorScheme: "dark" });
    await scheme("light");
    await choose("Dark");
    await popup.emulateMedia({ colorScheme: "light" });
    await scheme("dark");
    const fontSize = popup.getByRole("switch", {
      name: "Font size",
      exact: true,
    });
    await popup.evaluate(() => {
      window.holdPreferenceSaves = true;
    });
    await fontSize.focus();
    await fontSize.press("Space");
    await expect(fontSize).not.toBeChecked();
    await expect(fontSize).toBeDisabled();
    await fontSize.evaluate((input) => input.click());
    await expect(fontSize).not.toBeChecked();
    await popup.evaluate(() => window.releasePreferenceSave());
    await expect(fontSize).toBeEnabled();
    await expect(fontSize).toBeFocused();
    await expect
      .poll(() =>
        popup.evaluate(
          async () =>
            (await chrome.storage.local.get("cssGetterOptions"))
              .cssGetterOptions,
        ),
      )
      .toMatchObject({ appearance: "dark", fonts: { fontSize: false } });
    await popup.close();
    popup = await app.openPopup();
    await popup.setViewportSize({ width: 720, height: 600 });
    await popup.emulateMedia({ colorScheme: "light" });
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await scheme("dark");
    await popup.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(appearance("Dark")).toBeChecked();
    await expect(
      popup.getByRole("switch", { name: "Font size", exact: true }),
    ).not.toBeChecked();
    await expect(popup.locator("footer")).toBeInViewport({ ratio: 1 });
    await popup.screenshot({ path: info.outputPath("appearance-dark.png") });
    await choose("System");
    await scheme("light");
    await popup.emulateMedia({ colorScheme: "dark" });
    await scheme("dark");
    await choose("Light");
    await scheme("light");
    await expect(popup.locator(".notice")).toHaveCount(0);
    await popup.screenshot({ path: info.outputPath("appearance-light.png") });
  } finally {
    await app.context.close();
  }
});
test("high contrast keeps switch states and the selected appearance visible", async ({}, info) => {
  const app = await launch(info);
  try {
    const popup = await app.openPopup();
    await popup.setViewportSize({ width: 720, height: 600 });
    await popup.emulateMedia({ forcedColors: "active" });
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.getByRole("button", { name: "Settings", exact: true }).click();
    for (const [name, checked] of [
      ["Font size", true],
      ["All font styles", false],
    ]) {
      const control = popup.getByRole("switch", { name, exact: true });
      await expect(control).toBeChecked({ checked });
      const colors = await control.evaluate((input) => ({
        track: getComputedStyle(input).backgroundColor,
        thumb: getComputedStyle(input, "::before").backgroundColor,
        shadow: getComputedStyle(input, "::before").boxShadow,
      }));
      expect(colors.thumb).not.toBe(colors.track);
      expect(colors.shadow).toBe("none");
    }
    const selected = popup.locator(
      ".appearance .appearance-options input:checked + span",
    );
    const colors = await selected.evaluate((segment) => ({
      text: getComputedStyle(segment).color,
      background: getComputedStyle(segment).backgroundColor,
      other: getComputedStyle(
        document.querySelector(
          ".appearance .appearance-options input:not(:checked) + span",
        ),
      ).backgroundColor,
    }));
    expect(colors.text).not.toBe(colors.background);
    expect(colors.background).not.toBe(colors.other);
    await popup.screenshot({
      path: info.outputPath("settings-high-contrast.png"),
    });
  } finally {
    await app.context.close();
  }
});
test("failed appearance and switch saves restore the previous display and stored preferences", async ({}, info) => {
  const app = await launch(info);
  try {
    const popup = await app.openPopup();
    await popup.emulateMedia({ colorScheme: "light" });
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.getByRole("button", { name: "Settings", exact: true }).click();
    const before = await popup.evaluate(async () => {
      const saved = await chrome.storage.local.get("cssGetterOptions");
      chrome.storage.local.set = async () => {
        throw new Error("Synthetic storage failure");
      };
      return saved.cssGetterOptions;
    });
    await popup
      .locator(".appearance-options label")
      .filter({ hasText: "Dark" })
      .click();
    await expect(popup.locator(".notice").last()).toHaveText(
      "Preference was not saved. Please try again.",
    );
    await expect(
      popup.getByRole("radio", { name: "System", exact: true }),
    ).toBeChecked();
    await expect(popup.locator("html")).toHaveCSS("color-scheme", "light");
    await expect(popup.locator(".window")).toHaveCSS(
      "background-color",
      "rgb(244, 247, 252)",
    );
    await popup.getByRole("switch", { name: "Font size", exact: true }).click();
    await expect(
      popup.getByRole("switch", { name: "Font size", exact: true }),
    ).toBeChecked();
    await expect(
      popup.getByRole("switch", { name: "Font size", exact: true }),
    ).toBeEnabled();
    expect(
      await popup.evaluate(
        async () =>
          (await chrome.storage.local.get("cssGetterOptions")).cssGetterOptions,
      ),
    ).toEqual(before);
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

test("Text extracts page, main, and selection; copies exact values and saves real text bytes", async ({}, info) => {
  const app = await launch(info);
  try {
    await app.page.goto(`${origin}/workbench`);
    const before = await app.page
      .locator("html")
      .evaluate((el) => el.outerHTML);
    const popup = await app.openPopup();
    await popup.setViewportSize({ width: 720, height: 600 });
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    // Capture the submitted clipboard bytes; native clipboard success/failure is covered separately.
    await popup.evaluate(() => {
      window.copied = [];
      navigator.clipboard.writeText = async (value) => {
        window.copied.push(value);
      };
    });
    await popup.getByRole("button", { name: "Text", exact: true }).click();
    expect(
      await popup
        .locator(".text-source-row .segments button")
        .evaluateAll((buttons) =>
          buttons.every((button) => button.scrollWidth <= button.clientWidth),
        ),
    ).toBe(true);
    await expect(popup.locator(".text-results")).toContainText(
      "Fixture navigation",
    );
    await expect(popup.locator(".text-results")).toContainText(
      "Hello readable world!",
    );
    await expect(popup.locator(".text-results")).toContainText("Frame text");
    await expect(popup.locator(".text-results")).not.toContainText(
      "Hidden secret",
    );
    await expect(popup.locator(".text-results")).not.toContainText(
      "Private form value",
    );
    await expect(popup.getByText(/Partial results/)).toBeVisible();
    const pageBlocks = await popup.locator(".text-block p").allTextContents();
    await popup.getByRole("button", { name: "Page", exact: true }).click();
    await expect(popup.locator(".text-block p")).toHaveText(pageBlocks);
    await popup
      .getByRole("button", { name: "Main content", exact: true })
      .click();
    await expect(popup.locator(".text-results")).not.toContainText(
      "Fixture navigation",
    );
    await expect(popup.locator(".text-results")).not.toContainText(
      "Fixture footer",
    );
    await popup.getByRole("button", { name: "Copy text", exact: true }).click();
    await expect.poll(() => popup.evaluate(() => window.copied.length)).toBe(1);
    const copied = await popup.evaluate(() => window.copied.at(-1));
    expect(copied).toContain("Design in the details\n\nHello readable world!");
    expect(copied).not.toMatch(/private-password|Private form value/);
    const downloaded = popup.waitForEvent("download");
    await popup.getByRole("button", { name: /Save .txt/ }).click();
    const file = await downloaded;
    expect(await file.failure()).toBeNull();
    expect(await readFile(await file.path(), "utf8")).toBe(copied);
    await popup
      .getByRole("searchbox", { name: "Find in extracted text" })
      .fill("readable");
    await expect(popup.locator(".text-block")).toHaveCount(1);
    await expect(popup.locator(".text-block mark")).toHaveText("readable");
    await popup
      .getByRole("button", { name: "Main content", exact: true })
      .click();
    await expect(popup.locator(".text-block mark")).toHaveText("readable");
    await popup
      .getByRole("button", { name: "Copy paragraph", exact: true })
      .click();
    await expect
      .poll(() => popup.evaluate(() => window.copied.at(-1)))
      .toBe("Hello readable world!");
    await popup.screenshot({ path: info.outputPath("text-popup.png") });
    await popup.getByRole("button", { name: "Selection", exact: true }).click();
    await expect(
      popup.getByRole("heading", { name: "No text selected" }),
    ).toBeVisible();
    await app.page.evaluate(() => {
      const range = document.createRange();
      const node = document.querySelector("#intro strong").firstChild;
      range.setStart(node, 0);
      range.setEnd(node, 8);
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    });
    await popup
      .getByRole("button", { name: "Extract selection", exact: true })
      .click();
    await expect(popup.locator(".text-block p")).toHaveText("readable");
    await popup.getByRole("button", { name: "Selection", exact: true }).click();
    await expect(popup.locator(".text-block p")).toHaveText("readable");
    expect(await app.page.locator("html").evaluate((el) => el.outerHTML)).toBe(
      before,
    );
    await app.page.reload();
    await expect(
      popup.getByRole("heading", { name: "Scan again when ready" }),
    ).toBeVisible();
    await expect(popup.locator(".text-block")).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});

test("Inspect continuously selects, pauses, shows expanded sections, and cleans up", async ({}, info) => {
  const app = await launch(info);
  try {
    await app.page.goto(`${origin}/workbench`);
    const before = await app.page
      .locator("html")
      .evaluate((el) => el.outerHTML);
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 400, height: 820 });
    const errors = [];
    panel.on("pageerror", (error) => errors.push(error.message));
    await expect(
      panel.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await panel.evaluate(() => {
      window.copied = [];
      navigator.clipboard.writeText = async (value) =>
        window.copied.push(value);
    });
    await app.page.evaluate(() => {
      window.pressActions = [];
      for (const type of ["pointerdown", "pointerup", "mousedown", "mouseup"])
        document.addEventListener(
          type,
          (event) => {
            if (event.target.id === "action") window.pressActions.push(type);
          },
          true,
        );
    });
    await panel.getByRole("button", { name: "Inspect", exact: true }).click();
    await expect(
      panel.getByRole("heading", { name: "Choose an element" }),
    ).toBeVisible();
    await app.page.locator("#action").click();
    await expect(panel.locator(".element-title")).toContainText(
      "button#action",
    );
    expect(await app.page.evaluate(() => window.actionClicks || 0)).toBe(0);
    expect(await app.page.evaluate(() => window.pressActions)).toEqual([]);
    await expect(
      panel.getByRole("switch", { name: "Select on page", exact: true }),
    ).toBeChecked();
    await app.page.locator("#card").click({ position: { x: 10, y: 10 } });
    await expect(panel.locator(".element-title")).toContainText("section#card");
    await panel.getByRole("button", { name: "Layout", exact: true }).click();
    await expect(
      panel.getByText("Flex layout", { exact: false }).first(),
    ).toBeVisible();
    await expect(panel.getByTitle("Copy gap", { exact: true })).toHaveText(
      "24px",
    );
    await panel.getByText("Box model", { exact: false }).first().click();
    await expect(panel.locator(".box-core")).toBeVisible();
    await panel.screenshot({
      path: info.outputPath("inspect-layout-light.png"),
    });
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    await expect(
      panel.getByTitle("Copy background-image", { exact: true }),
    ).toContainText("linear-gradient");
    await panel.getByTitle("Copy box-shadow", { exact: true }).click();
    await expect
      .poll(() => panel.evaluate(() => window.copied.at(-1)))
      .toContain("8px 24px");
    await panel.getByRole("button", { name: /Copy CSS/ }).click();
    await expect(panel.locator(".code-preview")).toContainText(
      "display: flex;",
    );
    await expect(panel.locator(".code-preview")).not.toContainText(
      "aria-label:",
    );
    await panel
      .getByRole("button", { name: "Copy snippet", exact: true })
      .click();
    await expect
      .poll(() => panel.evaluate(() => window.copied.at(-1)))
      .toContain("section#card {");
    await panel.getByRole("button", { name: /Back to/ }).click();
    await panel
      .getByRole("switch", { name: "Select on page", exact: true })
      .uncheck();
    await expect(app.page.locator("getter-inspection-overlay")).toHaveCount(0);
    await app.page.locator("#action").click();
    expect(await app.page.evaluate(() => window.actionClicks)).toBe(1);
    expect(await app.page.evaluate(() => window.pressActions)).toEqual([
      "pointerdown",
      "mousedown",
      "pointerup",
      "mouseup",
    ]);
    await expect(panel.locator(".element-title")).toContainText("section#card");
    await panel
      .getByRole("button", { name: "Resume selecting", exact: true })
      .click();
    await app.page.locator("#plain").click();
    await expect(
      panel.getByRole("heading", { name: "No effects applied" }),
    ).toBeVisible();
    await panel
      .getByRole("searchbox", { name: "Find CSS property" })
      .fill("opacity");
    await expect(panel.getByTitle("Copy opacity", { exact: true })).toHaveText(
      "1",
    );
    await panel.getByRole("searchbox", { name: "Find CSS property" }).fill("");
    await panel
      .getByRole("switch", { name: "Show all properties", exact: true })
      .check();
    await expect(panel.getByTitle("Copy opacity", { exact: true })).toHaveText(
      "1",
    );
    await app.page.locator("#long-link").click();
    expect(app.page.url()).toBe(`${origin}/workbench`);
    await panel.getByRole("button", { name: "Element", exact: true }).click();
    await expect(panel.getByTitle("Copy href", { exact: true })).toContainText(
      "https://example.test/a/very/long/path",
    );
    await expect(
      panel.getByText("Not set", { exact: true }).first(),
    ).toBeVisible();
    await panel.emulateMedia({ colorScheme: "dark" });
    await panel.setViewportSize({ width: 320, height: 720 });
    expect(
      await panel.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await panel.screenshot({
      path: info.outputPath("inspect-element-dark-narrow.png"),
    });
    await app.page.locator("#sample").click();
    await expect(panel.getByTitle("Copy alt", { exact: true })).toHaveText(
      "Sample artwork",
    );
    await expect(
      panel.getByTitle("Copy original size", { exact: true }),
    ).toHaveText("1 × 1 px");
    await app.page.locator("#shadow-host button").click();
    await expect(panel.locator(".element-title")).toContainText(
      "button#shadow-button",
    );
    await expect(panel.getByText(/inside a shadow root/)).toBeVisible();
    await app.page.keyboard.press("Escape");
    await expect(
      panel.getByRole("button", { name: "Resume selecting", exact: true }),
    ).toBeVisible();
    await panel
      .getByRole("button", { name: "Resume selecting", exact: true })
      .click();
    await app.page.locator("#plain").click();
    await app.page.locator("#plain").evaluate((el) => el.remove());
    await expect(
      panel.getByRole("heading", { name: "Element no longer available" }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Colors", exact: true }).click();
    await expect(app.page.locator("getter-inspection-overlay")).toHaveCount(0);
    expect(await app.page.locator("#action").getAttribute("id")).toBe("action");
    expect(errors).toEqual([]);
    // Removing one fixture element was the only persistent page change.
    const after = await app.page.locator("html").evaluate((el) => el.outerHTML);
    expect(after).toBe(before.replace('<p id="plain">Plain content</p>', ""));
  } finally {
    await app.context.close();
  }
});

test("workspace preference configures toolbar and preview preference survives reopening", async ({}, info) => {
  const app = await launch(info);
  try {
    const popup = await app.openPopup();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.getByRole("button", { name: "Settings", exact: true }).click();
    await popup
      .locator(".workspace-options label")
      .filter({ hasText: "Side panel" })
      .click();
    await expect
      .poll(() => app.worker.evaluate(() => chrome.action.getPopup({})))
      .toBe("");
    expect(
      await app.worker.evaluate(() => chrome.sidePanel.getPanelBehavior()),
    ).toEqual({ openPanelOnActionClick: true });
    await popup
      .getByRole("switch", { name: "Load previews by default", exact: true })
      .check();
    await popup.close();
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 400, height: 820 });
    await expect(
      panel.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Images", exact: true }).click();
    await expect(
      panel.getByRole("switch", { name: "Load previews", exact: true }),
    ).toBeChecked();
    await expect(
      panel.getByRole("img", { name: "Sample image", exact: true }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Settings", exact: true }).click();
    await panel
      .locator(".workspace-options label")
      .filter({ hasText: "Popup" })
      .click();
    await expect
      .poll(() => app.worker.evaluate(() => chrome.action.getPopup({})))
      .toMatch(/popup.html$/);
    expect(
      await app.worker.evaluate(() => chrome.sidePanel.getPanelBehavior()),
    ).toEqual({ openPanelOnActionClick: false });
  } finally {
    await app.context.close();
  }
});

test("native popup and side panel transfer Text state and keep Inspect in the panel", async ({}, info) => {
  const app = await launch(info, { nativePopup: true });
  try {
    await app.page.goto(`${origin}/workbench`);
    const control = await app.openPopup();
    await app.worker.evaluate(() => chrome.action.openPopup());
    const read = () =>
      control.evaluate(() =>
        chrome.extension
          .getViews()
          .filter(
            (w) =>
              !w.location.href.includes("popup.html") ||
              chrome.extension.getViews({ type: "popup" }).includes(w),
          )
          .map((w) => ({
            path: w.location.pathname,
            text: w.document.body?.innerText || "",
            query:
              w.document.querySelector('input[type="search"]')?.value || "",
          })),
      );
    // Native extension views are CDP targets, not Playwright Pages. Supply the gesture
    // in the target view itself; clicking it from an observer window loses activation.
    const cdp = await app.context.newCDPSession(control);
    const controlTarget = (await cdp.send("Target.getTargetInfo")).targetInfo
      .targetId;
    let commandId = 0;
    const click = async (mode, selector) => {
      const targets = (await cdp.send("Target.getTargets")).targetInfos;
      const target = targets.find(
        (t) =>
          t.url.endsWith(
            mode === "popup" ? "/popup.html" : "/sidepanel.html",
          ) && t.targetId !== controlTarget,
      );
      if (!target)
        throw Error(
          `Missing native ${mode} target: ${JSON.stringify(targets)}`,
        );
      const { sessionId } = await cdp.send("Target.attachToTarget", {
        targetId: target.targetId,
        flatten: false,
      });
      const id = ++commandId;
      const result = new Promise((resolve, reject) => {
        const handler = (event) => {
          if (event.sessionId !== sessionId) return;
          const value = JSON.parse(event.message);
          if (value.id === id) {
            cdp.off("Target.receivedMessageFromTarget", handler);
            value.error
              ? reject(Error(value.error.message))
              : resolve(value.result);
          }
        };
        cdp.on("Target.receivedMessageFromTarget", handler);
      });
      await cdp.send("Target.sendMessageToTarget", {
        sessionId,
        message: JSON.stringify({
          id,
          method: "Runtime.evaluate",
          params: {
            expression: `document.querySelector(${JSON.stringify(selector)}).click()`,
            userGesture: true,
            returnByValue: true,
          },
        }),
      });
      await result;
      await cdp.send("Target.detachFromTarget", { sessionId }).catch(() => {});
    };
    await expect
      .poll(async () => JSON.stringify(await read()))
      .toContain("Page palette");
    await click("popup", ".sort-button");
    await click("popup", ".tabs button:nth-child(2)");
    await click("popup", ".sort-button");
    await click("popup", ".tabs button:nth-child(4)");
    await expect
      .poll(async () => JSON.stringify(await read()))
      .toContain("Hello readable world!");
    await control.evaluate(() => {
      const w = chrome.extension.getViews({ type: "popup" })[0];
      const input = w.document.querySelector('input[type="search"]');
      Object.getOwnPropertyDescriptor(
        w.HTMLInputElement.prototype,
        "value",
      ).set.call(input, "readable");
      input.dispatchEvent(new w.Event("input", { bubbles: true }));
    });
    await click("popup", ".mode-button");
    await expect
      .poll(async () => await read())
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/sidepanel.html",
            query: "readable",
          }),
        ]),
      );
    await click("panel", ".tabs button:nth-child(1)");
    await expect
      .poll(
        async () =>
          (await read()).find((v) => v.path === "/sidepanel.html")?.text,
      )
      .toContain("Least used first");
    await click("panel", ".tabs button:nth-child(2)");
    await expect
      .poll(
        async () =>
          (await read()).find((v) => v.path === "/sidepanel.html")?.text,
      )
      .toContain("Least used first");
    await click("panel", ".tabs button:nth-child(4)");
    await click("panel", ".mode-button");
    await expect
      .poll(async () => await read())
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "/popup.html", query: "readable" }),
        ]),
      );
    await click("popup", ".tabs button:nth-child(5)");
    await expect
      .poll(async () => JSON.stringify(await read()))
      .toContain("Choose an element");
    await expect(app.page.locator("getter-inspection-overlay")).toHaveCount(1);
    await app.page.locator("#action").click();
    await expect
      .poll(async () => JSON.stringify(await read()))
      .toContain("button#action");
    await click("panel", ".mode-button");
    await expect
      .poll(async () => await read())
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "/popup.html", query: "readable" }),
        ]),
      );
    const prefs = await app.worker.evaluate(() =>
      chrome.storage.local.get("cssGetterOptions"),
    );
    expect(prefs.cssGetterOptions.workspace).toBe("popup");
    await expect
      .poll(() => app.worker.evaluate(() => chrome.storage.session.get(null)))
      .toEqual({});
    await expect(app.page.locator("getter-inspection-overlay")).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});

test("side panel follows tabs, rejects restricted pages, and clears old Inspect data", async ({}, info) => {
  const app = await launch(info);
  try {
    await app.page.goto(`${origin}/workbench`);
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 400, height: 820 });
    await expect(
      panel.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Inspect", exact: true }).click();
    await expect(
      panel.getByRole("heading", { name: "Choose an element" }),
    ).toBeVisible();
    await app.page.locator("#action").click();
    await expect(panel.locator(".element-title")).toContainText(
      "button#action",
    );
    await app.page.locator("iframe").first().hover();
    await app.page.locator("getter-inspection-overlay .box").click();
    await expect(
      panel.getByText(/Embedded page content is unavailable/),
    ).toBeVisible();
    const newTab = await app.context.newPage();
    await newTab.goto(origin);
    await newTab.bringToFront();
    // A tab that is still loading is intentionally stale until an explicit scan.
    await panel.getByRole("button", { name: /Scan again/ }).click();
    await expect(
      panel.getByRole("heading", { name: "Choose an element" }),
    ).toBeVisible();
    await expect(app.page.locator("getter-inspection-overlay")).toHaveCount(0);
    await expect(panel.locator(".element-title")).toHaveCount(0);
    await newTab.locator("h1").click({ position: { x: 10, y: 10 } });
    await expect(panel.locator(".element-title")).toContainText("h1#unchanged");
    await newTab.goto("chrome://settings");
    await panel.getByRole("button", { name: /Scan again/ }).click();
    await expect(
      panel.getByRole("heading", { name: "This page cannot be inspected" }),
    ).toBeVisible();
    await expect(panel.locator(".element-title")).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});

test("retained workspaces receive saved preferences without overwriting another view", async ({}, info) => {
  const app = await launch(info);
  try {
    const panel = await app.openPanel();
    await expect(
      panel.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Settings", exact: true }).click();
    const popup = await app.openPopup();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.getByRole("button", { name: "Settings", exact: true }).click();
    await popup
      .locator(".appearance-options label")
      .filter({ hasText: "Dark" })
      .click();
    await expect(
      panel.getByRole("radio", { name: "Dark", exact: true }),
    ).toBeChecked();
    await expect(panel.locator("html")).toHaveAttribute(
      "data-appearance",
      "dark",
    );
    await panel
      .getByRole("switch", { name: "Font size", exact: true })
      .uncheck();
    await expect(
      popup.getByRole("switch", { name: "Font size", exact: true }),
    ).not.toBeChecked();
    const saved = await app.worker.evaluate(
      async () =>
        (await chrome.storage.local.get("cssGetterOptions")).cssGetterOptions,
    );
    expect(saved.appearance).toBe("dark");
    expect(saved.fonts.fontSize).toBe(false);
    await popup
      .getByRole("switch", { name: "Load previews by default", exact: true })
      .check();
    await expect(
      panel.getByRole("switch", {
        name: "Load previews by default",
        exact: true,
      }),
    ).toBeChecked();
  } finally {
    await app.context.close();
  }
});

test("Text excludes hidden embedded content from results, clipboard and saved text", async ({}, info) => {
  const app = await launch(info);
  try {
    await app.page.evaluate(() => {
      for (const style of [
        "visibility:hidden",
        "visibility:collapse",
        "display:none",
        "opacity:0",
      ]) {
        const frame = document.createElement("iframe");
        frame.src = "/hidden-frame";
        frame.style.cssText = style;
        document.body.append(frame);
      }
      const parent = document.createElement("div");
      parent.style.visibility = "hidden";
      parent.innerHTML = '<iframe src="/hidden-frame"></iframe>';
      document.body.append(parent);
    });
    await expect
      .poll(
        () =>
          app.page
            .frames()
            .filter((frame) => frame.url().endsWith("/hidden-frame")).length,
      )
      .toBe(5);
    const popup = await app.openPopup();
    await expect(
      popup.getByRole("heading", { name: "Page palette", exact: true }),
    ).toBeVisible();
    await popup.evaluate(() => {
      navigator.clipboard.writeText = async (value) => {
        window.copiedText = value;
      };
    });
    await popup.getByRole("button", { name: "Text", exact: true }).click();
    await expect(popup.locator(".text-results")).toContainText("Visible text");
    await expect(popup.locator(".text-results")).toContainText("Frame text");
    await expect(popup.locator(".text-results")).not.toContainText(
      "Hidden embedded confidential marker",
    );
    await popup
      .getByRole("button", { name: "Copy available text", exact: true })
      .click();
    await expect
      .poll(() => popup.evaluate(() => window.copiedText))
      .toContain("Visible text");
    const copied = await popup.evaluate(() => window.copiedText);
    expect(copied).not.toContain("Hidden embedded confidential marker");
    const pending = popup.waitForEvent("download");
    await popup.getByRole("button", { name: /Save .txt/ }).click();
    const file = await pending;
    expect(await file.failure()).toBeNull();
    expect(await readFile(await file.path(), "utf8")).toBe(copied);
  } finally {
    await app.context.close();
  }
});

for (const mode of ["popup", "panel"]) {
  test(`${mode} keeps the existing cards with usage percentages, sorting and a consistent font total`, async ({}, info) => {
    const app = await launch(info);
    try {
      await app.page.goto(`${origin}/usage`);
      const view = await (mode === "panel" ? app.openPanel() : app.openPopup());
      await view.setViewportSize({
        width: mode === "panel" ? 400 : 720,
        height: mode === "panel" ? 820 : 600,
      });
      await expect(view.locator(".swatch")).toHaveCount(4);
      const counts = view.locator(".swatch .usage-frequency");
      await expect(counts).toHaveText([
        "54.5% of color uses",
        "18.2% of color uses",
        "18.2% of color uses",
        "9.1% of color uses",
      ]);
      const columns = await view
        .locator(".swatches")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        );
      expect(columns).toBe(mode === "panel" ? 2 : 4);
      await view.evaluate(() => {
        navigator.clipboard.writeText = async (value) => {
          window.copiedColor = value;
        };
      });
      await view
        .getByRole("button", { name: "Copy #187C70", exact: true })
        .click();
      await expect
        .poll(() => view.evaluate(() => window.copiedColor))
        .toBe("#187C70");
      const sort = view.getByRole("button", {
        name: "Most used first",
        exact: true,
      });
      await sort.focus();
      await sort.press("Enter");
      await expect(
        view.getByRole("button", { name: "Least used first", exact: true }),
      ).toBeFocused();
      await expect(counts).toHaveText([
        "9.1% of color uses",
        "18.2% of color uses",
        "18.2% of color uses",
        "54.5% of color uses",
      ]);
      await view.getByRole("button", { name: "Fonts", exact: true }).click();
      await expect(view.locator(".font")).toHaveCount(3);
      await expect(view.locator(".font .usage-frequency")).toHaveText([
        " · 60.0% of font uses",
        " · 10.0% of font uses",
        " · 10.0% of font uses",
      ]);
      await expect(view.locator(".font").first()).toContainText("Arial");
      await expect(
        view.locator(".font").first().locator("dl > div"),
      ).toHaveCount(5);
      await view
        .getByRole("button", { name: "Most used first", exact: true })
        .click();
      await expect(view.locator(".font .usage-frequency")).toHaveText([
        " · 10.0% of font uses",
        " · 10.0% of font uses",
        " · 60.0% of font uses",
      ]);
      await view.getByRole("button", { name: "Settings", exact: true }).click();
      await view
        .getByRole("switch", { name: "All font styles", exact: true })
        .check();
      if (mode === "panel")
        await view
          .locator(".appearance-options label")
          .filter({ hasText: "Dark" })
          .click();
      await view.getByRole("button", { name: "Settings", exact: true }).click();
      await expect(view.locator(".font")).toHaveCount(4);
      await expect(view.locator(".font .usage-frequency")).toHaveText([
        " · 10.0% of font uses",
        " · 10.0% of font uses",
        " · 20.0% of font uses",
        " · 60.0% of font uses",
      ]);
      await view
        .getByRole("button", { name: "Least used first", exact: true })
        .click();
      await view.screenshot({
        path: info.outputPath(`${mode}-font-usage.png`),
      });
      await view.getByRole("button", { name: "Colors", exact: true }).click();
      await expect(
        view.getByRole("button", { name: "Least used first", exact: true }),
      ).toBeVisible();
      await view
        .getByRole("button", { name: "Least used first", exact: true })
        .click();
      await view.screenshot({
        path: info.outputPath(`${mode}-color-usage.png`),
      });
      await expect(view.locator(".usage-frequency").first()).toContainText(
        "54.5%",
      );
      await view
        .getByRole("button", { name: "About usage percentages", exact: true })
        .click();
      await expect(view.getByText(/not screen area/)).toBeVisible();
      expect(
        await view.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    } finally {
      await app.context.close();
    }
  });
}

for (const mode of ["popup", "panel"]) {
  test(`${mode} aligns short and wrapped color cards at the top in both appearances`, async ({}, info) => {
    const app = await launch(info);
    try {
      await app.page.goto(`${origin}/mixed-colors`);
      const view = await (mode === "panel" ? app.openPanel() : app.openPopup());
      await view.setViewportSize({
        width: mode === "panel" ? 400 : 720,
        height: mode === "panel" ? 820 : 600,
      });
      await expect(view.locator(".swatch")).toHaveCount(7);
      for (const appearance of ["Light", "Dark"]) {
        await view
          .getByRole("button", { name: "Settings", exact: true })
          .click();
        await view
          .locator(".appearance-options label")
          .filter({ hasText: appearance })
          .click();
        await view
          .getByRole("button", { name: "Settings", exact: true })
          .click();
        await expect(view.locator(".notice")).toHaveCount(0);
        await view.screenshot({
          path: info.outputPath(
            `${mode}-${appearance.toLowerCase()}-mixed-colors.png`,
          ),
        });
        const cards = await view.locator(".swatch").evaluateAll((cards) =>
          cards.map((card) => {
            const swatch = card.querySelector(".color"),
              label = card.querySelector(".color-label");
            const c = card.getBoundingClientRect(),
              s = swatch.getBoundingClientRect(),
              l = label.getBoundingClientRect();
            return {
              row: c.top,
              gap: s.top - c.top,
              height: s.height,
              widthGap: c.width - s.width,
              labelGap: l.top - s.bottom,
              labelHeight: l.height,
              overflow: card.scrollWidth > card.clientWidth,
            };
          }),
        );
        // Long and short labels must share a row to reproduce the centering bug.
        const firstRow = cards.filter((c) => c.row === cards[0].row);
        expect(
          new Set(firstRow.map((c) => c.labelHeight)).size,
        ).toBeGreaterThan(1);
        for (const card of cards) {
          expect(card.gap).toBeCloseTo(1, 1);
          expect(card.height).toBeCloseTo(65, 1);
          expect(card.widthGap).toBeCloseTo(2, 1);
          expect(card.labelGap).toBeCloseTo(0, 1);
          expect(card.overflow).toBe(false);
        }
      }
      await view
        .getByRole("button", { name: "Most used first", exact: true })
        .click();
      const gaps = await view
        .locator(".swatch")
        .evaluateAll((cards) =>
          cards.map(
            (card) =>
              card.querySelector(".color").getBoundingClientRect().top -
              card.getBoundingClientRect().top,
          ),
        );
      expect(gaps.every((gap) => Math.abs(gap - 1) < 0.1)).toBe(true);
      await view.evaluate(() => {
        navigator.clipboard.writeText = async (value) => {
          window.copiedMixedColor = value;
        };
      });
      const modern = view.locator('.swatch[aria-label^="Copy oklch("]').first();
      const expected = (await modern.getAttribute("aria-label")).slice(5);
      await modern.click();
      await expect
        .poll(() => view.evaluate(() => window.copiedMixedColor))
        .toBe(expected);
    } finally {
      await app.context.close();
    }
  });
}
