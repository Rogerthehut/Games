/**
 * What each age is offered: Nursery has Little ones only; Reception to Year 2 have no check-up or plan; Year 3 and up have everything.
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js npx tsx scripts/age-e2e.ts
 */
import { newProfile } from "../src/engine/progress";
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright"); const chromium = pw.chromium ?? pw.default.chromium;
const B = process.env.APP ?? "http://localhost:4173";
let failed = 0; const ok = (n: string, c: boolean, x = "") => { console.log(c ? "PASS" : "FAIL", n, c ? "" : x); if (!c) failed++; };
const mk = (year: number, early?: "nursery" | "reception") => { const p = newProfile("Bo", year, Date.now() - 86_400_000 * 3); if (early) p.early = early; p.toured = true; p.skillsView = "list"; return p; };
const br = await chromium.launch();
for (const [label, prof, offered] of [["nursery", mk(1, "nursery"), false], ["reception", mk(1, "reception"), false], ["year 2", mk(2), false], ["year 6", mk(6), true]] as const) {
  for (const [vw, w, h] of [["phone", 390, 800], ["desktop", 1280, 800]] as const) {
    const ctx = await br.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" });
    await ctx.addInitScript((s: string) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch { /* */ } }, JSON.stringify({ version: 1, profiles: [prof], activeId: prof.id }));
    const p = await ctx.newPage(); p.setDefaultTimeout(6000); const errors: string[] = []; p.on("pageerror", (e: Error) => errors.push(e.message));
    await p.goto(B); await p.waitForTimeout(900);
    await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 1200 }).catch(() => {}); await p.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
    const t = `${label} ${vw}`;
    ok(`${t}: Today ${offered ? "has" : "has no"} check-up and plan cards`, ((await p.getByTestId("start-checkup").count()) > 0) === offered);
    ok(`${t}: the tab bar or side menu ${offered ? "has" : "has no"} Plan`, ((await p.locator("[data-testid=nav-plan]:visible").count()) > 0) === offered);
    if (label === "nursery") ok(`${t}: Today is Little ones only`, (await p.getByTestId("little-open-count").isVisible()) && (await p.getByTestId("start-practice").count()) === 0);
    else ok(`${t}: practice and skills are still there`, (await p.getByTestId("start-practice").isVisible()));
    // an old link to the plan goes back to Today
    await p.goto(`${B}/?tab=plan`); await p.waitForTimeout(900);
    await p.getByRole("button", { name: /^Continue/ }).click({ timeout: 800 }).catch(() => {}); await p.getByRole("button", { name: "Got it" }).click({ timeout: 600 }).catch(() => {});
    ok(`${t}: a link to the plan ${offered ? "opens it" : "goes to Today instead"}`, offered ? (await p.locator("h1").first().innerText()).toLowerCase().includes("plan") || (await p.locator("[data-testid=nav-plan].on, .on[data-testid=nav-plan]").count()) > 0 : (await p.getByTestId("start-checkup").count()) === 0 && !(await p.locator("h1").first().innerText()).toLowerCase().includes("plan"));
    // Me
    await (async () => { if (vw === "phone") { await p.locator("[data-testid=top-me]:visible").first().click(); await p.getByTestId("rail-open-me").click(); } else { await p.getByTestId("rail-me").click(); await p.getByTestId("rail-open-me").click(); } })(); await p.waitForTimeout(500);
    const me = await p.locator(".me").innerText();
    ok(`${t}: Me ${offered ? "has" : "has no"} the check-up and plan rows`, /Take the check-up|Your check-up/.test(me) === offered && /Your plan/.test(me) === offered);
    if (label === "nursery") ok(`${t}: Me has no topic counts or Next up`, !/Topics secure|Next up/.test(me));
    // Skills
    await p.locator("[data-testid=nav-skills]:visible").first().click(); await p.waitForTimeout(600);
    const skills = await p.locator("#main").innerText();
    if (label === "nursery") ok(`${t}: Skills shows only Little ones`, /Little ones/.test(skills) && !/Key Stage 2|Place value/.test(skills));
    else ok(`${t}: Skills has the topics and Little ones`, /Key Stage 2/.test(skills) || /Place value/.test(skills));
    ok(`${t}: no script errors`, errors.length === 0, errors.join("; "));
    await ctx.close();
  }
}
await br.close(); process.exit(failed ? 1 : 0);
