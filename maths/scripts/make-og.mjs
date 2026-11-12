/**
 * Draws the share image (the preview shown when a link to quarter is pasted into a chat or social post) at 1200 x 630.
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js node scripts/make-og.mjs
 * The file name carries a version (og-image-2.png) because chat apps keep a preview for days; change the name and the references
 * (index.html and the OG_IMAGE constants in scripts/) together when the picture changes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "public/og-image-2.png");
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const font = (pkg, file) => pathToFileURL(resolve(root, `node_modules/@fontsource-variable/${pkg}/files/${file}`)).href;
const cube = readFileSync(resolve(root, "public/icon.svg"), "utf8").replace("<svg ", '<svg width="220" height="220" ');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:F;font-weight:100 900;src:url("${font("fraunces", "fraunces-latin-wght-normal.woff2")}")}
@font-face{font-family:G;font-weight:300 900;src:url("${font("figtree", "figtree-latin-wght-normal.woff2")}")}
html,body{margin:0}body{width:1200px;height:630px;display:flex;align-items:center;justify-content:center;gap:56px;
 background:radial-gradient(900px 500px at 0% 0%,#fbe3e8,transparent 70%),radial-gradient(900px 500px at 100% 100%,#e0e5f7,transparent 70%),#f6f1e4}
.wm{font:760 150px/1 F,Georgia,serif;letter-spacing:-.04em;color:#1e2038;display:flex;align-items:center;white-space:nowrap}
.wm svg{width:.48em;height:.69em;color:#e0709b;margin-top:-.03em}
.wm sup{align-self:flex-start;margin-left:.12em;font:700 .24em/1 system-ui,sans-serif;letter-spacing:0;margin-top:.12em}
.tag{font:600 46px/1.15 G,system-ui,sans-serif;color:#4a4f73;margin-top:22px}
</style><body>${cube}<div><div class="wm"><span>qua</span><svg viewBox="0 0 14 20"><path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z"/></svg><span>ter</span><sup>™</sup></div>
<div class="tag">Maths and STEM practice<br>for Years 3 to 13</div></div></body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: OUT });
await b.close();
console.log("Wrote", OUT);
