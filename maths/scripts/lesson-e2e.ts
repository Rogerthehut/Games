/**
 * Runs a worked-example lesson end to end from the skills list: watch one worked through, try one with help, three on your own, a
 * revisit question, then the finish. Also checks a wrong answer twice shows the steps, and that finishing is saved.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/lesson-e2e.ts
 */
import { buildLesson } from "../src/engine/lesson";
import { tmpdir } from "node:os";
import { correctInputs } from "../src/engine/answer-inputs";
import { newProfile } from "../src/engine/progress";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const SKILL = "rounding";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const lesson = buildLesson(SKILL);
const p0 = newProfile("Maya", 5, Date.now() - 86_400_000 * 5); p0.toured = true; p0.skillsView = "list";
const browser = await chromium.launch();
for (const [label, w, h] of [["desktop", 1280, 860], ["phone", 390, 800]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [p0], activeId: p0.id }));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(B); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  const nav = page.locator("[data-testid=nav-skills]:visible").first(); await nav.click(); await page.waitForTimeout(600);
  const open = page.getByTestId(`lesson-${SKILL}`);
  await open.scrollIntoViewIfNeeded();
  ok(`${label}: the skill has a Learn this button`, (await open.count()) === 1);
  await open.click(); await page.waitForTimeout(500);
  ok(`${label}: opens on Learn with the worked example`, (await page.locator("h1").innerText()) === "Learn");

  // 1. model: show every step
  for (let i = 0; i < 12 && (await page.getByTestId("lesson-show").count()); i++) await page.getByTestId("lesson-show").click();
  ok(`${label}: the worked answer is shown`, /Answer:/.test(await page.locator(".lesson-panel").innerText()));
  await page.getByTestId("lesson-next").click(); await page.waitForTimeout(300);
  ok(`${label}: then Try with help`, (await page.locator("h1").innerText()) === "Try with help");

  const fill = (text: string) => page.locator(".lesson-panel input.field-input, .lesson-panel input").first().fill(text);
  const type = async (q: typeof lesson.guided) => {
    const input = correctInputs(q);
    if (q.answer.kind === "choice") { await page.locator(".choices button, [role=radio]").nth(Number(input[0])).click(); }
    else await fill(input[0]);
    await page.getByTestId("check").click(); await page.waitForTimeout(250);
  };
  // 2. guided: a wrong answer shows feedback, then the right one
  await fill("987654"); await page.getByTestId("check").click(); await page.waitForTimeout(250);
  ok(`${label}: a wrong answer gets a nudge, not the answer`, (await page.locator(".fb.bad").count()) === 1 && (await page.locator(".fb.reveal").count()) === 0);
  await type(lesson.guided);
  ok(`${label}: guided answer accepted`, (await page.locator(".fb.good").count()) === 1);
  await page.getByTestId("lesson-next").click(); await page.waitForTimeout(300);

  // 3. three on their own: get the first wrong twice (steps shown), then the other two right
  ok(`${label}: Try on your own`, (await page.locator("h1").innerText()) === "Try on your own");
  for (let t = 0; t < 2; t++) { await fill(String(987654 + t)); await page.getByTestId("check").click(); await page.waitForTimeout(700); }
  ok(`${label}: two wrong tries reveal the steps`, (await page.locator(".fb.reveal").count()) === 1);
  await page.getByTestId("lesson-next").click(); await page.waitForTimeout(300);
  await type(lesson.independent[1]); await page.getByTestId("lesson-next").click(); await page.waitForTimeout(300);
  await type(lesson.independent[2]); await page.getByTestId("lesson-next").click(); await page.waitForTimeout(300);

  // 4. revisit, then finish
  ok(`${label}: Remember this? comes last`, (await page.locator("h1").innerText()) === "Remember this?");
  await type(lesson.revisit.q); await page.getByTestId("lesson-next").click(); await page.waitForTimeout(400);
  ok(`${label}: Lesson complete`, (await page.locator("h1").innerText()) === "Lesson complete");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mathpath.v1") ?? "{}"));
  ok(`${label}: finishing is saved`, !!saved.profiles?.[0]?.lessons?.[SKILL]);
  await page.getByTestId("lesson-done").click(); await page.waitForTimeout(500);
  ok(`${label}: back on the skills list, button now says Lesson again`, /Lesson again/.test(await page.getByTestId(`lesson-${SKILL}`).innerText()));
  await page.screenshot({ path: `${process.env.OUT ?? tmpdir()}/lesson-${label}.png` });
  ok(`${label}: no errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
