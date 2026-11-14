/**
 * Numbers to 100 for Year 1 and 2 learners: the hundred square, tens and ones (build, then read), and tracing two-digit numbers.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/little-numbers-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
import { tmpdir } from "node:os";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };
const kid = newProfile("Bo", 2, Date.now() - 86_400_000); kid.toured = true;
const br = await chromium.launch();
for (const [label, w, h] of [["phone", 390, 800], ["tablet", 834, 1194], ["desktop", 1280, 800]] as const) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: label !== "desktop", reducedMotion: "reduce" });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* */ } }, JSON.stringify({ version: 1, profiles: [kid], activeId: kid.id }));
  const p = await ctx.newPage(); p.setDefaultTimeout(6000); const errors: string[] = []; p.on("pageerror", (e: Error) => errors.push(e.message));
  await p.goto(B); await p.waitForTimeout(900);
  await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {}); await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  await p.getByTestId("open-little").click(); await p.waitForTimeout(400);
  // hundred square
  await p.getByTestId("little-open-hundred").click(); await p.waitForTimeout(500);
  ok(`${label}: the hundred square has 100 numbers`, (await p.locator("[data-testid^=sq-]").count()) === 100);
  for (let i = 0; i < 5; i++) { const n = (await p.locator(".little-prompt").innerText()).match(/\d+/)![0]; await p.getByTestId(`sq-${n}`).click(); await p.waitForTimeout(150); }
  await p.waitForTimeout(300);
  ok(`${label}: finding five numbers finishes the round`, await p.getByTestId("little-again").isVisible());
  await p.getByTestId("hundred-tens").click(); await p.waitForTimeout(300);
  for (let i = 0; i < 10; i++) { const n = (await p.locator(".little-prompt").innerText()).match(/\d+/)![0]; await p.getByTestId(`sq-${n}`).click(); await p.waitForTimeout(100); }
  ok(`${label}: counting in tens to 100 finishes`, await p.getByTestId("little-again").isVisible());
  if (label === "phone") await p.screenshot({ path: `${tmpdir()}/little-hundred.png` });
  await p.getByTestId("little-back").click(); await p.waitForTimeout(400);
  // tens and ones: build
  await p.getByTestId("little-open-tens").click(); await p.waitForTimeout(500);
  const target = Number((await p.locator(".little-prompt").innerText()).match(/\d+/)![0]);
  for (let i = 0; i < Math.floor(target / 10); i++) await p.getByTestId("add-ten").click();
  for (let i = 0; i < target % 10; i++) await p.getByTestId("add-one").click();
  await p.waitForTimeout(300);
  ok(`${label}: building ${target} from tens and ones finishes the round`, await p.getByTestId("little-again").isVisible());
  if (label === "phone") await p.screenshot({ path: `${tmpdir()}/little-tens.png` });
  // read the rods and cubes
  await p.getByTestId("little-again").click(); await p.waitForTimeout(400);
  const t2 = await p.locator("[data-testid=tens-col] .little-rod").count(), o2 = await p.locator("[data-testid=ones-col] .little-cube").count();
  await p.getByTestId(`opt-${t2 * 10 + o2}`).click(); await p.waitForTimeout(300);
  ok(`${label}: reading ${t2} tens and ${o2} ones as ${t2 * 10 + o2} is right`, await p.getByTestId("little-again").isVisible());
  // snap: turn every card, calling SNAP on each match
  await p.getByTestId("little-back").click(); await p.waitForTimeout(400);
  await p.getByTestId("little-open-snap").click(); await p.waitForTimeout(500);
  let calls = 0;
  for (let g = 0; g < 14; g++) {
    await p.getByTestId("snap-turn").click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(120);
    if (await p.locator(".snap-now.match").count()) { await p.getByTestId("snap-call").click(); calls++; await p.waitForTimeout(120); }
  }
  await p.waitForTimeout(1200);
  ok(`${label}: snap: all fourteen cards turned and ${calls} snaps called finishes the round`, calls === 4 && (await p.getByTestId("little-again").isVisible()), `calls ${calls}`);
  await p.getByTestId("little-back").click(); await p.waitForTimeout(300);
  ok(`${label}: no sideways scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${label}: no script errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await br.close(); process.exit(failed ? 1 : 0);
