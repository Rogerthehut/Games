/**
 * "Complete the table" questions: the table is drawn with numbered blank boxes, there is one answer box for each, and typing the right numbers is marked right.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/table-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
import { tmpdir } from "node:os";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };

const p0 = newProfile("Maya", 5, Date.now() - 86_400_000 * 5); p0.toured = true; p0.skillsView = "list";
const browser = await chromium.launch();
for (const [label, w, h] of [["desktop", 1280, 900], ["phone", 390, 800]] as const) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* private mode */ } }, JSON.stringify({ version: 1, profiles: [p0], activeId: p0.id }));
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  const errors: string[] = []; page.on("pageerror", (e: Error) => errors.push(e.message));
  await page.goto(B); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {});
  await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
  await page.locator("[data-testid=nav-skills]:visible").first().click(); await page.waitForTimeout(500);
  const row = page.locator("#skill-complete-table"); await row.scrollIntoViewIfNeeded(); await row.getByRole("button", { name: "Practise" }).click(); await page.waitForTimeout(600);
  if (await page.getByTestId("intro-skip").count()) await page.getByTestId("intro-skip").click();
  await page.waitForTimeout(300);

  const boxes = page.locator(".table-figure td.table-blank span");
  ok(`${label}: the table shows numbered blank boxes`, (await boxes.count()) >= 2, String(await boxes.count()));
  const inputs = page.locator(".fields input");
  ok(`${label}: one answer box for each blank`, (await inputs.count()) === (await boxes.count()), `${await inputs.count()} vs ${await boxes.count()}`);
  ok(`${label}: the answer boxes are labelled Box 1, Box 2…`, /Box 1 =/.test(await page.locator(".fields").innerText()));
  // work the answers out from the table itself: level 1 is a row that goes up by the same number for each pack
  const info = await page.evaluate(() => {
    const head = [...document.querySelectorAll(".table-figure thead th")].map((h) => (h as HTMLElement).innerText.trim());
    const cells = [...document.querySelectorAll(".table-figure tbody tr:first-child td")].slice(1).map((c) => ({ blank: c.classList.contains("table-blank"), text: (c as HTMLElement).innerText.trim() }));
    return { head: head.slice(1).map(Number), cells };
  });
  const k = info.cells.findIndex((c) => !c.blank), per = Number(info.cells[k].text) / info.head[k];       // how many for each pack
  const answers = info.cells.map((c, i) => ({ c, n: info.head[i] })).filter((x) => x.c.blank).map((x) => String(per * x.n));
  const count = await inputs.count();
  for (let i = 0; i < count; i++) { await inputs.nth(i).click(); await page.keyboard.type(answers[i]); }
  await page.screenshot({ path: `${process.env.OUT ?? tmpdir()}/table-${label}.png` });
  await page.getByTestId("check").click(); await page.waitForTimeout(500);
  ok(`${label}: the right numbers are marked right`, /Correct|Well done|Nice|Great|Yes|spot on|got it/i.test(await page.locator("body").innerText()), (await page.locator("body").innerText()).slice(0, 200));
  ok(`${label}: no sideways scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${label}: no script errors`, errors.length === 0, errors.join("; "));
  await ctx.close();
}
await browser.close(); process.exit(failed ? 1 : 0);
