/**
 * Checks the quick-fire refresher from Today: it is offered after a week of practice, runs ten mixed questions, and finishing it
 * records the date so it isn't offered again straight away.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/refresher-e2e.ts
 */
import { newProfile, recordAnswer, DAY } from "../src/engine/progress";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const now = Date.now();
const fresh: any = newProfile("Maya", 4, now - 30 * DAY); fresh.toured = true;
let busy: any = { ...fresh };
for (const id of ["place-value", "add-sub", "rounding", "division"]) busy = recordAnswer(busy, id, "right", now - 2 * DAY);
busy = recordAnswer(busy, "division", "wrong", now - 2 * DAY);

const browser = await chromium.launch();
const run = async (label: string, profile: any, w: number, h: number) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [profile], activeId: profile.id }));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(B); await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  return { ctx, page, errors };
};

// 1. nothing practised this week: no refresher
{
  const { ctx, page, errors } = await run("quiet", fresh, 1280, 860);
  ok("a quiet week offers no refresher", (await page.getByTestId("start-refresher").count()) === 0);
  ok("no errors (quiet)", errors.length === 0, errors.join("; ")); await ctx.close();
}
// 2. a busy week: offered, runs ten questions, finishing hides it
for (const [label, w, h] of [["desktop", 1280, 860], ["phone", 390, 800]] as const) {
  const { ctx, page, errors } = await run(label, busy, w, h);
  const row = page.getByTestId("start-refresher");
  ok(`${label}: a busy week offers the refresher`, (await row.count()) === 1);
  ok(`${label}: it says how many topics`, /4 topics/.test(await row.innerText()));
  await row.scrollIntoViewIfNeeded(); await row.click(); await page.waitForTimeout(500);
  let asked = 0;
  for (let i = 0; i < 14 && !(await page.getByTestId("lesson-done").count()); i++) {
    if (await page.getByTestId("intro-skip").count()) await page.getByTestId("intro-skip").click();
    if (!(await page.getByTestId("question").count())) break;
    asked++;
    // give up each question: wrong twice reveals the steps, then Next
    const input = page.locator(".practice-page input").first();
    for (let t = 0; t < 3 && !(await page.getByTestId("next").count()); t++) { await input.fill(String(990000 + t)); await page.getByTestId("check").click(); await page.waitForTimeout(700); }
    if (await page.getByTestId("next").count()) await page.getByTestId("next").click();
    await page.waitForTimeout(300);
  }
  ok(`${label}: ten questions were asked`, asked === 10, `asked ${asked}`);
  await page.waitForTimeout(400);
  ok(`${label}: the summary mentions the revision`, /Revision done/.test(await page.locator("body").innerText()));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mathpath.v1") ?? "{}"));
  ok(`${label}: finishing records the date`, typeof saved.profiles?.[0]?.lastRefresher === "number");
  await page.getByRole("button", { name: /back|done|home|today/i }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  ok(`${label}: not offered again straight away`, (await page.getByTestId("start-refresher").count()) === 0);
  ok(`${label}: no errors`, errors.length === 0, errors.join("; ")); await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
