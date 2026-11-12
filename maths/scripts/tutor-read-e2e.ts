/**
 * The AI tutor's "Read to me": each tutor reply gets a button that reads it aloud with the device's voice, and Stop ends it.
 * The tutor service and the browser's speech are stubbed, so this needs no key and makes no sound.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/tutor-read-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = JSON.parse(readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8"));
for (const p of store.profiles ?? []) p.tutor = { enabled: true, reveal: "guide" };
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };

const stub = `
window.__said = []; window.__cancelled = 0;
const voices = [];
window.SpeechSynthesisUtterance = function (t) { this.text = t; };
Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
  speaking: false, pending: false, paused: false, getVoices: () => voices,
  speak(u) { window.__said.push(u.text); this.speaking = true; setTimeout(() => u.onstart && u.onstart(), 0); },
  cancel() { window.__cancelled++; this.speaking = false; },
} });`;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, JSON.stringify(store));
await ctx.addInitScript({ content: stub });
const p = await ctx.newPage(); p.setDefaultTimeout(9000);
await p.route("**/api/health", (r: any) => r.fulfill({ json: { ok: true, tutor: true } }));
await p.route("**/api/tutor", (r: any) => r.fulfill({ json: { reply: "Good thinking. Try $12 \\times 3$ first, then add $\\frac{1}{2}$.", flag: "ok", remainingToday: 20 } }));
await p.goto(base); await p.waitForTimeout(1200);
await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});

await p.getByTestId("start-practice").click(); await p.getByTestId("intro-skip").click().catch(() => {}); await p.waitForTimeout(600);
await p.getByTestId("tutor-open").click(); await p.waitForTimeout(400);
await p.locator(".starters .chip-btn").first().click(); await p.waitForTimeout(900);
const read = p.getByTestId("tutor-read-1");
ok("a tutor reply has a Read to me button", (await read.count()) === 1);
ok("the child's own message does not", (await p.getByTestId("tutor-read-0").count()) === 0);
await read.click(); await p.waitForTimeout(300);
const said = await p.evaluate(() => (window as any).__said as string[]);
ok("pressing it reads the reply aloud, with the maths as words", said.length === 1 && /12 times 3/.test(said[0]) && !/[$\\]/.test(said[0]), said[0]);
ok("the button turns into Stop while it reads", /Stop/.test(await read.innerText()) && (await read.getAttribute("aria-pressed")) === "true");
await read.click(); await p.waitForTimeout(200);
ok("Stop ends it", /Read to me/.test(await read.innerText()) && (await p.evaluate(() => (window as any).__cancelled as number)) >= 1);
await b.close();
process.exit(failed ? 1 : 0);
