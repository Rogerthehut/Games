/**
 * Prints the quarter curriculum booklet to a PDF: npx tsx scripts/build-booklet.ts
 * Needs Playwright with Chromium. Writes server/assets/quarter-curriculum.pdf (served to subscribed parents) and checks that no page overflows.
 * Set PLAYWRIGHT_MODULE=/path/to/playwright/index.js if Playwright is installed somewhere else. Add --shots to save a picture of every page.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildBooklet } from "../src/booklet/model";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(resolve(root, "src/booklet/booklet.css"), "utf8");
// the app's fonts, with their paths pointed at node_modules so the page can load them from disk
const fonts = readFileSync(resolve(root, "src/fonts.css"), "utf8").replace(/url\("(@fontsource[^"]+)"\)/g, (_, p) => `url("${pathToFileURL(resolve(root, "node_modules", p)).href}")`);
const { pages } = buildBooklet();
const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>The quarter curriculum</title><style>${fonts}\n${css}\n@page { size: 794px 1123px; margin: 0 } html, body { margin: 0; background: #fff } .bk { break-after: page; }</style></head><body>${pages.map((p) => p.html).join("\n")}</body></html>`;
const htmlPath = resolve(root, "scripts/.booklet.html");
writeFileSync(htmlPath, html);

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await page.goto(pathToFileURL(htmlPath).href);
await page.evaluate(() => document.fonts.ready);
// a page overflows when something inside it sticks out below the page content area
const overflow: string[] = await page.evaluate(() => [...document.querySelectorAll(".bk")].flatMap((el, i) => {
  const box = el.getBoundingClientRect(), out: string[] = [];
  const body = el.querySelector(".bk-body") as HTMLElement | null;
  if (body) { const limit = box.top + 1123 - 66; for (const child of Array.from(body.children)) { const r = child.getBoundingClientRect(); if (r.bottom > limit + 1) out.push(`page ${i + 1}: content reaches ${Math.round(r.bottom - box.top)}px (limit ${1123 - 66})`); } }
  return out;
}));
const outPath = resolve(root, "server/assets/quarter-curriculum.pdf");
mkdirSync(dirname(outPath), { recursive: true });
await page.pdf({ path: outPath, width: "794px", height: "1123px", printBackground: true, preferCSSPageSize: true });
if (process.argv.includes("--shots")) {
  const dir = resolve(root, "scripts/.booklet-shots");
  mkdirSync(dir, { recursive: true });
  const els = await page.$$(".bk");
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: resolve(dir, `p${String(i + 1).padStart(2, "0")}.png`) });
}
await browser.close();
console.log(`${pages.length} pages written to ${outPath}`);
if (overflow.length) { console.log("Pages that overflow:\n" + overflow.join("\n")); process.exitCode = 1; }
