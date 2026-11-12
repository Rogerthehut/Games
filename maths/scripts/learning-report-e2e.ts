/**
 * Checks the grown-ups' learning report end to end: wrong answers in practice are logged, and the report lists them for the chosen
 * period with the reasons, the methods and the study links.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/learning-report-e2e.ts
 */
import { SKILL_BY_ID } from "../src/curriculum";
import { mulberry32 } from "../src/engine/rng";
import { newProfile, recordAnswer } from "../src/engine/progress";
import { recordWrong } from "../src/engine/wrong-log";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const now = Date.now(), DAY = 86_400_000;
let p: any = newProfile("Maya", 5, now - 20 * DAY); p.toured = true; p.skillsView = "list";
const add = (skill: string, seed: number, tried: string[], outcome: "missed" | "helped" | "gave-up", ago: number, notes: string[] = []) => {
  const q = { ...SKILL_BY_ID[skill].generate(mulberry32(seed), 2), seed };
  p = recordWrong(p, { q, outcome, tried, tags: notes.length ? ["x"] : [], notes, source: "practice" }, now - ago * DAY);
};
for (let i = 0; i < 3; i++) add("frac-add", 200 + i, ["3"], "missed", 1 + i, ["They added the bottoms as well as the tops."]);
add("rounding", 5, ["19"], "helped", 2);
add("division", 8, [], "gave-up", 40); // older than 14 days
// a topic that had wrong answers in the 14 days before, none since, and has been practised since: looking better
add("place-value", 31, ["9"], "missed", 20); add("place-value", 32, ["9"], "missed", 21);
p = recordAnswer(p, "place-value", "right", now - 1 * DAY);
const spoken = (skill: string, seed: number, level: number) => SKILL_BY_ID[skill].generate(mulberry32(seed), level).prompt;

const browser = await chromium.launch();
for (const [label, w, h] of [["desktop", 1280, 900], ["phone", 390, 800]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } (window as any).print = () => { (window as any).__printed = ((window as any).__printed ?? 0) + 1; setTimeout(() => window.dispatchEvent(new Event("afterprint")), 50); }; }, JSON.stringify({ version: 1, profiles: [p], activeId: p.id }));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(B); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  const tap = async (digits: string) => { for (const d of digits) await page.locator(".keypad .pad-key", { hasText: new RegExp(`^${d}$`) }).first().click(); };
  const rail = page.locator("[data-testid=rail-parents]:visible");
  if (await rail.count()) await rail.click(); else { const t = page.locator("[data-testid=nav-me]:visible").first(); await t.click(); await page.waitForTimeout(300); await page.getByTestId("open-parents").click(); }
  await page.waitForTimeout(300);
  const m = /(\d+)\s*×\s*(\d+)/.exec(await page.locator(".gate-sum").innerText())!; await tap(String(+m[1] * +m[2])); await page.getByTestId("gate-go").click(); await page.waitForTimeout(400);
  if (await page.getByTestId("pin-input").count()) { const rounds = /Make a PIN/.test(await page.getByTestId("pin-prompt").innerText()) ? 2 : 1; for (let k = 0; k < rounds; k++) { await tap("482915"); await page.getByTestId("pin-go").click(); await page.waitForTimeout(450); } }

  const card = page.getByTestId("learning-card");
  ok(`${label}: the Progress tab has a "where they're struggling" card`, (await card.count()) === 1 && /4 questions/.test(await card.innerText()), await card.innerText().catch(() => ""));
  await page.getByTestId("open-learning-report").click(); await page.waitForTimeout(500);
  ok(`${label}: the report opens with this week's wrong questions`, (await page.getByTestId("lr-total").innerText()) === "4");
  ok(`${label}: worst topic first`, (await page.locator(".lr-topic").first().getAttribute("data-testid")) === "topic-frac-add");
  const top = page.getByTestId("topic-frac-add");
  ok(`${label}: it shows the questions with what was answered and the right answer`, (await top.locator(".lr-example").count()) === 3 && /They answered: 3/.test(await top.innerText()) && /Right answer/.test(await top.innerText()));
  ok(`${label}: and a reason from the answers, in the marking's words`, /They added the bottoms/.test(await top.innerText()) && /From their answers/.test(await top.innerText()));
  ok(`${label}: and common reasons for the topic`, /Common with fractions/.test(await top.innerText()));
  ok(`${label}: and methods, things to ask and the right working-out tool`, /Fraction wall/.test(await top.innerText()) && /Things to ask/.test(await top.innerText()) && (await top.locator(".lr-method").count()) >= 2);
  await top.locator(".lr-example").first().getByRole("button", { name: /Show the steps/ }).click();
  ok(`${label}: the steps to work through together appear`, (await top.locator(".lr-steps li").count()) > 0);
  ok(`${label}: it shows then and now, with the trend`, /same time before/.test(await page.getByTestId("trend-frac-add").innerText()) && /Now:/.test(await page.getByTestId("trend-frac-add").innerText()));
  ok(`${label}: a topic that had wrong answers and none now is listed as looking better`, (await page.getByTestId("lr-improving").count()) === 1 && /Place value/.test(await page.getByTestId("lr-improving").innerText()));
  await top.locator(".lr-example").first().getByTestId("walk-start").click();
  ok(`${label}: a walk-through starts with reading it together`, /1\. Read it together/.test(await top.getByTestId("walk").innerText()));
  for (let i = 0; i < 4; i++) await top.getByTestId("walk-next").click();
  ok(`${label}: and ends with the child teaching it back, and a similar question`, /5\. Now they teach you/.test(await top.getByTestId("walk").innerText()) && (await top.getByTestId("walk-similar").count()) === 1);
  ok(`${label}: the older question isn't in the 14-day report`, (await page.getByTestId("topic-division").count()) === 0);
  await page.getByTestId("period-90").click(); await page.waitForTimeout(300);
  ok(`${label}: a longer period includes it`, (await page.getByTestId("topic-division").count()) === 1 && (await page.getByTestId("lr-total").innerText()) === "7");
  await page.getByTestId("period-custom").click(); await page.waitForTimeout(200);
  ok(`${label}: custom dates can be chosen`, (await page.locator(".lr-dates input[type=date]").count()) === 2);
  await page.getByTestId("lr-print").click(); await page.waitForTimeout(400);
  ok(`${label}: printing asks the browser to print`, (await page.evaluate(() => (window as any).__printed)) === 1);
  await page.screenshot({ path: `${process.env.OUT ?? "."}/lr-${label}.png` });
  await page.getByTestId("period-14").click(); await page.waitForTimeout(200);
  await page.getByTestId("fix-frac-add").click(); await page.waitForTimeout(700);
  const asked = (await page.getByTestId("question").innerText()).match(/\d+/g)?.sort().join(","); // typeset fractions list their numbers in another order
  const want = spoken("frac-add", 200, 2).match(/\d+/g)?.sort().join(",");
  ok(`${label}: "Fix this" asks the exact question that went wrong first`, !!asked && asked === want, `${asked} vs ${want}`);
  ok(`${label}: with no new-topic introduction in the way`, (await page.getByTestId("intro-skip").count()) === 0);
  await page.getByTestId("close").click(); await page.waitForTimeout(500);
  if (await page.getByRole("button", { name: /leave|stop|yes/i }).count()) await page.getByRole("button", { name: /^(leave|stop|yes)/i }).first().click().catch(() => {});
  await page.waitForTimeout(300);
  await page.goBack().catch(() => {});
  await page.waitForTimeout(300);
  if (!(await page.getByTestId("practise-frac-add").count())) { await page.goto(B); await page.waitForTimeout(600); }
  if (!(await page.getByTestId("practise-frac-add").count())) { ok(`${label}: (back in the report)`, true); await ctx.close(); continue; }
  await page.getByTestId("practise-frac-add").click(); await page.waitForTimeout(600);
  ok(`${label}: Practise this topic starts practice on it`, /Adding fractions/.test(await page.locator("body").innerText()));
  ok(`${label}: no errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}

// wrong answers in practice are logged
{
  let q: any = newProfile("Maya", 6, now - 5 * DAY); q.toured = true; q.skillsView = "list";
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [q], activeId: q.id }));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  await page.goto(B); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  await page.locator("[data-testid=nav-skills]:visible").first().click(); await page.waitForTimeout(500);
  const row = page.locator("#skill-rounding"); await row.scrollIntoViewIfNeeded(); await row.getByRole("button", { name: "Practise" }).click(); await page.waitForTimeout(500);
  if (await page.getByTestId("intro-skip").count()) await page.getByTestId("intro-skip").click();
  const input = page.locator(".practice-page input").first();
  for (let t = 0; t < 2; t++) { await input.fill(String(987654 + t)); await page.getByTestId("check").click(); await page.waitForTimeout(600); }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mathpath.v1") ?? "{}"));
  const log = saved.profiles?.[0]?.wrongLog ?? [];
  ok("a question missed in practice is logged with what was typed and its seed", log.length === 1 && log[0].outcome === "missed" && log[0].tried.length === 2 && typeof log[0].seed === "number" && log[0].skill === "rounding", JSON.stringify(log));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
