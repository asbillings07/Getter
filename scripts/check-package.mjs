import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const m = JSON.parse(await readFile("dist/manifest.json", "utf8"));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
assert.equal(m.version, pkg.version);
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[""].version, pkg.version);
assert.equal(m.manifest_version, 3);
assert.deepEqual(m.permissions, [
  "activeTab",
  "scripting",
  "storage",
  "downloads",
  "webNavigation",
]);
assert.equal(m.host_permissions, undefined);
assert.equal(m.optional_host_permissions, undefined);
assert.equal(m.web_accessible_resources, undefined);
assert.equal(
  m.content_security_policy.extension_pages,
  "script-src 'self'; object-src 'none'; base-uri 'none'; connect-src https:; img-src 'self' https:",
);
assert.equal(
  createHash("sha256")
    .update(await readFile("dist/images/aptelum-mark.png"))
    .digest("hex"),
  "e055a95caa78654fafd4aab080c91e216c262cada22d92173a5de0542ec60d80",
);
const popup = await readFile("dist/popup.js", "utf8");
assert.match(popup, /Created by Aptelum Labs/);
assert.match(popup, /mailto:support@aptelum\.com/);
assert.match(
  popup,
  /https:\/\/github\.com\/asbillings07\/Getter\/blob\/main\/PRIVACY\.md/,
);
assert.doesNotMatch(popup, /Created by Aaron Billings|An Aptelum product/);
assert.deepEqual((await readdir("dist")).sort(), [
  "background.js",
  "images",
  "manifest.json",
  "popup.css",
  "popup.html",
  "popup.js",
]);
console.log(
  "Package permissions, CSP, attribution, exact logo and inventory verified.",
);
