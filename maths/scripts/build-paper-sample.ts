/**
 * Builds the free sample practice paper: npx tsx scripts/build-paper-sample.ts   (or: npm run paper-sample)
 * Prints paper no. SAMPLE_NUMBER (the 20-question maths paper) with its answers and mark scheme to
 *   public/quarter-sample-practice-paper.pdf   (served to everyone at /quarter-sample-practice-paper.pdf)
 * and a picture of the first page, public/practice-paper-sample.png, for the public sample page.
 * It uses the same print view as the app, so the sample looks exactly like a paper printed from quarter.
 * Needs Playwright with Chromium (set PLAYWRIGHT_MODULE=/path/to/playwright/index.js if it is somewhere else).
 */
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SAMPLE_NUMBER = 101;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = resolve(root, "scripts/.paper-sample");
mkdirSync(tmp, { recursive: true });
await build({ entryPoints: [resolve(root, "scripts/paper-sample-entry.tsx")], bundle: true, outfile: resolve(tmp, "bundle.js"), jsx: "automatic", jsxImportSource: "preact", loader: { ".woff2": "dataurl", ".woff": "dataurl" }, logLevel: "error" });
const css = readFileSync(resolve(root, "src/styles.css"), "utf8");
const fonts = readFileSync(resolve(root, "src/fonts.css"), "utf8").replace(/url\("(@fontsource[^"]+)"\)/g, (_, p) => `url("${pathToFileURL(resolve(root, "node_modules", p)).href}")`);
writeFileSync(resolve(tmp, "index.html"), `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>quarter practice paper</title><style>${fonts}\n${css}</style></head><body><script src="bundle.js"></script></body></html>`);

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
await page.goto(`${pathToFileURL(resolve(tmp, "index.html")).href}?n=${SAMPLE_NUMBER}`);
await page.waitForSelector(".pp-q");
await page.evaluate(() => document.fonts.ready);
await page.emulateMedia({ media: "print" });
await page.pdf({ path: resolve(root, "public/quarter-sample-practice-paper.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
await page.emulateMedia({ media: "screen" });
const box = (await page.locator(".pp-paper").boundingBox())!;
await page.screenshot({ path: resolve(root, "public/practice-paper-sample.png"), fullPage: true, clip: { x: box.x, y: box.y, width: box.width, height: Math.round(box.width * 1.414) } }); // the first page, in A4 proportions
await browser.close();
console.log("wrote public/quarter-sample-practice-paper.pdf and public/practice-paper-sample.png");
