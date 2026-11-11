/**
 * Checks that a quick double tap can't do something twice: checking an answer, showing the steps and moving to the next question.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/tap-e2e.ts
 */
import { newProfile } from "../src/engine/progress";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const p0 = newProfile("Maya", 6, Date.now() - 86_400_000 * 5); p0.toured = true;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [p0], activeId: p0.id }));
const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
await page.goto(B); await page.waitForTimeout(800);
await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});

const counter = async () => (await page.locator(".workbook-tab").first().innerText()).replace(/\s+/g, " ");
await page.getByTestId("start-practice").first().click(); await page.waitForTimeout(500);
for (let i = 0; i < 4 && (await page.getByTestId("intro-skip").count()); i++) { await page.getByTestId("intro-skip").click(); await page.waitForTimeout(300); }
await page.waitForSelector("[data-testid=check]");
ok("practice starts at question 1", /1 of/.test(await counter()), await counter());

// 1. a wrong answer tapped twice counts as one try, so the answer isn't revealed
const box = page.locator("input:visible").first();
if (await box.count()) {
  await box.fill("98765");
  await Promise.all([page.getByTestId("check").click(), page.getByTestId("check").click({ delay: 0 }).catch(() => {})]);
  await page.waitForTimeout(500);
  ok("a double-tapped wrong answer is one try, not two (the steps aren't revealed yet)", (await page.getByTestId("check").count()) === 1 && (await page.getByTestId("next").count()) === 0);
} else ok("(skipped: the first question wasn't typed)", true);

// 2. showing the steps and then Next, each tapped twice: one question forward
await page.getByTestId("show-me").first().click().catch(() => {}); await page.waitForTimeout(400);
await page.getByTestId("show-me").first().click().catch(() => {});
const next = page.getByTestId("next");
await next.waitFor();
await Promise.all([next.click(), next.click().catch(() => {})]);
await page.waitForTimeout(700);
ok("tapping Next twice moves on by one question, not two", /2 of/.test(await counter()), await counter());
ok("no errors", errors.length === 0, errors.join("; "));

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
