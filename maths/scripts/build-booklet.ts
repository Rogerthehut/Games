/**
 * Prints the quarter curriculum booklet to PDF: npx tsx scripts/build-booklet.ts   (or: npm run booklet)
 * Needs Playwright with Chromium. Writes two files and checks that no page overflows:
 *   server/assets/quarter-curriculum.pdf        the full booklet, served to signed-in parents
 *   public/quarter-curriculum-sample.pdf        the free sample, served to everyone at /quarter-curriculum-sample.pdf
 * and two pictures for the public sample page: public/booklet-sample-cover.png and public/booklet-sample-page.png.
 * Set PLAYWRIGHT_MODULE=/path/to/playwright/index.js if Playwright is installed somewhere else. Add --shots to save a picture of every page.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SAMPLE_YEAR, buildBooklet, buildBookletSample } from "../src/booklet/model";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(resolve(root, "src/booklet/booklet.css"), "utf8");
// the app's fonts, with their paths pointed at node_modules so the page can load them from disk
const fonts = readFileSync(resolve(root, "src/fonts.css"), "utf8").replace(/url\("(@fontsource[^"]+)"\)/g, (_, p) => `url("${pathToFileURL(resolve(root, "node_modules", p)).href}")`);
const doc = (title: string, pages: { html: string }[]) => `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${title}</title><style>${fonts}\n${css}\n@page { size: 794px 1123px; margin: 0 } html, body { margin: 0; background: #fff } .bk { break-after: page; }</style></head><body>${pages.map((p) => p.html).join("\n")}</body></html>`;

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const browser = await chromium.launch();
let failed = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function render(name: string, title: string, pages: { html: string }[], outPath: string, extra?: (els: any[]) => Promise<void>) {
  const htmlPath = resolve(root, `scripts/.${name}.html`);
  writeFileSync(htmlPath, doc(title, pages));
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.goto(pathToFileURL(htmlPath).href);
  await page.evaluate(() => document.fonts.ready);
  // a page overflows when something inside it sticks out below the page content area
  const overflow: string[] = await page.evaluate(() => [...document.querySelectorAll(".bk")].flatMap((el, i) => {
    const box = el.getBoundingClientRect(), out: string[] = [];
    const body = el.querySelector(".bk-body") as HTMLElement | null;
    if (body) { const limit = box.top + 1123 - 66; for (const child of Array.from(body.children)) { const r = child.getBoundingClientRect(); if (r.bottom > limit + 1) out.push(`page ${i + 1}: content reaches below the page area`); } }
    return out;
  }));
  mkdirSync(dirname(outPath), { recursive: true });
  await page.pdf({ path: outPath, width: "794px", height: "1123px", printBackground: true, preferCSSPageSize: true });
  if (extra) await extra(await page.$$(".bk"));
  await page.close();
  console.log(`${pages.length} pages written to ${outPath}`);
  if (overflow.length) { console.log(`Pages that overflow in ${name}:\n` + overflow.join("\n")); failed = true; }
}

const full = buildBooklet();
await render("booklet", "The quarter curriculum", full.pages, resolve(root, "server/assets/quarter-curriculum.pdf"), async (els) => {
  if (!process.argv.includes("--shots")) return;
  const dir = resolve(root, "scripts/.booklet-shots");
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: resolve(dir, `p${String(i + 1).padStart(2, "0")}.png`) });
});

const sample = buildBookletSample();
await render("booklet-sample", "The quarter curriculum: free sample", sample.pages, resolve(root, "public/quarter-curriculum-sample.pdf"), async (els) => {
  // pictures of the cover and the first page of the sample year, for the public sample page
  const firstYear = sample.pages.findIndex((p) => p.title === `Year ${SAMPLE_YEAR}`);
  await els[0].screenshot({ path: resolve(root, "public/booklet-sample-cover.png") });
  if (firstYear >= 0) await els[firstYear].screenshot({ path: resolve(root, "public/booklet-sample-page.png") });
});

await browser.close();
if (failed) process.exitCode = 1;
