/**
 * Two screens open at once on one device, each with a different child chosen: each keeps its own child, and neither screen's
 * changes wipe out the other's, even after a reload.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/multi-screen-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = JSON.parse(readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8"));
const sam = JSON.parse(JSON.stringify(store.profiles[0])); sam.id = "sam-id"; sam.name = "Sam"; sam.year = 5;
store.profiles = [store.profiles[0], sam]; store.activeId = store.profiles[0].id;
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
let seeded = false;
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, JSON.stringify(store));
const open = async () => {
  const p = await ctx.newPage(); p.setDefaultTimeout(9000);
  await p.goto(base); await p.waitForTimeout(1000);
  await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  return p;
};
const who = (p: any) => p.locator(".row.current, [aria-current=true]").first().innerText().catch(() => "");
const tick = async (p: any, n: string) => { // work on a times table: this saves a change to the child shown on this screen
  await p.locator("[data-testid=start-tables]:visible").first().click(); await p.waitForTimeout(400);
  await p.locator(".tt-chips button", { hasText: n }).first().click(); await p.waitForTimeout(300);
  await p.getByTestId("tables-back").click(); await p.waitForTimeout(300);
};
const stored = (p: any) => p.evaluate(() => JSON.parse(localStorage.getItem("mathpath.v1")!));

const openMeVia = async (pg: any) => { const rail = pg.getByTestId("rail-me"); if (await rail.isVisible().catch(() => false)) { await rail.click(); await pg.getByTestId("rail-open-me").click(); } else await pg.getByRole("button", { name: /(?:open Me|switch learner)/ }).first().click(); await pg.waitForTimeout(500); };
const A = await open();
const B = await open();
await openMeVia(B);
await B.getByTestId("rail-me").click(); await B.getByRole("menuitemradio", { name: /Sam/ }).click(); await B.waitForTimeout(600);
await openMeVia(A);
ok("screen A shows the first child", /Maya/.test(await A.locator("body").innerText()));
ok("screen B shows the second child", /Sam/.test(await B.locator("body").innerText()));

await tick(A, "12×"); await tick(B, "11×");
await A.reload(); await B.reload(); await A.waitForTimeout(1200);
for (const pg of [A, B]) { await pg.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {}); await pg.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {}); }
const s = await stored(A);
const active = (id: string) => s.profiles.find((p: any) => p.id === id)?.tables?.active as number[] | undefined;
// Year 5 starts with every table switched on, so a change shows up as one table missing
ok("the first child's change from screen A was kept (12× switched off)", Array.isArray(active(store.profiles[0].id)) && !active(store.profiles[0].id)!.includes(12), JSON.stringify(active(store.profiles[0].id)));
ok("the second child's change from screen B was kept (11× switched off)", Array.isArray(active("sam-id")) && !active("sam-id")!.includes(11), JSON.stringify(active("sam-id")));
ok("after a reload, screen A still shows the first child and B the second", (await A.getByRole("button", { name: /Maya, (?:open Me|switch learner)/ }).count()) > 0 && (await B.getByRole("button", { name: /Sam, (?:open Me|switch learner)/ }).count()) > 0);
await b.close();
process.exit(failed ? 1 : 0);
