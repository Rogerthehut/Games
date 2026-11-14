/**
 * Narrow side menu: the learner stays visible and opens a centred pop-up; the padlock does too; no sideways scroll; the minimise button toggles.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/rail-slim-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };
const a = newProfile("Alaia", 4, Date.now() - 86_400_000 * 3), b = newProfile("Ariela", 6, Date.now() - 86_400_000 * 3); a.toured = b.toured = true;
const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* */ } }, JSON.stringify({ version: 1, profiles: [a, b], activeId: a.id }));
const p = await ctx.newPage(); p.setDefaultTimeout(6000); const errors: string[] = []; p.on("pageerror", (e: Error) => errors.push(e.message));
await p.goto(B); await p.waitForTimeout(900);
await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {}); await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
ok("no arrows by the learner or the padlock", (await p.locator(".rail-me-caret, .rail-lock-chev").count()) === 0);
ok("no sideways scroll in the menu", await p.evaluate(() => { const r = document.querySelector(".rail")!; return r.scrollWidth <= r.clientWidth; }));
await p.getByTestId("rail-min").click(); await p.waitForTimeout(400);
ok("minimise makes it narrow", (await p.evaluate(() => Math.round(document.querySelector(".rail")!.getBoundingClientRect().width))) === 76);
ok("the learner's avatar is still there", await p.locator(".rail-me .learner-avatar").isVisible());
ok("still no sideways scroll", await p.evaluate(() => { const r = document.querySelector(".rail")!; return r.scrollWidth <= r.clientWidth; }));
await p.getByTestId("rail-me").click(); await p.waitForTimeout(300);
const centred = async (sel: string) => p.evaluate((s) => { const r = document.querySelector(s)!.getBoundingClientRect(); return Math.abs(r.x + r.width / 2 - innerWidth / 2) < 3 && Math.abs(r.y + r.height / 2 - innerHeight / 2) < 3 && r.width > 280; }, sel);
ok("the learner menu opens in the middle, at full width", await centred("[data-testid=rail-switch-list]"));
await p.screenshot({ path: "/tmp/claude-0/slim-menu.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(200);
await p.getByTestId("rail-parents").click(); await p.waitForTimeout(300);
ok("the Parents' sum and PIN opens in the middle, at full width", await centred(".gate-backdrop .gate"));
await p.screenshot({ path: "/tmp/claude-0/slim-parents.png" });
await p.getByTestId("rail-min").click({ force: true }).catch(() => {}); await p.waitForTimeout(300);
await br.close(); console.log(errors.length ? "errors: " + errors.join("; ") : ""); process.exit(failed ? 1 : 0);
