import { test, expect, chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
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
const studioPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGNQybj//93dVf8ZQASIAwBmpgu9CscQTgAAAABJRU5ErkJggg==",
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
    if (req.url === "/component-selection") {
      res.setHeader("Content-Type", "text/html");
      const headline = (id, text) =>
        `<div class="card">${"<div>".repeat(6)}<h3 id="${id}">${text}</h3>${"</div>".repeat(6)}</div>`;
      res.end(`<!doctype html><title>Component selection fixture</title>
        <style>
          body { margin: 80px 30px; font: 16px system-ui; }
          #feature { display: grid; gap: 14px; width: 720px; padding: 22px; background: #eee; }
          #headlines { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
          .card { background: #fff; border: 1px solid #888; padding: 16px; }
          h3 { margin: 0; font: 600 18px/1.25 system-ui; }
          #player { position: relative; width: 420px; }
          #video { display: block; width: 420px; height: 210px; }
          #player button { position: absolute; bottom: 12px; left: 12px; }
          #wrapped { margin: 0; width: 220px; }
          iframe { width: 260px; height: 80px; border: 0; }
        </style>
        <article id="feature">
          <div id="player"><div><div><video id="video" muted autoplay playsinline></video></div></div>
            <button id="play">Player controls</button></div>
          <section id="headlines">${headline("first-headline", "First headline")}${headline("second-headline", "Second headline")}</section>
          <p id="wrapped">Keep these words on their original lines when they wrap across the card, even around <strong>inline content</strong> and the words that follow it.</p>
          <iframe src="${origin.replace("127.0.0.1", "localhost")}/frame" title="Embedded video"></iframe>
        </article>
        <script>
          const source = document.createElement("canvas");
          source.width = 160;
          source.height = 80;
          const paint = source.getContext("2d");
          document.getElementById("video").srcObject = source.captureStream(15);
          setInterval(() => {
            paint.fillStyle = "#254862";
            paint.fillRect(0, 0, 160, 80);
            paint.fillStyle = "#f4d128";
            paint.fillRect(20, 18, 40, 40);
          }, 65);
        </script>`);
      return;
    }
    if (req.url === "/frame") {
      res.setHeader("Content-Type", "text/html");
      res.end('<p style="color:rgb(10,20,30)">Frame text</p>');
      return;
    }
    if (req.url.split("?")[0] === "/usage") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><html><head><title>Usage fixture</title><style>
        body{color:#17253b;background:#fff;font:16px Arial}
        p{color:#187c70}p.alternate{color:#2059be;font-family:Georgia}
        h2{font-family:Georgia;font-style:italic}
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
    if (
      req.url === "/collection-component" ||
      req.url === "/collection-component-export"
    ) {
      const forExport = req.url === "/collection-component-export";
      const artwork = `<img alt="Site artwork" src="${imageOrigin}/studio-image.png">`;
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><title>Studio component fixture</title><style>
        body{color:#234567;font:16px Arial;margin:24px}
        #card{display:flex;gap:18px;padding:20px;background-color:#eeddaa;border-radius:12px;
          box-shadow:0 4px 12px #1122333a;animation:glide 2s linear infinite;}
        @keyframes glide{from{opacity:.8;transform:translateX(0)}to{opacity:1;transform:translateX(5px)}}
      </style><section id="card"><h2>Private fixture content</h2><button onclick="window.pageAction = true">Private fixture button</button>${forExport ? artwork + '<div style="opacity:0"><p id="invisible-copy">Invisible fixture content</p></div>' : ""}</section>${forExport ? "" : artwork}`);
      return;
    }
    if (req.url === "/studio-motion") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><title>Studio motion fixture</title><style>
        body { margin: 30px; font: 16px Arial; color: #203b32; }
        #promo { padding: 20px; width: 400px; box-shadow: 0 6px 18px #0003; animation: rise 120ms ease-out; }
        @keyframes rise { from { opacity: .1; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        #buy { color: white; background-color: #244939; transition: background-color 180ms ease-out; }
        #buy:hover { background-color: #32654e; }
      </style><main><article id="promo"><h2>Juniper blend</h2><img alt="Blend artwork" src="${imageOrigin}/studio-image.png" width="80" height="80"><button id="buy" onclick="window.bought=true">Shop blend</button><input placeholder="Email address" value="private-field-value"></article><section id="newsletter"><h2>Field notes</h2><p>Seasonal stories</p></section><span id="plain">Plain text</span></main><img alt="Vector artwork" src="${imageOrigin}/artwork.svg">`);
      return;
    }
    if (req.url === "/direct-artwork-motion") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><title>Direct artwork motion fixture</title>
        <style>
          body {margin:32px}
          #book-scene {position:relative;width:450px;height:260px}
          #book-clip {clip-path:inset(0px)}
          #book-clip canvas, #book-layer {pointer-events:none}
          #book-layer {position:absolute;inset:0}
          #book-target {position:absolute;top:52px;left:104px;width:144px;height:150px;pointer-events:auto}
          #book-target span {display:none}
          #book-target.painted::before {content:"";position:absolute;inset:0;background:#333}
          #cat-window {position:relative;width:190px;height:125px;overflow:hidden}
          #cat-turn {position:absolute;top:-16px;left:30px}
          canvas {display:block}
        </style>
        <div id="book-scene"><div id="book-clip"><canvas width="450" height="260"></canvas></div><div id="book-layer"><div id="book-target" aria-label="The featured book"><span>Book hit area</span></div></div></div>
        <div id="cat-window"><div id="cat-turn"><canvas width="150" height="165"></canvas></div></div>
        <script>
          const book=document.querySelector("#book-clip canvas").getContext("2d");
          const catTurn=document.querySelector("#cat-turn");
          const cat=catTurn.querySelector("canvas").getContext("2d");
          cat.fillStyle="#1471d9";
          cat.fillRect(0,0,150,165);
          cat.fillStyle="#eed340";
          cat.fillRect(20,32,45,31);
          function draw(t) {
            book.clearRect(0,0,450,260);
            book.fillStyle="#f00000";
            book.fillRect(0,0,30,260);
            book.fillStyle="#2459dc";
            book.fillRect(104,52,144,150);
            book.fillStyle="#13bf62";
            book.fillRect(140+22*Math.sin(t/190),86,28,54);
            catTurn.style.transform="rotate("+(17+3*Math.sin(t/230))+"deg)";
            requestAnimationFrame(draw);
          }
          requestAnimationFrame(draw);
        </script>`);
      return;
    }
    if (req.url === "/shelf-artwork-motion") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><title>Shelf artwork motion fixture</title>
        <style>
          body {margin:32px}
          #shelf {position:relative;width:450px;height:260px}
          #shelf canvas, #targets {position:absolute;inset:0;pointer-events:none}
          #gap, #spine, #neighbor {position:absolute;top:52px;height:150px;pointer-events:auto}
          #gap {left:0;width:450px}
          #spine {left:60px;width:44px}
          #neighbor {left:255px;width:130px}
        </style>
        <div id="shelf"><canvas width="450" height="260"></canvas><div id="targets">
          <div id="gap"></div><div id="spine"></div><div id="neighbor"></div>
        </div></div>
        <script>
          const spine = document.querySelector("#spine");
          const neighbor = document.querySelector("#neighbor");
          const canvas = document.querySelector("canvas");
          const ctx = canvas.getContext("2d");
          let start;
          window.addEventListener("wheel", () => { start ??= performance.now(); });
          window.addEventListener("keydown", (event) => {
            if (event.key === "ArrowRight") start ??= performance.now();
          });
          function draw(now) {
            const elapsed = start === undefined ? 0 : Math.max(0, now - start);
            const width = 44 + Math.round(Math.min(1, elapsed / 900) * 110);
            spine.style.width = width + "px";
            const turning = elapsed > 0 && elapsed < 460;
            spine.style.pointerEvents = neighbor.style.pointerEvents = turning ? "none" : "";
            ctx.clearRect(0, 0, 450, 260);
            ctx.fillStyle = "#04e00b";
            ctx.fillRect(0, 0, 450, 24);
            ctx.fillStyle = "#2459dc";
            ctx.fillRect(60, 52, width, 150);
            ctx.fillStyle = "#071f50";
            ctx.fillRect(66 + Math.floor(now / 100) % 10, 80, 5, 30);
            ctx.fillStyle = "#e6cd4e";
            if (width > 60) ctx.fillRect(114, 76, width - 62, 46);
            ctx.fillStyle = "#f00000";
            ctx.fillRect(255, 52, 130, 150);
            requestAnimationFrame(draw);
          }
          requestAnimationFrame(draw);
        </script>`);
      return;
    }
    if (req.url === "/nested-canvas-motion") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><title>Nested canvas motion fixture</title>
        <style>
          body {margin:40px}
          #book-stage {position:relative;width:480px;height:240px;background:#eee}
          #book-clip {position:absolute;inset:0 auto auto 0;width:340px;height:210px;clip-path:inset(0px);pointer-events:none}
          canvas {display:block;pointer-events:none}
        </style>
        <div id="book-stage">${"<span hidden></span>".repeat(180)}<div id="book-clip"><canvas width="340" height="210"></canvas></div></div>
        <script>
          function draw(time) {
            const canvas=document.querySelector("#book-clip canvas");
            const context=canvas.getContext("2d");
            context.clearRect(0,0,340,210);
            context.fillStyle="#4967aa";
            const offset=canvas.dataset.moving==="true"?35*Math.sin(time/220):0;
            context.fillRect(50+offset,50,80,110);
            requestAnimationFrame(draw);
          }
          requestAnimationFrame(draw);
        </script>`);
      return;
    }
    if (req.url === "/automatic-motion") {
      res.setHeader("Content-Type", "text/html");
      res.end(`<!doctype html><title>Automatic motion fixture</title>
        <style>body{min-height:200vh} canvas{display:block} #scroll-motion,#still{margin:40px; padding:16px; background:#2468df;color:white} #still{position:fixed;top:12px;right:12px} #hidden-media {height:80px;} #hidden-media span {opacity:0;} #masked {clip-path:inset(100%);} #cropped {width:48px;height:40px;overflow:hidden;} #static-crop {position:absolute;top:92vh;right:24px;}</style>
        <section id="moving"><canvas width="120" height="80"></canvas></section>
        <p id="scroll-motion">Scroll motion</p><p id="still">Still selection</p>
        <section id="hidden-media"><span><canvas width="120" height="10"></canvas></span><canvas id="masked" width="120" height="10"></canvas></section>
        <section id="cropped"><canvas width="120" height="40"></canvas></section><canvas id="static-crop" width="120" height="300"></canvas>
        <script>
          const section=document.querySelector("#moving");
          const canvas=section.querySelector("canvas");
          const ctx=canvas.getContext("2d");
          ctx.fillStyle="#278764";
          ctx.fillRect(15, 15, 60, 40);
          function move(t){canvas.style.transform="translateX("+Math.sin(t/160)*12+"px)";requestAnimationFrame(move);}
          requestAnimationFrame(move);
          const still=document.querySelector("#static-crop").getContext("2d");
          still.fillStyle="navy";
          still.fillRect(0,0,120,35);
          still.fillStyle="orange";
          still.fillRect(0,35,120,220);
          const samples=[...document.querySelectorAll("#hidden-media canvas,#cropped canvas")].map(node=>node.getContext("2d"));
          setInterval(() => {
            const green = Math.floor(performance.now()/200)%2 === 0;
            for (const sample of samples) {
              sample.fillStyle="red";
              sample.fillRect(0,0,120,40);
              sample.fillStyle=green?"green":"blue";
              sample.fillRect(0,0,49,40);
            }
          }, 100);
          window.addEventListener("scroll", () => {
            document.querySelector("#scroll-motion").style.translate = Math.min(scrollY/2, 100)+"px 0";
          });
        </script>`);
      return;
    }
    if (req.url.split("?")[0] === "/workbench") {
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
    fixtureHostGrants = true,
    permissionFixture = false,
    denyPermissionRequests = false,
    buildDir = "dist",
  } = {},
) {
  const extension = testInfo.outputPath("extension");
  await mkdir(extension, { recursive: true });
  await cp(buildDir, extension, { recursive: true });
  const manifest = JSON.parse(
    await readFile(path.join(extension, "manifest.json"), "utf8"),
  );
  // Test-only grants let an inactive popup exercise real injection against owned fixtures.
  // The shipping manifest is checked separately and has NO host permissions.
  if (fixtureHostGrants)
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
  if (permissionFixture || denyPermissionRequests) {
    await context.addInitScript(
      ({ permissionFixture }) => {
        if (!globalThis.chrome?.permissions) return;
        const state = {
          allowed: false,
          decision: "deny",
          requests: [],
          removals: [],
          deferred: null,
        };
        window.websiteAccessFixture = state;
        if (!permissionFixture) {
          // Leave real host permission enforcement intact; only decline the prompt.
          chrome.permissions.request = async (request) => {
            state.requests.push(request);
            return false;
          };
          return;
        }
        // UI-only permission responses over already-granted owned fixture hosts.
        // Native Chrome permission-boundary verification is recorded separately.
        const listeners = { added: new Set(), removed: new Set() };
        chrome.permissions.onAdded.addListener = (fn) =>
          listeners.added.add(fn);
        chrome.permissions.onAdded.removeListener = (fn) =>
          listeners.added.delete(fn);
        chrome.permissions.onRemoved.addListener = (fn) =>
          listeners.removed.add(fn);
        chrome.permissions.onRemoved.removeListener = (fn) =>
          listeners.removed.delete(fn);
        state.external = (allowed) => {
          state.allowed = allowed;
          for (const listener of listeners[allowed ? "added" : "removed"])
            listener({ origins: ["http://*/*", "https://*/*"] });
        };
        chrome.permissions.contains = async () => {
          if (state.deferContains && --state.deferContains === 0) {
            const allowed = state.allowed;
            return new Promise((resolve) => {
              state.releaseRead = () => resolve(allowed);
            });
          }
          return state.allowed;
        };
        chrome.permissions.request = async (request) => {
          state.requests.push(request);
          if (state.decision === "error")
            throw Error("Synthetic permission failure");
          if (state.decision === "defer")
            return new Promise((resolve) => {
              state.deferred = (allowed) => {
                state.external(allowed);
                resolve(allowed);
              };
            });
          if (state.decision === "allow") {
            state.external(true);
            return true;
          }
          return false;
        };
        chrome.permissions.remove = async (request) => {
          state.removals.push(request);
          state.external(false);
          return true;
        };
      },
      { permissionFixture },
    );
  }
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
    } else if (pathname === "/artwork.svg") {
      await route.fulfill({
        status: 200,
        headers: { ...headers, "content-type": "image/svg+xml" },
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="navy"/></svg>',
      });
    } else {
      await route.fulfill({
        status: 200,
        headers,
        body: pathname === "/studio-image.png" ? studioPng : png,
      });
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

test("Studio account QA entry preserves the free tool in popup and side panel", async ({}, info) => {
  execFileSync(process.execPath, ["scripts/build.mjs", "--studio-account-qa"]);
  const app = await launch(info, { buildDir: "dist-studio-qa" });
  try {
    await app.page.goto(`${origin}/workbench`);
    const popup = await app.openPopup();
    const panel = await app.openPanel();
    await popup.setViewportSize({ width: 720, height: 600 });
    await panel.setViewportSize({ width: 300, height: 820 });
    await panel.emulateMedia({ colorScheme: "dark" });
    await popup.emulateMedia({ colorScheme: "light" });
    const initialPages = app.context.pages().length;
    for (const [view, workspace] of [
      [popup, /Side panel/],
      [panel, /Popup/],
    ]) {
      const account = view.getByRole("button", {
        name: "Account",
        exact: true,
      });
      const settings = view.getByRole("button", {
        name: "Settings",
        exact: true,
      });
      const subscribe = view.getByRole("button", {
        name: "Subscribe to Studio",
      });
      const accountTitle = view.getByRole("heading", {
        name: "Account & plan",
      });
      const back = view.getByRole("button", { name: "Back", exact: true });
      const freeTools = view.getByRole("navigation", { name: "Explore page" });
      const workspaceButton = view.getByRole("button", { name: workspace });
      await expect(workspaceButton).toBeEnabled();
      await expect(
        freeTools.getByRole("button", { name: "Quick Inspect" }),
      ).toBeVisible();
      const row = await Promise.all(
        [account, workspaceButton, subscribe, settings].map((button) =>
          button.boundingBox(),
        ),
      );
      expect(new Set(row.map(({ y }) => Math.round(y))).size).toBe(1);
      expect(row.at(-1).x + row.at(-1).width).toBeLessThanOrEqual(
        (await view.evaluate(() => document.documentElement.clientWidth)) - 12,
      );

      await freeTools
        .getByRole("button", { name: "Text", exact: true })
        .click();
      const search = view.getByRole("searchbox", {
        name: "Find in extracted text",
      });
      await search.fill("readable world");
      const localData = await view.evaluate(() =>
        chrome.storage.local.get(null),
      );

      await account.click();
      await expect(accountTitle).toBeFocused();
      await expect(freeTools).toBeHidden();
      await expect(view.getByText("Signed out", { exact: true })).toBeVisible();
      await expect(
        view.getByRole("heading", { name: "Getter Free" }),
      ).toBeVisible();
      await expect(
        view.getByRole("heading", { name: "Getter Studio" }),
      ).toBeVisible();
      await expect(
        view.getByRole("button", { name: "Continue to sign-in" }),
      ).toBeInViewport();
      await view.screenshot({
        path: info.outputPath(
          `getter-${view === panel ? "side-panel" : "popup"}-account.png`,
        ),
      });
      await view
        .getByRole("button", { name: "Sign in or create an account" })
        .click();
      await expect(
        view.getByText(/Aptelum sign-in is unavailable/),
      ).toBeInViewport({ ratio: 1 });
      await back.click();
      await expect(account).toBeFocused();
      await expect(search).toHaveValue("readable world");

      await subscribe.click();
      const continueToSignIn = view.getByRole("button", {
        name: "Continue to sign-in",
      });
      await expect(continueToSignIn).toBeFocused();
      await continueToSignIn.click();
      await expect(
        view.getByText(/Aptelum sign-in is unavailable/),
      ).toBeInViewport({ ratio: 1 });
      await expect(
        view.getByRole("button", { name: "Open Studio" }),
      ).toHaveCount(0);
      await view
        .getByRole("button", { name: "Already subscribed? Sign in" })
        .click();
      await expect(
        view.getByText(/Aptelum sign-in is unavailable/),
      ).toBeVisible();
      await back.click();
      await expect(subscribe).toBeFocused();
      await expect(search).toHaveValue("readable world");

      await settings.click();
      const settingsAccount = view.getByRole("button", {
        name: /Account & plan/,
      });
      await settingsAccount.click();
      await expect(accountTitle).toBeVisible();
      await back.click();
      await expect(settingsAccount).toBeFocused();
      await settings.click();
      await expect(search).toHaveValue("readable world");
      expect(await view.evaluate(() => chrome.storage.local.get(null))).toEqual(
        localData,
      );
      expect(app.context.pages()).toHaveLength(initialPages);
    }
  } finally {
    await app.context.close();
  }
});

async function openStudioOptions(
  app,
  open = () => app.worker.evaluate(() => chrome.runtime.openOptionsPage()),
) {
  const nextPage = app.context.waitForEvent("page");
  await open();
  const studio = await nextPage;
  await expect(studio).toHaveURL(/\/studio\.html$/);
  return studio;
}

test("Studio collections save selected styles from multiple sites and reopen after Chrome restarts", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const buildDir = "dist-studio-workspace-qa";
  let app = await launch(info, { buildDir });
  try {
    const firstUrl = `${origin}/workbench?private=omit-first#omit-first-fragment`;
    await app.page.goto(firstUrl);
    const popup = await app.openPopup();
    const openStudio = popup.getByRole("button", { name: "Open Studio QA" });
    await expect(openStudio).toBeInViewport({ ratio: 1 });
    const studio = await openStudioOptions(app, () => openStudio.click());
    await studio.setViewportSize({ width: 1280, height: 860 });
    await studio.getByRole("button", { name: "New project" }).click();
    await studio
      .getByRole("textbox", { name: "Project name" })
      .fill("Fieldwork");
    await studio.keyboard.press("Enter");
    await expect(
      studio.getByRole("dialog", { name: "Create a project" }),
    ).toBeHidden();
    await expect(
      studio.getByRole("heading", { name: "Fieldwork collection" }),
    ).toBeVisible();
    await studio
      .getByLabel("Open tabs")
      .selectOption({ label: "Getter workspace fixture · 127.0.0.1" });
    await studio.getByRole("button", { name: "Scan styles" }).click();
    const color = studio.getByRole("checkbox", { name: /#123456/ });
    const font = studio.getByRole("checkbox", { name: /Arial.*body/ });
    await color.check();
    await font.check();
    await studio.getByRole("button", { name: "Save selected (2)" }).click();
    await expect(
      studio.getByText("Saved to the collection on this device."),
    ).toBeVisible();

    await color.check();
    await font.check();
    await studio.getByRole("button", { name: "Save selected (2)" }).click();
    await expect(
      studio.getByText("These styles are already saved from this scan."),
    ).toBeVisible();

    await color.check();
    await app.page.reload();
    await expect(
      studio.getByText(
        "The page changed or closed. Scan the current page before saving.",
      ),
    ).toBeVisible();
    await expect(
      studio.getByRole("button", { name: "Save selected (1)" }),
    ).toHaveCount(0);

    const secondUrl = `${origin.replace("127.0.0.1", "localhost")}/usage?private=omit-second#omit-second-fragment`;
    await studio.getByLabel("Website address").fill(secondUrl);
    await studio.getByRole("button", { name: "Open website" }).click();
    await studio
      .getByLabel("Open tabs")
      .selectOption({ label: "Usage fixture · localhost" });
    await studio.getByRole("button", { name: "Scan styles" }).click();
    await studio.getByRole("checkbox", { name: /#187C70/ }).check();
    await studio.getByRole("checkbox", { name: /Georgia.*h2.*italic/ }).check();
    await studio.getByLabel("Source reference").selectOption("title");
    await studio.getByRole("button", { name: "Save selected (2)" }).click();
    await expect(
      studio.getByText("Saved to the collection on this device."),
    ).toBeVisible();
    const views = studio.getByRole("navigation", { name: "Collection views" });
    await views
      .getByRole("button", { name: "Collection", exact: true })
      .click();
    const assets = studio.getByRole("region", { name: /Collection assets/ });
    await expect(assets.getByRole("article")).toHaveCount(4);
    await expect(
      assets.getByRole("article", { name: "#187C70", exact: true }),
    ).toBeVisible();
    await expect(
      assets.getByRole("article", { name: "#FFFFFF", exact: true }),
    ).toHaveCount(0);
    await studio.screenshot({
      path: info.outputPath("getter-studio-collection.png"),
    });

    const stored = await studio.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open("getter-studio-workspace-qa", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise((resolve, reject) => {
          const request = db
            .transaction("projects")
            .objectStore("projects")
            .getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } finally {
        db.close();
      }
    });
    const [first, second] = stored[0].collections[0].captures;
    expect(stored[0].collections[0].captures).toHaveLength(2);
    expect(first.source).toEqual({ hostname: "127.0.0.1" });
    expect(second.source).toEqual({ title: "Usage fixture" });
    expect(second.items).toContainEqual(
      expect.objectContaining({ type: "font", fontStyle: "italic" }),
    );
    expect(first.coverage.usageTotals.colors).toBeGreaterThan(
      first.items[0].count,
    );
    expect(first.coverage.framesOmitted).toBe(2);
    expect(JSON.stringify(stored)).not.toMatch(
      /omit-first|omit-second|\/workbench|\/usage|Readable world|sample image/i,
    );
    await studio.getByRole("button", { name: "Projects", exact: true }).click();
    await studio.getByRole("button", { name: "New project" }).click();
    await studio
      .getByRole("textbox", { name: "Project name" })
      .fill("Second brand");
    await studio
      .getByRole("button", { name: "Create project", exact: true })
      .click();
    await expect(
      studio.getByRole("heading", { name: "Second brand collection" }),
    ).toBeVisible();
    await views
      .getByRole("button", { name: "Collection", exact: true })
      .click();
    await expect(assets.getByRole("article")).toHaveCount(0);

    await app.context.close();
    app = await launch(info, { buildDir });
    const reopened = await openStudioOptions(app);
    await reopened
      .getByRole("button", { name: "Fieldwork collection", exact: true })
      .click();
    const restoredStyles = reopened.getByRole("region", {
      name: /Collection assets/,
    });
    await expect(restoredStyles.getByRole("article")).toHaveCount(4);
    await expect(
      restoredStyles.getByRole("article", { name: "#187C70", exact: true }),
    ).toBeVisible();
    await expect(
      reopened.getByRole("group", { name: "Styles found on this page" }),
    ).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});

test("Studio lists ungranted tabs without reading them and asks only for the selected site", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, {
    buildDir: "dist-studio-workspace-qa",
    fixtureHostGrants: false,
    denyPermissionRequests: true,
  });
  try {
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 300, height: 820 });
    const openStudio = panel.getByRole("button", { name: "Open Studio QA" });
    await expect(openStudio).toBeInViewport({ ratio: 1 });
    const studio = await openStudioOptions(app, () => openStudio.click());
    await studio.getByRole("button", { name: "New project" }).click();
    await studio
      .getByRole("textbox", { name: "Project name" })
      .fill("Local project");
    await studio
      .getByRole("button", { name: "Create project", exact: true })
      .click();
    const option = await studio
      .getByRole("option", { name: /127\.0\.0\.1/ })
      .getAttribute("value");
    await studio.getByLabel("Open tabs").selectOption(option);
    expect(await studio.evaluate(() => websiteAccessFixture.requests)).toEqual(
      [],
    );
    await studio.getByRole("button", { name: "Scan styles" }).click();
    await expect(
      studio.getByText(
        "Site access was declined. Your collection is unchanged.",
      ),
    ).toBeVisible();
    expect(await studio.evaluate(() => websiteAccessFixture.requests)).toEqual([
      { origins: ["http://127.0.0.1/*"] },
    ]);
    await studio
      .getByRole("navigation", { name: "Collection views" })
      .getByRole("button", { name: "Collection", exact: true })
      .click();
    await expect(
      studio
        .getByRole("region", { name: /Collection assets/ })
        .getByRole("article"),
    ).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});

test("Studio curates upgraded collections, captures component assets, and exports a reusable design kit", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/collection-component`);
    const popup = await app.openPopup();
    // Install the previous QA layout in this extension profile before opening Studio.
    await popup.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const opening = indexedDB.open("getter-studio-workspace-qa", 1);
          opening.onupgradeneeded = () =>
            opening.result.createObjectStore("projects", { keyPath: "id" });
          opening.onerror = () => reject(opening.error);
          opening.onsuccess = () => {
            const db = opening.result;
            const transaction = db.transaction("projects", "readwrite");
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
            transaction.onabort = () => reject(transaction.error);
            transaction.objectStore("projects").add({
              schemaVersion: 1,
              id: "prior-project",
              name: "Fieldwork",
              updatedAt: "2026-11-24T14:30:00Z",
              collection: {
                id: "prior-collection",
                name: "Fieldwork collection",
                captures: [
                  {
                    id: "old-capture",
                    scanId: "old-scan",
                    kind: "selected-styles",
                    extractionVersion: 1,
                    savedAt: "2026-11-24T14:30:00Z",
                    source: { hostname: "origin.example" },
                    coverage: { viewport: { width: 1280, height: 900 } },
                    items: [
                      {
                        type: "color",
                        value: "rgb(35, 69, 103)",
                        count: 5,
                        kinds: ["Text"],
                      },
                    ],
                  },
                ],
              },
            });
          };
        }),
    );
    const studio = await openStudioOptions(app);
    await studio.setViewportSize({ width: 1280, height: 880 });
    await studio
      .getByRole("button", { name: "Fieldwork collection", exact: true })
      .click();
    await studio.getByRole("button", { name: "Edit collection" }).click();
    const dialog = studio.getByRole("dialog");
    await dialog.getByLabel("Name", { exact: true }).fill("Fieldwork identity");
    await dialog.getByLabel("Notes").fill("Summer campaign");
    await dialog.getByRole("button", { name: "Save collection" }).click();
    await expect(
      studio.getByRole("heading", { name: "Fieldwork identity" }),
    ).toBeVisible();
    await expect(
      studio.getByRole("main").getByText("Summer campaign"),
    ).toBeVisible();

    const views = studio.getByRole("navigation", { name: "Collection views" });
    const assets = studio.getByRole("region", { name: /Collection assets/ });
    const color = assets.getByRole("article", {
      name: "Brand blue",
      exact: true,
    });
    await assets.getByRole("button", { name: "Item details" }).click();
    await dialog.getByLabel("Name", { exact: true }).fill("Brand blue");
    await dialog.getByLabel("Role").fill("Primary");
    await dialog.getByLabel("Color in this collection").fill("#2468DF");
    await dialog.getByRole("button", { name: "Save item" }).click();
    await expect(color.getByText("Primary", { exact: true })).toBeVisible();
    await expect(color.getByText("#2468DF", { exact: true })).toBeVisible();
    await views.getByRole("button", { name: "Captures", exact: true }).click();
    await studio.getByText("View captured values", { exact: true }).click();
    await expect(studio.getByText("#234567", { exact: true })).toBeVisible();

    await views.getByRole("button", { name: "Collect", exact: true }).click();
    await studio
      .getByLabel("Open tabs")
      .selectOption({ label: "Studio component fixture · 127.0.0.1" });
    await studio.getByRole("button", { name: "Scan styles" }).click();
    await studio.getByRole("checkbox", { name: /Site artwork/ }).check();
    const saved = studio.getByText("Saved to the collection on this device.", {
      exact: true,
    });
    await studio.getByRole("button", { name: "Save selected (1)" }).click();
    await expect(saved).toBeVisible();
    await studio.getByLabel("Add a local image").setInputFiles({
      name: "Broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("invalid image"),
    });
    await expect(studio.getByText(/could not be decoded/)).toBeVisible();
    await studio.getByLabel("Add a local image").setInputFiles({
      name: "Logo.png",
      mimeType: "image/png",
      buffer: studioPng,
    });
    await expect(saved).toBeVisible();

    await studio.getByRole("button", { name: "Pick an element" }).click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    await app.page
      .locator("#card")
      .click({ position: { x: 8, y: 8 }, force: true });
    await expect(
      studio.getByRole("heading", { name: "Review selected section" }),
    ).toBeVisible();
    await studio.getByLabel("Capture scope").selectOption("component");
    await studio.getByLabel("Name", { exact: true }).fill("Feature card");
    await studio.getByRole("button", { name: "Save capture" }).click();
    await expect(saved).toBeVisible();
    await studio.getByLabel("Capture scope").selectOption("effect");
    await studio.getByLabel("Name", { exact: true }).fill("Card shadow");
    await studio.getByRole("button", { name: "Save capture" }).click();
    await expect(saved).toBeVisible();
    await studio.getByLabel("Capture scope").selectOption("motion");
    await studio.getByLabel("Name", { exact: true }).fill("Card motion");
    await studio.getByRole("button", { name: "Play motion" }).click();
    expect(
      await studio
        .locator(".studio-sample")
        .evaluate((sample) => sample.getAnimations().length),
    ).toBeGreaterThan(0);
    await studio.getByRole("button", { name: "Save capture" }).click();
    await expect(saved).toBeVisible();

    await views
      .getByRole("button", { name: "Collection", exact: true })
      .click();
    await expect(assets.getByRole("article")).toHaveCount(6);
    await expect(
      assets.getByRole("article", { name: "Feature card" }),
    ).toContainText("button");
    await expect(studio.getByText(/Private fixture/)).toHaveCount(0);
    await expect(assets.getByRole("img", { name: "Logo.png" })).toBeVisible();
    await assets.getByRole("button", { name: "Images", exact: true }).click();
    await expect(assets.getByRole("article")).toHaveCount(2);
    await assets.getByLabel("Find assets").fill("logo");
    await expect(assets.getByRole("article")).toHaveCount(1);
    await assets.getByRole("button", { name: "All", exact: true }).click();
    await assets.getByLabel("Find assets").clear();
    await studio.screenshot({
      path: info.outputPath("getter-studio-curated-assets.png"),
    });
    await views
      .getByRole("button", { name: "Design kit", exact: true })
      .click();
    await studio.getByLabel("Kit name").fill("Fieldwork brand kit");
    await studio.getByRole("button", { name: "Save design kit" }).click();
    await expect(
      studio.getByText("Design kit saved on this device."),
    ).toBeVisible();
    await views
      .getByRole("button", { name: "Collection", exact: true })
      .click();
    await color.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(color).toHaveCount(0);
    await views
      .getByRole("button", { name: "Design kit", exact: true })
      .click();
    await studio
      .getByLabel("Saved design kits")
      .selectOption({ label: "Fieldwork brand kit" });
    await expect(
      studio.getByRole("checkbox", { name: /Brand blue/ }),
    ).toBeChecked();
    const filePromise = studio.waitForEvent("download");
    await studio.getByRole("button", { name: "Download export" }).click();
    const file = await filePromise;
    expect(await file.failure()).toBeNull();
    const zip = await JSZip.loadAsync(await readFile(await file.path()));
    const kit = JSON.parse(await zip.file("collection.json").async("text"));
    expect(kit.assets).toHaveLength(6);
    expect(JSON.stringify(kit)).not.toMatch(
      /Private fixture|origin\.example|images\.fixture\.test|getter-inspection-overlay/,
    );
    const css = await zip.file("styles.css").async("text");
    expect(css).toContain("--getter-color-brand-blue: #2468DF;");
    expect(css).toContain("@keyframes getter-card-motion-1");
    const importedColor = await studio.evaluate((css) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      return sheet.cssRules[0].style
        .getPropertyValue("--getter-color-brand-blue")
        .trim();
    }, css);
    expect(importedColor).toBe("#2468DF");
    for (const entry of kit.assets.filter(
      ({ value }) => value.type === "image",
    ))
      expect(await zip.file(entry.value.filename).async("nodebuffer")).toEqual(
        studioPng,
      );

    await studio.getByLabel("Destination").selectOption("figma");
    await expect(
      studio.getByText("1 of 6 selected items will transfer."),
    ).toBeVisible();
    const figmaPromise = studio.waitForEvent("download");
    await studio.getByRole("button", { name: "Download export" }).click();
    const figmaFile = await figmaPromise;
    expect(
      JSON.parse(await readFile(await figmaFile.path(), "utf8"))["brand-blue"]
        .$value,
    ).toEqual({
      colorSpace: "srgb",
      components: [36 / 255, 104 / 255, 223 / 255],
      alpha: 1,
    });
    await studio.getByLabel("Destination").selectOption("adobe");
    const adobePromise = studio.waitForEvent("download");
    await studio.getByRole("button", { name: "Download export" }).click();
    const adobeFile = await adobePromise;
    const ase = await readFile(await adobeFile.path());
    expect(ase.toString("ascii", 0, 4)).toBe("ASEF");
    expect(ase.readUInt32BE(8)).toBe(1);
    await studio.getByLabel("Destination").selectOption("canva");
    await expect(
      studio.getByRole("button", { name: "Print or save PDF" }),
    ).toBeEnabled();
    await studio.emulateMedia({ media: "print" });
    await expect(
      studio
        .locator(".studio-print-guide")
        .getByText("Brand blue", { exact: true }),
    ).toBeVisible();
    const guide = await studio.pdf({ format: "Letter", printBackground: true });
    expect(guide.toString("ascii", 0, 4)).toBe("%PDF");
    await studio.emulateMedia({ media: "screen" });
    await views
      .getByRole("button", { name: "Collection", exact: true })
      .click();
    await studio.getByText("Recently removed (1)", { exact: true }).click();
    await studio.getByRole("button", { name: "Restore Brand blue" }).click();
    await expect(color).toBeVisible();
    await studio.getByText("Manage collections", { exact: true }).click();
    await studio
      .getByRole("button", { name: "New collection", exact: true })
      .click();
    await dialog.getByLabel("Name", { exact: true }).fill("Campaign ideas");
    await dialog.getByRole("button", { name: "Create collection" }).click();
    await expect(
      studio.getByRole("heading", { name: "Campaign ideas" }),
    ).toBeVisible();
    await expect(assets.getByRole("article")).toHaveCount(0);
    await studio
      .getByRole("combobox", { name: "Collection", exact: true })
      .selectOption({ label: "Fieldwork identity" });
    await expect(assets.getByRole("article")).toHaveCount(6);
    await color.getByText("More actions", { exact: true }).click();
    await color.getByRole("button", { name: "Copy to collection" }).click();
    await dialog
      .getByRole("button", { name: "Copy item", exact: true })
      .click();
    await expect(
      studio.getByText("Item copied to the other collection."),
    ).toBeVisible();
    await studio
      .getByRole("combobox", { name: "Collection", exact: true })
      .selectOption({ label: "Campaign ideas" });
    await expect(
      color.getByText("origin.example", { exact: true }),
    ).toBeVisible();
    await views.getByRole("button", { name: "Collect", exact: true }).click();
    await studio
      .getByLabel("Open tabs")
      .selectOption({ label: "Studio component fixture · 127.0.0.1" });
    await studio.getByRole("button", { name: "Scan styles" }).click();
    await studio.getByRole("button", { name: "Save page styles" }).click();
    await expect(saved).toBeVisible();
    await views.getByRole("button", { name: "Captures", exact: true }).click();
    await expect(studio.getByText(/Page style snapshot/)).toHaveCount(1);
    await studio.getByRole("button", { name: "Capture new version" }).click();
    await studio
      .getByLabel("Open tabs")
      .selectOption({ label: "Studio component fixture · 127.0.0.1" });
    await studio.getByRole("button", { name: "Scan styles" }).click();
    await studio.getByRole("button", { name: "Save page styles" }).click();
    await expect(saved).toBeVisible();
    await views.getByRole("button", { name: "Captures", exact: true }).click();
    await expect(studio.getByText(/Page style snapshot/)).toHaveCount(2);
    await expect(studio.getByText(/New version/)).toBeVisible();
    await studio.reload();
    await studio
      .getByRole("button", { name: "Fieldwork identity", exact: true })
      .click();
    await views
      .getByRole("button", { name: "Design kit", exact: true })
      .click();
    await studio
      .getByLabel("Saved design kits")
      .selectOption({ label: "Fieldwork brand kit" });
    await expect(
      studio.getByRole("checkbox", { name: /Brand blue/ }),
    ).toBeChecked();
  } finally {
    await app.context.close();
  }
});

test("Studio Colors keeps Save inside each card and saves the full palette in one action", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/usage`);
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 300, height: 820 });
    const cards = panel.locator(".swatches > article.swatch");
    await expect(cards).toHaveCount(4);
    const card = cards.filter({
      has: panel.getByRole("button", { name: "Copy #187C70", exact: true }),
    });
    const copy = card.getByRole("button", {
      name: "Copy #187C70",
      exact: true,
    });
    const add = card.getByRole("button", {
      name: "Save to collection: #187C70",
      exact: true,
    });
    await expect(add).toHaveText(/Save to collection/);
    await panel.evaluate(() => {
      window.copiedColors = [];
      navigator.clipboard.writeText = async (value) =>
        window.copiedColors.push(value);
    });
    await copy.click();
    expect(await panel.evaluate(() => window.copiedColors)).toEqual([
      "#187C70",
    ]);
    const palette = panel.getByRole("button", {
      name: "Save palette to collection",
      exact: true,
    });
    await expect(palette).toBeInViewport({ ratio: 1 });
    await panel.screenshot({
      path: info.outputPath("getter-colors-collection.png"),
    });

    await add.click();
    const single = panel.getByRole("dialog", {
      name: "Save to collection",
      exact: true,
    });
    await expect(single.getByRole("checkbox")).toHaveCount(1);
    await expect(single.getByRole("checkbox")).toBeChecked();
    await single
      .getByRole("textbox", { name: "Project name" })
      .fill("Palette test");
    await single
      .getByRole("textbox", { name: /Collection name/ })
      .fill("Single swatch");
    await single.getByRole("button", { name: "Create and save" }).click();
    await expect(single.getByRole("status")).toContainText(
      "Saved to Single swatch",
    );
    await single.getByRole("button", { name: "Keep browsing" }).click();

    await palette.click();
    const full = panel.getByRole("dialog", {
      name: "Save palette to collection",
      exact: true,
    });
    await expect(full.getByText("4 colors from this scan")).toBeVisible();
    await expect(full.getByRole("checkbox")).toHaveCount(0);
    await full
      .getByRole("combobox", { name: "Collection", exact: true })
      .selectOption("");
    await full
      .getByRole("textbox", { name: "Collection name", exact: true })
      .fill("Page palette");
    await full
      .getByRole("button", { name: "Save palette", exact: true })
      .click();
    await expect(full.getByRole("status")).toContainText(
      "Saved to Page palette",
    );
    expect(await panel.evaluate(() => window.copiedColors)).toEqual([
      "#187C70",
    ]);
    const opened = app.context.waitForEvent("page");
    await full
      .getByRole("button", { name: "Open collection", exact: true })
      .click();
    const studio = await opened;
    const assets = studio.getByRole("region", { name: /Collection assets/ });
    await expect(assets.getByRole("article")).toHaveCount(4);
    for (const name of ["#187C70", "#17253B", "#2059BE", "#FFFFFF"]) {
      await expect(
        assets.getByRole("article", { name, exact: true }),
      ).toBeVisible();
    }
    await studio.getByRole("button", { name: "Captures", exact: true }).click();
    await expect(studio.getByText(/Color palette · 4 items/)).toBeVisible();
  } finally {
    await app.context.close();
  }
});

test("Studio Inspect keeps the existing tools and saves motion, text, and reusable component assets", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/studio-motion`);
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 370, height: 840 });
    await panel
      .getByRole("button", { name: "Quick Inspect", exact: true })
      .click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    await app.page.locator("#promo h2").click({ force: true });
    await panel
      .getByRole("button", { name: "Select parent", exact: true })
      .click();
    await expect(panel.locator(".element-title code")).toHaveText(
      "article#promo",
    );
    await panel.getByRole("button", { name: /Copy CSS/ }).click();
    await expect(panel.locator(".code-preview")).toContainText("article#promo");
    await panel.getByRole("button", { name: /Back to/ }).click();
    await panel.getByRole("switch", { name: "Show all properties" }).check();
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    const animation = panel.getByRole("region", { name: "Studio animation" });
    const dialog = panel.getByRole("dialog");
    const finished = app.page
      .locator("#promo")
      .evaluate((element) => element.getAnimations().length);
    expect(await finished).toBe(0);
    await animation.getByRole("button", { name: "Preview animation" }).click();
    expect(
      await animation
        .locator(".studio-sample")
        .evaluate((element) =>
          element
            .getAnimations()
            .some(({ effect }) => effect.getTiming().duration === 120),
        ),
    ).toBe(true);
    await animation
      .locator(".studio-sample")
      .evaluate((element) =>
        Promise.all(element.getAnimations().map((effect) => effect.finished)),
      );
    await panel.screenshot({
      path: info.outputPath("getter-inspect-animation.png"),
    });
    await animation.getByRole("button", { name: "Save animation" }).click();
    await dialog.getByRole("textbox", { name: "Project name" }).fill("Juniper");
    await expect(
      dialog.getByRole("textbox", { name: "Collection name" }),
    ).toHaveValue("Assets");
    await dialog.getByRole("button", { name: "Create and save" }).click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    await dialog.getByRole("button", { name: "Keep inspecting" }).click();

    const buy = app.page.locator("#buy");
    await buy.hover();
    await expect(buy).toHaveCSS("background-color", "rgb(50, 101, 78)");
    await buy.click({ force: true });
    const transition = panel.getByRole("region", { name: "Studio transition" });
    await transition
      .getByRole("button", { name: "Preview transition" })
      .click();
    expect(
      await transition
        .locator(".studio-sample")
        .evaluate((element) =>
          element
            .getAnimations()
            .some(({ effect }) =>
              effect.getKeyframes().some((frame) => frame.backgroundColor),
            ),
        ),
    ).toBe(true);
    await transition.getByRole("button", { name: "Save transition" }).click();
    await dialog
      .getByRole("button", { name: "Save transition", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    await dialog.getByRole("button", { name: "Keep inspecting" }).click();
    expect(await app.page.evaluate(() => window.bought)).toBeUndefined();
    await panel
      .getByRole("button", { name: "＋ Save to collection", exact: true })
      .click();
    await expect(dialog).toHaveAccessibleName("Save component to collection");
    await expect(
      dialog.getByRole("heading", { name: "button component" }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await panel
      .getByRole("button", { name: "Select parent", exact: true })
      .click();
    await panel
      .getByRole("button", { name: "＋ Save to collection", exact: true })
      .click();
    await expect(dialog).toHaveAccessibleName("Save component to collection");
    await expect(
      dialog.getByRole("button", { name: /Back to capture choices/ }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole("checkbox", { name: "Include 1 image" }),
    ).toBeChecked();
    await dialog
      .getByRole("button", { name: "Save component", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    await dialog.getByRole("button", { name: "Keep inspecting" }).click();
    await panel
      .getByRole("button", { name: "Individual assets", exact: true })
      .click();
    await expect(dialog).toHaveAccessibleName("Save an individual asset");
    await expect(
      dialog.getByRole("button", { name: /^Save font:/ }).first(),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /^Save component:/ }),
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

    await panel.getByRole("button", { name: "Text", exact: true }).click();
    await expect(
      panel.getByRole("button", { name: /Copy text/ }),
    ).toBeEnabled();
    await expect(
      panel.getByRole("button", { name: /Save \.txt/ }),
    ).toBeEnabled();
    await panel
      .getByRole("button", { name: "Save all text to collection" })
      .click();
    await dialog
      .getByRole("button", { name: "Save all text", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    const opened = app.context.waitForEvent("page");
    await dialog.getByRole("button", { name: "Open collection" }).click();
    const studio = await opened;
    const assets = studio.getByRole("region", { name: /Collection assets/ });
    await expect(assets.getByRole("article")).toHaveCount(4);
    const component = assets.getByRole("article", {
      name: "article component",
      exact: true,
    });
    await expect(
      component.getByText("Juniper blend", { exact: true }),
    ).toBeVisible();
    await expect(
      component.getByRole("img", { name: "Blend artwork" }),
    ).toBeVisible();
    await expect(component.getByText(/Captured motion/)).toBeVisible();
    await expect(assets.getByText("private-field-value")).toHaveCount(0);
    await expect(
      assets.getByRole("article", { name: "Page text", exact: true }),
    ).toContainText("Seasonal stories");
  } finally {
    await app.context.close();
  }
});

test("Quick Inspect opens from the popup while Pro is active", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/studio-motion`);
    const studio = await openStudioOptions(app);
    await studio
      .getByRole("button", { name: "Inspect Pro", exact: true })
      .click();
    const dialog = studio.getByRole("dialog");
    await dialog
      .getByRole("combobox", { name: "Open tabs", exact: true })
      .selectOption({ label: "Studio motion fixture · 127.0.0.1" });
    await dialog
      .getByRole("button", { name: "Open Inspect Pro", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    const native = () =>
      studio.evaluate(() =>
        chrome.extension
          .getViews()
          .filter((w) => w.location.pathname === "/sidepanel.html")
          .map((w) => ({
            head: w.document.querySelector("h1")?.textContent,
            quickInspect: !!w.document.querySelector(
              ".tabs button:last-child[aria-pressed=true]",
            ),
            body: w.document.body?.innerText,
          })),
      );
    await expect
      .poll(native)
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ head: "Inspect Pro" }),
        ]),
      );
    await app.worker.evaluate(() => chrome.action.openPopup());
    const cdp = await app.context.newCDPSession(studio);
    const opened = (await cdp.send("Target.getTargets")).targetInfos.find((t) =>
      t.url.endsWith("/popup.html"),
    );
    if (!opened) throw Error("Missing native popup.");
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId: opened.targetId,
      flatten: false,
    });
    const activity = new Promise((resolve, reject) => {
      const handler = (event) => {
        if (event.sessionId !== sessionId) return;
        const result = JSON.parse(event.message);
        if (result.id !== 1) return;
        cdp.off("Target.receivedMessageFromTarget", handler);
        result.error || result.result?.exceptionDetails
          ? reject(new Error(JSON.stringify(result)))
          : resolve();
      };
      cdp.on("Target.receivedMessageFromTarget", handler);
    });
    await cdp.send("Target.sendMessageToTarget", {
      sessionId,
      message: JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: {
          expression:
            "document.querySelector('.tabs button:nth-child(5)').click()",
          userGesture: true,
          returnByValue: true,
        },
      }),
    });
    await activity;
    await cdp.send("Target.detachFromTarget", { sessionId }).catch(() => {});
    await expect
      .poll(native)
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ quickInspect: true }),
        ]),
      );
  } finally {
    await app.context.close();
  }
});

test("Inspect Pro opens the native panel, previews and saves the whole selected component", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/studio-motion`);
    const studio = await openStudioOptions(app);
    await studio
      .getByRole("button", { name: "Inspect Pro", exact: true })
      .click();
    const sitePicker = studio.getByRole("dialog", {
      name: /Inspect Pro.*Choose a site/,
    });
    const tabChoice = sitePicker.getByRole("combobox", {
      name: "Open tabs",
      exact: true,
    });
    const mode = sitePicker.getByRole("combobox", {
      name: "How to open the page",
    });
    await expect(mode).toHaveValue("tab");
    await expect(
      sitePicker.getByRole("textbox", { name: "Website address", exact: true }),
    ).toHaveCount(0);
    await tabChoice.selectOption({
      label: "Studio motion fixture · 127.0.0.1",
    });
    await sitePicker.screenshot({
      path: info.outputPath("getter-inspect-pro-open-tabs.png"),
    });
    await mode.selectOption("address");
    await expect(tabChoice).toHaveCount(0);
    await sitePicker
      .getByRole("textbox", { name: "Website address", exact: true })
      .fill("https://would-open-if-both-inputs-were-active.example/");
    await sitePicker.screenshot({
      path: info.outputPath("getter-inspect-pro-address.png"),
    });
    await mode.selectOption("tab");
    await expect(
      sitePicker.getByRole("textbox", { name: "Website address", exact: true }),
    ).toHaveCount(0);
    await expect(tabChoice).not.toHaveValue("");
    await sitePicker.getByRole("button", { name: "Open Inspect Pro" }).click();
    await expect(sitePicker).toBeHidden();
    await expect
      .poll(() =>
        studio.evaluate(() =>
          chrome.extension
            .getViews()
            .some(
              (view) =>
                view.location.pathname === "/sidepanel.html" &&
                view.document.querySelector("h1")?.textContent ===
                  "Inspect Pro" &&
                view.document.body.innerText.includes("Choose an element"),
            ),
        ),
      )
      .toBe(true);
    await app.worker.evaluate(async () => {
      const window = await chrome.windows.getCurrent();
      await chrome.sidePanel.close({ windowId: window.id });
    });

    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 320, height: 880 });
    await expect(
      panel.getByRole("heading", { name: "Inspect Pro", exact: true }),
    ).toBeVisible();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    const selectionButton = panel.locator(".selection-button");
    await expect(selectionButton).toHaveText("Pause selection");
    await selectionButton.click();
    await expect(selectionButton).toHaveText("Resume selecting");
    await expect(app.page.locator("getter-inspection-overlay")).toHaveCount(0);
    await selectionButton.click();
    await expect(selectionButton).toHaveText("Pause selection");
    await expect(app.page.locator("#promo")).toHaveCSS("cursor", "crosshair");
    await app.page.locator("#promo").evaluate(async (component) => {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 21;
      const paint = canvas.getContext("2d");
      paint.fillStyle = "#2b634c";
      paint.fillRect(0, 0, 32, 21);
      const image = document.createElement("img");
      image.alt = "Readable preview artwork";
      image.width = 32;
      image.height = 21;
      image.src = canvas.toDataURL();
      component.append(image);
      await image.decode();
    });
    await app.page.locator("#promo h2").dispatchEvent("click");
    await panel
      .getByRole("button", { name: "Select parent", exact: true })
      .click();
    const selection = panel.locator(".element-title code");
    await expect(selection).toHaveText("article#promo");
    const parts = panel.getByRole("region", { name: "Component hierarchy" });
    const componentPreview = panel.getByRole("region", {
      name: "Component preview",
    });
    const highlight = componentPreview.locator("[data-highlighted-part]");
    const previewMark = componentPreview.getByRole("img", {
      name: "Readable preview artwork",
      exact: true,
    });
    await expect(previewMark).toHaveAttribute(
      "src",
      /^data:image\/webp;base64,/,
    );
    const previewTop = await componentPreview.boundingBox();
    const tabs = await panel
      .getByRole("group", { name: "Inspect sections" })
      .boundingBox();
    expect(previewTop.y).toBeLessThan(tabs.y);
    const rootHighlight = await highlight.boundingBox();
    await parts.getByRole("button", { name: /h2 · Juniper blend/ }).click();
    await expect(selection).toHaveText("article#promo > h2");
    await expect(highlight).not.toHaveAttribute("data-highlighted-part", "");
    expect((await highlight.boundingBox()).height).toBeLessThan(
      rootHighlight.height,
    );
    await expect(
      componentPreview.getByText("Juniper blend", { exact: true }),
    ).toBeVisible();
    await expect(
      componentPreview.getByText("Shop blend", { exact: true }),
    ).toBeVisible();
    const icon = panel.locator(".inspect-pro-context .inspect-pro-label svg");
    const iconPaint = () =>
      icon.evaluate((mark) => {
        const css = getComputedStyle(mark);
        return { stroke: css.stroke, color: css.color };
      });
    await panel.emulateMedia({ colorScheme: "light" });
    const light = await iconPaint();
    expect(light.stroke).toBe(light.color);
    await panel.emulateMedia({ colorScheme: "dark" });
    const dark = await iconPaint();
    expect(dark.stroke).toBe(dark.color);
    expect(dark.stroke).not.toBe(light.stroke);
    await expect(panel.locator(".inspect-pro-footer img")).toHaveAttribute(
      "src",
      "images/aptelum-mark.png",
    );
    await panel.screenshot({
      path: info.outputPath("getter-inspect-pro-parts-dark.png"),
    });
    await panel.emulateMedia({ colorScheme: "light" });
    await panel.screenshot({
      path: info.outputPath("getter-inspect-pro-parts-light.png"),
    });
    await parts.getByRole("button", { name: "article", exact: true }).click();
    await expect(selection).toHaveText("article#promo");

    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    await expect(
      componentPreview.getByText("Juniper blend", { exact: true }),
    ).toBeVisible();
    const animation = panel.getByRole("region", { name: "Studio animation" });
    await animation
      .getByRole("combobox", { name: "Playback speed" })
      .selectOption("0.25");
    await animation
      .getByRole("button", { name: "Preview animation", exact: true })
      .click();
    await expect(
      animation.getByRole("slider", {
        name: "Animation timeline in milliseconds",
      }),
    ).toBeVisible();
    expect(
      await animation
        .locator(".studio-sample > .studio-node")
        .evaluate((node) =>
          node.getAnimations().some((item) => item.playbackRate === 0.25),
        ),
    ).toBe(true);
    expect(
      await panel.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
    await animation.getByRole("slider").fill("1");
    await expect(animation.locator(".studio-sample")).toHaveCSS("opacity", "1");
    expect(
      await animation
        .locator(".studio-sample > .studio-node")
        .evaluate((node) => Number(getComputedStyle(node).opacity)),
    ).toBeLessThan(0.3);
    const saveAnimation = animation.getByRole("button", {
      name: "Save animation",
      exact: true,
    });
    await saveAnimation.scrollIntoViewIfNeeded();
    await expect(saveAnimation).toBeInViewport({ ratio: 1 });
    await panel.screenshot({
      path: info.outputPath("getter-inspect-pro-effects.png"),
    });

    await panel
      .getByRole("button", { name: "＋ Save to collection", exact: true })
      .click();
    const dialog = panel.getByRole("dialog", {
      name: "Save component to collection",
    });
    await expect(
      dialog.getByRole("heading", { name: "article component" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("region", { name: "Capture choices" }),
    ).toHaveCount(0);
    await dialog
      .getByRole("textbox", { name: "Project name" })
      .fill("Inspect Pro QA");
    await dialog.getByRole("button", { name: "Create and save" }).click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    await dialog.getByRole("button", { name: "Keep inspecting" }).click();
    await expect(selection).toHaveText("article#promo");
    await panel
      .getByRole("button", { name: "Individual assets", exact: true })
      .click();
    await expect(
      panel.getByRole("dialog", { name: "Save an individual asset" }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Cancel", exact: true }).click();

    const opened = app.context.waitForEvent("page");
    await panel
      .getByRole("button", { name: "Open collection", exact: true })
      .click();
    const collection = await opened;
    const component = collection.getByRole("article", {
      name: "article component",
      exact: true,
    });
    await expect(
      component.getByText("Juniper blend", { exact: true }),
    ).toBeVisible();
    await expect(
      component.getByRole("img", { name: "Blend artwork" }),
    ).toBeVisible();
    await expect(component.getByText(/Captured motion/)).toBeVisible();
    await expect(collection.getByText("private-field-value")).toHaveCount(0);
    await collection.close();

    await app.page.bringToFront();
    await expect(
      panel.getByRole("heading", { name: "Inspect Pro", exact: true }),
    ).toBeVisible();
    await app.page.reload();
    await expect(
      panel.getByRole("heading", { name: "Choose an element" }),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "＋ Save to collection" }),
    ).toHaveCount(0);
    await app.page.goto(
      `${origin.replace("127.0.0.1", "localhost")}/workbench`,
    );
    await expect(panel.locator(".inspect-pro-context")).toContainText(
      "localhost",
    );
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    await app.page.locator("#action").click();
    await expect(selection).toHaveText("button#action");

    const nextTab = await app.context.newPage();
    await nextTab.goto(`${origin}/studio-motion`);
    await nextTab.bringToFront();
    await expect(panel.locator(".inspect-pro-context")).toContainText(
      "127.0.0.1",
    );
    await expect(selection).toHaveCount(0);
    await expect(app.page.locator("getter-inspection-overlay")).toHaveCount(0);
    await expect(nextTab.locator("getter-inspection-overlay")).toBeAttached();
    await nextTab.locator("#promo h2").click();
    await expect(selection).toHaveText("article#promo > h2");
    await nextTab.goto("about:blank");
    await expect(
      panel.getByRole("heading", { name: "Open a website to inspect" }),
    ).toBeVisible();
    await nextTab.goto(`${origin}/studio-motion`);
    await expect(
      panel.getByRole("button", {
        name: /^(Pause selection|Resume selecting)$/,
      }),
    ).toBeVisible({ timeout: 15000 });
    const resume = panel.getByRole("button", {
      name: "Resume selecting",
      exact: true,
    });
    if (await resume.isVisible()) await resume.click();
    await expect(nextTab.locator("getter-inspection-overlay")).toBeAttached();
    await expect(selection).toHaveCount(0);
    await panel.getByRole("button", { name: "Back to Getter" }).click();
    await panel
      .getByRole("button", { name: "Quick Inspect", exact: true })
      .click();
    await expect(nextTab.locator("getter-inspection-overlay")).toBeAttached();
    await nextTab.locator("#promo h2").dispatchEvent("click");
    await panel.getByRole("button", { name: /Copy CSS/ }).click();
    await expect(panel.locator(".code-preview")).toContainText(
      "article#promo > h2",
    );
  } finally {
    await app.context.close();
  }
});

test("Inspect Pro keeps nested media and text in place while selecting or saving component parts", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    const thumbnailRequests = [];
    await app.context.addCookies([
      {
        name: "preview_session",
        value: "fixture-only",
        url: imageOrigin,
        secure: true,
        sameSite: "None",
      },
    ]);
    await app.context.route(
      `${imageOrigin}/component-thumb-*.png`,
      async (route) => {
        const request = route.request();
        const headers = await request.allHeaders();
        const filename = new URL(request.url()).pathname.split("/").at(-1);
        const displayOnly = Boolean(request.serviceWorker());
        const preview =
          displayOnly || headers.origin?.startsWith("chrome-extension://");
        if (preview)
          thumbnailRequests.push({
            filename,
            displayOnly,
            referrer: headers.referer,
            cookie: headers.cookie,
          });
        if (preview && filename.includes("blocked")) {
          await route.fulfill({ status: 403, body: "Image unavailable" });
          return;
        }
        await route.fulfill({
          status: 200,
          headers: {
            "content-type": "image/png",
            "access-control-allow-origin":
              filename === "component-thumb-10.png"
                ? "https://unrelated.fixture.test"
                : "*",
          },
          body: studioPng,
        });
      },
    );
    await app.page.goto(`${origin}/component-selection`);
    await app.page
      .locator("#feature")
      .evaluate(async (component, imageOrigin) => {
        const row = document.createElement("div");
        row.id = "thumbnail-row";
        Object.assign(row.style, {
          display: "flex",
          width: "420px",
          overflow: "hidden",
        });
        component.append(row);
        const images = Array.from({ length: 11 }, (_, index) => {
          const image = document.createElement("img");
          const name = index === 10 ? "blocked" : String(index + 1);
          image.id = `thumbnail-${name}`;
          image.alt = `Component thumbnail ${name}`;
          image.width = 140;
          image.height = 90;
          image.style.flexShrink = "0";
          image.src = `${imageOrigin}/component-thumb-${name}.png`;
          row.append(image);
          return image.decode();
        });
        await Promise.all(images);
      }, imageOrigin);
    await app.page.locator("#video").evaluate(async (video) => {
      await video.play();
    });
    const studio = await openStudioOptions(app);
    await studio
      .getByRole("button", { name: "Inspect Pro", exact: true })
      .click();
    const picker = studio.getByRole("dialog", {
      name: /Inspect Pro.*Choose a site/,
    });
    await picker.getByRole("combobox", { name: "Open tabs" }).selectOption({
      label: "Component selection fixture · 127.0.0.1",
    });
    await picker.getByRole("button", { name: "Open Inspect Pro" }).click();
    await expect(picker).toBeHidden();
    await app.worker.evaluate(async () => {
      const window = await chrome.windows.getCurrent();
      await chrome.sidePanel.close({ windowId: window.id });
    });
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 320, height: 900 });
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    const feature = app.page.locator("#feature");
    await feature.click({ position: { x: 5, y: 5 } });

    const selection = panel.locator(".element-title code");
    const preview = panel.getByRole("region", { name: "Component preview" });
    const parts = panel.getByRole("region", { name: "Component hierarchy" });
    const outline = preview.locator("[data-highlighted-part]");
    const frame = preview.getByRole("img", {
      name: "Video frame",
      exact: true,
    });
    await expect(selection).toHaveText("article#feature");
    await expect(frame).toHaveAttribute("src", /^data:image\/webp;base64,/);
    const thumbnails = preview.getByRole("img", {
      name: /^Component thumbnail \d+$/,
    });
    await expect(thumbnails).toHaveCount(10);
    await expect
      .poll(() =>
        thumbnails.evaluateAll(
          (images) => images.filter((image) => image.naturalWidth > 0).length,
        ),
      )
      .toBe(10);
    const displayOnly = preview.getByRole("img", {
      name: "Component thumbnail 10",
      exact: true,
    });
    await expect(displayOnly).toHaveAttribute(
      "src",
      /\/inspect-preview-image\?/,
    );
    expect(
      await displayOnly.evaluate((image) => {
        const context = document.createElement("canvas").getContext("2d");
        context.drawImage(image, 0, 0);
        try {
          context.getImageData(0, 0, 1, 1);
          return false;
        } catch (error) {
          return error.name === "SecurityError";
        }
      }),
    ).toBe(true);
    await expect(
      preview.getByText("Image unavailable", { exact: true }),
    ).toHaveCount(1);
    expect(
      new Set(thumbnailRequests.map(({ filename }) => filename)).size,
    ).toBe(11);
    expect(
      thumbnailRequests.some(
        ({ filename, displayOnly }) =>
          filename === "component-thumb-10.png" && displayOnly,
      ),
    ).toBe(true);
    expect(
      thumbnailRequests.every(({ referrer, cookie }) => !referrer && !cookie),
    ).toBe(true);
    await expect(
      preview.getByText("Embedded frame", { exact: true }),
    ).toBeVisible();
    await expect(preview.getByText("Frame text", { exact: true })).toHaveCount(
      0,
    );
    const lines = await preview
      .locator(".inspect-pro-text-run")
      .evaluateAll((runs) =>
        runs.flatMap((run) => {
          const text = run.textContent;
          return /Keep these words|original lines|wrap across|inline content/.test(
            text,
          )
            ? [parseFloat(run.style.top)]
            : [];
        }),
      );
    expect(new Set(lines).size).toBeGreaterThanOrEqual(3);

    const first = preview.getByText("First headline", { exact: true });
    const second = preview.getByText("Second headline", { exact: true });
    await expect(first).toBeVisible();
    await expect(second).toBeVisible();
    expect((await second.boundingBox()).x).toBeGreaterThan(
      (await first.boundingBox()).x + 40,
    );

    const rootRect = await feature.boundingBox();
    async function expectPart(button, selector) {
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(selection).toHaveText(selector);
      const source = await app.page.locator(selector).boundingBox();
      const bounds = await outline.evaluate((element) =>
        ["left", "top", "width", "height"].map((dimension) =>
          parseFloat(element.style[dimension]),
        ),
      );
      expect(bounds).toEqual(
        [
          source.x - rootRect.x,
          source.y - rootRect.y,
          source.width,
          source.height,
        ].map(Math.round),
      );
      await expect(frame).toBeVisible();
      await expect(first).toBeVisible();
      await expect(second).toBeVisible();
    }
    const part = (name) => parts.getByRole("button", { name, exact: true });
    await expectPart(part("video"), "video#video");
    await expectPart(part("button · Player controls"), "button#play");
    await expectPart(part("h3 · First headline"), "h3#first-headline");
    await expectPart(part("img").nth(9), "img#thumbnail-10");
    const previewFrame = preview.locator(".inspect-pro-preview-frame");
    const scrollLeft = () =>
      previewFrame.evaluate((element) => element.scrollLeft);
    const visibleFraction = () =>
      outline.evaluate((mark) => {
        const part = mark.getBoundingClientRect();
        const viewport = mark.closest(".inspect-pro-preview-frame");
        const frame = viewport.getBoundingClientRect();
        return (
          Math.max(
            0,
            Math.min(part.right, frame.left + viewport.clientWidth) -
              Math.max(part.left, frame.left),
          ) / part.width
        );
      });
    const afterRight = await scrollLeft();
    expect(afterRight).toBeGreaterThan(0);
    await expect.poll(visibleFraction).toBeGreaterThan(0.9);
    await expectPart(part("h3 · Second headline"), "h3#second-headline");
    await expect.poll(scrollLeft).toBeLessThan(afterRight);
    await expect.poll(visibleFraction).toBeGreaterThan(0.9);
    expect(
      await panel.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
    await preview.screenshot({
      path: info.outputPath("component-preview-second-headline.png"),
    });

    await panel.getByRole("button", { name: /Save to collection/ }).click();
    const destination = panel.getByRole("dialog", {
      name: "Save component to collection",
    });
    await expect(
      destination.getByRole("heading", { name: "article component" }),
    ).toBeVisible();
    await destination
      .getByRole("textbox", { name: "Project name" })
      .fill("Full component QA");
    await destination.getByRole("button", { name: "Create and save" }).click();
    await expect(destination.getByRole("status")).toContainText(
      "Saved to Assets",
    );
    const opened = app.context.waitForEvent("page");
    await destination.getByRole("button", { name: "Open collection" }).click();
    const collection = await opened;
    const saved = collection.getByRole("article", {
      name: "article component",
      exact: true,
    });
    await expect(
      saved.getByText("First headline", { exact: true }),
    ).toBeVisible();
    await expect(
      saved.getByText("Second headline", { exact: true }),
    ).toBeVisible();
  } finally {
    await app.context.close();
  }
});

test("Inspect Pro accepts a typed site and requests only that site when asked", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, {
    buildDir: "dist-studio-workspace-qa",
    fixtureHostGrants: false,
    denyPermissionRequests: true,
  });
  try {
    const studio = await openStudioOptions(app);
    await studio
      .getByRole("button", { name: "Inspect Pro", exact: true })
      .click();
    const picker = studio.getByRole("dialog", {
      name: /Inspect Pro.*Choose a site/,
    });
    await picker
      .getByRole("combobox", { name: "How to open the page" })
      .selectOption("address");
    await expect(
      picker.getByRole("combobox", { name: "Open tabs" }),
    ).toHaveCount(0);
    await picker
      .getByRole("textbox", { name: "Website address", exact: true })
      .fill(`${origin}/studio-motion`);
    const opened = app.context.waitForEvent("page");
    await picker.getByRole("button", { name: "Open Inspect Pro" }).click();
    const site = await opened;
    await expect(picker).toBeHidden();
    await expect(site).toHaveURL(`${origin}/studio-motion`);
    await app.worker.evaluate(async () => {
      const window = await chrome.windows.getCurrent();
      await chrome.sidePanel.close({ windowId: window.id });
    });
    const panel = await app.openPanel();
    await expect(
      panel.getByRole("heading", { name: "Allow Inspect Pro on this site" }),
    ).toBeVisible();
    expect(await panel.evaluate(() => websiteAccessFixture.requests)).toEqual(
      [],
    );
    await panel
      .getByRole("button", { name: "Allow site access", exact: true })
      .click();
    await expect(panel.getByRole("status")).toContainText(
      "Site access wasn’t allowed",
    );
    expect(await panel.evaluate(() => websiteAccessFixture.requests)).toEqual([
      { origins: ["http://127.0.0.1/*"] },
    ]);
    await expect(site.locator("getter-inspection-overlay")).toHaveCount(0);
    await site.goto(`${origin.replace("127.0.0.1", "localhost")}/workbench`);
    await expect(
      panel.getByRole("heading", { name: "Inspect Pro", exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByText(/Grant Getter access to localhost/),
    ).toBeVisible();
    expect(
      await panel.evaluate(() => websiteAccessFixture.requests),
    ).toHaveLength(1);
    await panel
      .getByRole("button", { name: "Allow site access", exact: true })
      .click();
    expect(await panel.evaluate(() => websiteAccessFixture.requests)).toEqual([
      { origins: ["http://127.0.0.1/*"] },
      { origins: ["http://localhost/*"] },
    ]);
    await expect(site.locator("getter-inspection-overlay")).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});

test("Studio detects and replays selected canvas and scroll motion without a recording step", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/automatic-motion`);
    const panel = await app.openPanel();
    await panel
      .getByRole("button", { name: "Quick Inspect", exact: true })
      .click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    const canvas = app.page.locator("#moving canvas");
    expect(await canvas.evaluate((node) => node.getAnimations().length)).toBe(
      0,
    );
    await canvas.dispatchEvent("click");
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    const motion = panel.getByRole("region", {
      name: "Studio observed motion",
    });
    await expect(motion.getByRole("heading")).toHaveText("Canvas motion");
    await motion.getByRole("button", { name: "Preview motion" }).click();
    await expect(motion.getByRole("status")).toHaveText("Preview complete.");
    await expect(motion.getByRole("img")).toBeVisible();
    await motion.getByRole("button", { name: "Save motion" }).click();
    const dialog = panel.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Project name" })
      .fill("Motion tests");
    await dialog.getByRole("button", { name: "Create and save" }).click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    const opened = app.context.waitForEvent("page");
    await dialog.getByRole("button", { name: "Open collection" }).click();
    const studio = await opened;
    const saved = studio.getByRole("article", {
      name: "Canvas motion",
      exact: true,
    });
    await expect(saved.getByRole("img")).toBeVisible();
    await saved.getByRole("button", { name: "Preview motion" }).click();
    await expect(saved.getByRole("status")).toHaveText("Preview complete.");
    await studio.close();
    await app.page.bringToFront();
    const resume = panel.getByRole("button", { name: "Resume selecting" });
    if (await resume.isVisible()) await resume.click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    await canvas.dispatchEvent("click");
    await app.page.locator("#still").dispatchEvent("click");
    await expect(panel.locator(".element-title code")).toHaveText("p#still");
    const effects = panel.getByRole("button", { name: "Effects", exact: true });
    if ((await effects.getAttribute("aria-pressed")) !== "true")
      await effects.click();
    await expect(panel.getByText(/^No motion detected/)).toBeVisible();
    await app.page.mouse.wheel(0, 40);
    await app.page.waitForFunction(() => scrollY >= 40);
    await expect(motion).toHaveCount(0);
    await expect(panel.getByText(/^No motion detected/)).toBeVisible();
    await app.page.locator("#hidden-media").dispatchEvent("click");
    await expect(panel.locator(".element-title code")).toHaveText(
      "section#hidden-media",
    );
    await expect(panel.getByText(/^No motion detected/)).toBeVisible();
    await expect(motion).toHaveCount(0);

    await app.page.locator("#cropped").dispatchEvent("click");
    await expect(panel.locator(".element-title code")).toHaveText(
      "section#cropped",
    );
    await expect(motion.getByRole("heading")).toHaveText("Canvas motion");
    const crop = await motion
      .locator(".studio-visual-stage img")
      .evaluate(async (image) => {
        await image.decode();
        const buffer = document.createElement("canvas");
        buffer.width = image.naturalWidth;
        buffer.height = image.naturalHeight;
        const context = buffer.getContext("2d");
        context.drawImage(image, 0, 0);
        return {
          width: buffer.width,
          red: context
            .getImageData(0, 0, buffer.width, buffer.height)
            .data.some((value, index) => index % 4 === 0 && value > 150),
        };
      });
    expect(crop).toEqual({ width: 48, red: false });
    await app.page.locator("#cropped canvas").evaluate((node) => {
      node.style.transform = "scaleX(-1)";
    });
    await app.page.locator("#hidden-media").dispatchEvent("click");
    await expect(panel.locator(".element-title code")).toHaveText(
      "section#hidden-media",
    );
    await app.page.locator("#cropped").dispatchEvent("click");
    await expect(panel.locator(".element-title code")).toHaveText(
      "section#cropped",
    );
    await expect(panel.getByText(/^No motion detected/)).toBeVisible();
    await expect(motion).toHaveCount(0);

    await app.page.locator("#static-crop").dispatchEvent("click");
    await expect(panel.locator(".element-title code")).toHaveText(
      "canvas#static-crop",
    );
    await app.page.mouse.wheel(0, 32);
    await app.page.waitForFunction(() => scrollY >= 72);
    await expect(panel.getByText(/^No motion detected/)).toBeVisible();
    await expect(motion).toHaveCount(0);

    await app.page.locator("#scroll-motion").dispatchEvent("click");
    await expect(panel.locator(".element-title code")).toHaveText(
      "p#scroll-motion",
    );
    await expect(panel.getByText(/^No motion detected/)).toBeVisible();
    await app.page.mouse.wheel(0, 80);
    await expect(motion.getByRole("heading")).toHaveText("Scripted motion");
    await motion.getByRole("button", { name: "Preview motion" }).click();
    expect(
      await motion
        .locator(".studio-sample")
        .evaluate((element) =>
          element
            .getAnimations()
            .some(({ effect }) =>
              effect.getKeyframes().some((frame) => frame.translate),
            ),
        ),
    ).toBe(true);
  } finally {
    await app.context.close();
  }
});

test("Studio retries a deep pointer-transparent canvas from the same unambiguous selection", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/nested-canvas-motion`);
    const panel = await app.openPanel();
    await panel
      .getByRole("button", { name: "Quick Inspect", exact: true })
      .click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    const stage = app.page.locator("#book-stage");
    const clip = app.page.locator("#book-clip");
    const canvas = clip.locator("canvas");
    const click = (x = 110) => stage.click({ position: { x, y: 100 } });
    const motion = panel.getByRole("region", {
      name: "Studio observed motion",
    });
    const still = panel.getByText(/^No motion detected/);
    async function retryOutsideCanvas() {
      const bounds = await stage.boundingBox();
      await app.page.mouse.move(bounds.x + 410, bounds.y - 12);
      await app.page.mouse.move(bounds.x + 410, bounds.y + 100);
    }

    await click();
    await expect(panel.locator(".element-title code")).toHaveText(
      "div#book-stage",
    );
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    await expect(still).toBeVisible();
    await canvas.evaluate((node) => {
      node.dataset.moving = "true";
    });
    await retryOutsideCanvas();
    await expect(motion.getByText(/Canvas in selection/)).toBeVisible();
    await expect(
      motion.getByRole("button", { name: "Save motion" }),
    ).toBeEnabled();
    await motion.getByRole("button", { name: "Preview motion" }).click();
    await expect(motion.getByRole("status")).toHaveText("Preview complete.");

    await canvas.evaluate((node) => {
      node.dataset.moving = "false";
    });
    await click();
    await expect(still).toBeVisible();
    await canvas.evaluate((node) => {
      const replacement = node.cloneNode();
      replacement.dataset.moving = "true";
      node.replaceWith(replacement);
    });
    await retryOutsideCanvas();
    await expect(
      panel.getByText(/^This motion can’t be previewed/),
    ).toBeVisible();
    await expect(motion).toHaveCount(0);

    async function expectNoPreview(x) {
      await click(x);
      await expect(still).toBeVisible();
      await expect(motion).toHaveCount(0);
    }

    await expectNoPreview(410);
    await clip.evaluate((node) => {
      node.style.clipPath = "inset(8px)";
    });
    await expectNoPreview();
    await clip.evaluate((node) => {
      node.style.clipPath = "inset(0px round 12px)";
    });
    await expectNoPreview();
    await clip.evaluate((node) => {
      node.style.clipPath = "";
    });
    await canvas.evaluate((node) => {
      node.style.transform = "translateX(12px)";
    });
    await expectNoPreview();
    await canvas.evaluate((node) => {
      node.style.transform = "";
      const other = node.cloneNode();
      other.style.position = "absolute";
      other.style.inset = "0";
      node.after(other);
    });
    await expectNoPreview();
    await stage.locator("span").evaluateAll((nodes) => {
      for (const node of nodes) node.remove();
    });
    await expectNoPreview();
    await clip
      .locator("canvas")
      .last()
      .evaluate((node) => node.remove());
    await expectNoPreview(410);
  } finally {
    await app.context.close();
  }
});

test("Studio previews clicked artwork within its hitbox and preserves a visible canvas rotation", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/direct-artwork-motion`);
    const panel = await app.openPanel();
    await panel
      .getByRole("button", { name: "Quick Inspect", exact: true })
      .click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    const book = app.page.locator("#book-target");
    const artwork = panel.getByRole("region", {
      name: "Studio observed motion",
    });
    const visual = artwork.locator(".studio-visual-stage img");
    const start = panel.getByText(/Checking the selected element for motion/);
    const absent = panel.getByText(
      /No motion detected|This motion can’t be previewed/,
    );

    await book.click();
    await expect(panel.locator(".element-title code")).toHaveText(
      "div#book-target",
    );
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    await expect(artwork.getByText(/Selected artwork/)).toBeVisible();
    expect(
      await visual.evaluate(async (image) => {
        await image.decode();
        const scratch = document.createElement("canvas");
        scratch.width = image.naturalWidth;
        scratch.height = image.naturalHeight;
        const ctx = scratch.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(
          0,
          0,
          scratch.width,
          scratch.height,
        ).data;
        return {
          width: scratch.width,
          height: scratch.height,
          red: pixels.some((value, i) => i % 4 === 0 && value > 150),
        };
      }),
    ).toEqual({ width: 144, height: 150, red: false });
    const firstFrame = await visual.getAttribute("src");
    await artwork.getByRole("button", { name: "Preview motion" }).click();
    await expect(artwork.getByRole("status")).toHaveText("Preview complete.");

    // Moving off the book can hide the page's target while the preview is open.
    await book.evaluate((node) => {
      node.style.display = "none";
    });
    await artwork
      .getByRole("button", { name: "Save motion", exact: true })
      .click();
    const dialog = panel.getByRole("dialog");
    await expect(dialog.locator(".studio-visual-stage img")).toHaveAttribute(
      "src",
      firstFrame,
    );
    await dialog.getByRole("textbox", { name: "Project name" }).fill("Artwork");
    await dialog.getByRole("button", { name: "Create and save" }).click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    await dialog.getByRole("button", { name: "Keep inspecting" }).click();
    await book.evaluate((node) => {
      node.style.display = "";
    });

    await book.evaluate((node) => node.classList.add("painted"));
    await book.click();
    await expect(start).toBeVisible();
    await expect(absent).toBeVisible();
    await expect(visual).toHaveCount(0);

    await book.evaluate((node) => {
      node.classList.remove("painted");
      node.style.left = "288px";
    });
    await book.click();
    await expect(
      panel.getByText("Select artwork on the page to preview its motion."),
    ).toBeVisible();
    await expect(visual).toHaveCount(0);

    await book.evaluate((node) => {
      node.style.left = "";
      node.parentElement.style.overflow = "hidden";
      node.parentElement.style.width = "180px";
    });
    await book.click();
    await expect(start).toBeVisible();
    await expect(absent).toBeVisible();
    await expect(visual).toHaveCount(0);

    await book.evaluate((node) => {
      node.parentElement.style.overflow = "";
      node.parentElement.style.width = "";
      const wrapper = document.querySelector("#book-clip");
      wrapper.style.clipPath = "none";
      wrapper.querySelector("canvas").style.transform = "scaleX(-1)";
    });
    await book.click();
    await expect(start).toBeVisible();
    await expect(absent).toBeVisible();
    await expect(visual).toHaveCount(0);
    await app.page.locator("#book-clip canvas").evaluate((node) => {
      node.parentElement.style.clipPath = "";
      node.style.transform = "";
    });

    await book.evaluate((node) => {
      node.style.left = "";
    });
    await book.click();
    await expect(start).toBeVisible();
    await app.page
      .locator("#book-clip canvas")
      .evaluate((node) => document.body.append(node));
    await expect(absent).toBeVisible();
    await expect(visual).toHaveCount(0);

    const clickCat = async () => {
      const box = await app.page.locator("#cat-window").boundingBox();
      await app.page.mouse.click(box.x + 85, box.y + 57);
    };
    await clickCat();
    await expect(panel.locator(".element-title code")).toHaveText(
      "div#cat-turn > canvas",
    );
    await expect(artwork.getByText(/Selected artwork/)).toBeVisible();
    await panel.emulateMedia({ colorScheme: "dark" });
    await expect(artwork.locator(".studio-visual-stage")).toHaveCSS(
      "background-color",
      "rgb(242, 245, 249)",
    );
    expect(
      await visual.evaluate(async (image) => {
        await image.decode();
        const scratch = document.createElement("canvas");
        scratch.width = image.naturalWidth;
        scratch.height = image.naturalHeight;
        const ctx = scratch.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(
          0,
          0,
          scratch.width,
          scratch.height,
        ).data;
        const transparentEdge = pixels.some(
          (value, i) => i % 4 === 3 && value === 0,
        );
        const painted = pixels.some((value, i) => i % 4 === 3 && value === 255);
        return { height: scratch.height, transparentEdge, painted };
      }),
    ).toEqual({ height: 125, transparentEdge: true, painted: true });
    await artwork.getByRole("button", { name: "Preview motion" }).click();
    await expect(artwork.getByRole("status")).toHaveText("Preview complete.");

    await app.page.locator("#cat-window").evaluate((node) => {
      node.style.transform = "rotate(8deg)";
    });
    await clickCat();
    await expect(start).toBeVisible();
    await expect(
      panel.getByText(/Scripted motion|This motion can’t be previewed/).first(),
    ).toBeVisible();
    await expect(visual).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});

test("Inspect Pro preserves the verified motion when a clicked book leaves view at 1440 px", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.setViewportSize({ width: 1440, height: 850 });
    await app.page.goto(`${origin}/direct-artwork-motion`);
    const studio = await openStudioOptions(app);
    await studio
      .getByRole("button", { name: "Inspect Pro", exact: true })
      .click();
    const picker = studio.getByRole("dialog", {
      name: /Inspect Pro.*Choose a site/,
    });
    await picker
      .getByRole("combobox", { name: "Open tabs", exact: true })
      .selectOption({ label: "Direct artwork motion fixture · 127.0.0.1" });
    await picker.getByRole("button", { name: "Open Inspect Pro" }).click();
    await expect(picker).toBeHidden();
    await app.worker.evaluate(async () => {
      const window = await chrome.windows.getCurrent();
      await chrome.sidePanel.close({ windowId: window.id });
    });
    const panel = await app.openPanel();
    await expect(
      panel.getByRole("heading", { name: "Inspect Pro" }),
    ).toBeVisible();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    const book = app.page.locator("#book-target");
    await book.click();
    await expect(panel.locator(".element-title code")).toHaveText(
      "div#book-target",
    );
    const componentPreview = panel.getByRole("region", {
      name: "Component preview",
    });
    const bookPreview = componentPreview.getByRole("img", {
      name: "Selected artwork preview",
    });
    await expect(bookPreview).toHaveAttribute(
      "src",
      /^data:image\/webp;base64,/,
    );
    await book.evaluate((node) => {
      window.setTimeout(() => {
        node.style.visibility = "hidden";
      }, 640);
    });
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    const motion = panel.getByRole("region", {
      name: "Studio observed motion",
    });
    await expect(
      motion.getByText(/Selected artwork · [01]\.[0-9]+s visual reference/),
    ).toBeVisible();
    const image = motion.getByRole("img").locator("img");
    const firstFrame = await image.getAttribute("src");
    await motion.getByRole("button", { name: "Preview motion" }).click();
    await expect(motion.getByText("Preview complete.")).toBeVisible();
    const lastFrame = await image.getAttribute("src");
    expect(lastFrame).not.toBe(firstFrame);

    await motion
      .getByRole("button", { name: "Save motion", exact: true })
      .click();
    const destination = panel.getByRole("dialog", {
      name: "Save motion to collection",
    });
    await destination
      .getByRole("textbox", { name: "Project name" })
      .fill("Wide book QA");
    await destination.getByRole("button", { name: "Create and save" }).click();
    await expect(destination.getByRole("status")).toContainText(
      "Saved to Assets",
    );
    const opened = app.context.waitForEvent("page");
    await destination.getByRole("button", { name: "Open collection" }).click();
    const collection = await opened;
    const saved = collection.getByRole("article", {
      name: "Canvas motion",
      exact: true,
    });
    const savedImage = saved.getByRole("img").locator("img");
    await expect(savedImage).toHaveAttribute("src", firstFrame);
    await saved.getByRole("button", { name: "Preview motion" }).click();
    await expect(saved.getByText("Preview complete.")).toBeVisible();
    await expect(savedImage).toHaveAttribute("src", lastFrame);
    await collection.close();

    await app.page.setViewportSize({ width: 850, height: 844 });
    await app.page.goto(`${origin}/shelf-artwork-motion`);
    await app.page.bringToFront();
    const resume = panel.getByRole("button", { name: "Resume selecting" });
    if (await resume.isVisible()) await resume.click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    await app.page.mouse.click(260, 147);
    const shelf = componentPreview.getByRole("img", {
      name: "Entire scene preview",
    });
    await expect(shelf).toHaveAttribute("src", /^data:image\/webp;base64,/);
    await expect(bookPreview).toHaveCount(0);
    expect(
      await shelf.evaluate(async (image) => {
        await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      }),
    ).toEqual([256, 85]);
  } finally {
    await app.context.close();
  }
});

test("Studio previews and saves the whole shelf without capturing artwork outside the selected row", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.setViewportSize({ width: 850, height: 844 });
    await app.page.goto(`${origin}/shelf-artwork-motion`);
    const panel = await app.openPanel();
    await panel.getByRole("button", { name: "Quick Inspect" }).click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    await app.page.mouse.click(260, 147);
    await app.page.keyboard.press("ArrowRight");
    await expect(panel.locator(".element-title code")).toHaveText("div#gap");
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    const scene = panel.getByRole("region", { name: "Studio observed motion" });
    await expect(scene.getByText(/Entire scene/)).toBeVisible();
    const image = scene.locator(".studio-visual-stage img");
    expect(
      await image.evaluate(async (node) => {
        await node.decode();
        const canvas = document.createElement("canvas");
        canvas.width = node.naturalWidth;
        canvas.height = node.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(node, 0, 0);
        const blue = ctx.getImageData(42, 36, 1, 1).data;
        const red = ctx.getImageData(160, 36, 1, 1).data;
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const outside = pixels.some(
          (green, index) =>
            index % 4 === 1 &&
            green > 180 &&
            pixels[index - 1] < 20 &&
            pixels[index + 1] < 20,
        );
        return {
          size: [canvas.width, canvas.height],
          blue: blue[2] > 160,
          red: red[0] > 180,
          outside,
        };
      }),
    ).toEqual({ size: [256, 85], blue: true, red: true, outside: false });
    const first = await image.getAttribute("src");
    await scene.getByRole("button", { name: "Preview motion" }).click();
    await expect(image).not.toHaveAttribute("src", first);
    await expect(scene.getByRole("status")).toHaveText("Preview complete.");
    const last = await image.getAttribute("src");
    await scene.getByRole("button", { name: "Save motion" }).click();
    const dialog = panel.getByRole("dialog");
    await expect(
      dialog.getByText("Entire scene", { exact: true }),
    ).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Project name" })
      .fill("Shelf scene");
    await dialog.getByRole("button", { name: "Create and save" }).click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    const opened = app.context.waitForEvent("page");
    await dialog.getByRole("button", { name: "Open collection" }).click();
    const studio = await opened;
    const saved = studio.getByRole("article", { name: "Entire scene motion" });
    const savedImage = saved.locator(".studio-visual-stage img");
    await expect(savedImage).toHaveAttribute("src", first);
    await saved.getByRole("button", { name: "Preview motion" }).click();
    await expect(saved.getByRole("status")).toHaveText("Preview complete.");
    await expect(savedImage).toHaveAttribute("src", last);

    await app.page.bringToFront();
    const resume = panel.getByRole("button", { name: "Resume selecting" });
    if (await resume.isVisible()) await resume.click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    const row = app.page.locator("#gap");
    await app.page.mouse.click(260, 147);
    await row.evaluate((node) =>
      Object.assign(node.style, { top: "0px", height: "260px" }),
    );
    await expect(panel.locator(".element-title code")).toHaveText("div#gap");
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    await expect(
      panel.getByText(
        "This motion can’t be previewed from the selected element.",
      ),
    ).toBeVisible();
    await expect(scene).toHaveCount(0);
  } finally {
    await app.context.close();
  }
});

test("Studio follows a turning shelf spine and skips an ambiguous broad layer", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.setViewportSize({ width: 850, height: 844 });
    await app.page.goto(`${origin}/shelf-artwork-motion`);
    const panel = await app.openPanel();
    await panel.getByRole("button", { name: "Quick Inspect" }).click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    const observed = panel.getByRole("region", {
      name: "Studio observed motion",
    });
    const image = observed.locator(".studio-visual-stage img");
    const selected = panel.locator(".element-title code");
    const clickGap = () => app.page.mouse.click(260, 147);
    await app.page.locator("#neighbor").evaluate((node) => {
      node.style.display = "none";
    });
    await clickGap();
    await expect(selected).toHaveText("div#gap");
    await panel.getByRole("button", { name: "Effects", exact: true }).click();
    await expect(
      panel.getByText("Select artwork on the page to preview its motion."),
    ).toBeVisible();
    await expect(observed).toHaveCount(0);
    await app.page.locator("#neighbor").evaluate((node) => {
      node.style.display = "";
    });

    await app.page.locator("#spine").click();
    await expect(selected).toHaveText("div#spine");
    await expect(observed.getByText(/Selected artwork/)).toBeVisible();
    const stage = observed.locator(".studio-visual-stage");
    const ratio = () => stage.evaluate((el) => el.style.aspectRatio);
    expect(await ratio()).toBe("44 / 150");
    await app.page.bringToFront();
    await app.page.keyboard.press("ArrowRight");
    await expect.poll(ratio, { timeout: 10000 }).toBe("154 / 150");
    const spine = await image.getAttribute("src");
    await observed.getByRole("button", { name: "Preview motion" }).click();
    await expect(observed.getByRole("status")).toHaveText("Preview complete.");
    const cover = await image.getAttribute("src");
    expect(cover).not.toBe(spine);
    expect(
      await image.evaluate(async (node) => {
        await node.decode();
        const sample = document.createElement("canvas");
        sample.width = node.naturalWidth;
        sample.height = node.naturalHeight;
        const ctx = sample.getContext("2d");
        ctx.drawImage(node, 0, 0);
        const yellow = ctx.getImageData(100, 36, 1, 1).data;
        return {
          width: sample.width,
          yellow: yellow[0] > 190 && yellow[1] > 160,
        };
      }),
    ).toEqual({ width: 154, yellow: true });

    await observed
      .getByRole("button", { name: "Save motion", exact: true })
      .click();
    const dialog = panel.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Project name" })
      .fill("Shelf artwork");
    await dialog.getByRole("button", { name: "Create and save" }).click();
    await expect(dialog.getByRole("status")).toContainText("Saved to Assets");
    const opened = app.context.waitForEvent("page");
    await dialog.getByRole("button", { name: "Open collection" }).click();
    const studio = await opened;
    const saved = studio.getByRole("article", { name: "Canvas motion" });
    const savedImage = saved.locator(".studio-visual-stage img");
    await expect(savedImage).toHaveAttribute("src", spine);
    await saved.getByRole("button", { name: "Preview motion" }).click();
    await expect(saved.getByRole("status")).toHaveText("Preview complete.");
    await expect(savedImage).toHaveAttribute("src", cover);
  } finally {
    await app.context.close();
  }
});

test("Studio collection buttons, tabs and mixed swatches fit the popup and narrow side panel", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/mixed-colors`);
    for (const [open, width, columns] of [
      [app.openPanel, 300, 2],
      [app.openPopup, 720, 4],
    ]) {
      const tool = await open();
      await tool.setViewportSize({ width, height: 820 });
      const tabs = tool.locator(".tabs button");
      const cards = tool.locator(".studio-color-card");
      await expect(cards.first()).toBeVisible();
      const geometry = await tabs.evaluateAll((items) =>
        items.map((tab) => {
          const { width, height, top } = tab.getBoundingClientRect();
          return { width, height, top };
        }),
      );
      expect(geometry).toHaveLength(5);
      expect(new Set(geometry.map(({ top }) => top)).size).toBe(1);
      expect(
        Math.max(...geometry.map(({ width }) => width)) -
          Math.min(...geometry.map(({ width }) => width)),
      ).toBeLessThan(1);
      expect(geometry.every(({ height }) => height >= 44)).toBe(true);
      const swatches = await cards.evaluateAll((items) =>
        items.map((card) => {
          const box = card.getBoundingClientRect();
          const fill = card.querySelector(".color").getBoundingClientRect();
          const save = card
            .querySelector(".studio-color-save")
            .getBoundingClientRect();
          return { top: box.top, fill: fill.top, save: save.top };
        }),
      );
      expect(
        swatches.filter(({ top }) => top === swatches[0].top),
      ).toHaveLength(columns);
      for (const swatch of swatches) {
        expect(swatch.fill - swatch.top).toBeCloseTo(1);
        expect(
          swatches
            .filter(({ top }) => top === swatch.top)
            .every(
              ({ fill, save }) => fill === swatch.fill && save === swatch.save,
            ),
        ).toBe(true);
      }
      for (const [tab, label] of [
        ["Colors", "Save palette to collection"],
        ["Fonts", "Save all typography to collection"],
        ["Text", "Save all text to collection"],
      ]) {
        await tool.getByRole("button", { name: tab, exact: true }).click();
        const button = tool.getByRole("button", { name: label, exact: true });
        await expect(button).toBeEnabled();
        expect(
          await button.evaluate((node) => {
            const range = document.createRange();
            range.selectNodeContents(node);
            const text = range.getBoundingClientRect();
            const button = node.getBoundingClientRect();
            return (
              button.left >= 0 &&
              button.right <= innerWidth &&
              text.left >= button.left &&
              text.right <= button.right &&
              node.scrollWidth <= node.clientWidth
            );
          }),
        ).toBe(true);
      }
      await tool.close();
    }
    await app.page.goto(`${origin}/studio-motion`);
    const popup = await app.openPopup();
    await popup.getByRole("button", { name: "Fonts", exact: true }).click();
    await popup
      .getByRole("button", {
        name: "Save all typography to collection",
        exact: true,
      })
      .click();
    const dialog = popup.getByRole("dialog");
    await expect(
      dialog.getByText(/Review styles · (\d+) of \1 selected/),
    ).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Project name" })
      .fill("Popup captures");
    await dialog
      .getByRole("button", { name: "Create and save", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Saved to Typography",
    );
    await dialog.getByRole("button", { name: "Keep browsing" }).click();
    await popup.getByRole("button", { name: "Images", exact: true }).click();
    await popup
      .getByRole("button", {
        name: "Save all images to collection",
        exact: true,
      })
      .click();
    await expect(
      dialog.getByText("Review images · 2 of 2 selected"),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: "Save 2 images", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Deselect the images marked unavailable",
    );
    await expect(dialog.getByRole("status")).toHaveCount(0);
    await dialog
      .getByRole("checkbox", { name: /Vector artwork.*Unavailable/ })
      .uncheck();
    await dialog
      .getByRole("button", { name: "Save selected (1)", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Saved to Typography",
    );
  } finally {
    await app.context.close();
  }
});

test("Studio saves while browsing two sites, then edits and exports a design from those assets", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/collection-component-export`);
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 370, height: 840 });
    const dialog = panel.getByRole("dialog");
    const keepBrowsing = () =>
      dialog.getByRole("button", { name: "Keep browsing" }).click();
    await panel
      .getByRole("button", { name: "Save to collection: #234567", exact: true })
      .click();
    await dialog
      .getByRole("textbox", { name: "Project name" })
      .fill("Trail project");
    await dialog
      .getByRole("textbox", { name: /Collection name/ })
      .fill("Trail campaign");
    await dialog
      .getByRole("button", { name: "Create and save", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Saved to Trail campaign",
    );
    await keepBrowsing();
    await panel.getByRole("button", { name: "Fonts", exact: true }).click();
    await panel
      .getByRole("button", {
        name: "Save to collection: Arial body",
        exact: true,
      })
      .click();
    await expect(
      dialog.getByRole("combobox", { name: "Collection", exact: true }),
    ).toHaveValue(/./);
    await dialog
      .getByRole("button", { name: "Save font", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Saved to Trail campaign",
    );
    await keepBrowsing();

    await panel.getByRole("button", { name: "Images", exact: true }).click();
    await panel
      .getByRole("button", {
        name: "Save to collection: Site artwork",
        exact: true,
      })
      .click();
    await dialog
      .getByRole("button", { name: "Save image", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Saved to Trail campaign",
    );
    await keepBrowsing();

    await panel
      .getByRole("button", { name: "Quick Inspect", exact: true })
      .click();
    await expect(app.page.locator("getter-inspection-overlay")).toBeAttached();
    await app.page.locator("#invisible-copy").click({ force: true });
    await expect(panel.locator(".element-title code")).toHaveText(
      "p#invisible-copy",
    );
    await panel
      .getByRole("button", { name: "＋ Save to collection", exact: true })
      .click();
    await expect(
      panel.getByText("Choose the element again before saving."),
    ).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await app.page
      .locator("#card")
      .click({ position: { x: 8, y: 8 }, force: true });
    await panel
      .getByRole("button", { name: "＋ Save to collection", exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: "Save component to collection" }),
    ).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Feature card");
    await dialog
      .getByRole("button", { name: "Save component", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Saved to Trail campaign",
    );
    await dialog.getByRole("button", { name: "Keep inspecting" }).click();

    await panel.getByRole("button", { name: "Colors", exact: true }).click();
    await panel
      .getByRole("button", { name: "Save to collection: #234567", exact: true })
      .click();
    await app.page.goto(
      `${origin.replace("127.0.0.1", "localhost")}/usage?keep=private#capture`,
    );
    await dialog
      .getByRole("button", { name: "Save color", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("The page changed");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await panel.getByRole("button", { name: "Scan again" }).click();
    await panel
      .getByRole("button", { name: "Save to collection: #187C70", exact: true })
      .click();
    await expect(dialog.getByText("localhost", { exact: true })).toBeVisible();
    await dialog
      .getByRole("button", { name: "Save color", exact: true })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      "Saved to Trail campaign",
    );
    await panel.screenshot({
      path: info.outputPath("getter-browse-and-save.png"),
    });
    const opened = app.context.waitForEvent("page");
    await dialog
      .getByRole("button", { name: "Open collection", exact: true })
      .click();
    const studio = await opened;
    await expect(studio).toHaveURL(/\/studio\.html\?project=/);
    await studio.setViewportSize({ width: 1440, height: 900 });
    await expect(
      studio.getByRole("heading", { name: "Trail campaign", exact: true }),
    ).toBeVisible();
    const assets = studio.getByRole("region", { name: /Collection assets/ });
    await expect(assets.getByRole("article")).toHaveCount(5);
    await assets
      .getByRole("button", { name: "Create design", exact: true })
      .click();
    const create = studio.getByRole("dialog", { name: "Create a design" });
    await create
      .getByRole("textbox", { name: "Design name" })
      .fill("Trail website");
    await create
      .getByRole("combobox", { name: "Starting layout" })
      .selectOption("website");
    await create
      .getByRole("button", { name: "Create design", exact: true })
      .click();
    const editor = studio.getByRole("region", { name: "Studio editor" });
    await expect(
      editor.getByRole("heading", { name: "Trail website" }),
    ).toBeVisible();
    const canvas = editor.locator(".design-artboard");
    await editor
      .getByRole("button", { name: "Apply #187C70", exact: true })
      .click();
    await expect(canvas.locator(":scope > rect")).toHaveAttribute(
      "fill",
      "rgb(24, 124, 112)",
    );
    await editor
      .getByRole("textbox", { name: "Canvas background" })
      .fill("#F7F3E9");
    await editor
      .getByRole("textbox", { name: "Canvas background" })
      .press("Enter");
    await editor
      .getByRole("button", { name: "Call to action", exact: true })
      .click();
    await editor
      .getByRole("button", { name: "Apply #187C70", exact: true })
      .click();
    await editor.getByRole("button", { name: "Headline", exact: true }).click();
    const properties = editor.getByRole("complementary", {
      name: "Design properties",
    });
    await properties
      .getByRole("textbox", { name: "Layer text" })
      .fill("A brighter trail");
    await editor
      .getByRole("button", { name: "Apply Arial · body", exact: true })
      .click();
    await expect(
      properties.getByRole("textbox", { name: "Font family" }),
    ).toHaveValue("Arial");
    await editor.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(
      properties.getByRole("textbox", { name: "Font family" }),
    ).toHaveValue("Georgia, serif");
    await editor.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(
      properties.getByRole("textbox", { name: "Font family" }),
    ).toHaveValue("Arial");
    await properties.getByRole("spinbutton", { name: "Type size" }).fill("66");
    await properties
      .getByRole("spinbutton", { name: "Type size" })
      .press("Enter");
    await properties
      .getByRole("spinbutton", { name: "X position" })
      .fill("110");
    await properties
      .getByRole("spinbutton", { name: "X position" })
      .press("Enter");
    await expect(
      canvas
        .locator("g[data-layer-id]")
        .filter({ hasText: "A brighter trail" }),
    ).toHaveAttribute("transform", "translate(110 269)");
    await editor
      .getByRole("button", { name: "Insert Site artwork", exact: true })
      .click();
    await expect(canvas.locator("image")).toHaveAttribute(
      "href",
      /^data:image\/png;base64,/,
    );
    const imageLayer = canvas
      .locator("g[data-layer-id]")
      .filter({ has: studio.locator("image") });
    const imageBox = await imageLayer.boundingBox();
    await expect(imageLayer).toHaveAttribute("transform", "translate(809 180)");
    await studio.mouse.move(
      imageBox.x + imageBox.width / 2,
      imageBox.y + imageBox.height / 2,
    );
    await studio.mouse.down();
    await studio.mouse.move(
      imageBox.x + imageBox.width / 2 + 42,
      imageBox.y + imageBox.height / 2 + 20,
      { steps: 4 },
    );
    await studio.mouse.up();
    await expect(imageLayer).not.toHaveAttribute(
      "transform",
      "translate(809 180)",
    );
    await editor.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(canvas.locator("image")).toHaveAttribute(
      "href",
      /^data:image\/png;base64,/,
    );
    await studio.evaluate(() => {
      const readImage = FileReader.prototype.readAsDataURL;
      FileReader.prototype.readAsDataURL = function (blob) {
        FileReader.prototype.readAsDataURL = readImage;
        window.finishComponentPreview = () => readImage.call(this, blob);
      };
    });
    await editor
      .getByRole("button", { name: "Insert Feature card", exact: true })
      .click();
    await expect(
      canvas.getByText("Private fixture button", { exact: true }),
    ).toBeVisible();
    await expect(canvas.getByText("Invisible fixture content")).toHaveCount(0);
    await expect
      .poll(() => studio.evaluate(() => typeof window.finishComponentPreview))
      .toBe("function");
    await expect(canvas.locator("image[href]")).toHaveCount(1);
    await properties
      .getByRole("spinbutton", { name: "X position" })
      .fill("860");
    await properties
      .getByRole("spinbutton", { name: "X position" })
      .press("Enter");
    await properties
      .getByRole("spinbutton", { name: "Y position" })
      .fill("520");
    await properties
      .getByRole("spinbutton", { name: "Y position" })
      .press("Enter");
    await properties
      .getByRole("spinbutton", { name: "Width", exact: true })
      .fill("440");
    await properties
      .getByRole("spinbutton", { name: "Width", exact: true })
      .press("Enter");
    await editor
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await expect(editor.getByRole("status")).toHaveText(
      "Draft saved to collection",
    );
    await editor.locator(".design-sidebar").evaluate((element) => {
      element.scrollTop = 0;
    });
    await studio.screenshot({
      path: info.outputPath("getter-studio-design-editor.png"),
    });

    await editor
      .getByRole("button", { name: "Export draft", exact: true })
      .click();
    const exportBox = studio.getByRole("dialog", { name: "Export draft" });
    const svgReady = studio.waitForEvent("download");
    await exportBox.getByRole("button", { name: "Download SVG" }).click();
    const svg = await readFile(await (await svgReady).path(), "utf8");
    expect(svg).toMatch(/<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain("A brighter trail");
    expect(svg.match(/data:image\/png;base64,/g)).toHaveLength(2);
    expect(svg).not.toMatch(
      /data-editor-only|data-component-image|Invisible fixture content|localhost|keep=private|onclick=|window\.pageAction/,
    );
    await exportBox
      .getByRole("combobox", { name: "File format" })
      .selectOption("png");
    const pngReady = studio.waitForEvent("download");
    await exportBox.getByRole("button", { name: "Download PNG" }).click();
    const pixels = await readFile(await (await pngReady).path());
    expect(pixels.subarray(1, 4).toString()).toBe("PNG");
    expect(pixels.readUInt32BE(16)).toBe(1440);
    expect(pixels.readUInt32BE(20)).toBe(900);
    await exportBox.getByRole("button", { name: "Done" }).click();
    await editor.getByRole("button", { name: /Back to collection/ }).click();
    await expect(assets.getByRole("article")).toHaveCount(5);
    await studio.reload();
    await studio.getByRole("button", { name: "Editor", exact: true }).click();
    await studio.getByRole("button", { name: "Open Trail website" }).click();
    await expect(
      canvas.getByText("A brighter trail", { exact: true }),
    ).toBeVisible();
    await expect(
      canvas.locator('image[href^="data:image/png;base64,"]'),
    ).toHaveCount(2);
    await expect(
      editor.getByRole("button", { name: "Newsletter heading", exact: true }),
    ).toHaveCount(0);
    await editor.getByRole("button", { name: /Back to collection/ }).click();

    await studio.setViewportSize({ width: 360, height: 860 });
    await assets
      .getByRole("button", { name: "Create design", exact: true })
      .click();
    await create
      .getByRole("textbox", { name: "Design name" })
      .fill("Trail newsletter");
    await create
      .getByRole("combobox", { name: "Starting layout" })
      .selectOption("website-newsletter");
    await create
      .getByRole("button", { name: "Create design", exact: true })
      .click();
    await expect(
      editor.getByRole("heading", { name: "Trail newsletter" }),
    ).toBeVisible();
    await expect(canvas.getByText("About", { exact: true })).toBeVisible();
    await expect(canvas.getByText("Privacy", { exact: true })).toBeVisible();
    await expect(
      canvas.getByText("Your email address", { exact: true }),
    ).toBeVisible();
    await expect(canvas.getByText("Join", { exact: true })).toBeVisible();
    expect(
      await studio.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(360);
    await editor
      .getByRole("button", { name: "Newsletter button", exact: true })
      .click();
    await editor
      .getByRole("button", { name: "Apply #187C70", exact: true })
      .click();
    await editor
      .getByRole("button", { name: "Newsletter heading", exact: true })
      .click();
    await properties
      .getByRole("textbox", { name: "Layer text" })
      .fill("Weekly field notes");
    await editor.getByRole("button", { name: /Back to collection/ }).click();
    await expect(assets.getByRole("article")).toHaveCount(5);
    await studio.reload();
    await studio.getByRole("button", { name: "Editor", exact: true }).click();
    await studio.getByRole("button", { name: "Open Trail newsletter" }).click();
    await expect(
      canvas.getByText("Weekly field notes", { exact: true }),
    ).toBeVisible();
    await expect(
      canvas.locator(
        'g[transform="translate(1184 695)"] > rect[fill="rgb(24, 124, 112)"]',
      ),
    ).toHaveCount(1);
    await studio.setViewportSize({ width: 1440, height: 900 });
    await studio.screenshot({
      path: info.outputPath("getter-studio-website-newsletter.png"),
    });
    await editor
      .getByRole("button", { name: "Export draft", exact: true })
      .click();
    const newsletterReady = studio.waitForEvent("download");
    await exportBox.getByRole("button", { name: "Download SVG" }).click();
    const newsletter = await readFile(
      await (await newsletterReady).path(),
      "utf8",
    );
    expect(newsletter).toContain("Weekly field notes");
    expect(newsletter).toContain("Your email address");
    expect(newsletter).toContain("Privacy");
    expect(newsletter).toContain('fill="rgb(24, 124, 112)"');
  } finally {
    await app.context.close();
  }
});

test("Studio campaign and brand board drafts keep collection assets through reopen and export", async ({}, info) => {
  execFileSync(process.execPath, [
    "scripts/build.mjs",
    "--studio-workspace-qa",
  ]);
  const app = await launch(info, { buildDir: "dist-studio-workspace-qa" });
  try {
    await app.page.goto(`${origin}/workbench`);
    const studio = await openStudioOptions(app);
    await studio.setViewportSize({ width: 360, height: 860 });
    await studio.getByRole("button", { name: "New project" }).click();
    await studio
      .getByRole("textbox", { name: "Project name" })
      .fill("Fieldwork");
    await studio.keyboard.press("Enter");
    await expect(
      studio.getByRole("dialog", { name: "Create a project" }),
    ).toBeHidden();
    await studio.getByLabel("Open tabs").selectOption({
      label: "Getter workspace fixture · 127.0.0.1",
    });
    await studio.getByRole("button", { name: "Scan styles" }).click();
    await studio.getByRole("checkbox", { name: /#123456/ }).check();
    await studio.getByRole("checkbox", { name: /Arial.*body/ }).check();
    await studio.getByRole("button", { name: "Save selected (2)" }).click();
    const saved = studio.getByText("Saved to the collection on this device.", {
      exact: true,
    });
    await expect(saved).toBeVisible();
    const alternate = await studio.evaluate(() => {
      const sample = document.createElement("canvas");
      sample.width = sample.height = 4;
      const context = sample.getContext("2d");
      context.fillStyle = "#d38c52";
      context.fillRect(0, 0, sample.width, sample.height);
      return sample.toDataURL("image/png").split(",")[1];
    });
    for (const [name, buffer] of [
      ["Cover artwork.png", studioPng],
      ["Alternate artwork.png", Buffer.from(alternate, "base64")],
    ]) {
      await studio
        .getByLabel("Add a local image")
        .setInputFiles({ name, mimeType: "image/png", buffer });
      await expect(saved).toBeVisible();
    }
    await studio
      .getByRole("button", { name: "Collection", exact: true })
      .click();
    await studio.setViewportSize({ width: 1280, height: 1024 });
    await studio.getByRole("button", { name: "Projects", exact: true }).click();
    await expect(
      studio.getByRole("heading", { name: "Your projects" }),
    ).toBeVisible();
    await studio.screenshot({
      path: info.outputPath("getter-studio-projects.png"),
    });
    await studio
      .getByRole("button", {
        name: "Create project from collection",
        exact: true,
      })
      .click();
    const start = studio.getByRole("dialog", { name: "Create a project" });
    await start
      .getByRole("textbox", { name: "Project name" })
      .fill("Summer campaign");
    await expect(
      start.getByRole("combobox", { name: "Collection", exact: true }),
    ).toHaveValue(/\|/);
    await start
      .getByRole("combobox", { name: "Open tabs", exact: true })
      .selectOption({ label: "Getter workspace fixture · 127.0.0.1" });
    await start
      .getByRole("button", { name: "Create project", exact: true })
      .click();
    await expect(
      studio.getByText("Linked collection", { exact: true }),
    ).toBeVisible();
    await studio.getByRole("button", { name: /Open collection/ }).click();
    await expect(
      studio.getByText("Starting with Fieldwork collection.", { exact: true }),
    ).toBeVisible();
    await studio.screenshot({
      path: info.outputPath("getter-campaign-collection.png"),
    });
    await studio.setViewportSize({ width: 360, height: 860 });
    const assets = studio.getByRole("region", { name: /Collection assets/ });
    const editor = studio.getByRole("region", { name: "Studio editor" });
    const canvas = editor
      .getByRole("region", { name: "Canvas workspace" })
      .locator("svg.design-artboard");
    const layerButton = (name) =>
      editor.getByRole("button", { name, exact: true });
    const textField = editor.getByRole("textbox", {
      name: "Text",
      exact: true,
    });
    const goToSlide = (number) => layerButton(`Slide ${number}`).press("Enter");
    const back = async () => {
      await editor.getByRole("button", { name: /Back to collection/ }).click();
      await expect(assets).toBeVisible();
    };
    const create = async (name, layout) => {
      await assets
        .getByRole("button", { name: "Create design", exact: true })
        .click();
      const dialog = studio.getByRole("dialog", { name: "Create a design" });
      await dialog.getByRole("textbox", { name: "Design name" }).fill(name);
      await dialog
        .getByRole("combobox", { name: "Starting layout" })
        .selectOption(layout);
      await dialog
        .getByRole("button", { name: "Create design", exact: true })
        .click();
      await expect(
        editor.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
    };
    const reopen = async (name, projectName = "Summer campaign") => {
      await studio.reload();
      await studio
        .getByRole("article")
        .filter({
          has: studio.getByRole("heading", {
            name: projectName,
            exact: true,
          }),
        })
        .getByRole("button", { name: "Fieldwork collection", exact: true })
        .click();
      await studio.getByRole("button", { name: "Editor", exact: true }).click();
      await studio
        .getByRole("button", { name: `Open ${name}`, exact: true })
        .click();
    };
    const showExport = async () => {
      await layerButton("Export draft").click();
      return studio.getByRole("region", { name: "Export draft" });
    };
    const download = async (dialog, name) => {
      const next = studio.waitForEvent("download");
      await dialog.getByRole("button", { name, exact: true }).click();
      const downloaded = await next;
      return readFile(await downloaded.path());
    };

    await assets
      .getByRole("button", { name: "Create campaign", exact: true })
      .click();
    const campaignStart = studio.getByRole("dialog", {
      name: "Create campaign",
    });
    await campaignStart
      .getByRole("textbox", { name: "Design name" })
      .fill("Summer carousel");
    await expect(
      campaignStart.getByRole("checkbox", { name: "Apply saved brand styles" }),
    ).toBeChecked();
    await campaignStart.getByRole("button", { name: "Open editor" }).click();
    await editor.getByLabel("Artwork format").selectOption("carousel");
    expect(
      await studio.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(360);
    await layerButton("Headline").click();
    await textField.fill("Fresh for summer");

    await expect(canvas.locator("image")).toHaveAttribute(
      "href",
      /^data:image\/png;base64,/,
    );
    await editor.getByLabel("Composition").selectOption("image-first");
    await expect(
      canvas.locator('g[transform="translate(64 106)"] image'),
    ).toHaveCount(1);
    await goToSlide(2);
    await expect(editor.getByLabel("Composition")).toHaveValue(
      "headline-first",
    );
    await expect(canvas.getByText("Fresh for summer")).toHaveCount(0);
    await layerButton("Headline").click();
    await textField.fill("Made with care");
    await goToSlide(3);
    await layerButton("Headline").click();
    await textField.fill("Find your favorite");
    await goToSlide(1);
    await layerButton("Undo").click();
    await expect(layerButton("Slide 3")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(canvas.getByText("Find your favorite")).toHaveCount(0);
    await layerButton("Redo").click();
    await expect(
      canvas.getByText("Find your favorite", { exact: true }),
    ).toBeVisible();
    await layerButton("Brand colors").click();
    const background = editor.getByRole("textbox", {
      name: "Background",
      exact: true,
    });
    await background.fill("#F2E8D5");
    await background.press("Enter");
    await goToSlide(1);
    await expect(canvas.locator("rect").first()).toHaveAttribute(
      "fill",
      "#F2E8D5",
    );
    await back();
    await expect(assets.getByRole("article")).toHaveCount(4);
    await reopen("Summer carousel");
    await goToSlide(2);
    await expect(
      canvas.getByText("Made with care", { exact: true }),
    ).toBeVisible();
    await goToSlide(3);
    await expect(
      canvas.getByText("Find your favorite", { exact: true }),
    ).toBeVisible();

    const campaignExport = await showExport();
    await expect(
      campaignExport.getByRole("button", { name: "Canva", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await studio.setViewportSize({ width: 1280, height: 1024 });
    await studio.screenshot({
      path: info.outputPath("getter-campaign-export.png"),
    });
    await campaignExport
      .getByRole("button", { name: "Figma", exact: true })
      .click();
    await campaignExport
      .getByText("Preview a font substitution", { exact: true })
      .click();
    await campaignExport
      .getByLabel("Heading font in this export")
      .selectOption("Arial, sans-serif");
    await expect(
      campaignExport.getByText(
        "Download the files and import them into Figma.",
      ),
    ).toBeVisible();
    const svgZip = await JSZip.loadAsync(
      await download(campaignExport, "Download SVG ZIP"),
    );
    expect(Object.keys(svgZip.files)).toEqual([
      "slide-01.svg",
      "slide-02.svg",
      "slide-03.svg",
    ]);
    const cover = await svgZip.file("slide-01.svg").async("string");
    expect(cover).toContain("Fresh for summer");
    expect(cover).toContain('fill="#F2E8D5"');
    expect(cover).toContain('font-family="Arial, sans-serif"');
    expect(cover).toContain("data:image/png;base64,");
    expect(await svgZip.file("slide-02.svg").async("string")).toContain(
      "Made with care",
    );
    expect(await svgZip.file("slide-03.svg").async("string")).toContain(
      "Find your favorite",
    );
    await campaignExport.getByLabel("File format").selectOption("png");
    const pngZip = await JSZip.loadAsync(
      await download(campaignExport, "Download PNG ZIP"),
    );
    expect(Object.keys(pngZip.files)).toEqual([
      "slide-01.png",
      "slide-02.png",
      "slide-03.png",
    ]);
    for (const file of Object.values(pngZip.files)) {
      const image = await file.async("nodebuffer");
      expect(image.subarray(1, 4).toString()).toBe("PNG");
      expect(image.readUInt32BE(16)).toBe(1080);
      expect(image.readUInt32BE(20)).toBe(1350);
    }
    await campaignExport
      .getByRole("button", { name: /Back to editor/ })
      .click();
    await studio.setViewportSize({ width: 1280, height: 900 });
    await goToSlide(1);
    await studio.screenshot({
      path: info.outputPath("getter-campaign-artwork.png"),
    });
    await back();

    await create("Vertical story", "story");
    await expect(canvas).toHaveAttribute("viewBox", "0 0 1080 1920");
    const storyExport = await showExport();
    await storyExport.getByLabel("File format").selectOption("png");
    const story = await download(storyExport, "Download PNG");
    expect(story.readUInt32BE(20)).toBe(1920);
    await storyExport.getByRole("button", { name: /Back to editor/ }).click();
    await back();

    await studio.getByRole("button", { name: "Projects", exact: true }).click();
    await studio
      .getByRole("article")
      .filter({
        has: studio.getByRole("heading", { name: "Fieldwork", exact: true }),
      })
      .getByRole("button", { name: "Fieldwork collection", exact: true })
      .click();
    await studio.screenshot({
      path: info.outputPath("getter-brand-collection.png"),
    });
    await studio.setViewportSize({ width: 360, height: 860 });
    await assets
      .getByRole("button", { name: "Create brand board", exact: true })
      .click();
    const boardStart = studio.getByRole("dialog", {
      name: "Create brand board",
    });
    await boardStart
      .getByRole("textbox", { name: "Design name" })
      .fill("Fieldwork brand board");
    await boardStart.getByRole("button", { name: "Open editor" }).click();
    expect(
      await studio.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(360);
    await layerButton("Palette").click();
    const primary = editor.getByRole("textbox", {
      name: "Primary",
      exact: true,
    });
    await primary.fill("#123456");
    await primary.press("Enter");
    await expect(canvas.getByText("#123456", { exact: true })).toBeVisible();
    const brandButton = canvas
      .locator('g[transform="translate(54 940)"] > rect')
      .first();
    await expect(brandButton).toHaveAttribute("fill", "#123456");
    await layerButton("Typography").click();
    await textField.fill("A quieter kind of good");
    await layerButton("Apply Arial · body").click();
    await expect(
      editor.getByRole("combobox", { name: "Typeface" }),
    ).toHaveValue("Arial");
    await editor.getByRole("slider", { name: /Type size/ }).fill("40");
    await layerButton("Artwork").click();
    await editor
      .getByRole("combobox", { name: "Image", exact: true })
      .selectOption({ label: "Alternate artwork.png" });
    const artwork = canvas.locator("image");
    await expect(artwork).toHaveAttribute(
      "href",
      `data:image/png;base64,${alternate}`,
    );
    await editor.getByLabel("Composition").selectOption("airy");
    await expect(
      canvas.locator('g[transform="translate(620 844)"] image'),
    ).toHaveCount(1);
    await back();
    await reopen("Fieldwork brand board", "Fieldwork");
    await expect(editor.getByLabel("Composition")).toHaveValue("airy");
    await expect(
      canvas.getByText("A quieter kind of good", { exact: true }),
    ).toBeVisible();
    await expect(
      canvas.locator('g[transform="translate(54 969)"] > rect').first(),
    ).toHaveAttribute("fill", "#123456");
    await studio.setViewportSize({ width: 1280, height: 900 });
    await studio.screenshot({
      path: info.outputPath("getter-brand-board.png"),
    });
    const boardExport = await showExport();
    await expect(
      boardExport.getByRole("button", { name: "Figma", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await boardExport
      .getByRole("button", { name: "Illustrator", exact: true })
      .click();
    await studio.screenshot({
      path: info.outputPath("getter-brand-board-export.png"),
    });
    const board = (await download(boardExport, "Download SVG")).toString(
      "utf8",
    );
    expect(board).toContain("A quieter kind of good");
    expect(board).toContain("#123456");
    expect(board).toContain(`data:image/png;base64,${alternate}`);
  } finally {
    await app.context.close();
  }
});

test("ungranted side-panel sites are identified without automatic permission requests", async ({}, info) => {
  const app = await launch(info, {
    fixtureHostGrants: false,
    denyPermissionRequests: true,
  });
  try {
    const panel = await app.openPanel();
    await panel.setViewportSize({ width: 400, height: 820 });
    await expect(
      panel.getByRole("heading", { name: "Ready to scan this site" }),
    ).toBeVisible();
    await expect(panel.locator(".site-identity")).toContainText("127.0.0.1");
    expect(await panel.evaluate(() => websiteAccessFixture.requests)).toEqual(
      [],
    );
    await app.page.goto(origin.replace("127.0.0.1", "localhost"));
    await expect(
      panel.getByRole("heading", { name: "Ready to scan this site" }),
    ).toBeVisible();
    await expect(panel.locator(".site-identity")).toContainText("localhost");
    expect(await panel.evaluate(() => websiteAccessFixture.requests)).toEqual(
      [],
    );
    await panel.getByRole("button", { name: /Scan again/ }).click();
    await expect(
      panel.getByRole("heading", { name: "Site access wasn’t allowed" }),
    ).toBeVisible();
    expect(await panel.evaluate(() => websiteAccessFixture.requests)).toEqual([
      { origins: ["http://localhost/*"] },
    ]);
    await expect(panel.locator(".swatch")).toHaveCount(0);
    await app.page.goto("chrome://settings");
    await panel.getByRole("button", { name: /Scan again/ }).click();
    await expect(
      panel.getByRole("heading", { name: "This page cannot be inspected" }),
    ).toBeVisible();
    expect(
      await panel.evaluate(() => websiteAccessFixture.requests.length),
    ).toBe(1);
    await panel.screenshot({
      path: info.outputPath("restricted-without-host-access.png"),
    });
  } finally {
    await app.context.close();
  }
});

for (const mode of ["popup", "panel"]) {
  test(`${mode} access settings link focuses the all-websites switch without requesting permission`, async ({}, info) => {
    const app = await launch(info, {
      fixtureHostGrants: false,
      denyPermissionRequests: true,
    });
    try {
      const view = await (mode === "panel" ? app.openPanel() : app.openPopup());
      await view.setViewportSize({
        width: mode === "panel" ? 400 : 720,
        height: mode === "panel" ? 820 : 600,
      });
      await view.getByRole("button", { name: "Fonts", exact: true }).click();
      const link = view.getByRole("link", {
        name: "Enable for all sites in Settings",
      });
      const toggle = view.getByRole("switch", {
        name: "Allow on all websites",
        exact: true,
      });
      const settings = view.getByRole("button", {
        name: "Settings",
        exact: true,
      });
      for (const status of ["access", "denied"]) {
        if (status === "denied") {
          await view.getByRole("button", { name: /Scan again/ }).click();
          await expect(
            view.getByRole("heading", { name: "Site access wasn’t allowed" }),
          ).toBeVisible();
        }
        const requestsBefore = await view.evaluate(
          () => websiteAccessFixture.requests.length,
        );
        await expect(link).toBeInViewport({ ratio: 1 });
        for (const appearance of ["light", "dark"]) {
          await view.emulateMedia({ colorScheme: appearance });
          await view.screenshot({
            path: info.outputPath(
              `access-link-${mode}-${status}-${appearance}.png`,
            ),
          });
        }
        if (status === "access") {
          await link.focus();
          await link.press("Enter");
        } else await link.click();
        await expect(
          view.getByRole("heading", { name: "Settings", exact: true }),
        ).toBeVisible();
        await expect(toggle).toBeEnabled();
        await expect(toggle).toBeFocused();
        await expect(toggle).not.toBeChecked();
        await expect(toggle).toBeInViewport({ ratio: 1 });
        expect(
          await view.evaluate(() => websiteAccessFixture.requests.length),
        ).toBe(requestsBefore);
        if (status === "access") {
          await view.screenshot({
            path: info.outputPath(`access-link-${mode}-destination.png`),
          });
          // Permission is requested only by the separate switch action.
          await toggle.click();
          await expect(
            view.getByText("Access wasn’t allowed. This setting is still off."),
          ).toBeVisible();
          expect(
            await view.evaluate(() => websiteAccessFixture.requests),
          ).toEqual([{ origins: ["http://*/*", "https://*/*"] }]);
        }
        await settings.click();
        await expect(
          view.getByRole("button", { name: "Fonts", exact: true }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(link).toBeVisible();
      }
      // Opening Settings normally should not reuse a past focus request.
      await settings.click();
      await expect(toggle).toBeEnabled();
      await expect(toggle).not.toBeFocused();
      await settings.click();
      await app.page.goto("chrome://settings");
      await view.getByRole("button", { name: /Scan again/ }).click();
      await expect(
        view.getByRole("heading", { name: "This page cannot be inspected" }),
      ).toBeVisible();
      await expect(link).toHaveCount(0);
    } finally {
      await app.context.close();
    }
  });

  test(`${mode} website access requires confirmation and supports revoke, regrant and external changes`, async ({}, info) => {
    const app = await launch(info, { permissionFixture: true });
    try {
      const view = await (mode === "panel" ? app.openPanel() : app.openPopup());
      await view.setViewportSize({
        width: mode === "panel" ? 400 : 720,
        height: mode === "panel" ? 820 : 600,
      });
      await view.getByRole("button", { name: "Settings", exact: true }).click();
      const toggle = view.getByRole("switch", {
        name: "Allow on all websites",
        exact: true,
      });
      await expect(toggle).toBeEnabled();
      await expect(toggle).not.toBeChecked();
      await toggle.click();
      await expect(
        view.getByText("Access wasn’t allowed. This setting is still off."),
      ).toBeVisible();
      await expect(toggle).not.toBeChecked();
      await view.evaluate(() => (websiteAccessFixture.decision = "defer"));
      await toggle.click();
      await expect(toggle).toBeDisabled();
      await expect(toggle).not.toBeChecked();
      await view.evaluate(() => websiteAccessFixture.deferred(true));
      await expect(toggle).toBeChecked();
      await expect(toggle).toBeEnabled();
      expect(await view.evaluate(() => websiteAccessFixture.requests)).toEqual([
        { origins: ["http://*/*", "https://*/*"] },
        { origins: ["http://*/*", "https://*/*"] },
      ]);
      await toggle.click();
      await expect(toggle).not.toBeChecked();
      await expect(
        view.getByText(
          "All-website access removed. Per-site requests are available.",
        ),
      ).toBeVisible();
      expect(await view.evaluate(() => websiteAccessFixture.removals)).toEqual([
        { origins: ["http://*/*", "https://*/*"] },
      ]);
      await view.evaluate(() => (websiteAccessFixture.decision = "allow"));
      await toggle.click();
      await expect(toggle).toBeChecked();
      await view.evaluate(() => websiteAccessFixture.external(false));
      await expect(toggle).not.toBeChecked();
      await view.evaluate(() => websiteAccessFixture.external(true));
      await expect(toggle).toBeChecked();
      await view.getByRole("button", { name: "Colors", exact: true }).click();
      await view.getByRole("button", { name: "Settings", exact: true }).click();
      await expect(toggle).toBeChecked();
      for (const appearance of ["light", "dark"]) {
        await view.emulateMedia({ colorScheme: appearance });
        await view.screenshot({
          path: info.outputPath(`website-access-${mode}-${appearance}.png`),
        });
        await view
          .getByRole("button", { name: "About website access", exact: true })
          .click();
        const tip = view
          .getByRole("tooltip")
          .filter({ hasText: "Chrome asks for access" });
        await expect(tip).toBeInViewport({ ratio: 1 });
        await view
          .getByRole("button", { name: "About website access", exact: true })
          .press("Escape");
      }
      // A newer Chrome change must win over an older permission read, including
      // the message displayed after a pending removal finishes.
      await view.evaluate(() => {
        websiteAccessFixture.deferContains = 2;
      });
      await toggle.click();
      await expect
        .poll(() =>
          view.evaluate(() => typeof websiteAccessFixture.releaseRead),
        )
        .toBe("function");
      await view.evaluate(() => websiteAccessFixture.external(true));
      await expect(toggle).toBeChecked();
      await view.evaluate(() => websiteAccessFixture.releaseRead());
      await expect(toggle).toBeEnabled();
      await expect(toggle).toBeChecked();
      await expect(
        view.getByText(
          "All-website access removed. Per-site requests are available.",
        ),
      ).toHaveCount(0);
      await view.evaluate(() => {
        websiteAccessFixture.external(false);
        websiteAccessFixture.decision = "error";
      });
      await toggle.click();
      await expect(
        view.getByText("Chrome could not change website access. Try again."),
      ).toBeVisible();
      await expect(toggle).not.toBeChecked();
      await expect(toggle).toBeEnabled();
    } finally {
      await app.context.close();
    }
  });
}

test("toolbar popup sizes itself and keeps all settings reachable without a test-supplied viewport", async ({}, info) => {
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
            el.scrollIntoView({ block: "nearest" });
            const rect = el.getBoundingClientRect();
            return rect.top >= main.top - 1 && rect.bottom <= main.bottom + 1;
          }).length;
        }),
      )
      .toBe(12);
    await writeFile(
      info.outputPath("toolbar-sizing.json"),
      JSON.stringify({ palette, reachableSettings: 12 }, null, 2),
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
            return popup.document.querySelectorAll(".preferences .setting")
              .length;
          }),
        )
        .toBe(11);
      await control.evaluate(() => {
        const popup = chrome.extension.getViews({ type: "popup" })[0];
        popup.document.querySelector(".preferences .setting input").click();
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
test("popup keeps labeled Settings and all preferences reachable in both appearances", async ({}, info) => {
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
      await expect(popup.getByRole("switch")).toHaveCount(12);
      await expect(
        popup.getByRole("radiogroup", { name: "Appearance" }),
      ).toBeInViewport({ ratio: 1 });
      const bounds = await popup.evaluate(() => {
        const main = document.querySelector("main").getBoundingClientRect();
        const preferences = [
          ...document.querySelectorAll(".preferences .setting"),
        ].map((el) => {
          el.scrollIntoView({ block: "nearest" });
          return el.getBoundingClientRect();
        });
        return {
          width: document.body.getBoundingClientRect().width,
          height: document.querySelector(".window").getBoundingClientRect()
            .height,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
          reachablePreferences: preferences.filter(
            (rect) =>
              rect.top >= main.top - 1 && rect.bottom <= main.bottom + 1,
          ).length,
          preferenceCount: preferences.length,
        };
      });
      expect(bounds).toEqual({
        width: 720,
        height: 600,
        horizontalOverflow: false,
        reachablePreferences: 11,
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
    const action = app.page.locator("#action");
    const shadowButton = app.page.locator("#shadow-host button");
    await app.page.evaluate(() => {
      const styles = new CSSStyleSheet();
      styles.replaceSync("#action { cursor: pointer !important; }");
      document.adoptedStyleSheets.push(styles);
    });
    await shadowButton.evaluate((node) => (node.style.cursor = "help"));
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
    const pause = panel.getByRole("button", { name: "Pause selection" });
    const resume = panel.getByRole("button", { name: "Resume selecting" });
    const overlay = app.page.locator("getter-inspection-overlay");
    await expect(pause).toBeVisible();
    await expect(action).toHaveCSS("cursor", "crosshair");
    const pagePause = overlay.getByRole("button", {
      name: "Pause",
      exact: true,
    });
    await expect(pagePause).toHaveCSS("cursor", "pointer");
    await pagePause.click();
    await expect(resume).toHaveCount(1);
    await expect(action).toHaveCSS("cursor", "pointer");
    await resume.click();
    await action.click();
    await expect(panel.locator(".element-title")).toContainText(
      "button#action",
    );
    const propertySearch = panel.getByRole("searchbox", {
      name: "Find CSS property",
    });
    await propertySearch.fill("cursor");
    await panel.getByTitle("Copy cursor", { exact: true }).click();
    await expect
      .poll(() => panel.evaluate(() => window.copied.at(-1)))
      .toBe("pointer");
    await propertySearch.clear();
    await expect(action).toHaveCSS("cursor", "crosshair");
    expect(await app.page.evaluate(() => window.actionClicks || 0)).toBe(0);
    expect(await app.page.evaluate(() => window.pressActions)).toEqual([]);
    await expect(pause).toBeVisible();
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
    await pause.click();
    await expect(resume).toHaveCount(1);
    await expect(overlay).toHaveCount(0);
    await expect(action).toHaveCSS("cursor", "pointer");
    await action.click();
    expect(await app.page.evaluate(() => window.actionClicks)).toBe(1);
    expect(await app.page.evaluate(() => window.pressActions)).toEqual([
      "pointerdown",
      "mousedown",
      "pointerup",
      "mouseup",
    ]);
    await expect(panel.locator(".element-title")).toContainText("section#card");
    await resume.click();
    await expect(action).toHaveCSS("cursor", "crosshair");
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
    await shadowButton.hover();
    await expect(shadowButton).toHaveCSS("cursor", "crosshair");
    await shadowButton.click();
    await expect(panel.locator(".element-title")).toContainText(
      "button#shadow-button",
    );
    await expect(panel.getByText(/inside a shadow root/)).toBeVisible();
    await app.page.keyboard.press("Escape");
    await expect(resume).toBeVisible();
    await expect(shadowButton).toHaveCSS("cursor", "help");
    await resume.click();
    await app.page.locator("#plain").click();
    await app.page.locator("#plain").evaluate((el) => el.remove());
    await expect(
      panel.getByRole("heading", { name: "Element no longer available" }),
    ).toBeVisible();
    await panel.getByRole("button", { name: "Colors", exact: true }).click();
    await expect(overlay).toHaveCount(0);
    await expect(action).toHaveCSS("cursor", "pointer");
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
