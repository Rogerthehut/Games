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
  const ctx = await b.newContext({ viewport: { width: Number(process.env.W ?? 1100), height: 900 } }); await ctx.addInitScript(() => localStorage.setItem("quarter.fake.user", "fake_boss"));
  const boss = await ctx.newPage(); boss.setDefaultTimeout(9000); await boss.goto("http://localhost:5173/ops");
  await boss.getByTestId("ops-send").click(); await boss.getByTestId("ops-code").waitFor();
  const code = /\[dev email to fake_boss@example.test\] Your quarter ops code: (\d{6})/.exec(log)?.[1];
  await boss.getByTestId("ops-code").fill(code ?? ""); await boss.getByTestId("ops-verify").click(); await boss.getByTestId("ops-folder-inbox").waitFor();
  const body = async () => boss.locator("body").innerText();
  // folders: the form message is in Messages (unread), not in the Inbox
  ok("an unread count shows on Messages", (await boss.getByTestId("ops-count-messages").innerText()) === "1");
  ok("the Inbox is empty of it", !/How do I add a second child/.test(await body()));
  await boss.getByTestId("ops-folder-messages").click(); await boss.waitForTimeout(500);
  ok("the form message is in the Messages folder, marked unread", /How do I add a second child/.test(await body()) && (await boss.locator(".ops-mail-row.unread").count()) === 1);
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
  ok("the signature is saved and listed", /Roger/.test(await boss.getByTestId("ops-signatures").innerText()) && /default/.test(await boss.getByTestId("ops-signatures").innerText()));
  ok("nothing the signature contained ran", (await boss.evaluate(() => window.__pwned)) === undefined);
  // open the conversation (which marks it read) and reply under the signature
  await boss.getByTestId("ops-folder-messages").click(); await boss.waitForTimeout(400);
  await boss.getByTestId("ops-mail-row").first().locator(".ops-mail-open").click(); await boss.getByTestId("ops-thread").waitFor();
  ok("the conversation shows its reference number", /Q-\d{4,}/.test(await boss.getByTestId("ops-message").innerText()));
  if (process.env.SHOT) await boss.screenshot({ path: `/tmp/claude-0/ops-mail-thread-${process.env.W ?? 1100}.png` });
  ok("the default signature is chosen under the reply box", (await boss.getByTestId("ops-message-signature").first().inputValue()) !== "");
  await boss.locator("textarea[aria-label='Your reply']").first().fill("A reply I'm not sure about yet.");
  await boss.getByTestId("ops-draft-save").click(); await boss.waitForTimeout(500);
  ok("a reply can be saved as a draft", /Draft saved/.test(await body()));
  await boss.getByTestId("ops-mail-back").click(); await boss.waitForTimeout(400);
  ok("opening it marked it read", (await boss.locator(".ops-mail-row.unread").count()) === 0 && (await boss.getByTestId("ops-count-messages").count()) === 0);
  ok("the draft is counted in Drafts", (await boss.getByTestId("ops-count-drafts").innerText()) === "1");
  await boss.getByTestId("ops-folder-drafts").click(); await boss.waitForTimeout(400);
  await boss.getByTestId("ops-mail-row").first().locator(".ops-mail-open").click(); await boss.getByTestId("ops-thread").waitFor();
  ok("opening the draft puts its words back in the reply box", (await boss.locator("textarea[aria-label='Your reply']").first().inputValue()) === "A reply I'm not sure about yet.");
  await boss.locator("textarea[aria-label='Your reply']").first().fill("You can add one under Parents' area, then Learners.");
  await boss.getByTestId("ops-message-reply").first().click(); await boss.waitForTimeout(900);
  ok("the reply was emailed to the sender, with the reference in the subject", /dev email to kim@example.com\] Re: your message to quarter \[Q-\d{4,}-[0-9a-f]{8}\]/.test(log));
  await boss.getByTestId("ops-mail-back").click(); await boss.waitForTimeout(500);
  ok("sending removed the draft", (await boss.getByTestId("ops-count-drafts").count()) === 0);
  await boss.getByTestId("ops-folder-sent").click(); await boss.waitForTimeout(500);
  ok("the reply is in Sent", /To kim@example.com/.test(await body()));
  // a big signature (well past the usual 8 KB request limit) still saves
  await boss.getByTestId("ops-signatures-toggle").click();
  await boss.getByTestId("ops-signature-new").click(); await boss.getByTestId("ops-signature-name").fill("Big");
  await boss.getByTestId("ops-signature-html").fill("<p>" + "Roger Richman, quarter. ".repeat(1300) + "</p>");
  await boss.getByTestId("ops-signature-save").click(); await boss.waitForTimeout(900);
  ok("a 30,000-character signature saves", /Big/.test(await boss.getByTestId("ops-signatures").innerText()));
  // a brand new email to someone who hasn't been in touch, saved as a draft first
  await boss.getByTestId("ops-compose-toggle").click();
  await boss.getByTestId("ops-compose-to").fill("partner@example.org"); await boss.getByTestId("ops-compose-subject").fill("A quick hello");
  await boss.getByTestId("ops-compose-body").fill("Hi, a short note from quarter."); await boss.getByTestId("ops-compose-save").click(); await boss.waitForTimeout(500);
  await boss.getByTestId("ops-compose-send").click(); await boss.waitForTimeout(900);
  ok("a new email is sent from the portal", /dev email to partner@example.org\] A quick hello \[Q-\d{4,}-[0-9a-f]{8}\]/.test(log));
  await boss.getByTestId("ops-folder-sent").click(); await boss.waitForTimeout(500);
  ok("it is in Sent", /To partner@example.org/.test(await body()));
  ok("and its draft is gone", (await boss.getByTestId("ops-count-drafts").count()) === 0);
  // the Trash: move the form conversation there, restore it, and see it come back
  await boss.getByTestId("ops-folder-messages").click(); await boss.waitForTimeout(400);
  await boss.getByTestId("ops-mail-row").first().locator(".ops-mail-open").click(); await boss.getByTestId("ops-thread").waitFor();
  await boss.getByTestId("ops-trash").click(); await boss.waitForTimeout(500);
  ok("moving it to the Trash takes it out of Messages", !/How do I add a second child/.test(await body()));
  await boss.getByTestId("ops-folder-trash").click(); await boss.waitForTimeout(500);
  ok("it is in the Trash", /How do I add a second child|kim@example.com/.test(await body()));
  await boss.getByTestId("ops-trash-restore").first().click(); await boss.waitForTimeout(500);
  ok("restoring empties the Trash", /Nothing here/.test(await body()));
  await boss.getByTestId("ops-folder-messages").click(); await boss.waitForTimeout(400);
  ok("and it is back in Messages", /kim@example.com|How do I add a second child/.test(await body()));
  // pin and flag, then search across every folder with a spelling slip
  await boss.getByTestId("ops-mail-row").first().locator(".ops-mail-open").click(); await boss.getByTestId("ops-thread").waitFor();
  await boss.getByTestId("ops-pin").click(); await boss.waitForTimeout(400); await boss.getByTestId("ops-flag").click(); await boss.waitForTimeout(400);
  ok("pin and flag buttons flip", /Unpin/.test(await boss.getByTestId("ops-pin").innerText()) && /Remove flag/.test(await boss.getByTestId("ops-flag").innerText()));
  await boss.getByTestId("ops-folder-flagged").click(); await boss.waitForTimeout(500);
  ok("a flagged conversation shows in Flagged, marked", (await boss.getByTestId("ops-mail-row").count()) >= 1 && /⚑/.test(await body()));
  await boss.getByTestId("ops-search").fill("partnr helo"); await boss.waitForTimeout(900);
  ok("search finds it across folders with typos", /1 result|results/.test(await boss.getByTestId("ops-search-status").innerText()) && /Sent/.test(await boss.getByTestId("ops-hit-folder").first().innerText()));
  ok("matched words are highlighted", (await boss.locator(".ops-mail-list mark, [data-testid=ops-mail-list] mark").count()) >= 1);
  await boss.getByTestId("ops-search").press("Escape"); await boss.waitForTimeout(400);
  ok("Escape clears the search", (await boss.getByTestId("ops-search").inputValue()) === "");
  await boss.getByTestId("ops-tab-audit").click(); await boss.waitForTimeout(600);
  const audit = await boss.locator("body").innerText();
  ok("the audit log lists the signature and the reply, without their content", /signature-add/.test(audit) && /contact-reply/.test(audit) && !/second child/.test(audit));
  await b.close();
} catch (e) { console.error(e); failed++; } finally { for (const c of [server, receiving, app]) { try { process.kill(-c.pid); } catch {} } }
process.exit(failed ? 1 : 0);
