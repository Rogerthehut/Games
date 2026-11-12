/**
 * Checks the times tables challenges: a blitz and a race can be played, a personal best is set and then beaten, and the family board
 * shows a brother or sister, can hide a learner, and ranks everyone.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/tables-challenge-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
import { recordChallenge } from "../src/engine/tables-challenge";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const now = Date.now();
const maya: any = newProfile("Maya", 5, now - 9 * 86_400_000); maya.toured = true;
const leo: any = newProfile("Leo", 3, now - 9 * 86_400_000); leo.toured = true;
const leoScored = recordChallenge(leo, "blitz", "all", 14, 1, 60_000, now - 86_400_000).profile;

const browser = await chromium.launch();
for (const [label, w, h] of [["desktop", 1280, 900], ["phone", 390, 800]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [maya, leoScored], activeId: maya.id }));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.clock.install();
  await page.goto(B); await page.clock.runFor(900);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  await page.locator("[data-testid=start-tables]:visible").first().click(); await page.clock.runFor(500);

  await page.getByTestId("start-blitz").waitFor();
  ok(`${label}: the tables page has the challenges`, (await page.getByTestId("start-blitz").count()) === 1 && (await page.getByTestId("start-race").count()) === 1);
  ok(`${label}: no score yet`, /No score yet/.test(await page.getByTestId("best-blitz").innerText()));

  // a blitz: answer a few correctly by reading the question, then let the clock run out
  const solve = async (n: number) => {
    for (let i = 0; i < n; i++) {
      const m = /(\d+)\s*×\s*(\d+)/.exec(await page.getByTestId("challenge-question").innerText())!;
      await page.keyboard.type(String(+m[1] * +m[2])); await page.clock.runFor(250);
    }
  };
  await page.getByTestId("start-blitz").click(); await page.clock.runFor(300);
  await solve(6);
  ok(`${label}: the blitz counts right answers`, /6 right/.test(await page.locator(".tt-count").innerText()));
  await page.clock.runFor(61_000);
  await page.waitForTimeout(200);
  ok(`${label}: the blitz ends at 60 seconds with a new personal best`, /New personal best/.test(await page.locator("h1").innerText()));
  ok(`${label}: and shows the score`, /6 right/.test(await page.getByTestId("challenge-score").innerText()));

  // beat it
  await page.getByTestId("challenge-again").click(); await page.clock.runFor(300);
  await solve(9); await page.clock.runFor(61_000); await page.waitForTimeout(200);
  ok(`${label}: beating it sets a new best`, /New personal best/.test(await page.locator("h1").innerText()) && /9 right/.test(await page.getByTestId("challenge-score").innerText()));
  // a worse round keeps the best
  await page.getByTestId("challenge-again").click(); await page.clock.runFor(300);
  await solve(2); await page.clock.runFor(61_000); await page.waitForTimeout(200);
  ok(`${label}: a lower round keeps the best and says so kindly`, /Round done/.test(await page.locator("h1").innerText()) && /still/.test(await page.locator(".tt-wrap").innerText()));

  // the board
  await page.getByTestId("challenge-board").click(); await page.clock.runFor(300);
  const rows = page.getByTestId("family-board").locator("li");
  ok(`${label}: the family board lists both learners`, (await rows.count()) === 2);
  const names = await rows.locator(".tt-who strong").allInnerTexts();
  ok(`${label}: Leo (14) leads Maya (9)`, names[0].startsWith("Leo") && names[1].startsWith("Maya"), names.join(","));
  ok(`${label}: Maya is marked as you`, /\(you\)/.test(names[1]));
  await page.screenshot({ path: `${process.env.OUT ?? "."}/tt-board-${label}.png` });
  await page.getByTestId("board-mode-race").click(); await page.clock.runFor(200);
  ok(`${label}: nobody has a race score yet, and the board says so`, (await page.getByTestId("family-board").locator("li").filter({ hasText: "Not yet" }).count()) === 2);
  await page.getByTestId("board-back").click(); await page.clock.runFor(300);

  // a race: 25 questions, penalties for wrong ones
  await page.getByTestId("start-race").click(); await page.clock.runFor(300);
  for (let i = 0; i < 25; i++) {
    const m = /(\d+)\s*×\s*(\d+)/.exec(await page.getByTestId("challenge-question").innerText())!;
    const right = String(+m[1] * +m[2]); await page.keyboard.type(i === 3 ? "1".repeat(right.length) : right); await page.clock.runFor(400);
  }
  await page.waitForTimeout(200);
  ok(`${label}: the race finishes after 25 with a score`, /New personal best/.test(await page.locator("h1").innerText()) && /\d:\d\d\.\d/.test(await page.getByTestId("challenge-score").innerText()));
  ok(`${label}: one wrong answer adds 3 seconds`, /3 seconds added/.test(await page.locator(".tt-wrap").innerText()));
  ok(`${label}: no errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
