/**
 * Practice papers by age: Years 5 and 6 see 11+ papers, 10 and 11 GCSE, 12 and 13 A-level; Years 3, 4 and 7 to 9 none yet.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/papers-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };
const mk = (year: number) => { const p = newProfile("Bo", year, Date.now() - 86_400_000 * 3); p.toured = true; return p; };
const br = await chromium.launch();
for (const [year, title, paper, firstPart] of [[5, "11+ practice papers", "maths", "Maths"], [6, "11+ practice papers", "reasoning", "Verbal"], [11, "GCSE practice papers", "gcse-quick", "Maths"], [13, "A-level practice papers", "alevel-quick", "Pure"], [4, "", "", ""], [8, "", "", ""]] as const) {
  const ctx = await br.newContext({ viewport: { width: 1000, height: 900 }, reducedMotion: "reduce" });
  const prof = mk(year);
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* */ } }, JSON.stringify({ version: 1, profiles: [prof], activeId: prof.id }));
  const p = await ctx.newPage(); p.setDefaultTimeout(6000); const errors: string[] = []; p.on("pageerror", (e: Error) => errors.push(e.message));
  await p.goto(B); await p.waitForTimeout(900);
  await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {}); await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  const row = p.getByTestId("open-papers");
  if (!title) { ok(`Year ${year}: no practice papers offered yet`, (await row.count()) === 0); ok(`Year ${year}: no errors`, errors.length === 0, errors.join("; ")); await ctx.close(); continue; }
  ok(`Year ${year}: Today offers "${title}"`, (await row.count()) === 1 && (await row.innerText()).includes(title));
  await row.click(); await p.waitForTimeout(500);
  const text = await p.locator("main").innerText();
  const gcse = year === 11, alevel = year === 13;
  ok(`Year ${year}: the paper page lists the right papers`, gcse ? /GCSE practice/.test(text) && /GCSE-style paper/.test(text) && !/Quest-style/.test(text) : alevel ? /A-level practice/.test(text) && /A-level-style paper/.test(text) && !/Quest-style/.test(text) : /Maths paper/.test(text) && /Reasoning paper/.test(text) && !/GCSE/.test(text));
  await p.getByTestId(`paper-${paper}`).check(); await p.waitForTimeout(200);
  await p.getByTestId("mock-start").click(); await p.waitForTimeout(700);
  ok(`Year ${year}: ${paper} starts with a question on screen`, (await p.locator(".qbody, .question, [data-testid=check]").count()) > 0 && errors.length === 0, errors.join("; "));
  ok(`Year ${year}: no sideways scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await ctx.close();
}
// printing a GCSE paper
{
  const ctx = await br.newContext({ viewport: { width: 1000, height: 900 }, reducedMotion: "reduce" }); const prof = mk(11);
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* */ } }, JSON.stringify({ version: 1, profiles: [prof], activeId: prof.id }));
  const p = await ctx.newPage(); p.setDefaultTimeout(6000); const errors: string[] = []; p.on("pageerror", (e: Error) => errors.push(e.message));
  await p.goto(B); await p.waitForTimeout(900); await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {}); await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  await p.getByTestId("open-papers").click(); await p.waitForTimeout(400); await p.getByTestId("paper-gcse-paper").check(); await p.getByTestId("mock-print").click(); await p.waitForTimeout(800);
  ok("a GCSE paper can be opened for printing, with its questions", (await p.locator("main").innerText()).length > 400 && errors.length === 0, errors.join("; "));
  await ctx.close();
}
await br.close(); process.exit(failed ? 1 : 0);
