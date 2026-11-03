import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("src/static", "dist", { recursive: true });
await build({
  entryPoints: { popup: "src/App.jsx", background: "src/background.js" },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome120",
  minify: !process.argv.includes("--development"),
  legalComments: "eof",
  define: { "process.env.NODE_ENV": '"production"' },
});
await cp("src/style.css", "dist/popup.css");
await writeFile(
  "dist/popup.html",
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Getter — Created by Aptelum Labs</title><link rel="stylesheet" href="popup.css"></head><body><div id="root"></div><script src="popup.js"></script></body></html>\n',
);
