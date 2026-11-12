/**
 * Draws the logo used in quarter's email signature (public/email/quarter-signature-logo.png): the cube and wordmark on a cream tile, at 2x so it
 * stays sharp on phones. Email programs block SVG and web fonts, so it has to be a picture, and a solid tile keeps it readable in dark mode.
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js node scripts/make-email-assets.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const font = (file) => pathToFileURL(resolve(root, `node_modules/@fontsource-variable/fraunces/files/${file}`)).href;
const cube = readFileSync(resolve(root, "public/icon.svg"), "utf8").replace("<svg ", '<svg width="64" height="64" ');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:F;font-weight:100 900;src:url("${font("fraunces-latin-wght-normal.woff2")}")}
html,body{margin:0}body{width:340px;height:100px;display:flex;align-items:center;justify-content:center;gap:14px;background:#f6f1e4;border-radius:14px}
.wm{font:760 46px/1 F,Georgia,serif;letter-spacing:-.04em;color:#1e2038;display:flex;align-items:center;white-space:nowrap}
.wm svg{width:.48em;height:.69em;color:#e0709b;margin-top:-.03em}
.wm sup{align-self:flex-start;margin-left:.1em;font:700 .26em/1 Arial,sans-serif;letter-spacing:0;margin-top:.1em}
</style><body>${cube}<div class="wm"><span>qua</span><svg viewBox="0 0 14 20"><path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z"/></svg><span>ter</span><sup>™</sup></div></body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 340, height: 100 }, deviceScaleFactor: 2 });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: resolve(root, "public/email/quarter-signature-logo.png"), omitBackground: true });
await b.close();
console.log("Wrote public/email/quarter-signature-logo.png");
