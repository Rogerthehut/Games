/**
 * Draws the app icons from public/icon.svg: node scripts/make-icons.mjs  (needs Playwright with Chromium; set PLAYWRIGHT_MODULE if it lives elsewhere)
 * Writes favicon.ico (16, 32 and 48), favicon-16.png, favicon-32.png, apple-touch-icon.png (180), icon-192.png, icon-512.png and icon-maskable-512.png into public/.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pub = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const svg = readFileSync(resolve(pub, "icon.svg"), "utf8");
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;

// the maskable icon fills the whole square and keeps the tiles inside the central 80% that every device keeps
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#121522"/><g transform="translate(4.8 4.8) scale(.9)">${svg.replace(/<svg[^>]*>|<\/svg>|<rect x="3" y="3" width="90" height="90"[^>]*\/>/g, "")}</g></svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(markup, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`);
  return page.screenshot({ type: "png", omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
const out = {
  "favicon-16.png": await png(svg, 16), "favicon-32.png": await png(svg, 32), "apple-touch-icon.png": await png(svg, 180),
  "icon-192.png": await png(svg, 192), "icon-512.png": await png(svg, 512), "icon-maskable-512.png": await png(maskable, 512),
};
const icoSizes = [16, 32, 48], icoImages = await Promise.all(icoSizes.map((s) => png(svg, s)));
await browser.close();

// favicon.ico: a small header, then each size as an embedded PNG
const head = Buffer.alloc(6 + 16 * icoSizes.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(icoSizes.length, 4);
let offset = head.length;
icoSizes.forEach((s, i) => { const at = 6 + 16 * i; head.writeUInt8(s, at); head.writeUInt8(s, at + 1); head.writeUInt16LE(1, at + 4); head.writeUInt16LE(32, at + 6); head.writeUInt32LE(icoImages[i].length, at + 8); head.writeUInt32LE(offset, at + 12); offset += icoImages[i].length; });
writeFileSync(resolve(pub, "favicon.ico"), Buffer.concat([head, ...icoImages]));
for (const [name, data] of Object.entries(out)) writeFileSync(resolve(pub, name), data);
console.log("Wrote favicon.ico and", Object.keys(out).join(", "));
