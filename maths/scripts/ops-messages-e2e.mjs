/**
 * End-to-end check of the ops page's Messages tab and signatures, and of the inbound-email webhook's door:
 * a message from the public form appears, a signature is added (scripts are cleaned out), a reply is sent under it, and the webhook refuses
 * anything not signed by Resend. Starts its own server (fake sign-in, in-memory database) and the dev app.
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js node scripts/ops-messages-e2e.mjs
 */
import { spawn } from "node:child_process";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
let log = "";
const run = (cmd, args, env) => { const c = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true }); c.stdout.on("data", (d) => (log += d)); c.stderr.on("data", (d) => (log += d)); return c; };
const server = run("npx", ["tsx", "server/index.ts"], { AUTH_FAKE: "1", PORT: "8787", OPS_ADMINS: "fake_boss@example.test", OPS_SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret" });
// a second server with receiving switched on (a real Resend key would make the sign-in email really send, so the portal test uses the first)
const receiving = run("npx", ["tsx", "server/index.ts"], { AUTH_FAKE: "1", PORT: "8788", RESEND_API_KEY: "re_e2e_not_real", RESEND_WEBHOOK_SECRET: "whsec_" + Buffer.from("e2e webhook secret of some length").toString("base64") });
const app = run("npx", ["vite", "--port", "5173"], { VITE_FAKE_AUTH: "1" });
const wait = async (url) => { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).status < 500) return; } catch {} await new Promise((r) => setTimeout(r, 500)); } throw new Error(`${url} did not start`); };
let failed = 0; const ok = (n, c) => { console.log(c ? "PASS" : "FAIL", n); if (!c) failed++; };
try {
  await wait("http://localhost:8787/api/health"); await wait("http://localhost:8788/api/health"); await wait("http://localhost:5173/");
  const sent = await fetch("http://localhost:8787/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "kim@example.com", message: "How do I add a second child to my account?", topic: "question" }) });
  ok("the public form accepts a message", sent.status === 200);
  // the webhook's door
  const hook = (headers, body) => fetch("http://localhost:8788/api/inbound/resend", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
  ok("an unsigned webhook is refused", (await hook({}, '{"type":"email.received"}')).status === 400);
  ok("a badly signed webhook is refused", (await hook({ "svix-id": "msg_1", "svix-timestamp": String(Math.floor(Date.now() / 1000)), "svix-signature": "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" }, '{"type":"email.received"}')).status === 400);
  ok("the webhook only answers POST", (await fetch("http://localhost:8788/api/inbound/resend")).status !== 200);
  ok("with receiving switched off, the webhook doesn't exist", (await fetch("http://localhost:8787/api/inbound/resend", { method: "POST", body: "{}" })).status === 404);

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await ctx.addInitScript(() => localStorage.setItem("quarter.fake.user", "fake_boss"));
  const boss = await ctx.newPage(); boss.setDefaultTimeout(9000); await boss.goto("http://localhost:5173/ops");
  await boss.getByTestId("ops-send").click(); await boss.getByTestId("ops-code").waitFor();
  const code = /\[dev email to fake_boss@example.test\] Your quarter ops code: (\d{6})/.exec(log)?.[1];
  await boss.getByTestId("ops-code").fill(code ?? ""); await boss.getByTestId("ops-verify").click(); await boss.getByTestId("ops-inbox").waitFor();
  await boss.getByTestId("ops-tab-messages").click(); await boss.getByTestId("ops-messages").waitFor(); await boss.waitForTimeout(500);
  ok("the form message appears under Messages", /How do I add a second child/.test(await boss.locator("body").innerText()));
  // signatures
  await boss.getByTestId("ops-signatures-toggle").click();
  await boss.getByTestId("ops-signature-new").click();
  await boss.getByTestId("ops-signature-name").fill("Roger");
  await boss.getByTestId("ops-signature-html").fill('<p style="color:#2f3a73">Roger<br>quarter</p><script>window.__pwned=1</script><img src="x" onerror="window.__pwned=1">');
  await boss.waitForTimeout(900);
  const frame = boss.locator("iframe.ops-sig-preview");
  ok("the preview is a sandboxed frame with no script rights", (await frame.last().getAttribute("sandbox")) === "");
  const previewHtml = await frame.last().getAttribute("srcdoc");
  ok("the preview holds the cleaned signature, not the script", /Roger/.test(previewHtml ?? "") && !/script|onerror/.test((previewHtml ?? "").replace(/<meta[^>]*>/, "")));
  if (process.env.SHOT) await boss.screenshot({ path: "/tmp/claude-0/ops-sig-edit.png" });
  await boss.getByTestId("ops-signature-save").click(); await boss.waitForTimeout(700);
  if (process.env.SHOT) await boss.screenshot({ path: "/tmp/claude-0/ops-sig-list.png" });
  ok("the signature is saved and listed", /Roger/.test(await boss.getByTestId("ops-signatures").innerText()) && /default/.test(await boss.getByTestId("ops-signatures").innerText()));
  ok("nothing the signature contained ran", (await boss.evaluate(() => window.__pwned)) === undefined);
  // reply under it
  const picker = boss.getByTestId("ops-message-signature").first();
  ok("the default signature is chosen under the reply box", (await picker.inputValue()) !== "");
  await boss.locator("textarea[aria-label='Your reply']").first().fill("You can add one under Parents' area, then Learners.");
  await boss.getByTestId("ops-message-reply").first().click(); await boss.waitForTimeout(900);
  ok("the reply was emailed to the sender", /dev email to kim@example.com\] Re: your message to quarter/.test(log));
  ok("the conversation leaves the waiting list", !/How do I add a second child/.test(await boss.locator("body").innerText()));
  // a big signature (well past the usual 8 KB request limit) still saves
  if (!(await boss.getByTestId("ops-signature-new").isVisible().catch(() => false))) await boss.getByTestId("ops-signatures-toggle").click();
  await boss.getByTestId("ops-signature-new").click(); await boss.getByTestId("ops-signature-name").fill("Big");
  await boss.getByTestId("ops-signature-html").fill("<p>" + "Roger Richman, quarter. ".repeat(1300) + "</p>");
  await boss.getByTestId("ops-signature-save").click(); await boss.waitForTimeout(900);
  ok("a 30,000-character signature saves", /Big/.test(await boss.getByTestId("ops-signatures").innerText()));
  await boss.getByTestId("ops-tab-audit").click(); await boss.waitForTimeout(600);
  const audit = await boss.locator("body").innerText();
  ok("the audit log lists the signature and the reply, without their content", /signature-add/.test(audit) && /contact-reply/.test(audit) && !/second child/.test(audit));
  await b.close();
} catch (e) { console.error(e); failed++; } finally { for (const c of [server, receiving, app]) { try { process.kill(-c.pid); } catch {} } }
process.exit(failed ? 1 : 0);
