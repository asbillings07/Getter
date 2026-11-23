import test from "node:test";
import assert from "node:assert/strict";
import { activePage, siteOrigin, websiteOrigins } from "../src/core/access.js";
import { ScanSession } from "../src/core/scan.js";
import { extractPage } from "../src/core/extract.js";

function event() {
  const listeners = new Set();
  return {
    listeners,
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
    fire: (...args) => [...listeners].forEach((fn) => fn(...args)),
  };
}
function fixture() {
  const model = {
    id: 7,
    windowId: 1,
    url: "https://first.test/a",
    documentId: "first",
    granted: false,
  };
  const requests = [],
    reads = [],
    states = [],
    queries = [];
  const api = {
    tabs: {
      query: async (query) => {
        queries.push(query);
        return [
          {
            id: model.id,
            windowId: model.windowId,
            ...(model.granted ? { url: model.url } : {}),
          },
        ];
      },
      onUpdated: event(),
      onActivated: event(),
    },
    webNavigation: {
      getFrame: async () => ({ url: model.url, documentId: model.documentId }),
      getAllFrames: async () => [],
    },
    permissions: {
      request: async (permission) => {
        requests.push(permission);
        return false;
      },
      onAdded: event(),
      onRemoved: event(),
    },
    scripting: {
      executeScript: async ({ target, func }) => {
        assert.equal(model.granted, true, "page content must require access");
        assert.deepEqual(
          target.documentIds,
          [model.documentId],
          "read must pin the current document",
        );
        if (func === extractPage) {
          reads.push(model.url);
          return [
            {
              frameId: 0,
              documentId: model.documentId,
              result: {
                colors: [],
                fonts: [],
                images: [],
                frames: 0,
                visited: 0,
                limited: false,
              },
            },
          ];
        }
        return [{ frameId: 0, documentId: model.documentId, result: true }];
      },
    },
  };
  const session = new ScanSession(api, (value) => states.push(value), {
    followTabs: true,
  });
  session.start();
  return { model, requests, reads, states, queries, api, session };
}

test("site requests contain only the exact HTTP(S) hostname, never a path or all sites", () => {
  assert.equal(
    siteOrigin("https://a.example.test:8443/private?q=secret"),
    "https://a.example.test/*",
  );
  assert.equal(siteOrigin("http://localhost:8123/test"), "http://localhost/*");
  for (const url of [
    "file:///private",
    "chrome://settings",
    "https://chromewebstore.google.com/detail/x",
  ])
    assert.throws(() => siteOrigin(url));
  assert.deepEqual(websiteOrigins, ["http://*/*", "https://*/*"]);
});

test("ungranted normal sites remain identifiable without reading content or automatically requesting access", async () => {
  const f = fixture();
  try {
    await f.session.scan();
    assert.equal(f.states.at(-1).status, "access");
    assert.equal(f.states.at(-1).host, "first.test");
    assert.equal(f.states.at(-1).data, null);
    assert.deepEqual(f.requests, []);
    assert.deepEqual(f.reads, []);
    f.model.url = "https://second.test/";
    f.model.documentId = "second";
    f.api.tabs.onUpdated.fire(7, { status: "loading" });
    await f.session.refreshTarget();
    assert.equal(f.states.at(-1).host, "second.test");
    assert.deepEqual(f.requests, []);
    assert.deepEqual(f.reads, []);
    assert.deepEqual(f.queries.at(-1), { active: true, windowId: 1 });
  } finally {
    f.session.dispose();
  }
});

test("denying a site request leaves content unread, and a later approval scans without the popup", async () => {
  const f = fixture();
  try {
    await f.session.scan({ requestAccess: true });
    assert.equal(f.states.at(-1).status, "denied");
    assert.deepEqual(f.reads, []);
    assert.deepEqual(f.requests, [{ origins: ["https://first.test/*"] }]);
    f.api.permissions.request = async (permission) => {
      f.requests.push(permission);
      f.model.granted = true;
      f.api.permissions.onAdded.fire(permission);
      return true;
    };
    await f.session.scan({ requestAccess: true });
    assert.equal(f.states.at(-1).status, "ready");
    assert.deepEqual(f.reads, ["https://first.test/a"]);
    await f.session.scan({ requestAccess: true });
    assert.equal(
      f.requests.length,
      2,
      "already permitted pages do not prompt again",
    );
  } finally {
    f.session.dispose();
  }
});

test("navigation, tab changes, revocation and closure while a permission prompt is open cannot publish stale results", async () => {
  for (const change of ["navigate", "reload", "activate", "revoke", "close"]) {
    const f = fixture();
    let release, begin;
    const started = new Promise((resolve) => (begin = resolve));
    f.api.permissions.request = () => {
      begin();
      return new Promise((resolve) => (release = resolve));
    };
    try {
      const work = f.session.scan({ requestAccess: true });
      await started;
      assert.equal(f.states.at(-1).status, "permission");
      if (change === "close") f.session.dispose();
      else if (change === "revoke")
        f.api.permissions.onRemoved.fire({ origins: websiteOrigins });
      else if (change === "activate") {
        f.model.id = 8;
        f.model.url = "https://second.test/";
        f.model.documentId = "second";
        f.api.tabs.onActivated.fire({ tabId: 8, windowId: 1 });
      } else {
        if (change === "navigate") f.model.url = "https://second.test/";
        f.model.documentId = "reloaded";
        f.api.tabs.onUpdated.fire(7, { status: "loading" });
      }
      release(true);
      await work;
      assert.deepEqual(f.reads, []);
      assert.ok(!f.states.some((s) => s.status === "ready"));
    } finally {
      f.session.dispose();
    }
  }
});

test("a same-URL reload is rejected by document identity even before a navigation event arrives", async () => {
  const f = fixture();
  try {
    f.api.permissions.request = async () => {
      f.model.documentId = "different";
      f.model.granted = true;
      return true;
    };
    await f.session.scan({ requestAccess: true });
    assert.equal(f.states.at(-1).status, "stale");
    assert.deepEqual(f.reads, []);
  } finally {
    f.session.dispose();
  }
});

test("restricted pages never request host permission, and errors do not claim a successful grant", async () => {
  const f = fixture();
  try {
    f.model.url = "chrome://settings";
    await f.session.scan({ requestAccess: true });
    assert.equal(f.states.at(-1).status, "blocked");
    assert.deepEqual(f.requests, []);
    f.model.url = "https://first.test/a";
    f.api.permissions.request = async () => {
      throw Error("request denied by policy");
    };
    await f.session.scan({ requestAccess: true });
    assert.equal(f.states.at(-1).status, "error");
    assert.deepEqual(f.reads, []);
  } finally {
    f.session.dispose();
  }
});

test("removing access clears ready data and disposing removes all permission listeners", async () => {
  const f = fixture();
  f.model.granted = true;
  await f.session.scan();
  assert.equal(f.states.at(-1).status, "ready");
  f.model.granted = false;
  f.api.permissions.onRemoved.fire({ origins: websiteOrigins });
  assert.equal(f.states.at(-1).data, null);
  await f.session.refreshTarget();
  assert.equal(f.states.at(-1).status, "access");
  f.session.dispose();
  for (const e of [
    f.api.permissions.onAdded,
    f.api.permissions.onRemoved,
    f.api.tabs.onUpdated,
    f.api.tabs.onActivated,
  ])
    assert.equal(e.listeners.size, 0);
});

test("metadata lookup pins the current committed document rather than a stale tab URL", async () => {
  const f = fixture();
  try {
    f.api.tabs.query = async () => [
      { id: 7, windowId: 1, url: "https://old.test/" },
    ];
    const tab = await activePage(f.api, 1);
    assert.equal(tab.url, "https://first.test/a");
    assert.equal(tab.documentId, "first");
  } finally {
    f.session.dispose();
  }
});
