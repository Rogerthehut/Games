/**
 * Little ones: a Nursery learner lands on the activities and each of the five can be played through with touch.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/little-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
import { tmpdir } from "node:os";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };
const kid = newProfile("Bo", 1, Date.now() - 86_400_000); kid.early = "nursery"; kid.toured = true;
const br = await chromium.launch();
for (const [label, w, h, touch] of [["phone", 390, 800, true], ["tablet", 834, 1194, true], ["desktop", 1280, 800, false]] as const) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: touch, reducedMotion: "reduce" });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* */ } }, JSON.stringify({ version: 1, profiles: [kid], activeId: kid.id }));
  const p = await ctx.newPage(); p.setDefaultTimeout(6000); const errors: string[] = []; p.on("pageerror", (e: Error) => errors.push(e.message));
  await p.goto(B); await p.waitForTimeout(900);
  await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {}); await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  ok(`${label}: Nursery lands on Little ones`, await p.getByTestId("little-open-count").isVisible());
  if (label === "phone") await p.screenshot({ path: `${tmpdir()}/little-hub.png` });
  // count
  await p.getByTestId("little-open-count").click(); await p.waitForTimeout(500);
  const things = await p.getByTestId("little-thing").count();
  for (let i = 0; i < things; i++) { await p.getByTestId("little-thing").nth(i).click(); await p.waitForTimeout(120); }
  await p.waitForTimeout(400);
  ok(`${label}: counting every one finishes the round`, await p.getByTestId("little-again").isVisible(), `things ${things}`);
  if (label === "phone") await p.screenshot({ path: `${tmpdir()}/little-count.png` });
  await p.getByTestId("little-back").click(); await p.waitForTimeout(400);
  // add / take away
  await p.getByTestId("little-open-add").click(); await p.waitForTimeout(500);
  for (let g = 0; g < 8 && (await p.getByTestId("little-move").count()); g++) { await p.getByTestId("little-move").first().click(); await p.waitForTimeout(150); }
  await p.waitForTimeout(300);
  ok(`${label}: sending ducks or eating biscuits finishes the sum`, await p.getByTestId("little-again").isVisible());
  if (label === "phone") await p.screenshot({ path: `${tmpdir()}/little-add.png` });
  await p.getByTestId("little-back").click(); await p.waitForTimeout(400);
  // shapes
  await p.getByTestId("little-open-shapes").click(); await p.waitForTimeout(500);
  for (let g = 0; g < 8; g++) {
    const shape = p.locator("[data-testid^=shape-]").first(); if (!(await shape.count())) break;
    const kind = (await shape.getAttribute("data-testid"))!.replace("shape-", "");
    const sb = (await shape.boundingBox())!, hb = (await p.getByTestId(`hole-${kind}`).boundingBox())!;
    await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.mouse.down(); await p.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(250);
  }
  ok(`${label}: every shape dragged to its hole finishes the round`, await p.getByTestId("little-again").isVisible());
  await p.getByTestId("little-back").click(); await p.waitForTimeout(400);
  // colour by number
  await p.getByTestId("little-open-colour").click(); await p.waitForTimeout(500);
  const cells = await p.evaluate(() => [...document.querySelectorAll("[data-testid^=region-]")].map((c) => ({ id: c.getAttribute("data-testid")!, n: Number(c.getAttribute("data-n")) })));
  for (const n of [...new Set(cells.map((c) => c.n))]) { await p.getByTestId(`swatch-${n}`).click(); for (const c of cells.filter((x) => x.n === n)) await p.getByTestId(c.id).dispatchEvent("pointerdown"); }
  await p.waitForTimeout(400);
  ok(`${label}: colouring every number finishes the picture`, await p.getByTestId("little-again").isVisible());
  if (label === "phone") await p.screenshot({ path: `${tmpdir()}/little-colour.png` });
  await p.getByTestId("little-back").click(); await p.waitForTimeout(400);
  // snap: turn every card, calling SNAP on each match
  await p.getByTestId("little-open-snap").click(); await p.waitForTimeout(500);
  let calls = 0;
  for (let g = 0; g < 14; g++) {
    await p.getByTestId("snap-turn").click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(120);
    if (await p.locator(".snap-now.match").count()) { await p.getByTestId("snap-call").click(); calls++; await p.waitForTimeout(120); }
  }
  await p.waitForTimeout(1200);
  ok(`${label}: snap: all fourteen cards turned and ${calls} snaps called finishes the round`, calls === 4 && (await p.getByTestId("little-again").isVisible()), `calls ${calls}`);
  await p.getByTestId("little-back").click(); await p.waitForTimeout(300);
  // trace: follow the guide path with the finger
  await p.getByTestId("little-open-trace").click(); await p.waitForTimeout(500);
  const path = await p.evaluate(() => { const g = document.querySelector(".trace-guide") as SVGPathElement, svg = document.querySelector("[data-testid=trace-pad]") as SVGSVGElement, r = svg.getBoundingClientRect(), len = g.getTotalLength(); const out: number[][] = []; for (let i = 0; i <= 60; i++) { const pt = g.getPointAtLength((len * i) / 60); out.push([r.left + (pt.x / 100) * r.width, r.top + (pt.y / 140) * r.height]); } return out; });
  await p.mouse.move(path[0][0], path[0][1]); await p.mouse.down(); for (const [x, y] of path) await p.mouse.move(x, y, { steps: 2 }); await p.mouse.up(); await p.waitForTimeout(400);
  ok(`${label}: tracing the number along its path finishes it`, await p.getByTestId("little-again").isVisible());
  if (label === "phone") await p.screenshot({ path: `${tmpdir()}/little-trace.png` });
  ok(`${label}: no sideways scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${label}: no script errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await br.close(); process.exit(failed ? 1 : 0);
