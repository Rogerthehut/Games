/**
 * Checks the grown-ups' controls from a child's point of view: the Parents' area, adding or changing a learner, and the search all
 * ask for the sum and PIN, and the area locks again as soon as someone leaves it.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/grownup-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
import { tmpdir } from "node:os";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const p0 = newProfile("Maya", 6, Date.now() - 86_400_000 * 5); p0.toured = true;
const browser = await chromium.launch();
const phone = process.env.VIEW === "phone";
const ctx = await browser.newContext({ viewport: phone ? { width: 390, height: 800 } : { width: 1280, height: 860 } });
await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [p0], activeId: p0.id }));
const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
await page.goto(B); await page.waitForTimeout(800);
await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});

// on a wide screen the Parents' area is the padlock at the bottom of the left-hand panel; on a phone it is a row on Me
const openParents = async () => {
  const rail = page.locator("[data-testid=rail-parents]:visible");
  if (await rail.count()) await rail.click(); else { await page.locator("[data-testid=top-me]:visible").first().click(); await page.getByTestId("top-open-parents").click(); }
  await page.waitForTimeout(300);
};
const toMe = async () => { const t = page.locator("[data-testid=top-me]:visible").first(); if (await t.count()) { await t.click(); await page.getByTestId("rail-open-me").click(); } else { await page.locator(".rail-me").click(); await page.getByTestId("rail-open-me").click(); } await page.waitForTimeout(400); };
const gateUp = async () => (await page.getByTestId("gate-input").count()) === 1;
const tap = async (digits: string) => { for (const d of digits) await page.locator(".keypad .pad-key", { hasText: new RegExp(`^${d}$`) }).first().click(); };
const solveSum = async () => { const m = /(\d+)\s*×\s*(\d+)/.exec(await page.locator(".gate-sum").innerText())!; await tap(String(+m[1] * +m[2])); await page.getByTestId("gate-go").click(); await page.waitForTimeout(400); };
const pin = async () => {
  if (!(await page.getByTestId("pin-input").count())) return;
  const rounds = /Make a PIN/.test(await page.getByTestId("pin-prompt").innerText()) ? 2 : 1; // making one means typing it twice
  for (let k = 0; k < rounds; k++) { await tap("482915"); await page.getByTestId("pin-go").click(); await page.waitForTimeout(450); }
};

// 1. the Parents' area asks for the sum, then a PIN
await toMe();
await openParents();
ok("the Parents' area asks for a sum first", await gateUp());
if (!phone) ok("on a wide screen the sum and PIN open in the left-hand panel", (await page.locator(".rail .gate-embedded").count()) === 1 && (await page.locator(".gate-backdrop").count()) === 0);
if (phone) ok("on a phone the Parents' area is in the avatar menu, not on Me", (await page.getByTestId("open-parents").count()) === 0);
await solveSum(); await pin();
ok("with the sum and PIN, the Parents' area opens", /Parents' area/.test(await page.locator("body").innerText()) && !(await gateUp()));
await page.keyboard.press("Shift"); // as if a keyboard was just used, which is when browsers draw focus rings
const boxed = await page.evaluate(() => { const el = document.activeElement as HTMLElement | null; return el ? { tag: el.tagName, outline: getComputedStyle(el).outlineStyle } : null; });
ok("the heading the app focuses on arrival has no box round it", boxed?.tag === "H1" && boxed.outline === "none", JSON.stringify(boxed));

await page.screenshot({ path: `${process.env.OUT ?? tmpdir()}/gu-after-pin.png` });
// 2a. the Lock and leave button locks it at once and goes back to Me
await page.getByTestId("lock-parents").click(); await page.waitForTimeout(500);
ok("Lock and leave goes back to Me", /Choose your avatar|Who.s learning/i.test(await page.locator("body").innerText()));
await openParents();
ok("and the area is locked again", await gateUp());
await solveSum(); await pin();
// 2. leaving it locks it again
await page.locator(`button[aria-label="Back to Me"]`).click(); await page.waitForTimeout(500);
await openParents();
ok("after leaving, the Parents' area is locked again", await gateUp());
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
if (await gateUp()) await page.getByRole("button", { name: /cancel|close|not now/i }).first().click().catch(() => {});

// 3. adding or changing a learner needs a grown-up
await page.waitForTimeout(300);
if (phone) { await page.locator("[data-testid=top-me]:visible").first().click(); await page.getByTestId("rail-add-learner").click(); } else await page.getByTestId("rail-add-learner").click().catch(async () => { await page.locator("[data-testid=rail-me]").click(); await page.getByTestId("rail-add-learner").click(); }); await page.waitForTimeout(300);
ok("adding someone or changing the school year asks for a grown-up", await gateUp());
await page.keyboard.press("Escape"); await page.waitForTimeout(300);

// 4. the search can't be used to get round it
await page.getByRole("button", { name: /search/i }).first().click().catch(() => {});
await page.waitForTimeout(300);
const box = page.locator("input[type=search], input[placeholder*=earch]").first();
if (await box.count()) {
  await box.fill("grown-ups"); await page.waitForTimeout(400);
  await page.getByRole("option", { name: /Grown-ups’ area/ }).first().click().catch(async () => { await page.getByText("Grown-ups’ area").first().click(); });
  await page.waitForTimeout(500);
  ok("opening the Parents' area from the search asks for the sum too", await gateUp());
} else ok("(search box not found)", false);

ok("no errors", errors.length === 0, errors.join("; "));
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
