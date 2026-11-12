/**
 * The "Try one" card on the marketing page: a question to answer (right and wrong), the worked method, a second question, and the
 * quick-fire times tables round. Needs the landing page, so run the app with the fake sign-in (signed out):
 *   VITE_FAKE_AUTH=1 npx vite --port 5173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js APP=http://localhost:5173 npx tsx scripts/try-card-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:5173";
const bank = JSON.parse(readFileSync(new URL("../src/landing/try-bank.json", import.meta.url), "utf8")) as { value: number; name: string }[];
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const b = await chromium.launch();
for (const [label, vp] of [["desktop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]] as const) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: label === "phone", isMobile: label === "phone" });
  await ctx.addInitScript(() => { Math.random = () => 0; }); // always the first question, so the right answer is known
  const p = await ctx.newPage(); p.setDefaultTimeout(9000);
  const errs: string[] = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(base); await p.waitForTimeout(900);
  ok(`${label}: the card isn't loaded until you scroll to it`, (await p.getByTestId("try-card").count()) === 0);
  await p.locator("#what").scrollIntoViewIfNeeded(); await p.locator(".try-slot").scrollIntoViewIfNeeded(); await p.waitForTimeout(900);
  ok(`${label}: the card appears`, (await p.getByTestId("try-card").count()) === 1);
  ok(`${label}: it asks a real question`, (await p.getByTestId("try-prompt").innerText()).length > 8);
  // a wrong answer
  await p.getByTestId("try-input").fill("999999"); await p.getByTestId("try-check").click(); await p.waitForTimeout(200);
  ok(`${label}: a wrong answer is told 'not quite'`, /Not quite/.test(await p.getByTestId("try-feedback").innerText()));
  await p.getByTestId("try-show").click(); await p.waitForTimeout(500);
  ok(`${label}: 'Show me how' draws the method and the steps`, (await p.getByTestId("worked-figure").count()) === 1 && (await p.locator(".try-steps li").count()) > 0);
  ok(`${label}: and the way in to an account is there`, (await p.getByTestId("try-cta").count()) === 1);
  // another question, answered correctly (Math.random is pinned, so it is the second in the bank)
  await p.getByTestId("try-another").click(); await p.waitForTimeout(400);
  const right = bank[1].value; // "Another one" skips the question just shown, so with Math.random pinned it is the second in the bank
  await p.getByTestId("try-input").fill(String(right)); await p.getByTestId("try-check").click(); await p.waitForTimeout(300);
  ok(`${label}: the right answer is celebrated`, /Yes/.test(await p.getByTestId("try-feedback").innerText()));
  // quick-fire
  await p.getByTestId("try-tab-tables").click(); await p.waitForTimeout(300);
  await p.getByTestId("qf-start").click(); await p.waitForTimeout(300);
  for (let i = 0; i < 10; i++) {
    const t = (await p.getByTestId("qf-q").innerText()).match(/(\d+)\s*×\s*(\d+)/);
    if (!t) break;
    await p.getByTestId("qf-input").pressSequentially(String(Number(t[1]) * Number(t[2])), { delay: 20 }); await p.waitForTimeout(330);
  }
  await p.getByTestId("qf-result").waitFor();
  ok(`${label}: ten right answers end the round with 10 of 10`, /10\s*of 10/.test(await p.getByTestId("qf-result").innerText()));
  await p.getByTestId("qf-again").click(); await p.waitForTimeout(300);
  ok(`${label}: 'Go again' starts a new round`, (await p.getByTestId("qf-q").count()) === 1);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(`${label}: no sideways scrolling`, !overflow);
  ok(`${label}: no script errors`, errs.length === 0, errs.join("; "));
  await p.getByTestId("try-card").screenshot({ path: `/tmp/claude-0/try-${label}.png` });
  await ctx.close();
}
await b.close();
process.exit(failed ? 1 : 0);
