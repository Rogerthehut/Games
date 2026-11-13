/**
 * The side menu can be dragged narrower (icons only) and wider again, and remembers it.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/rail-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
import { tmpdir } from "node:os";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };
const p0 = newProfile("Maya", 5, Date.now() - 86_400_000 * 5); p0.toured = true;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [p0], activeId: p0.id }));
const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
await page.goto(B); await page.waitForTimeout(800);
await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
const railW = () => page.evaluate(() => Math.round(document.querySelector(".rail")!.getBoundingClientRect().width));
const contentW = () => page.evaluate(() => Math.round(document.querySelector(".content")!.getBoundingClientRect().width));
const grip = page.getByTestId("rail-grip");
ok("starts at the normal width", (await railW()) === 264, String(await railW()));
const box = (await grip.boundingBox())!, y = box.y + 300;
await page.mouse.move(box.x + 4, y); await page.mouse.down(); await page.mouse.move(200, y, { steps: 5 }); await page.mouse.move(60, y, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(400);
ok("dragging in shrinks it to icons", (await railW()) === 76, String(await railW()));
ok("the labels are hidden and nothing scrolls sideways", !(await page.locator(".rail .nav-item > span").first().isVisible()) && (await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)));
const slimContent = await contentW();
await page.screenshot({ path: `${tmpdir()}/rail-slim.png` });
await page.reload(); await page.waitForTimeout(800);
await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
ok("it remembers", (await railW()) === 76, String(await railW()));
const b2 = (await grip.boundingBox())!;
await page.mouse.move(b2.x + 4, y); await page.mouse.down(); await page.mouse.move(250, y, { steps: 6 }); await page.mouse.move(330, y, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(400);
ok("dragging out widens it", (await railW()) === 330, String(await railW()));
ok("the page narrows to make room", (await contentW()) < slimContent + 1);
await grip.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(300);
ok("Enter switches to icons", (await railW()) === 76);
await page.keyboard.press("Enter"); await page.waitForTimeout(300);
ok("and back again", (await railW()) === 264);
ok("no script errors", errors.length === 0, errors.join("; "));
await browser.close(); process.exit(failed ? 1 : 0);
