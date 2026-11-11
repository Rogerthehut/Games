/**
 * End-to-end check of the assessment journey, in a real browser: who can start a pathway test, saving and resuming, failing and retrying,
 * the exact pass mark, one certificate only, and the pathway moving on. It reads the saved paper from the browser to know the right answers.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/pathway-e2e.ts
 * Options: APP=http://localhost:4173  OUT=./pathway-e2e (screenshots)
 */
import { mkdirSync } from "node:fs";
import { SKILLS } from "../src/curriculum";
import { correctInputs } from "../src/engine/answer-inputs";
import { pathwayPassMark } from "../src/engine/pathway";
import { newProfile, SECURE_BOX } from "../src/engine/progress";
import type { Question } from "../src/engine/types";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const out = process.env.OUT ?? "./pathway-e2e";
mkdirSync(out, { recursive: true });

const results: [string, string][] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push([cond ? "PASS" : "FAIL", name]); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

/** A Year 6 learner. With `secure`, every Key Stage 2 topic has been secured. */
const store = (secure: boolean) => {
  const p = newProfile("Maya", 6, Date.now() - 86_400_000 * 40);
  if (secure) for (const s of SKILLS.filter((x) => x.stage === "KS2")) p.skills[s.id] = { box: SECURE_BOX, seen: 4, right: 4, wrong: 0, due: Date.now() + 86_400_000 * 20, last: Date.now() - 86_400_000 };
  p.toured = true;
  return JSON.stringify({ version: 1, profiles: [p], activeId: p.id });
};

const browser = await chromium.launch();
const open = async (secure: boolean, size = { width: 1280, height: 860 }) => {
  const ctx = await browser.newContext({ viewport: size });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, store(secure));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(B); await page.waitForTimeout(700);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  return { ctx, page, errors };
};
const saved = (page: any) => page.evaluate(() => JSON.parse(localStorage.getItem("mathpath.v1")!).profiles[0]);
const toMap = async (page: any) => { const tab = page.locator("[data-testid=nav-skills]:visible").first(); if (await tab.count()) await tab.click(); else await page.getByRole("link", { name: /^skills$/i }).first().click(); await page.waitForTimeout(600); };
const finalTestButton = (page: any) => page.getByRole("button", { name: "Take the final test" });

/** Answers the visible question. `right` says whether to answer correctly. */
async function answer(page: any, q: Question, right: boolean) {
  const a = q.answer;
  if (a.kind === "choice") { await page.getByTestId(`choice-${right ? a.correct : (a.correct + 1) % a.options.length}`).click(); }
  else {
    let inputs = correctInputs(q);
    if (!right) inputs = inputs.map((v) => (Number.isFinite(Number(v)) ? String(Math.abs(Number(v)) + 1357) : "99999"));
    const boxes = page.locator("input:visible");
    for (let i = 0; i < inputs.length; i++) await boxes.nth(i).fill(inputs[i]);
  }
  await page.getByTestId("next").click();
}

/** Starts a test, saves it straight away so the paper can be read, then comes back and answers `rightCount` questions correctly. */
async function takeTest(page: any, rightCount: number) {
  await finalTestButton(page).first().click();
  await page.getByTestId("pathway-start").click();
  await page.waitForSelector("[data-testid=question]");
  await page.getByTestId("close").click(); await page.waitForTimeout(500);
  const draft = (await saved(page)).pathwayDrafts.KS2;
  const questions: Question[] = draft.questions;
  // back in from Today: the saved test is offered
  await page.locator("[data-testid=nav-today]:visible").first().click().catch(() => {}); await page.waitForTimeout(400);
  const cont = page.getByRole("button", { name: /Continue .*pathway test/i });
  const offered = (await cont.count()) > 0;
  if (offered) await cont.first().click(); else { await toMap(page); await finalTestButton(page).first().click(); }
  await page.getByTestId("pathway-start").click();
  for (let i = 0; i < questions.length; i++) {
    await page.waitForSelector("[data-testid=question]");
    await answer(page, questions[i], i < rightCount);
    if (i < questions.length - 1) {
      try { await page.waitForFunction((n: number) => document.body.innerText.includes(`Question ${n} of`), i + 2); }
      catch (e) { await page.screenshot({ path: `${out}/stuck-q${i + 1}.png` }); throw new Error(`stuck on question ${i + 1} (${questions[i].skill}: ${questions[i].prompt.slice(0, 80)} | ${JSON.stringify(questions[i].answer).slice(0, 120)})`); }
    }
  }
  await page.waitForTimeout(700);
  return { total: questions.length, offered };
}

// ---------------------------------------------------------------- 1. someone who hasn't secured the topics
{
  const { ctx, page, errors } = await open(false);
  await toMap(page);
  ok("a learner who hasn't secured every topic isn't offered the final test", (await finalTestButton(page).count()) === 0);
  await page.screenshot({ path: `${out}/1-not-ready.png` });
  ok("no errors on the way", errors.length === 0, errors.join("; "));
  await ctx.close();
}

// ---------------------------------------------------------------- 2. someone who has: fail, near miss, then the exact pass mark
{
  const { ctx, page, errors } = await open(true);
  await toMap(page);
  ok("a learner with every topic secured is offered the final test", (await finalTestButton(page).count()) > 0);
  await page.screenshot({ path: `${out}/2-ready.png` });

  // attempt 1: every answer wrong
  let r = await takeTest(page, 0);
  ok("a started test can be saved and picked up again from Today", r.offered);
  const total = r.total, mark = pathwayPassMark(total);
  ok("the Key Stage 2 test is a fair sample of 30 questions", total === 30, String(total));
  let text = await page.locator("body").innerText();
  ok("all wrong: the result says to keep going, with the pass mark", /Keep going/.test(text) && text.includes(`at least ${mark} correct`));
  ok("all wrong: no certificate is awarded", ((await saved(page)).certificates ?? []).length === 0);
  ok("all wrong: the saved paper is cleared", !(await saved(page)).pathwayDrafts?.KS2);
  await page.screenshot({ path: `${out}/3-fail.png` });
  await page.getByRole("button", { name: "Back to skills" }).click(); await page.waitForTimeout(500);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/3b-after-fail.png` });
  ok("after failing, the learner can try again", (await finalTestButton(page).count()) > 0, (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));

  // attempt 2: one short of the pass mark
  r = await takeTest(page, mark - 1);
  text = await page.locator("body").innerText();
  ok("one short of the pass mark: no certificate", /Keep going/.test(text) && ((await saved(page)).certificates ?? []).length === 0, text.slice(0, 120));
  await page.getByRole("button", { name: "Back to skills" }).click(); await page.waitForTimeout(500);

  // attempt 3: exactly the pass mark
  r = await takeTest(page, mark);
  text = await page.locator("body").innerText();
  const profile = await saved(page);
  ok("exactly the pass mark: the certificate is earned", /You earned your certificate/.test(text) && (profile.certificates ?? []).length === 1, text.slice(0, 120));
  ok("the certificate records the stage and the score", profile.certificates?.[0]?.stage === "KS2" && profile.certificates?.[0]?.score === mark && profile.certificates?.[0]?.total === total);
  await page.screenshot({ path: `${out}/4-pass.png` });
  await page.getByRole("button", { name: "See your certificate" }).click(); await page.waitForTimeout(600);
  text = await page.locator("body").innerText();
  ok("the certificate names the learner, the pathway and the score", text.includes("Maya") && text.includes("Key Stage 2") && text.includes(`${mark} out of ${total}`));
  await page.screenshot({ path: `${out}/5-certificate.png` });

  // it lasts, and the pathway moves on
  await page.reload(); await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {});
  ok("the certificate is still there after reloading", ((await saved(page)).certificates ?? []).length === 1);
  await toMap(page);
  ok("the Key Stage 2 test can't be taken twice", (await finalTestButton(page).count()) === 0);
  ok("nothing broke along the way", errors.length === 0, errors.join("; "));
  await ctx.close();
}

// ---------------------------------------------------------------- 3. on a phone
{
  const { ctx, page, errors } = await open(true, { width: 390, height: 844 });
  await toMap(page);
  ok("the final test is offered on a phone too", (await finalTestButton(page).count()) > 0);
  await finalTestButton(page).first().click();
  await page.getByTestId("pathway-start").click();
  await page.waitForSelector("[data-testid=question]");
  await page.screenshot({ path: `${out}/6-phone-question.png` });
  ok("a question is on screen on a phone", (await page.getByTestId("question").count()) === 1);
  ok("no errors on a phone", errors.length === 0, errors.join("; "));
  await ctx.close();
}

await browser.close();
const failed = results.filter(([r]) => r === "FAIL").length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
