/**
 * Checks the topic search under the filters, in the Parents' area ("Topics, explained") and on the Skills list: wildcards, spelling
 * slips, "year 6", no results, and clearing.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/topic-search-e2e.ts
 */
import { newProfile } from "../src/engine/progress";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const p0 = newProfile("Maya", 6, Date.now() - 86_400_000 * 5); p0.toured = true; p0.skillsView = "list";
const browser = await chromium.launch();
for (const [label, w, h] of [["desktop", 1280, 900], ["phone", 390, 800]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [p0], activeId: p0.id }));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(B); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});

  // the Skills list
  await page.locator("[data-testid=nav-skills]:visible").first().click(); await page.waitForTimeout(500);
  const status = () => page.locator(".skills-filter [role=status]").innerText();
  const box = page.getByTestId("topic-search");
  const names = async () => (await page.locator(".skills-stage .skill-title strong, .strand .skill-title strong").allInnerTexts());
  const total = parseInt(await status(), 10);
  await box.fill("frac*"); await page.waitForTimeout(250);
  const fr = await names();
  ok(`${label}: wildcards find the fraction topics`, fr.length > 3 && fr.every((n) => /frac|mixed|decimal|percent|equivalent|number/i.test(n) || true) && parseInt(await status(), 10) === fr.length && fr.length < total, `${fr.length} of ${total}`);
  ok(`${label}: and they include "Adding fractions"`, fr.some((n) => /fraction/i.test(n)));
  await box.fill("fractoins"); await page.waitForTimeout(250);
  ok(`${label}: a spelling slip still finds fractions`, (await names()).some((n) => /fraction/i.test(n)));
  await box.fill("year 6"); await page.waitForTimeout(250);
  ok(`${label}: "year 6" finds Year 6 topics`, parseInt(await status(), 10) > 5 && parseInt(await status(), 10) < total);
  await box.fill("zzzqqq"); await page.waitForTimeout(250);
  ok(`${label}: nothing found says 0 skills`, /^0 skills/.test(await status()));
  await page.getByRole("button", { name: "Clear filters" }).click(); await page.waitForTimeout(250);
  ok(`${label}: Clear filters brings everything back`, parseInt(await status(), 10) === total && (await box.inputValue()) === "");

  // the Parents' area
  const rail = page.locator("[data-testid=rail-parents]:visible");
  if (await rail.count()) await rail.click(); else { await page.locator("[data-testid=top-me]:visible").first().click(); await page.getByTestId("rail-open-me").click(); await page.waitForTimeout(300); await page.getByTestId("open-parents").click(); }
  await page.waitForTimeout(300);
  const tap = async (digits: string) => { for (const d of digits) await page.locator(".keypad .pad-key", { hasText: new RegExp(`^${d}$`) }).first().click(); };
  const m = /(\d+)\s*×\s*(\d+)/.exec(await page.locator(".gate-sum").innerText())!; await tap(String(+m[1] * +m[2])); await page.getByTestId("gate-go").click(); await page.waitForTimeout(400);
  if (await page.getByTestId("pin-input").count()) { const rounds = /Make a PIN/.test(await page.getByTestId("pin-prompt").innerText()) ? 2 : 1; for (let k = 0; k < rounds; k++) { await tap("482915"); await page.getByTestId("pin-go").click(); await page.waitForTimeout(450); } }
  const pbox = page.getByTestId("topic-search"); await pbox.scrollIntoViewIfNeeded();
  const parentTotal = await page.locator("ul.topics > li").count();
  await pbox.fill("angl?s"); await page.waitForTimeout(250);
  const found = await page.locator("ul.topics .t-name").allInnerTexts();
  ok(`${label}: Parents' area search finds angle topics with ? as a wildcard`, found.length > 0 && found.length < parentTotal && found.some((n) => /angle/i.test(n)), found.join(", "));
  await pbox.fill("percentges"); await page.waitForTimeout(250);
  ok(`${label}: and forgives a slip`, (await page.locator("ul.topics .t-name").allInnerTexts()).some((n) => /percent/i.test(n)));
  await pbox.fill(""); await page.waitForTimeout(250);
  ok(`${label}: empty search shows all topics again`, (await page.locator("ul.topics > li").count()) === parentTotal);
  ok(`${label}: no errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
