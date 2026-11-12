/**
 * Checks the guides: the children's guide opens from Me without the grown-ups' PIN, sections open and close, and printing
 * opens every section.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/guides-e2e.ts
 */
import { newProfile } from "../src/engine/progress";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const p0 = newProfile("Maya", 6, Date.now() - 86_400_000 * 5); p0.toured = true;
const browser = await chromium.launch();
for (const [label, w, h] of [["desktop", 1280, 900], ["phone", 390, 800]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } (window as any).__printed = 0;
 window.print = () => { (window as any).__printed++; (window as any).__closedAtPrint = document.querySelectorAll(".guide-block:not([open])").length; setTimeout(() => window.dispatchEvent(new Event("afterprint")), 50); }; }, JSON.stringify({ version: 1, profiles: [p0], activeId: p0.id }));
  // a stand-in voice, so reading aloud can be checked without a speaker (plain JavaScript, added as text)
  await ctx.addInitScript({ content: `(() => { const spoken = []; window.__spoken = spoken; window.__cancelled = 0;
    const synth = { speaking: false, pending: false, paused: false, getVoices: () => [],
      cancel() { this.speaking = false; window.__cancelled++; }, resume() {}, speak(u) { this.speaking = true; spoken.push(u.text); setTimeout(() => u.onstart && u.onstart(), 30); } };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true }); })();` });
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(B); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  const nav = page.locator("[data-testid=nav-me]:visible").first(); if (await nav.count()) await nav.click(); else await page.locator(".rail-me").click(); await page.waitForTimeout(400);

  await page.getByTestId("open-child-guide").click(); await page.waitForTimeout(400);
  ok(`${label}: the children's guide opens from Me without a PIN`, (await page.getByTestId("guide-list").count()) === 1 && (await page.getByTestId("gate-input").count()) === 0);
  ok(`${label}: it is the children's guide only (no switch)`, (await page.getByTestId("guide-parents").count()) === 0 && /Your first go/.test(await page.locator("body").innerText()));
  const blocks = page.locator(".guide-block");
  ok(`${label}: the first section is open and the others are closed`, (await blocks.nth(0).getAttribute("open")) !== null && (await blocks.nth(1).getAttribute("open")) === null);
  await blocks.nth(1).locator("summary").click();
  ok(`${label}: a section opens when tapped`, (await blocks.nth(1).getAttribute("open")) !== null);
  ok(`${label}: steps get number badges and tips get notes`, (await page.locator(".guide-steps li").count()) > 0 && (await blocks.nth(2).locator(".guide-tips").count()) === 1);
  await page.getByTestId("read-first").count().catch(() => 0);
  await page.getByTestId("read-first").click(); await page.waitForTimeout(250);
  ok(`${label}: Read aloud speaks the section, with its title and numbered steps`, (await page.evaluate(() => (window as any).__spoken.length)) === 1 && /Your first go\./.test(await page.evaluate(() => (window as any).__spoken[0])) && /Step 2\./.test(await page.evaluate(() => (window as any).__spoken[0])));
  ok(`${label}: and the button turns into Stop reading`, /Stop reading/.test(await page.getByTestId("read-first").innerText()));
  await page.getByTestId("read-first").click(); await page.waitForTimeout(250);
  ok(`${label}: tapping again stops it`, /Read aloud/.test(await page.getByTestId("read-first").innerText()) && (await page.evaluate(() => (window as any).__cancelled ?? 0)) > 0);
  await page.getByTestId("guide-print").click(); await page.waitForTimeout(400);
  ok(`${label}: Print opens every section and asks the browser to print`, (await page.evaluate(() => (window as any).__printed)) === 1 && (await page.evaluate(() => (window as any).__closedAtPrint)) === 0);
  await page.waitForTimeout(300);
  ok(`${label}: and then puts the page back`, !(await page.evaluate(() => document.body.classList.contains("printing-guide"))));
  await page.screenshot({ path: `${process.env.OUT ?? "."}/guide-${label}.png` });
  await page.locator("button[aria-label='Back to Me']").click(); await page.waitForTimeout(300);
  ok(`${label}: back on Me`, /Choose your avatar/i.test(await page.locator("body").innerText()));
  ok(`${label}: no errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
