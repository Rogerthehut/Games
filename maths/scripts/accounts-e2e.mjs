/**
 * End-to-end test of accounts: sign-up, consent, saving, a second device, a two-device clash, data download, sign-out,
 * moving old local progress into an account, and deleting an account. Uses the fake sign-in and an in-memory database.
 *
 *   AUTH_FAKE=1 npm run server:dev &                       # port 8787, fresh in-memory database each start
 *   VITE_FAKE_AUTH=1 npx vite --port 5173 &            # the app, proxying /api to the server
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json  # an old-style local profile to migrate
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js LEGACY_STORE=/tmp/store.json OUT=/tmp/e2e node scripts/accounts-e2e.mjs
 * Restart the server between runs: the fake parents ("maya", "ben") persist in memory.
 */
import { mkdirSync, readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const dir = process.env.OUT ?? "./accounts-e2e";
mkdirSync(dir, { recursive: true });
const legacy = JSON.parse(readFileSync(process.env.LEGACY_STORE ?? "store.json", "utf8"));
const B = process.env.APP ?? "http://localhost:5173";
const results = []; const ok = (name, cond, extra = "") => { results.push([cond ? "PASS" : "FAIL", name, extra]); console.log(cond ? "PASS" : "FAIL", name, extra); };
const b = await chromium.launch();
const open = async (store) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  if (store) await ctx.addInitScript((s) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch {} }, store);
  const p = await ctx.newPage(); p.setDefaultTimeout(9000); p.errs = []; p.on("pageerror", (e) => p.errs.push(e.message));
  await p.goto(B); await p.waitForTimeout(900);
  // signed-out visitors see the welcome page first; step through to the form
  if (await p.getByTestId("landing-sign-in").count()) await p.getByTestId("landing-sign-in").click();
  await p.waitForTimeout(300); return { ctx, p };
};
const text = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
const signIn = async (p, who) => { await p.getByTestId("fake-auth").locator("input").fill(who); await p.getByTestId("fake-auth-go").click(); await p.waitForTimeout(1200); await p.waitForFunction(() => !document.querySelector(".boot-splash"), null, { timeout: 10000 }).catch(() => {}); await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {}); await p.waitForTimeout(400); };
const api = async (who, path, init = {}) => (await fetch(`http://localhost:8787${path}`, { ...init, headers: { Authorization: `Bearer fake_${who}`, "Content-Type": "application/json", ...(init.headers ?? {}) } })).json();
const consent = async (p) => { await p.getByTestId("consent-check").check(); await p.getByTestId("consent-go").click(); await p.waitForTimeout(1200); await p.waitForFunction(() => !document.querySelector(".boot-splash"), null, { timeout: 10000 }).catch(() => {}); };
let tourSeen = 0; // a brand-new learner is offered the welcome tour, which is skipped here
const addLearner = async (p, name, year = 5) => { await p.fill("#name", name); await p.getByTestId("name-next").click(); await p.getByTestId(`year-${year}`).click(); await p.getByTestId("year-go").click(); await p.getByTestId("avatar-next").click(); await p.getByTestId("setup-done").click(); await p.waitForTimeout(900); if (await p.getByTestId("tour-skip").count()) { tourSeen++; await p.getByTestId("tour-skip").click(); await p.waitForTimeout(500); } };

// 1. a new parent signs up
let { ctx, p } = await open();
ok("signed-out screen asks to create an account", /Create an account/.test(await text(p)) && (await p.getByTestId("fake-auth").count()) === 1);
ok("no way in without signing in", (await p.locator("#name").count()) === 0);
await p.screenshot({ path: `${dir}/acct-1-signed-out.png` });
await signIn(p, "maya");
ok("then a consent screen, with nothing saved yet", /Before we start/.test(await text(p)));
ok("the agree button is disabled until the box is ticked", await p.getByTestId("consent-go").isDisabled());
await p.screenshot({ path: `${dir}/acct-2-consent.png`, fullPage: true });
ok("server has no learners before consent", (await api("maya", "/api/account")).learners.length === 0);
await consent(p);
ok("then 'Who's learning?'", /Who's learning\?/.test(await text(p)) && (await p.getByText("I have a saved profile").count()) === 0);
await addLearner(p, "Ella", 5);
ok("the learner reaches Today", /Ella/.test(await text(p)));

// 2. progress is saved to the account
await p.locator("[data-testid=nav-me]:visible").first().click(); await p.waitForTimeout(3500);
const chip = await p.getByTestId("sync-chip").innerText().catch(() => "");
ok("Me says progress is saved to the account", /Saved to your account/.test(chip), chip);
const acct = await api("maya", "/api/account");
ok("the server holds the learner, with the nickname and year", acct.learners.length === 1 && acct.learners[0].data.name === "Ella" && acct.learners[0].data.year === 5);
ok("the learner's id on the server is the id the app uses", acct.learners[0].id === (await p.evaluate(() => JSON.parse(localStorage.getItem("quarter.cache.fake_maya")).store.profiles[0].id)));
await p.screenshot({ path: `${dir}/acct-3-me.png` });

// 3. practising changes the saved progress
await p.locator("[data-testid=nav-today]:visible").first().click(); await p.waitForTimeout(500);
await p.getByTestId("start-practice").click(); await p.getByTestId("intro-skip").click(); await p.waitForTimeout(400);
const inp = p.locator("input:visible").first(); await inp.fill("3"); await p.getByTestId("check").click(); await p.waitForTimeout(500);
await p.getByTestId("close").click(); await p.waitForTimeout(500); await p.getByRole("button", { name: /^(Leave|Save and leave|Yes)/i }).first().click().catch(() => {}); await p.waitForTimeout(3500);
const after = await api("maya", "/api/account");
ok("practice is saved (a new version on the server)", after.learners[0].version > acct.learners[0].version, `v${acct.learners[0].version} → v${after.learners[0].version}`);

// 4. a second device
let second = await open(); let p2 = second.p;
await signIn(p2, "maya");
ok("signing in elsewhere skips consent and onboarding, and shows Ella", /Ella/.test(await text(p2)) && !/Before we start/.test(await text(p2)));
await p2.screenshot({ path: `${dir}/acct-4-second-device.png` });

// 5. grown-ups' area: account section, download, sign out
const openParents = async (page) => {
  await page.locator("[data-testid=nav-me]:visible").first().click(); await page.waitForTimeout(500);
  { const rail = page.locator("[data-testid=rail-parents]:visible"); if (await rail.count()) await rail.click(); else await page.getByTestId("open-parents").click(); }
  await page.waitForTimeout(500);
  const q = await text(page); const m = q.match(/(\d+)\s*\+\s*(\d+)/) ?? q.match(/(\d+)\s*[×x]\s*(\d+)/);
  if (m) { const isMul = /[×x]/.test(q.slice(q.indexOf(m[0]), q.indexOf(m[0]) + m[0].length)); for (const d of String(isMul ? +m[1] * +m[2] : +m[1] + +m[2])) await page.locator(".keypad .pad-key", { hasText: new RegExp(`^${d}$`) }).first().click(); await page.getByTestId("gate-go").click(); await page.waitForTimeout(600); }
  await page.waitForTimeout(300);
  const typePin = async (pin) => { for (const d of pin) await page.locator(".keypad .pad-key", { hasText: new RegExp("^" + d + "$") }).first().click(); await page.getByTestId("pin-go").click(); await page.waitForTimeout(400); };
  if (/Make a PIN/.test(await text(page))) { await typePin("482915"); await typePin("482915"); } else await typePin("482915");
  await page.getByRole("tab", { name: "Settings" }).click().catch(async () => { await page.getByRole("button", { name: "Settings" }).first().click(); }); await page.waitForTimeout(400);
};
await openParents(p2);
ok("the grown-ups' area shows the account, who is signed in, and no paste-in box", (await p2.getByTestId("account-section").count()) === 1 && /maya@test\.invalid/.test(await text(p2)) && !/Load saved text/.test(await text(p2)));
await p2.screenshot({ path: `${dir}/acct-5-parents.png`, fullPage: true });
await p2.getByTestId("download-data").click(); await p2.waitForTimeout(1200);
const info = await text(p2);
ok("shows a readable page of everything held, not a data file", /What quarter holds/.test(info) && /Ella/.test(info) && /maya@test\.invalid/.test(info) && /What we don't keep/.test(info) && !/"learners"/.test(info));
await p2.screenshot({ path: `${dir}/acct-5b-information.png`, fullPage: true });
const [dl] = await Promise.all([p2.waitForEvent("download"), p2.getByTestId("mydata-json").click()]);
const file = readFileSync(await dl.path(), "utf8");
ok("and still offers the data file for other services", /"learners"/.test(file) && /Ella/.test(file) && !/tutorLog/.test(file), dl.suggestedFilename());

// 6. conflict: another device saves first; this device's next save is turned down and it takes the newer copy
await p2.close();
const dev1 = await open(); const d1 = dev1.p;
await signIn(d1, "maya");                                    // device 1 loads version N
const cur = (await api("maya", "/api/account")).learners[0];
const other = await api("maya", `/api/learners/${cur.id}`, { method: "PUT", body: JSON.stringify({ profile: { ...cur.data, points: 777 }, baseVersion: cur.version }) });
ok("another device saves newer progress", other.version === cur.version + 1, JSON.stringify(other));
await d1.getByTestId("start-practice").click(); await d1.getByTestId("intro-skip").click(); await d1.waitForTimeout(300);
await d1.locator("input:visible").first().fill("2"); await d1.getByTestId("check").click(); await d1.waitForTimeout(3800);   // device 1 saves, against the old version
await d1.getByTestId("close").click().catch(() => {}); await d1.getByRole("button", { name: /^(Leave|Save and leave|Yes)/i }).first().click().catch(() => {}); await d1.waitForTimeout(600);
await d1.locator("[data-testid=nav-me]:visible").first().click(); await d1.waitForTimeout(400);
const afterClash = (await api("maya", "/api/account")).learners[0];
ok("the newer copy is kept on the server, not overwritten", afterClash.data.points === 777 && afterClash.version === cur.version + 1, `points ${afterClash.data.points}, v${afterClash.version}`);
const shown = await d1.evaluate(() => JSON.parse(localStorage.getItem("quarter.cache.fake_maya")).store.profiles[0].points);
ok("device 1 now shows the newer copy", shown === 777, `points on device 1: ${shown}`);
await d1.close();

// 7. signing out clears this device
await p2.close();
let third = await open(); let p3 = third.p; await signIn(p3, "maya"); await openParents(p3);
await p3.getByTestId("sign-out").click(); await p3.waitForTimeout(1500);
ok("signing out returns to the sign-in screen", /Create (an|a parent) account/.test(await text(p3)));
const left = await p3.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("quarter.cache.")));
ok("and leaves no family data on the device", left.length === 0, JSON.stringify(left));

// 8. old local progress moves into a new account
let mig = await open(JSON.stringify(legacy)); let p4 = mig.p;
await signIn(p4, "ben"); await consent(p4);
ok("a parent with older progress on the device is offered to add it", /We found progress on this device/.test(await text(p4)), (await text(p4)).slice(0, 80));
await p4.screenshot({ path: `${dir}/acct-6-migrate.png` });
await p4.getByTestId("migrate-yes").click(); await p4.waitForTimeout(1500);
const ben = await api("ben", "/api/account");
ok("it is added to the account", ben.learners.length === 1 && ben.learners[0].data.name === "Maya", JSON.stringify(ben.learners.map((l) => l.data.name)));
ok("and the app opens on it", /Maya/.test(await text(p4)) || (await p4.getByRole("button", { name: /^Continue/ }).count()) > 0, (await text(p4)).slice(0, 80));
ok("the old device copy is removed once it is safe", (await p4.evaluate(() => localStorage.getItem("mathpath.v1"))) === null);

// 8b. feedback from the Parents' area (the Parents' area is opened once, for this and the delete step)
await openParents(p4);
await p4.getByTestId("part-feedback").click(); await p4.waitForTimeout(300);
ok("the Feedback tab shows the form", (await p4.getByTestId("feedback").count()) === 1);
ok("send is disabled until something is written", await p4.getByTestId("feedback-send").isDisabled());
await p4.getByTestId("feedback-message").fill("A test message"); await p4.getByTestId("feedback-send").click(); await p4.waitForTimeout(800);
ok("sending shows a thank-you", /Thank you, that.s reached us/.test(await text(p4)));
ok("and the server holds it for that parent", ((await api("ben", "/api/account/export")).feedback ?? []).length === 1);
await p4.screenshot({ path: `${dir}/acct-feedback.png`, fullPage: true });

// 9. deleting an account
await p4.getByTestId("part-settings").click(); await p4.waitForTimeout(300);
await p4.getByTestId("delete-account").click(); await p4.getByTestId("delete-confirm").fill("nope");
ok("delete stays disabled until DELETE is typed", await p4.getByTestId("delete-everything").isDisabled());
await p4.getByTestId("delete-confirm").fill("delete"); await p4.getByTestId("delete-everything").click(); await p4.waitForTimeout(1500);
ok("deleting returns to sign-in", /Create (an|a parent) account/.test(await text(p4)));
ok("and the server holds nothing for that family", (await api("ben", "/api/account")).learners.length === 0);

// 10. creating an account needs the terms ticked first, and the tick is then recorded without a second screen
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await ctx.newPage(); q.setDefaultTimeout(9000); q.errs = []; q.on("pageerror", (e) => q.errs.push(e.message));
  await q.goto(B); await q.waitForTimeout(900); await q.getByTestId("landing-sign-up").click(); await q.waitForTimeout(300);
  ok("the sign-up form stays closed until the terms are ticked", (await q.getByTestId("fake-auth").count()) === 0 && (await q.getByTestId("agree-terms").count()) === 1);
  await q.getByTestId("agree-terms").check(); await q.waitForTimeout(300);
  ok("ticking opens the form", (await q.getByTestId("fake-auth").count()) === 1);
  await signIn(q, "zoe");
  ok("a new parent who ticked goes straight in, with no second consent screen", !/Before we start/.test(await text(q)) && (await q.locator("#name").count()) === 1);
  ok("and the agreement is on the account", (await api("zoe", "/api/account")).consented === true);
  p3.errs.push(...q.errs);
}

ok("a new learner is offered the welcome tour", tourSeen > 0);
const errs = [p, p3, p4].flatMap((x) => x.errs); ok("no page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
console.log(`\n${results.filter((r) => r[0] === "PASS").length} passed, ${results.filter((r) => r[0] === "FAIL").length} failed`);
await b.close();
