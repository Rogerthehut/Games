/**
 * Checks the working-out tools: the right one opens first for the topic, and the column method, number line, hundred square,
 * fraction wall, straight-line pen, ruler and protractor all work.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/tools-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
import { tmpdir } from "node:os";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
const results: boolean[] = [];
const ok = (name: string, cond: boolean, extra = "") => { results.push(cond); console.log(cond ? "PASS" : "FAIL", name, cond ? "" : extra); };

const p0 = newProfile("Maya", 6, Date.now() - 86_400_000 * 5); p0.toured = true; p0.skillsView = "list";
const browser = await chromium.launch();
for (const [label, w, h] of [["desktop", 1280, 900], ["phone", 390, 800]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: label === "phone" });
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
  // Apple Pencil: once a pen has drawn, a finger or palm on the paper doesn't
  if (label === "phone") {
    await page.getByRole("button", { name: "Work it out" }).click(); await page.waitForTimeout(300);
    const cdp = await ctx.newCDPSession(page);
    await page.locator("canvas.scrap-paper").scrollIntoViewIfNeeded();
    const pb = await page.locator("canvas.scrap-paper").boundingBox();
    const ink = () => page.evaluate(() => { const c = document.querySelector("canvas.scrap-paper") as HTMLCanvasElement; const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
    const before = await ink();
    const x0 = pb.x + 60, y0 = pb.y + 40;
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0, y: y0 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: x0, y: y0, button: "left", pointerType: "pen", buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x0 + i * 12, y: y0 + i * 6, button: "left", pointerType: "pen", buttons: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x0 + 72, y: y0 + 36, button: "left", pointerType: "pen", clickCount: 1 });
    await page.waitForTimeout(400); // the paper redraws a moment after the last point
    const afterPen = await ink();
    ok(`${label}: the pencil draws`, afterPen > before + 100, `${before} -> ${afterPen}`);
    ok(`${label}: a "Pencil only" switch appears once a pencil has been used`, await page.getByTestId("pencil-only").isVisible());
    await page.locator("canvas.scrap-paper").scrollIntoViewIfNeeded();
    const pb2 = await page.locator("canvas.scrap-paper").boundingBox(); // the switch appeared above the paper and moved it
    const tx = pb2.x + 60, ty = pb2.y + 160;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tx, y: ty }] });
    for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: tx + i * 12, y: ty + i * 6 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(400);
    ok(`${label}: a finger or palm doesn't draw while "Pencil only" is on`, (await ink()) === afterPen, `${afterPen} -> ${await ink()}`);
    await page.getByTestId("pencil-only").uncheck();
    await page.locator("canvas.scrap-paper").scrollIntoViewIfNeeded();
    const pb3 = await page.locator("canvas.scrap-paper").boundingBox(); // unticking can scroll the page
    const ux = pb3.x + 60, uy = pb3.y + 160;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: ux, y: uy }] });
    for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: ux + i * 12, y: uy + i * 6 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(400);
    ok(`${label}: with it off, a finger draws again`, (await ink()) > afterPen + 100);
  }
  // graph paper and algebra tiles
  await page.getByRole("button", { name: /Graph paper/ }).click();
  const gp = page.getByTestId("graph-paper"); await gp.scrollIntoViewIfNeeded(); const gb = await gp.boundingBox();
  const at = (x: number, y: number) => ({ x: gb.x + gb.width * ((26 + (x + 10) * 24) / 532), y: gb.y + gb.height * ((26 + (10 - y) * 24) / 532) });
  for (const [x, y] of [[2, 3], [-4, 5], [0, -6]]) { const c = at(x, y); await page.mouse.click(c.x, c.y); }
  ok(`${label}: graph paper plots points at the crossings tapped`, /1: \(2, 3\)\s+2: \(-4, 5\)\s+3: \(0, -6\)/.test(await page.getByTestId("graph-points").innerText()), await page.getByTestId("graph-points").innerText());
  const c0 = at(2, 3); await page.mouse.click(c0.x, c0.y);
  ok(`${label}: tapping a point again removes it`, !/\(2, 3\)/.test(await page.getByTestId("graph-points").innerText()));
  await page.getByRole("button", { name: /Algebra tiles/ }).click();
  for (const id of ["tile-x2-plus", "tile-x2-plus", "tile-x-minus", "tile-one-plus", "tile-one-plus", "tile-one-plus"]) await page.getByTestId(id).click();
  ok(`${label}: algebra tiles read as an expression`, (await page.getByTestId("tiles-expression").innerText()).trim() === "2x² − x + 3", await page.getByTestId("tiles-expression").innerText());
  await page.screenshot({ path: `${process.env.OUT ?? tmpdir()}/tools-${label}.png` });
  ok(`${label}: no errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
