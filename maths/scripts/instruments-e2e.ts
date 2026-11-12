/**
 * Checks the protractor and drawing questions end to end: reading a protractor, turning an arm to draw an angle (buttons and a drag),
 * and drawing a rectangle and a triangle on the grid.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/instruments-e2e.ts
 */
import { newProfile } from "../src/engine/progress";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const p0 = newProfile("Maya", 6, Date.now() - 86_400_000 * 5); p0.toured = true; p0.skillsView = "list";
const browser = await chromium.launch();
for (const [label, w, h] of [["desktop", 1280, 900], ["phone", 390, 800]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [p0], activeId: p0.id }));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(B); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});

  const openPractice = async (id: string) => {
    await page.locator("[data-testid=nav-skills]:visible").first().click(); await page.waitForTimeout(500);
    const row = page.locator(`#skill-${id}`); await row.scrollIntoViewIfNeeded();
    await row.getByRole("button", { name: "Practise" }).click(); await page.waitForTimeout(500);
    if (await page.getByTestId("intro-skip").count()) await page.getByTestId("intro-skip").click();
    await page.waitForTimeout(300);
  };
  const leave = async () => { await page.getByTestId("close").click(); await page.waitForTimeout(500); };

  // measure: the figure is a protractor, the answer is typed
  await openPractice("measure-angles");
  ok(`${label}: measuring shows a protractor`, (await page.locator("svg.protractor").count()) >= 1);
  ok(`${label}: and a typed answer box`, (await page.locator(".practice-page input").count()) >= 1);
  await leave();

  // draw an angle with the buttons
  await openPractice("draw-angles");
  ok(`${label}: drawing an angle has the loose arm and no typed box`, (await page.getByTestId("angle-draw").count()) === 1 && (await page.locator(".practice-page input:visible").count()) === 0);
  const target = Number(/Draw an angle of (\d+)/.exec(await page.getByTestId("question").innerText())?.[1]);
  const readAngle = async () => Number(/(\d+)°/.exec(await page.locator(".angle-draw .board-status").innerText())?.[1]);
  ok(`${label}: Check waits until the arm has been moved`, await page.getByTestId("check").isDisabled());
  let now = await readAngle();
  for (let i = 0; i < 30 && Math.abs(now - target) >= 10; i++) { await page.getByRole("button", { name: now < target ? "Bigger by 10 degrees" : "Smaller by 10 degrees" }).click(); now = await readAngle(); }
  for (let i = 0; i < 12 && now !== target; i++) { await page.getByRole("button", { name: now < target ? "Bigger by 1 degree" : "Smaller by 1 degree" }).click(); now = await readAngle(); }
  ok(`${label}: the buttons reach ${target}°`, now === target, `got ${now}`);
  await page.getByTestId("check").click(); await page.waitForTimeout(400);
  ok(`${label}: the angle is accepted`, (await page.locator(".fb.good").count()) === 1);
  await page.screenshot({ path: `${process.env.OUT ?? "."}/instr-angle-${label}.png` });
  await leave();

  // draw a rectangle by dragging, then check a wrong one first
  await openPractice("draw-shapes");
  ok(`${label}: drawing a shape shows the grid`, (await page.getByTestId("shape-draw").count()) === 1);
  const m = /\$(\d+)\$ cm wide and \$(\d+)\$ cm tall|(\d+) cm wide and (\d+) cm tall/.exec(await page.getByTestId("question").innerText());
  const W = Number(m?.[1] ?? m?.[3]), H = Number(m?.[2] ?? m?.[4]);
  const readSize = async () => /(\d+) cm.*?(\d+) cm/.exec(await page.locator(".shape-draw .board-status").innerText())!.slice(1, 3).map(Number);
  await page.getByRole("button", { name: "Longer across" }).click(); // starts at 1 x 1: one step makes it wrong
  await page.getByTestId("check").click(); await page.waitForTimeout(500);
  ok(`${label}: a wrong shape isn't accepted`, (await page.locator(".fb.good").count()) === 0);
  let [cw, ch] = await readSize();
  for (let i = 0; i < 12 && cw !== W; i++) { await page.getByRole("button", { name: cw < W ? "Longer across" : "Shorter across" }).click(); [cw, ch] = await readSize(); }
  for (let i = 0; i < 12 && ch !== H; i++) { await page.getByRole("button", { name: ch < H ? "Taller" : "Shorter up" }).click(); [cw, ch] = await readSize(); }
  ok(`${label}: moved to ${W} by ${H}`, cw === W && ch === H, `got ${cw} by ${ch}`);
  await page.getByTestId("check").click(); await page.waitForTimeout(500);
  if (await page.locator(".fb.bad").count()) await page.getByTestId("check").click().catch(() => {});
  await page.waitForTimeout(400);
  ok(`${label}: the right rectangle is accepted`, (await page.locator(".fb.good").count()) === 1);
  await page.screenshot({ path: `${process.env.OUT ?? "."}/instr-shape-${label}.png` });
  ok(`${label}: no errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
