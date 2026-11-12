/**
 * A child reading a study guide must not be sent back to Me. (The Parents' area's idle check used to apply to study guides too, so anyone who
 * hadn't entered the PIN was bounced within about ten seconds.) Also checks the Parents' area itself still sends people back when it locks.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/idle-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8");
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, store);
const p = await ctx.newPage(); p.setDefaultTimeout(9000);
await p.goto(base); await p.waitForTimeout(1200);
await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});

// the STEM lab, then a study guide, as a child would (no PIN)
await p.getByTestId("open-stem").first().click(); await p.waitForTimeout(900);
const learn = p.locator("[data-testid^=stem-learn-]").first();
await learn.scrollIntoViewIfNeeded();
const title = (await learn.innerText()).replace(/^.*Learn:\s*/, "").trim();
await learn.click(); await p.waitForTimeout(900);
const h1 = async () => (await p.locator("h1").first().innerText().catch(() => "")).trim();
ok("a study guide opens from the STEM lab", (await h1()) === title, `${await h1()}`);

// longer than the ten-second check, with no clicks or scrolling
await p.waitForTimeout(25_000);
ok("still on the study guide after 25 seconds without touching anything", (await h1()) === title, `now showing: ${await h1()}`);
ok("and it hasn't been sent to Me", !/Choose your avatar/i.test(await p.locator("body").innerText()));
await b.close();
process.exit(failed ? 1 : 0);
