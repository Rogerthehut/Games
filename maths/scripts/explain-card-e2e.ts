/**
 * The landing page's "See how quarter explains tricky problems" card: present, plays, switches scene, pauses, no sideways scroll on phones, no script errors.
 *   VITE_FAKE_AUTH=1 npx vite --port 5173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/explain-card-e2e.ts
 */
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:5173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const b = await chromium.launch();
for (const [label, vp] of [["desktop", { width: 1280, height: 900 }], ["iPad", { width: 820, height: 1180 }], ["iPhone", { width: 390, height: 780 }]] as const) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); const errs: string[] = [];
  p.on("pageerror", (e: Error) => errs.push(e.message));
  await p.goto(base); await p.waitForTimeout(800);
  const card = p.getByTestId("explain-card"); await card.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  ok(`${label}: card present`, await card.isVisible());
  const first = await p.getByTestId("explain-caption").innerText();
  await p.waitForTimeout(1900);
  const second = await p.getByTestId("explain-caption").innerText();
  ok(`${label}: it plays on its own`, first !== second, `${first} -> ${second}`);
  await p.getByTestId("explain-pause").click(); const held = await p.getByTestId("explain-caption").innerText();
  await p.waitForTimeout(2200);
  ok(`${label}: pause freezes it`, held === (await p.getByTestId("explain-caption").innerText()));
  await p.getByTestId("explain-dot-fractions").click(); await p.waitForTimeout(200);
  ok(`${label}: dots switch scene`, /half/i.test(await p.getByTestId("explain-caption").innerText()));
  await card.screenshot({ path: `/tmp/claude-0/explain-${label}.png` });
  ok(`${label}: no sideways scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${label}: no script errors`, errs.length === 0, errs.join("; "));
  await ctx.close();
}
await b.close(); process.exit(failed ? 1 : 0);
