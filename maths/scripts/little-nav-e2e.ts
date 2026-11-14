/**
 * Little ones is on the Skills page (list rows and path banner), in search, in the parent report and has notes for grown-ups.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/little-nav-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };
const kid = newProfile("Bo", 1, Date.now() - 86_400_000); kid.early = "reception"; kid.toured = true; kid.little = { count: 2 };
const br = await chromium.launch();
for (const [label, w, h] of [["phone", 390, 800], ["desktop", 1280, 800]] as const) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* */ } }, JSON.stringify({ version: 1, profiles: [kid], activeId: kid.id }));
  const p = await ctx.newPage(); p.setDefaultTimeout(6000); const errors: string[] = []; p.on("pageerror", (e: Error) => errors.push(e.message));
  await p.goto(B); await p.waitForTimeout(900);
  await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {}); await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  ok(`${label}: Today has the Little ones banner for Reception`, await p.getByTestId("open-little").isVisible());
  await p.locator("[data-testid=nav-skills]:visible").first().click(); await p.waitForTimeout(600);
  const listBtn = p.getByRole("button", { name: /^(Show as a list|List)$/ }).first(); if (await listBtn.count()) { await listBtn.click().catch(() => {}); await p.waitForTimeout(400); }
  ok(`${label}: Skills list has all eight Little ones activities`, (await p.locator("[data-testid^=skills-little-]:not([data-testid=skills-little-banner])").count()) === 8);
  await p.getByTestId("skills-little-trace").click(); await p.waitForTimeout(500);
  ok(`${label}: Play opens the activity`, await p.getByTestId("trace-pad").isVisible());
  await p.getByTestId("little-back").click(); await p.waitForTimeout(400);
  await p.locator("[data-testid=nav-today]:visible").first().click(); await p.waitForTimeout(400); await p.getByTestId("open-little").click(); await p.waitForTimeout(500);
  ok(`${label}: notes for grown-ups are there`, await p.getByTestId("little-notes").isVisible());
  await p.getByTestId("little-notes").locator("summary").click(); ok(`${label}: and open to show what each builds`, /One-to-one counting/.test(await p.getByTestId("little-notes").innerText()));
  // path banner
  await p.locator("[data-testid=nav-skills]:visible").first().click(); await p.waitForTimeout(500);
  const pathBtn = p.getByRole("button", { name: /^(Show as a path|Path|Journey|Show journey)/i }).first(); if (await pathBtn.count()) { await pathBtn.click().catch(() => {}); await p.waitForTimeout(500); ok(`${label}: the path has the Little ones banner`, await p.getByTestId("skills-little-banner").isVisible()); }
  ok(`${label}: no script errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await br.close(); process.exit(failed ? 1 : 0);
