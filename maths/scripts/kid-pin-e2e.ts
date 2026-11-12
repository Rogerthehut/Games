/**
 * Child PINs: a grown-up makes a PIN for a child in the Parents' area; switching to that child then asks for it; a wrong one is refused;
 * "Forgot it?" goes to a grown-up, who can open the profile or clear the PIN; an older child, if allowed, changes their own.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js STORE=/tmp/store.json npx tsx scripts/kid-pin-e2e.ts
 */
import { readFileSync } from "node:fs";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:4173";
const store = JSON.parse(readFileSync(process.env.STORE ?? "/tmp/store.json", "utf8"));
const sam = JSON.parse(JSON.stringify(store.profiles[0])); sam.id = "sam-id"; sam.name = "Sam"; sam.year = 8;
store.profiles = [store.profiles[0], sam]; store.activeId = store.profiles[0].id;
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const PARENT = "135790", SAM = "2580";

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* ignore */ } }, JSON.stringify(store));
const p = await ctx.newPage(); p.setDefaultTimeout(9000);
await p.goto(base); await p.waitForTimeout(1000);
await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
const openMeVia = async (pg: any) => { const rail = pg.getByTestId("rail-me"); if (await rail.isVisible().catch(() => false)) { await rail.click(); await pg.getByTestId("rail-open-me").click(); } else await pg.getByRole("button", { name: /(?:open Me|switch learner)/ }).first().click(); await pg.waitForTimeout(500); };
const openMe = () => openMeVia(p);
const pick = async (name: RegExp) => { await p.getByTestId("rail-me").click(); await p.waitForTimeout(150); await p.getByRole("menuitemradio", { name }).click(); await p.waitForTimeout(400); };
const type = async (digits: string) => { await p.waitForTimeout(250); await p.keyboard.type(digits, { delay: 50 }); await p.waitForTimeout(150); };
const clear4 = async () => { for (let i = 0; i < 4; i++) { await p.keyboard.press("Backspace"); await p.waitForTimeout(80); } };
const parentGate = async () => { // the sum, then the parent's PIN (made the first time, typed twice)
  const sum = (await p.locator(".gate-sum").innerText()).match(/(\d+)\s*×\s*(\d+)/)!;
  await type(String(Number(sum[1]) * Number(sum[2]))); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
  await type(PARENT); await p.keyboard.press("Enter"); await p.waitForTimeout(600);
  if (await p.getByTestId("pin-prompt").count() && /once more/i.test(await p.getByTestId("pin-prompt").innerText())) { await type(PARENT); await p.keyboard.press("Enter"); await p.waitForTimeout(800); }
};
const switchTo = async (name: RegExp) => { await pick(name); await p.waitForTimeout(100); };

// Sam: a grown-up makes a PIN for Sam and lets him change it himself
await switchTo(/Sam/);
await p.getByTestId("rail-parents").click(); await p.waitForTimeout(400); await parentGate();
await p.getByTestId("part-settings").click(); await p.waitForTimeout(300);
ok("the Parents' area has a PIN section for Sam", (await p.getByTestId("kid-pin-settings").count()) === 1);
ok("no PIN yet, so no 'let him change it' option", (await p.getByTestId("kid-pin-self").count()) === 0);
await p.getByTestId("kid-pin-make").click(); await type("1234"); await p.getByTestId("kid-pin-save").click();
ok("an easy run like 1234 is refused", /run of digits/.test(await p.getByTestId("kid-pin-settings").innerText()));
await clear4();
await type(SAM); await p.getByTestId("kid-pin-save").click(); await type(SAM); await p.getByTestId("kid-pin-save").click(); await p.waitForTimeout(400);
ok("Sam's PIN is made", (await p.getByTestId("kid-pin-off").count()) === 1);
await p.getByTestId("kid-pin-self").check();

// Maya (no PIN) can switch to Sam only with the PIN
await switchTo(/Maya/);
await pick(/Sam/);
ok("switching to Sam asks for his PIN", (await p.getByTestId("kid-pin-gate").count()) === 1);
await type("9999"); await p.keyboard.press("Enter"); await p.waitForTimeout(500);
ok("a wrong PIN is refused with tries left", /isn't right/.test(await p.getByTestId("kid-pin-note").innerText()) && (await p.getByTestId("kid-pin-gate").count()) === 1);
await type(SAM); await p.keyboard.press("Enter"); await p.waitForTimeout(700);
ok("the right PIN opens Sam's profile", (await p.getByRole("button", { name: /Sam, (?:open Me|switch learner)/ }).count()) > 0 && (await p.getByTestId("kid-pin-gate").count()) === 0);

// Sam, allowed by a grown-up, changes his own PIN
await openMe();
ok("Sam sees My PIN", (await p.getByTestId("my-pin").count()) === 1);
await p.getByTestId("my-pin-change").click(); await type(SAM); await p.getByTestId("my-pin-go").click(); await type("7413"); await p.getByTestId("my-pin-go").click(); await type("7413"); await p.getByTestId("my-pin-go").click(); await p.waitForTimeout(400);
ok("his own PIN is changed", (await p.getByTestId("my-pin-done").count()) === 1);
await pick(/Maya/);
await pick(/Sam/);
await type(SAM); await p.keyboard.press("Enter"); await p.waitForTimeout(500);
ok("the old PIN no longer works", (await p.getByTestId("kid-pin-gate").count()) === 1);
await clear4();

// forgotten: a grown-up opens the profile (PIN kept), or clears it
await p.getByTestId("kid-pin-forgot").click(); await p.getByTestId("kid-pin-grownup").click(); await p.waitForTimeout(400); await parentGate();
ok("after the grown-up check there's a choice", (await p.getByTestId("kid-pin-clear").count()) === 1);
await p.getByTestId("kid-pin-open-anyway").click(); await p.waitForTimeout(600);
ok("opening anyway shows Sam's profile", (await p.getByRole("button", { name: /Sam, (?:open Me|switch learner)/ }).count()) > 0);
await switchTo(/Maya/); await p.waitForTimeout(300);
await pick(/Sam/);
ok("and the PIN is still there afterwards", (await p.getByTestId("kid-pin-gate").count()) === 1);
await p.getByTestId("kid-pin-forgot").click(); await p.getByTestId("kid-pin-grownup").click(); await p.waitForTimeout(400); await parentGate();
await p.getByTestId("kid-pin-clear").click(); await p.waitForTimeout(600);
await switchTo(/Maya/); await pick(/Sam/);
ok("once cleared, switching to Sam no longer asks", (await p.getByTestId("kid-pin-gate").count()) === 0 && (await p.getByRole("button", { name: /Sam, (?:open Me|switch learner)/ }).count()) > 0);
await b.close();
process.exit(failed ? 1 : 0);
