/**
 * "Explain your answer" questions: write, compare with the model answer, tick the key points, and be marked by the ticks.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/explain-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
import { tmpdir } from "node:os";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };

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
  await page.locator("[data-testid=nav-skills]:visible").first().click(); await page.waitForTimeout(500);
  const row = page.locator("#skill-explain-why"); await row.scrollIntoViewIfNeeded(); await row.getByRole("button", { name: "Practise" }).click(); await page.waitForTimeout(600);
  if (await page.getByTestId("intro-skip").count()) await page.getByTestId("intro-skip").click();
  await page.waitForTimeout(300);

  ok(`${label}: a box to write in, and no marking panel yet`, (await page.getByTestId("explain-text").isVisible()) && (await page.getByTestId("explain-mark").count()) === 0);
  ok(`${label}: Compare waits for some writing`, await page.getByTestId("explain-compare").isDisabled());
  ok(`${label}: Check waits for some writing`, await page.getByTestId("check").isDisabled());
  await page.getByTestId("explain-text").fill("Because of the numbers in the question");
  await page.getByTestId("explain-compare").click(); await page.waitForTimeout(300);
  ok(`${label}: the model answer and key points appear`, (await page.getByTestId("explain-mark").isVisible()) && (await page.locator("[data-testid^=explain-point-]").count()) >= 2);
  ok(`${label}: it says the child marks it`, /mark this one yourself/i.test(await page.getByTestId("explain-mark").innerText()));
  await page.screenshot({ path: `${process.env.OUT ?? tmpdir()}/explain-${label}.png` });
  // tick all but the last point: marked wrong, naming what was missed
  const points = await page.locator("[data-testid^=explain-point-]").count();
  for (let i = 0; i < points - 1; i++) await page.getByTestId(`explain-point-${i}`).check();
  await page.getByTestId("check").click(); await page.waitForTimeout(500);
  ok(`${label}: missing a point is not marked right`, !/Correct|Well done|Nice one/i.test(await page.locator("body").innerText()) || /didn't include/.test(await page.locator("body").innerText()));
  ok(`${label}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${label}: no script errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close(); process.exit(failed ? 1 : 0);
