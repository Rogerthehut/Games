/**
 * The Parents' area sum must open in front of whoever tapped it, wherever the page is scrolled, and its keypad and buttons must be
 * reachable on small phones. (It once opened half way up a long page, out of sight, in Safari on an iPhone.)
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/gate-position-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8");
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const b = await chromium.launch();
for (const [label, vp] of [["iPhone SE", { width: 375, height: 667 }], ["iPhone 15", { width: 390, height: 664 }], ["small Android", { width: 360, height: 560 }]] as const) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: true, isMobile: true });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, store);
  const p = await ctx.newPage(); p.setDefaultTimeout(9000);
  await p.goto(base); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  await p.getByRole("button", { name: /open Me/ }).first().click(); await p.waitForTimeout(600);
  const row = p.getByTestId("open-parents"); await row.scrollIntoViewIfNeeded();
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(300);
  await row.click(); await p.waitForTimeout(500);
  const box = await p.locator(".gate").boundingBox(), vh = await p.evaluate(() => innerHeight);
  ok(`${label}: the sum appears`, !!box);
  ok(`${label}: it sits inside the visible screen, not further up the page`, !!box && box.y >= 0 && box.y < vh - 40, JSON.stringify(box));
  const back = await p.locator(".gate-backdrop").evaluate((e: HTMLElement) => ({ parent: e.parentElement?.tagName, top: e.getBoundingClientRect().top, h: e.getBoundingClientRect().height, vh: innerHeight }));
  ok(`${label}: the dim layer is on the page body and covers the whole screen`, back.parent === "BODY" && back.top === 0 && Math.abs(back.h - back.vh) <= 1, JSON.stringify(back));
  // every key and the buttons can be reached, scrolling inside the pop-up if the screen is short
  const key = p.locator(".gate .keypad button").last(); await key.scrollIntoViewIfNeeded();
  const kb = await key.boundingBox();
  ok(`${label}: the last key can be brought into view`, !!kb && kb.y >= 0 && kb.y + kb.height <= vh + 1, JSON.stringify(kb));
  await ctx.close();
}
await b.close();
process.exit(failed ? 1 : 0);
