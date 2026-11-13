/**
 * End-to-end check of the ops page: an admin signs in, passes the emailed-code step, replies to feedback, and a non-admin sees nothing.
 * Starts its own server (fake sign-in, in-memory database) and the dev app.
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js node scripts/ops-e2e.mjs      (or: npm run e2e:ops)
 */
import { spawn } from "node:child_process";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
let log = "";
const run = (cmd, args, env) => { const c = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true }); c.stdout.on("data", (d) => (log += d)); c.stderr.on("data", (d) => (log += d)); return c; };
const server = run("npx", ["tsx", "server/index.ts"], { AUTH_FAKE: "1", PORT: "8787", OPS_ADMINS: "fake_boss@example.test", OPS_SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret" });
const app = run("npx", ["vite", "--port", "5173"], { VITE_FAKE_AUTH: "1" });
const wait = async (url) => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error(`${url} did not start`); };
let failed = 0; const ok = (n, c) => { console.log(c ? "PASS" : "FAIL", n); if (!c) failed++; };
try {
  await wait("http://localhost:8787/api/health"); await wait("http://localhost:5173/");
  // seed feedback as a parent through the API
  const post = (p, who, body) => fetch(`http://localhost:8787${p}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${who}` }, body: JSON.stringify(body) });
  await post("/api/account/consent", "fake_maya", { version: "x" });
  await fetch("http://localhost:8787/api/account", { headers: { Authorization: "Bearer fake_maya" } }).then((r) => r.json()).then((a) => post("/api/account/consent", "fake_maya", { version: a.termsVersion }));
  const fb = await post("/api/feedback", "fake_maya", { category: "idea", rating: 5, message: "Please add more fractions", mayReply: true, context: "Today" });
  ok("feedback saved", fb.status < 300 || fb.status === 401);   // 401 only if the human check is on
  const b = await chromium.launch();
  const page = async (who) => { const ctx = await b.newContext({ viewport: { width: 1000, height: 800 } }); await ctx.addInitScript((w) => localStorage.setItem("quarter.fake.user", w), who); const p = await ctx.newPage(); p.setDefaultTimeout(9000); await p.goto("http://localhost:5173/ops"); return p; };
  const other = await page("fake_maya");
  await other.getByTestId("ops-send").click(); await other.waitForTimeout(600);
  ok("a non-admin is refused", /can't open the ops page/.test(await other.locator("body").innerText()));
  const boss = await page("fake_boss");
  await boss.getByTestId("ops-send").click(); await boss.getByTestId("ops-code").waitFor();
  await boss.getByTestId("ops-code").fill("000000"); await boss.getByTestId("ops-verify").click(); await boss.waitForTimeout(500);
  ok("a wrong code is refused", /isn't the right code/.test(await boss.locator("body").innerText()));
  const code = /\[dev email to fake_boss@example.test\] Your quarter ops code: (\d{6})/.exec(log)?.[1];
  await boss.getByTestId("ops-code").fill(code ?? "");
  await boss.getByTestId("ops-verify").click(); await boss.getByTestId("ops-folder-feedback").waitFor();
  await boss.getByTestId("ops-folder-feedback").click(); await boss.getByText("Please add more fractions").waitFor().catch(() => {});
  ok("the right code opens the mailbox, with the feedback in its folder", /Please add more fractions/.test(await boss.locator("body").innerText()));
  await boss.getByTestId("ops-mail-row").first().locator(".ops-mail-open").click(); await boss.getByTestId("ops-thread").waitFor();
  await boss.locator("textarea").fill("Thanks, more fractions are coming soon."); await boss.getByTestId("ops-reply").click(); await boss.waitForTimeout(900);
  await boss.getByTestId("ops-mail-back").click(); await boss.getByTestId("ops-folder-sent").click(); await boss.waitForTimeout(500);
  ok("the reply was sent and is in the Sent folder", /more fractions are coming soon/.test(await boss.locator("body").innerText()));
  ok("the email was 'sent' to the parent", /dev email to fake_maya@example.test\] Re: your feedback/.test(log));
  await boss.getByTestId("ops-tab-numbers").click(); await boss.getByTestId("ops-numbers").waitFor();
  await boss.getByTestId("ops-tab-audit").click(); await boss.waitForTimeout(600);
  ok("the audit log lists the reply", /feedback-reply/.test(await boss.locator("body").innerText()));
  // deleting an account for someone who can't sign in
  await boss.getByTestId("ops-tab-account").click();
  await boss.locator("input[type=email]").fill("fake_maya@example.test"); await boss.getByRole("button", { name: "Look up" }).click(); await boss.getByTestId("ops-delete").waitFor();
  ok("the lookup shows a delete section, with the button off until the phrase is typed", await boss.getByTestId("ops-delete-go").isDisabled());
  await boss.getByTestId("ops-delete-confirm").fill("delete wrong@example.test");
  ok("a wrong phrase leaves it off", await boss.getByTestId("ops-delete-go").isDisabled());
  await boss.getByTestId("ops-delete-confirm").fill("delete fake_maya@example.test");
  await boss.getByTestId("ops-delete-go").click(); await boss.waitForTimeout(900);
  ok("the account is deleted and the parent emailed", /has been deleted/.test(await boss.getByTestId("ops-msg").innerText()) && /Your quarter account has been deleted/.test(log));
  await boss.locator("input[type=email]").fill("fake_maya@example.test"); await boss.getByRole("button", { name: "Look up" }).click(); await boss.waitForTimeout(600);
  ok("looking it up again finds nothing", /No quarter account/.test(await boss.getByTestId("ops-msg").innerText()));
  await b.close();
} catch (e) { console.error(e); failed++; } finally { for (const c of [server, app]) { try { process.kill(-c.pid); } catch {} } }
process.exit(failed ? 1 : 0);
