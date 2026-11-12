/**
 * Printable practice papers: from the paper-choice screen to the print view; the paper number makes the same paper every time;
 * the answers and mark scheme match; printing the paper hides the answers (and the reverse).
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/print-paper-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8");
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const b = await chromium.launch();
for (const [label, vp] of [["phone", { width: 390, height: 800 }], ["desktop", { width: 1200, height: 900 }]] as const) {
  const ctx = await b.newContext({ viewport: vp });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, store);
  const p = await ctx.newPage(); p.setDefaultTimeout(9000);
  await p.goto(base); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  await p.locator("[data-testid=nav-plan]:visible").first().click(); await p.waitForTimeout(700);
  await p.getByTestId("take-mock").click(); await p.waitForTimeout(400);
  await p.getByTestId("paper-maths").check();
  ok(`${label}: the paper-choice screen offers printing`, (await p.getByTestId("mock-print").count()) === 1);
  await p.getByTestId("paper-reasoning").check();
  ok(`${label}: but not for the multiple-choice reasoning paper`, (await p.getByTestId("mock-print").count()) === 0);
  await p.getByTestId("paper-maths").check();
  await p.getByTestId("mock-print").click(); await p.waitForTimeout(500);
  await p.getByTestId("pp-number").fill("214"); await p.getByTestId("pp-number").blur(); await p.waitForTimeout(300);
  const qs = () => p.getByTestId("pp-question");
  ok(`${label}: 20 questions on the paper`, (await qs().count()) === 20);
  const first = await qs().first().innerText();
  await p.getByTestId("pp-new").click(); await p.waitForTimeout(200);
  ok(`${label}: a different paper has different questions`, (await qs().first().innerText()) !== first);
  await p.getByTestId("pp-number").fill("214"); await p.getByTestId("pp-number").blur(); await p.waitForTimeout(300);
  ok(`${label}: paper 214 again gives the same paper`, (await qs().first().innerText()) === first);
  ok(`${label}: the paper number is on both sheets`, (await p.locator(".pp-head", { hasText: "Paper no. 214" }).count()) === 2);
  ok(`${label}: the answer key has 20 answers and the mark scheme 20 entries`, (await p.locator(".pp-key li").count()) === 20 && (await p.locator(".pp-s").count()) === 20);
  // what prints: emulate print media with the class the buttons set
  await p.emulateMedia({ media: "print" });
  for (const [cls, shown, hidden] of [["printing-paper", ".pp-paper", ".pp-answers"], ["printing-answers", ".pp-answers", ".pp-paper"]] as const) {
    await p.evaluate((c) => document.body.classList.add(c), cls);
    const vis = async (sel: string) => p.evaluate((s) => { const e = document.querySelector(s) as HTMLElement; return e && getComputedStyle(e).display !== "none" && getComputedStyle(e.querySelector("li, h2") as HTMLElement).visibility !== "hidden"; }, sel);
    ok(`${label}: ${cls} shows ${shown} and hides ${hidden}`, (await vis(shown)) && !(await vis(hidden)));
    await p.evaluate((c) => document.body.classList.remove(c), cls);
  }
  ok(`${label}: the toolbar doesn't print`, await p.evaluate(() => getComputedStyle(document.querySelector(".pp-toolbar") as HTMLElement).display === "none"));
  await p.emulateMedia({ media: "screen" });
  if (label === "desktop") await p.pdf({ path: "/tmp/claude-0/print-paper-sample.pdf", format: "A4", printBackground: true }).catch(() => {});
  await ctx.close();
}
await b.close();
process.exit(failed ? 1 : 0);
