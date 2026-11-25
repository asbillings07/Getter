import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const studioWorkspaceQa = process.argv.includes("--studio-workspace-qa");
const studioAccountQa =
  studioWorkspaceQa || process.argv.includes("--studio-account-qa");
const outdir = studioWorkspaceQa
  ? "dist-studio-workspace-qa"
  : studioAccountQa
    ? "dist-studio-qa"
    : "dist";
await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await cp("src/static", outdir, { recursive: true });
await build({
  entryPoints: {
    popup: "src/App.jsx",
    background: "src/background.js",
    inspect: "src/inspect-content.js",
    ...(studioWorkspaceQa ? { studio: "src/studio/Studio.jsx" } : {}),
  },
  outdir,
  bundle: true,
  format: "iife",
  target: "chrome141",
  minify: !process.argv.includes("--development"),
  legalComments: "eof",
  define: {
    "process.env.NODE_ENV": '"production"',
    GETTER_STUDIO_ACCOUNT_QA: JSON.stringify(studioAccountQa),
    GETTER_STUDIO_WORKSPACE_QA: JSON.stringify(studioWorkspaceQa),
  },
});
await cp("src/style.css", `${outdir}/popup.css`);
if (studioAccountQa) {
  const manifest = JSON.parse(
    await readFile("src/static/manifest.json", "utf8"),
  );
  manifest.name = studioWorkspaceQa
    ? "Getter Studio Workspace QA"
    : "Getter Studio Account QA";
  manifest.action.default_title = manifest.name;
  if (studioWorkspaceQa) {
    manifest.version_name = `${manifest.version} Browse and Design QA 9`;
    manifest.options_ui = { page: "studio.html", open_in_tab: true };
    manifest.content_security_policy.extension_pages =
      manifest.content_security_policy.extension_pages.replace(
        "img-src 'self' https:",
        "img-src 'self' https: data: blob:",
      );
    await cp("src/studio/studio.css", `${outdir}/studio.css`);
    await writeFile(
      `${outdir}/studio.html`,
      '<!doctype html><html lang="en" data-mode="panel"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Getter Studio Workspace QA</title><link rel="stylesheet" href="popup.css"><link rel="stylesheet" href="studio.css"></head><body><div id="root"></div><script src="studio.js"></script></body></html>\n',
    );
  }
  await writeFile(
    `${outdir}/manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await cp("src/studio-account.css", `${outdir}/studio-account.css`);
}

const accountStyles = studioAccountQa
  ? '<link rel="stylesheet" href="studio-account.css">'
  : "";
const studioStyles = studioWorkspaceQa
  ? '<link rel="stylesheet" href="studio.css">'
  : "";
for (const [file, mode] of [
  ["popup", ""],
  ["sidepanel", ' data-mode="panel"'],
]) {
  await writeFile(
    `${outdir}/${file}.html`,
    `<!doctype html><html lang="en"${mode}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Getter — Created by Aptelum Labs</title><link rel="stylesheet" href="popup.css">${accountStyles}${studioStyles}</head><body><div id="root"></div><script src="popup.js"></script></body></html>\n`,
  );
}
