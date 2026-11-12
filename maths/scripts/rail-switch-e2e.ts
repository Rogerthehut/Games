/**
 * The learner switcher in the left-hand panel: the card shows who is learning, opens a list of everyone on the account, switches with a tap,
 * and can open Me. (Wide screens only: on a phone the same list is on the Me page.)
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/rail-switch-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = JSON.parse(readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8"));
const sam = JSON.parse(JSON.stringify(store.profiles[0])); sam.id = "sam-id"; sam.name = "Sam"; sam.year = 4;
store.profiles = [store.profiles[0], sam]; store.activeId = store.profiles[0].id;
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, JSON.stringify(store));
const p = await ctx.newPage(); p.setDefaultTimeout(9000);
await p.goto(base); await p.waitForTimeout(1200);
await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
const card = p.getByTestId("rail-me");
ok("the card shows the current learner", /Maya/.test(await card.innerText()));
ok("the list is closed to start with", (await p.getByTestId("rail-switch-list").count()) === 0);
await card.click();
ok("it opens a list of everyone", (await p.getByTestId("rail-switch-list").locator("[role=menuitemradio]").count()) === 2);
ok("the current learner is marked", (await p.getByTestId(`rail-switch-${store.profiles[0].id}`).getAttribute("aria-checked")) === "true");
await p.waitForTimeout(150); await p.keyboard.press("Escape");
ok("Escape closes it", (await p.getByTestId("rail-switch-list").count()) === 0);
await card.click(); await p.getByTestId("rail-switch-sam-id").click(); await p.waitForTimeout(600);
ok("choosing Sam switches to him", /Sam/.test(await p.getByTestId("rail-me").innerText()) && (await p.getByTestId("rail-switch-list").count()) === 0);
await p.getByTestId("rail-me").click(); await p.getByTestId("rail-open-me").click(); await p.waitForTimeout(500);
ok("'Me and settings' opens Me, and the learner list is no longer repeated there on a wide screen", /Look and feel|Sound/i.test(await p.locator("body").innerText()) && !/Who's learning/i.test(await p.locator("body").innerText()));
await p.getByTestId("rail-me").click(); await p.getByTestId("rail-add-learner").click(); await p.waitForTimeout(400);
ok("'Add someone' asks a grown-up first", (await p.locator(".gate-sum").count()) === 1);
await b.close();
process.exit(failed ? 1 : 0);
