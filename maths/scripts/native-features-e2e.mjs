/**
 * The app-only features, with the iPhone app faked: a page that announces itself as the app and answers its messages. Checks Face ID opens the Parents'
 * area in place of the sum and PIN (and falls back when it fails), reminders are sent and cleared, haptics go out on answers, and nothing is asked of an
 * app build that lacks a feature.
 *   AUTH_FAKE=1 npm run server:dev &      VITE_FAKE_AUTH=1 npx vite --port 5173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js node scripts/native-features-e2e.mjs
 */
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:5173";
let bad = 0; const ok = (n, c, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) bad++; };
const b = await chromium.launch();

async function session(features) {
  const ctx = await b.newContext({ viewport: { width: 820, height: 1100 } });
  await ctx.addInitScript((feat) => {
    window.__sent = []; window.__bio = "ok"; window.__rem = "scheduled";
    window.__quarterNative = { platform: "ios", version: "1.1.0", tablet: true, features: feat };
    window.ReactNativeWebView = { postMessage: (raw) => {
      const m = JSON.parse(raw); window.__sent.push(m);
      const reply = m.type === "biometric" ? { type: "biometric-result", id: m.id, result: window.__bio } : m.type === "reminders" ? { type: "reminders-result", result: window.__rem } : null;
      if (reply) setTimeout(() => window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(reply) })), 30);
    } };
  }, features);
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  await p.goto(base); await p.waitForTimeout(1200);
  await p.getByTestId("landing-sign-up").first().click(); await p.waitForTimeout(400);
  await p.getByTestId("agree-terms").check(); await p.fill("input[name=who]", `nat${Math.random().toString(36).slice(2, 8)}`); await p.getByTestId("fake-auth-go").click(); await p.waitForTimeout(1500);
  if (await p.getByTestId("consent-check").count()) { await p.getByTestId("consent-check").check(); await p.getByRole("button", { name: /agree|continue/i }).first().click(); await p.waitForTimeout(1500); }
  await p.fill("#name", "Ella"); await p.getByTestId("name-next").click(); await p.getByTestId("year-5").click(); await p.getByTestId("year-go").click();
  await p.getByTestId("avatar-next").click(); await p.getByTestId("setup-done").click(); await p.waitForTimeout(1500);
  if (await p.getByTestId("tour-skip").count()) { await p.getByTestId("tour-skip").click(); await p.waitForTimeout(400); }
  return { ctx, p };
}
const tap = async (p, digits) => { for (const d of digits) await p.locator(".keypad .pad-key", { hasText: new RegExp(`^${d}$`) }).first().click(); };
const toMe = async (p) => { const t = p.locator("[data-testid=top-me]:visible").first(); if (await t.count()) { await t.click(); await p.getByTestId("rail-open-me").click(); } else { await p.locator(".rail-me").click(); await p.getByTestId("rail-open-me").click(); } await p.waitForTimeout(400); };
const openParents = async (p) => { const rail = p.locator("[data-testid=rail-parents]:visible"); if (await rail.count()) await rail.click(); else await p.getByTestId("open-parents").click(); await p.waitForTimeout(400); };
const sum = async (p) => { const m = /(\d+)\s*×\s*(\d+)/.exec(await p.locator(".gate-sum").innerText()); await tap(p, String(+m[1] * +m[2])); await p.getByTestId("gate-go").click(); await p.waitForTimeout(400); };
const pin = async (p) => { const rounds = /Make a PIN/.test(await p.getByTestId("pin-prompt").innerText()) ? 2 : 1; for (let k = 0; k < rounds; k++) { await tap(p, "482915"); await p.getByTestId("pin-go").click(); await p.waitForTimeout(450); } };
const inParents = async (p) => (await p.locator("body").innerText()).includes("Parents' area") && !(await p.getByTestId("gate-input").count());

// ---- an app build with every feature
{
  const { ctx, p } = await session(["haptics2", "biometric", "reminders", "review"]);
  await toMe(p); await openParents(p); await sum(p); await pin(p);
  ok("first time: the sum and PIN make a PIN and open the area", await inParents(p));
  await p.getByTestId("part-settings").click(); await p.waitForTimeout(400);
  ok("the app-only settings are shown", await p.getByTestId("device-section").isVisible());
  await p.getByTestId("faceid-toggle").check();
  await p.getByTestId("reminders-toggle").check(); await p.waitForTimeout(300);
  let sent = await p.evaluate(() => window.__sent);
  ok("turning reminders on sends a weekly schedule", sent.some((m) => m.type === "reminders" && m.enabled && m.hour === 16 && m.minute === 30 && m.days.join() === "2,3,4,5,6"), JSON.stringify(sent));
  await p.getByTestId("reminder-day-6").click(); await p.waitForTimeout(300);
  sent = await p.evaluate(() => window.__sent);
  ok("unticking a day updates the schedule", sent.filter((m) => m.type === "reminders").pop().days.join() === "2,3,4,5");
  await p.evaluate(() => { window.__rem = "denied"; }); await p.getByTestId("reminder-day-6").click(); await p.waitForTimeout(400);
  ok("if notifications are blocked, the switch goes back off and says why", !(await p.getByTestId("reminders-toggle").isChecked()) && /switched off for quarter/.test(await p.locator("body").innerText()));
  await p.getByTestId("lock-parents").click(); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__sent.length = 0; window.__bio = "ok"; });
  await openParents(p); await p.waitForTimeout(800);
  ok("with Face ID on, the area opens with no sum or PIN", await inParents(p));
  ok("and the app was asked for Face ID", (await p.evaluate(() => window.__sent)).some((m) => m.type === "biometric"));
  await p.getByTestId("lock-parents").click(); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__bio = "failed"; });
  await openParents(p); await p.waitForTimeout(800);
  ok("if Face ID doesn't match, the sum is asked instead", (await p.getByTestId("gate-input").count()) === 1 && !(await inParents(p)));
  await sum(p); await pin(p);
  ok("and the sum and PIN still open it", await inParents(p));
  await p.getByTestId("lock-parents").click(); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__bio = "cancelled"; });
  await openParents(p); await p.waitForTimeout(800);
  ok("cancelling Face ID also falls back to the sum", (await p.getByTestId("gate-input").count()) === 1);
  await ctx.close();
}
// ---- an older app build, before these features existed
{
  const { ctx, p } = await session([]);
  await toMe(p); await openParents(p); await sum(p); await pin(p);
  await p.getByTestId("part-settings").click(); await p.waitForTimeout(400);
  ok("older app: no app-only settings are offered", (await p.getByTestId("device-section").count()) === 0);
  ok("older app: nothing was sent that it can't handle", (await p.evaluate(() => window.__sent)).length === 0);
  await ctx.close();
}
await b.close(); process.exit(bad ? 1 : 0);
