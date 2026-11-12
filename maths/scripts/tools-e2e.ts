/**
 * Checks the working-out tools: the right one opens first for the topic, and the column method, number line, hundred square,
 * fraction wall, straight-line pen, ruler and protractor all work.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/tools-e2e.ts
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
  const practise = async (id: string) => {
    await page.locator("[data-testid=nav-skills]:visible").first().click(); await page.waitForTimeout(500);
    const row = page.locator(`#skill-${id}`); await row.scrollIntoViewIfNeeded(); await row.getByRole("button", { name: "Practise" }).click(); await page.waitForTimeout(500);
    if (await page.getByTestId("intro-skip").count()) await page.getByTestId("intro-skip").click();
    await page.waitForTimeout(300);
  };
  const tools = () => page.getByRole("button", { name: /Working-out tools|^Tools$/ }).first();
  const pressed = async (name: string) => (await page.getByRole("button", { name: name }).first().getAttribute("aria-pressed")) === "true";

  await practise("add-sub");
  await tools().click(); await page.waitForTimeout(300);
  ok(`${label}: adding opens the column method first`, await pressed(/Column method/));
  const cell = page.getByLabel("First number, ones");
  await cell.fill("7"); await page.waitForTimeout(100);
  ok(`${label}: a digit goes in a column box`, (await cell.inputValue()) === "7");
  await page.getByRole("button", { name: /Subtract/ }).click();
  ok(`${label}: changing the method clears the sheet`, (await page.getByLabel("First number, ones").inputValue()) === "");

  await page.getByRole("button", { name: /Number line/ }).click();
  await page.getByRole("button", { name: "Forward 5", exact: true }).click(); await page.getByRole("button", { name: "Forward 2", exact: true }).click(); await page.getByRole("button", { name: "Back 1", exact: true }).click();
  ok(`${label}: jumping along the number line`, /You are on\s*6/.test(await page.locator(".number-line-tool .board-status").innerText()));
  await page.getByRole("button", { name: "Undo jump" }).click();
  ok(`${label}: undo goes back a jump`, /You are on\s*7/.test(await page.locator(".number-line-tool .board-status").innerText()));

  await page.getByRole("button", { name: /Hundred square/ }).click();
  await page.getByRole("button", { name: "Multiples of 5", exact: true }).click();
  ok(`${label}: multiples of 5 are coloured`, (await page.locator(".hundred-cell.on").count()) === 20);

  await page.getByRole("button", { name: /Fraction wall/ }).click();
  await page.getByRole("button", { name: "Part 1 of 2", exact: true }).click(); await page.getByRole("button", { name: "Part 1 of 4", exact: true }).click();
  ok(`${label}: fraction wall parts shade`, (await page.locator(".wall-part.on").count()) === 2);

  await page.getByRole("button", { name: /Work it out/ }).click();
  await page.getByRole("button", { name: "Ruler", exact: true }).click(); await page.getByRole("button", { name: "Protractor", exact: true }).click();
  ok(`${label}: a ruler and a protractor appear on the paper`, (await page.locator(".paper-instrument").count()) === 2);
  const rot = page.getByLabel("Turn the ruler"); await rot.fill("30");
  ok(`${label}: the ruler turns`, /30°/.test(await page.locator(".instrument-turn output").first().innerText()));
  await page.getByRole("button", { name: "Straight lines" }).click();
  const box = await page.locator("canvas.scrap-paper").boundingBox();
  await page.mouse.move(box.x + 40, box.y + 30); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 60, { steps: 6 }); await page.mouse.up();
  const painted = await page.evaluate(() => { const c = document.querySelector("canvas.scrap-paper") as HTMLCanvasElement; const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  ok(`${label}: a straight line is drawn`, painted > 200);
  await page.screenshot({ path: `${process.env.OUT ?? "."}/tools-${label}.png` });
  ok(`${label}: no errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
