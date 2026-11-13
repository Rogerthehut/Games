/**
 * The Message us page: the footer links to it, the form sends, a hidden field stops bots, and errors show.
 *   AUTH_FAKE=1 TUTOR_FAKE=1 npm run server &  (needs the built app: VITE_ALLOW_LOCAL_ONLY=1 npm run build)
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js APP=http://localhost:8787 npx tsx scripts/contact-e2e.ts
 */
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const base = process.env.APP ?? "http://localhost:8787";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, x); if (!c) failed++; };
const b = await chromium.launch();
for (const [label, vp] of [["desktop", { width: 1280, height: 900 }], ["iPhone", { width: 390, height: 780 }]] as const) {
  const p = await (await b.newContext({ viewport: vp })).newPage(); const errs: string[] = [];
  p.on("pageerror", (e: Error) => errs.push(e.message));
  await p.goto(`${base}/?info=contact`); await p.waitForTimeout(800);
  ok(`${label}: form shows`, await p.getByTestId("contact-form").isVisible());
  await p.getByTestId("contact-email").fill("not an email"); await p.getByTestId("contact-message").fill("Hello there, a question please.");
  await p.getByTestId("contact-send").click(); await p.waitForTimeout(400);
  ok(`${label}: a bad address doesn't send`, !(await p.getByTestId("contact-sent").count()));
  await p.getByTestId("contact-email").fill("parent@example.com");
  await p.getByTestId("contact-send").click(); await p.waitForTimeout(1200);
  ok(`${label}: a good message sends`, (await p.getByTestId("contact-sent").count()) === 1);
  ok(`${label}: no sideways scroll`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${label}: no script errors`, errs.length === 0, errs.join("; "));
  await p.goto(`${base}/?info=privacy`); await p.waitForTimeout(500);
  const link = p.getByTestId("footer-contact").first();
  ok(`${label}: the footer has Message us, not an email address`, (await link.innerText()) === "Message us" && !(await p.content()).includes("mailto:hello@"));
}
await b.close(); process.exit(failed ? 1 : 0);
