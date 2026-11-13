/**
 * App Store screenshots: five real screens at each App Store Connect size, with no overlays (headlines are added afterwards).
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js OUT=/some/dir STORE=/path/to/store.json npx tsx scripts/store-shots.ts
 */
import { readFileSync, mkdirSync } from "node:fs";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173", OUT = process.env.OUT ?? "./store-shots", store = readFileSync(process.env.STORE!, "utf8");
mkdirSync(OUT, { recursive: true });
// [name, css width, css height, device scale] chosen so the saved PNG is exactly the App Store size
const SIZES = [["iphone-6.3in-1206x2622", 402, 874, 3], ["iphone-6.9in-1320x2868", 440, 956, 3], ["ipad-13in-2064x2752", 1032, 1376, 2], ["duo-outer-1398x2034", 699, 1017, 2]] as const;
const wait = (p: any, ms = 500) => p.waitForTimeout(ms);
const click = async (p: any, id: string) => { await p.getByTestId(id).first().click(); await wait(p, 400); };
const nav = async (p: any, tab: string) => { await p.locator(`[data-testid=nav-${tab}]:visible`).first().click(); await wait(p, 800); };
const SCREENS: [string, (p: any) => Promise<void>][] = [
  ["1-today", async () => {}],
  ["2-practice", async (p) => {
    await nav(p, "skills"); await p.getByRole("button", { name: /^(Show as a list|List)$/ }).first().click().catch(() => {}); await wait(p, 300);
    await p.locator('#skill-frac-add button:has-text("Practise")').click(); await wait(p, 600);
    await p.getByTestId("intro-skip").click().catch(() => {}); await wait(p, 600);
  }],
  ["3-working-out", async (p) => {
    await nav(p, "skills"); await p.getByRole("button", { name: /^(Show as a list|List)$/ }).first().click().catch(() => {}); await wait(p, 300);
    await p.locator('#skill-add-sub button:has-text("Practise")').click(); await wait(p, 600);
    await p.getByTestId("intro-skip").click().catch(() => {}); await wait(p, 600);
    await p.getByRole("button", { name: "Working-out tools" }).click(); await wait(p, 900);
  }],
  ["4-skills-map", async (p) => { await nav(p, "skills"); await wait(p, 900); }],
  ["5-stem-lab", async (p) => { await click(p, "open-stem"); await click(p, "open-lab-binary"); await click(p, "binary-challenge"); await p.getByRole("button", { name: /Lamp worth 8,/ }).click(); await wait(p, 500); }],
];
const browser = await chromium.launch();
for (const [size, w, h, scale] of SIZES) {
  for (const [name, go] of SCREENS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, hasTouch: true, isMobile: w < 900, reducedMotion: "reduce" });
    await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) { localStorage.setItem("mathpath.v1", s); localStorage.setItem("quarter.storage-notice.v1", "seen"); } } catch { /* */ } }, store);
    const page = await ctx.newPage(); page.setDefaultTimeout(8000);
    await page.goto(B); await wait(page, 900);
    await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {});
    await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
    try { await go(page); await page.addStyleTag({ content: ".more-cue, .qbar-more { display: none !important; }" }); await wait(page, 200); await page.getByRole("button", { name: "Got it" }).click({ timeout: 300 }).catch(() => {}); await page.screenshot({ path: `${OUT}/${size}/${name}.png` }); console.log("saved", size, name); }
    catch (e) { console.log("FAILED", size, name, String(e).split("\n")[0]); }
    await ctx.close();
  }
}
await browser.close();
