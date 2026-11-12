/**
 * Times tables extras: the streak and speed card, the "how quickly I answer" colours on the grid, and this week's winner on the scoreboard.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/tables-progress-e2e.ts
 */
import { readFileSync } from "node:fs";
import { recordFact } from "../src/engine/tables";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = JSON.parse(readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8"));
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };

// the first learner practised on the last three days (streak of 3, up to today); a second one only last month
const DAY = 86_400_000, now = Date.now();
let a = store.profiles[0];
for (const back of [2, 1, 0]) a = recordFact(a, 6, 7, true, 2500 + back * 500, now - back * DAY);
a = recordFact(a, 9, 8, true, 7000, now);
store.profiles[0] = a;
if (store.profiles.length < 2) store.profiles.push({ ...JSON.parse(JSON.stringify(a)), id: "sib", name: "Sam", tables: undefined });
store.profiles[1] = recordFact({ ...store.profiles[1], tables: undefined }, 2, 3, true, 2000, now - 30 * DAY);

const b = await chromium.launch();
for (const [label, vp] of [["phone", { width: 390, height: 800 }], ["desktop", { width: 1200, height: 900 }]] as const) {
  const ctx = await b.newContext({ viewport: vp });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, JSON.stringify(store));
  const p = await ctx.newPage(); p.setDefaultTimeout(9000);
  await p.goto(base); await p.waitForTimeout(1200);
  await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  await p.locator("[data-testid=start-tables]:visible").first().click(); await p.waitForTimeout(500);
  ok(`${label}: streak of three days shows`, (await p.getByTestId("streak-days").innerText()) === "3");
  ok(`${label}: speed chart is drawn`, (await p.locator(".tt-speed circle").count()) === 3);
  await p.getByTestId("tables-speed").click();
  const cls = async (label2: string) => (await p.locator(`td[aria-label^="${label2}"]`).first().getAttribute("class")) ?? "";
  ok(`${label}: 6 × 7 is quick, 8 × 9 slow, others not answered`, /sp-fast/.test(await cls("6 times 7")) && /sp-slow/.test(await cls("8 times 9")) && /sp-none/.test(await cls("5 times 5")));
  await p.getByTestId("tables-speed").click();
  await p.getByTestId("open-board").click(); await p.waitForTimeout(400);
  const week = p.getByTestId("week-board");
  ok(`${label}: the weekly board names a winner`, /ahead/.test(await week.innerText()) && (await week.locator("li").count()) === 2, (await week.innerText()).replace(/\n/g, " | ").slice(0, 120));
  await p.screenshot({ path: `/tmp/claude-0/tables-progress-${label}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
process.exit(failed ? 1 : 0);
