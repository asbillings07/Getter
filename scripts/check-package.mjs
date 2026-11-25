import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const m = JSON.parse(await readFile("dist/manifest.json", "utf8"));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
assert.equal(m.version, pkg.version);
assert.equal(m.name, "Getter");
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[""].version, pkg.version);
assert.equal(m.manifest_version, 3);
assert.equal(m.side_panel.default_path, "sidepanel.html");
assert.equal(m.minimum_chrome_version, "141");
assert.deepEqual(m.permissions, [
  "activeTab",
  "scripting",
  "storage",
  "downloads",
  "webNavigation",
  "sidePanel",
]);
assert.equal(m.host_permissions, undefined);
assert.deepEqual(m.optional_host_permissions, ["http://*/*", "https://*/*"]);
assert.equal(m.web_accessible_resources, undefined);
assert.equal(m.options_ui, undefined);
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
for (const size of [16, 32, 48, 128]) {
  const icon = `images/CSS-Getter-Icon-${size}px.png`;
  assert.equal(m.icons[size], icon);
  assert.equal(m.action.default_icon[size], icon);
  const png = await readFile(`dist/${icon}`);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.toString("ascii", 12, 16), "IHDR");
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}
const popup = await readFile("dist/popup.js", "utf8");
assert.match(popup, /Created by Aptelum Labs/);
assert.match(popup, /mailto:support@aptelum\.com/);
assert.match(
  popup,
  /https:\/\/github\.com\/asbillings07\/Getter\/blob\/main\/PRIVACY\.md/,
);
assert.doesNotMatch(popup, /Created by Aaron Billings|An Aptelum product/);
assert.doesNotMatch(
  popup,
  /Subscribe to Studio|Open Studio QA|Aptelum sign-in is unavailable|Save palette to collection|Save all (typography|images|text) to collection|Individual assets|studio-side-dialog|studio-inspect-motion/,
);
assert.doesNotMatch(
  await readFile("dist/inspect.js", "utf8"),
  /getter-studio-inspect|studio-capture|studio-((sampled|native)-)?motion|select-parent/,
);
assert.deepEqual((await readdir("dist")).sort(), [
  "background.js",
  "images",
  "inspect.js",
  "manifest.json",
  "popup.css",
  "popup.html",
  "popup.js",
  "sidepanel.html",
]);
console.log(
  "Package permissions, CSP, attribution, exact logo and inventory verified.",
);
