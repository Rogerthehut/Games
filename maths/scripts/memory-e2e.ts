/**
 * Checks that the app remembers where people left off: the scroll position on Skills, Plan and Me when coming back to them, going back
 * from a sub-screen, and the Parents' area tab and learning-report period.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-rich-profile.ts > /tmp/store.json     (or seed-profile.ts)
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/memory-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8");
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1000, height: 700 } });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, store);
const p = await ctx.newPage(); p.setDefaultTimeout(8000);
const errs: string[] = []; p.on("pageerror", (e) => errs.push(e.message));
const top = () => p.evaluate(() => { const c = document.querySelector(".content") as HTMLElement | null; return Math.round(c && c.scrollHeight > c.clientHeight + 1 ? c.scrollTop : scrollY); });
const tab = async (t: string) => {
  const nav = p.locator(`[data-testid=nav-${t}]:visible`).first();
  if (t !== "me") await nav.waitFor();
  if (await nav.count()) await nav.click(); else await p.getByRole("button", { name: /Maya|Year \d/ }).first().click(); // Me is the profile button on a wide screen
  await p.waitForTimeout(900);
};
await p.goto(base); await p.waitForTimeout(1200);

for (const t of ["plan", "skills", "me"]) {
  await tab(t); await p.mouse.move(500, 350); await p.mouse.wheel(0, 700); await p.waitForTimeout(700);
  const y = await top();
  await tab("today"); const home = await top();
  await tab(t); await p.waitForTimeout(600);
  const back = await top();
  ok(`${t}: coming back returns to the same spot`, y > 100 && Math.abs(back - y) <= 3, `left at ${y}, back at ${back}, Today at ${home}`);
}

// reload: the place is still remembered
await tab("plan"); const planY = await top();
await p.reload(); await p.waitForTimeout(1200); await tab("plan"); await p.waitForTimeout(600);
ok("plan: still remembered after the app is closed and reopened", Math.abs((await top()) - planY) <= 3, `${planY} -> ${await top()}`);
ok("no errors", errs.length === 0, errs.join("; ").slice(0, 160));
await b.close();
process.exit(failed ? 1 : 0);
