/**
 * Screen-size audit. Opens the key screens at phone, tablet and desktop sizes (portrait and landscape where it matters) and checks for
 * the layout problems that are easy to miss: sideways scrolling, content pushed off the screen, clipped text, tiny tap targets, tiny
 * text, and a main button that is hidden or covered.
 *
 *   VITE_ALLOW_LOCAL_ONLY=1 npm run build && npx vite preview --port 4173 &
 *   npx tsx scripts/seed-profile.ts > /tmp/store.json         # a learner who already has a plan
 *   PLAYWRIGHT_MODULE=/path/to/playwright/index.js node scripts/screen-audit.mjs --store /tmp/store.json --out /tmp/audit
 *

 * Options:  --only=screen1,screen2   --sizes=phone,tablet,desktop   --names=phone-390x844,desktop-1440x900   --shots   (save a screenshot for every screen and size)
 * It prints a summary and writes report.json. A clean run prints "0 problems". The checks are heuristics: read what they flag.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes("=") ? hit.split("=").slice(1).join("=") : process.argv[process.argv.indexOf(hit) + 1] ?? true;
};
const base = arg("base", "http://localhost:4173");
const out = arg("out", "./screen-audit");
const storeFile = arg("store", "");
const only = arg("only", "")?.split(",").filter(Boolean) ?? [];
const wantSizes = arg("sizes", "phone,tablet,desktop").split(",");
const shots = process.argv.includes("--shots");
const wantNames = arg("names", "")?.split(",").filter(Boolean) ?? [];
mkdirSync(out, { recursive: true });
const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const store = storeFile ? readFileSync(storeFile, "utf8") : "";

/** [name, width, height, kind]. kind: touch phones and tablets, or mouse desktops. */
const SIZES = [
  ["phone-280x653", 280, 653, "phone"], ["phone-320x568", 320, 568, "phone"], ["phone-360x640", 360, 640, "phone"], ["phone-375x667", 375, 667, "phone"],
  ["phone-390x844", 390, 844, "phone"], ["phone-430x932", 430, 932, "phone"],
  ["phone-land-667x375", 667, 375, "phone"], ["phone-land-844x390", 844, 390, "phone"],
  ["tablet-768x1024", 768, 1024, "tablet"], ["tablet-834x1194", 834, 1194, "tablet"], ["tablet-1024x1366", 1024, 1366, "tablet"],
  ["tablet-land-1024x768", 1024, 768, "tablet"], ["tablet-land-1180x820", 1180, 820, "tablet"], ["tablet-land-1366x1024", 1366, 1024, "tablet"],
  ["desktop-1280x720", 1280, 720, "desktop"], ["desktop-1440x900", 1440, 900, "desktop"], ["desktop-1920x1080", 1920, 1080, "desktop"], ["desktop-2560x1080", 2560, 1080, "desktop"],
].filter(([name, , , kind]) => wantSizes.includes(kind) && (!wantNames.length || wantNames.includes(name)));

const wait = (p, ms = 500) => p.waitForTimeout(ms);
const click = async (p, id) => { await p.getByTestId(id).first().click(); await wait(p, 400); };
const navTab = async (p, tab) => {
  const tabLoc = p.locator(`[data-testid=nav-${tab}]:visible`).first();
  if (await tabLoc.count()) await tabLoc.click(); else await p.getByRole("link", { name: new RegExp(`^${tab}$`, "i") }).first().click();
  await wait(p, 700);
};
// the 11+ reasoning card was removed from the map; reach the same list through the list view and the topic filter
const reasoningList = async (p) => {
  await navTab(p, "skills");
  await p.getByRole("button", { name: /^(Show as a list|List)$/ }).first().click().catch(() => {});
  for (const box of await p.getByRole("combobox").all()) { if (await box.selectOption({ label: "Reasoning (11+)" }).then(() => true, () => false)) break; }
};
const practiseSkill = async (p, id) => { await p.locator(`#skill-${id} button:has-text("Practise")`).click(); await wait(p, 600); };
const openQuestion = async (p) => { await p.getByTestId("intro-skip").click().catch(() => {}); await wait(p, 500); };

/** Each screen: a name and the steps to reach it from the learner's home. `fresh` screens need an empty browser. */
const SCREENS = [
  { name: "onboarding-name", fresh: true, go: async () => {} },
  { name: "onboarding-year", fresh: true, go: async (p) => { await p.fill("input", "Maya"); await click(p, "name-next"); } },
  { name: "today", go: async () => {} },
  { name: "skills-map", go: async (p) => { await navTab(p, "skills"); await wait(p, 600); } },
  { name: "skills-list", go: async (p) => { await reasoningList(p); await wait(p, 400); } },
  { name: "plan", go: async (p) => { await navTab(p, "plan"); } },
  { name: "plan-form", go: async (p) => { await navTab(p, "plan"); await click(p, "edit-plan").catch(() => {}); } },
  { name: "me", go: async (p) => { await navTab(p, "me").catch(async () => { await p.getByRole("button", { name: /Maya/ }).first().click(); await wait(p, 600); }); } },
  { name: "practice-intro", go: async (p) => { await click(p, "start-practice"); } },
  { name: "practice-number", go: async (p) => { await click(p, "start-practice"); await openQuestion(p); } },
  { name: "practice-fraction", go: async (p) => { await navTab(p, "skills"); await p.getByRole("button", { name: /^(Show as a list|List)$/ }).first().click().catch(() => {}); await wait(p, 300); await p.getByRole("combobox").nth(1).selectOption("Number").catch(() => {}); await practiseSkill(p, "frac-add"); await openQuestion(p); } },
  { name: "practice-choice-words", go: async (p) => { await reasoningList(p); await practiseSkill(p, "vr-odd-word"); await openQuestion(p); } },
  { name: "practice-choice-pictures", go: async (p) => { await reasoningList(p); await practiseSkill(p, "nvr-series"); await openQuestion(p); } },
  { name: "practice-grid", go: async (p) => { await reasoningList(p); await practiseSkill(p, "nvr-matrix"); await openQuestion(p); } },
  { name: "practice-working-lines", go: async (p) => { await reasoningList(p); await practiseSkill(p, "ps-find-error"); await openQuestion(p); } },
  { name: "practice-wrong-feedback", go: async (p) => { await reasoningList(p); await practiseSkill(p, "nvr-series"); await openQuestion(p); await click(p, "choice-0"); await click(p, "check"); } },
  { name: "mock-intro", go: async (p) => { await navTab(p, "plan"); await click(p, "take-mock"); } },
  { name: "mock-question", go: async (p) => { await navTab(p, "plan"); await click(p, "take-mock"); await click(p, "paper-maths"); await click(p, "mock-start"); } },
  { name: "mock-reasoning-question", go: async (p) => { await navTab(p, "plan"); await click(p, "take-mock"); await click(p, "paper-reasoning"); await click(p, "mock-start"); } },
  { name: "mock-result", go: async (p) => {
    await navTab(p, "plan"); await click(p, "take-mock"); await click(p, "paper-both"); await click(p, "mock-start");
    for (let i = 0; i < 40 && !(await p.getByText("Practice paper result").count()); i++) {
      if (await p.getByTestId("choice-0").count()) await p.getByTestId("choice-0").click();
      else { const inp = p.locator("input:visible").first(); if (await inp.count()) await inp.fill("1"); }
      await p.getByTestId("next").click(); await wait(p, 80);
    }
    await wait(p, 500);
  } },
  { name: "checkup-question", go: async (p) => { await navTab(p, "plan"); await click(p, "start-checkup").catch(() => {}); await click(p, "checkup-start").catch(() => {}); await wait(p, 500); } },
  { name: "parent-guide-test-finder", fresh: true, path: "/11-plus-maths.html", go: async (p) => { await p.locator("#test-finder").scrollIntoViewIfNeeded(); await wait(p, 300); } },
  { name: "parent-guide-test-finder-search", fresh: true, path: "/11-plus-maths.html", go: async (p) => { await p.locator("#test-finder").scrollIntoViewIfNeeded(); await p.fill("#test-finder-query", "kent"); await wait(p, 300); } },
  { name: "study-guide", fresh: true, path: "/learn/pascals-triangle.html", go: async (p) => { await wait(p, 300); } },
  { name: "study-guide-index", fresh: true, path: "/learn/index.html", go: async (p) => { await wait(p, 300); } },
  { name: "tables-hub", go: async (p) => { await click(p, "start-tables"); } },
  { name: "tables-learn", go: async (p) => { await click(p, "start-tables"); await click(p, "tables-learn"); await p.getByRole("button", { name: "Cover the answers" }).click(); await wait(p, 300); } },
  { name: "tables-round", go: async (p) => { await click(p, "start-tables"); await click(p, "tables-practise"); await wait(p, 400); } },
  { name: "tables-round-wrong", go: async (p) => { await click(p, "start-tables"); await click(p, "tables-practise"); await p.keyboard.press("0"); await p.keyboard.press("0"); await p.keyboard.press("0"); await wait(p, 400); } },
  { name: "tables-check", go: async (p) => { await click(p, "start-tables"); await click(p, "tables-check"); await wait(p, 400); } },
  { name: "tables-summary", go: async (p) => {
    await click(p, "start-tables"); await click(p, "tables-practise");
    for (let i = 0; i < 12; i++) {
      const t = await p.getByTestId("tables-question").innerText().catch(() => "");
      const m = t.match(/(\d+)\s*([×÷])\s*(\d+)?/); if (!m) break;
      const n = m[2] === "×" ? +m[1] * +m[3] : +m[1] / +(t.match(/÷\s*(\d+)/)?.[1] ?? 1) ;
      const ans = m[2] === "×" ? n : +m[1] / +t.match(/÷\s*(\d+)/)[1];
      await p.keyboard.type(String(ans)); await wait(p, 600);
    }
    await wait(p, 500);
  } },
].filter((s) => !only.length || only.includes(s.name));

/** Runs in the page. Returns the problems it can see right now. */
const AUDIT = ({ kind }) => {
  const vw = innerWidth, vh = innerHeight;
  const issues = [];
  const label = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.dataset?.testid ? `[${el.dataset.testid}]` : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  const insideScroller = (el) => { let c = el.parentElement; while (c && c !== document.body) { const s = getComputedStyle(c); if (/(auto|scroll|hidden|clip)/.test(s.overflowX) && c.scrollWidth <= c.clientWidth + 1 === false) return true; if (/(auto|scroll)/.test(s.overflowX)) return true; c = c.parentElement; } return false; };

  // 1. the page scrolls sideways
  const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (docW > vw + 1) issues.push({ type: "sideways-scroll", detail: `page is ${docW}px wide in a ${vw}px window` });

  // 2. things that stick out past the right or left edge
  const stick = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 2 || r.left < -2) && !insideScroller(el) && getComputedStyle(el).position !== "fixed") {
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      stick.push(`${label(el)} (${Math.round(r.left)}..${Math.round(r.right)})`);
    }
  }
  if (stick.length) issues.push({ type: "off-screen", detail: stick.slice(0, 4).join("; ") + (stick.length > 4 ? ` +${stick.length - 4} more` : "") });

  // 3. text clipped by its own box (not scrollers, not deliberate ellipsis)
  const clipped = [];
  for (const el of document.querySelectorAll("button, a, label, h1, h2, h3, p, span, li, summary, small, strong")) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    if (s.display === "inline" || el.classList.contains("sr") || el.classList.contains("activity-card")) continue; // visually hidden text, and tiles whose decorative circle runs off the edge on purpose // visually hidden text is meant to be clipped
    if (/(hidden|clip)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 2 && s.textOverflow !== "ellipsis" && el.textContent.trim()) clipped.push(`${label(el)} "${el.textContent.trim().slice(0, 24)}"`);
  }
  if (clipped.length) issues.push({ type: "clipped-text", detail: clipped.slice(0, 4).join("; ") });

  // 4. small tap targets (touch devices) and small text
  const small = [], tiny = [];
  for (const el of document.querySelectorAll("button, [role=button], [role=radio], input:not([type=hidden]), select, summary, a")) {
    if (!visible(el) || el.closest("[hidden]")) continue;
    const r = el.getBoundingClientRect();
    if (kind !== "desktop" && el.tagName !== "A" && (r.width < 40 || r.height < 40) && !(el.type === "radio" || el.type === "checkbox") ) small.push(`${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (kind !== "desktop" && el.tagName === "A" && r.height < 24) small.push(`${label(el)} ${Math.round(r.width)}x${Math.round(r.height)} (link)`);
  }
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || !el.childNodes.length) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs > 0 && fs < 11.5 && !el.closest("svg") && !el.closest(".mtight")) tiny.push(`${label(el)} ${fs}px "${el.textContent.trim().slice(0, 18)}"`);
  }
  if (small.length) issues.push({ type: "small-target", detail: small.slice(0, 5).join("; ") + (small.length > 5 ? ` +${small.length - 5} more` : "") });
  if (tiny.length) issues.push({ type: "tiny-text", detail: tiny.slice(0, 3).join("; ") });

  // 5. the main action is hidden, off screen, or covered
  const main = ["check", "next", "mock-start", "intro-next", "intro-try", "name-next", "year-go", "build-plan-go"].map((id) => document.querySelector(`[data-testid=${id}]`)).filter((el) => el && visible(el));
  for (const el of main) {
    el.scrollIntoView({ block: "nearest" }); // a button lower down the page is fine if a child can scroll to it and nothing fixed covers it there
    const r = el.getBoundingClientRect();
    const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(vh - 1, Math.max(0, r.top + r.height / 2));
    const hit = document.elementFromPoint(cx, cy);
    const reachable = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && (el === hit || el.contains(hit) || (hit && hit.closest && hit.closest("button") === el));
    if (!reachable) issues.push({ type: "main-action-hidden", detail: `${label(el)} at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} (window ${vw}x${vh}), covered by ${hit ? label(hit) : "nothing"}` });
    else if (r.right > vw || r.left < 0) issues.push({ type: "main-action-clipped", detail: `${label(el)} spans ${Math.round(r.left)}..${Math.round(r.right)} in a ${vw}px window` });
  }

  // 6. a question screen with so little room for the question that it is unusable
  const body = document.querySelector(".qbody");
  const bar = document.querySelector(".qbar");
  const top = document.querySelector(".qtop");
  if (body && bar && top) {
    const room = bar.getBoundingClientRect().top - top.getBoundingClientRect().bottom;
    if (room < 140) issues.push({ type: "no-room", detail: `only ${Math.round(room)}px between the top bar and the bottom bar (window ${vw}x${vh})` });
  }

  // 7. the times tables keypad should be on screen without scrolling, or a child cannot answer
  const pad = document.querySelector(".tt-play .keypad");
  if (pad && visible(pad)) {
    scrollTo(0, 0); // judge it as the child first sees it, not after the page has scrolled to a tapped key
    const r = pad.getBoundingClientRect(), q = document.querySelector(".tt-prompt")?.getBoundingClientRect();
    if (r.bottom > vh + 1) issues.push({ type: "keypad-off-screen", detail: `keypad ends at ${Math.round(r.bottom)}px in a ${vh}px tall window` });
    if (q && q.bottom > vh) issues.push({ type: "question-off-screen", detail: `the question ends at ${Math.round(q.bottom)}px in a ${vh}px tall window` });
  }
  return issues;
};

const report = [];
const browser = await chromium.launch();
for (const [sizeName, width, height, kind] of SIZES) {
  const touch = kind !== "desktop";
  const ctxOptions = { viewport: { width, height }, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: kind === "phone" };
  for (const screen of SCREENS) {
    const context = await browser.newContext(ctxOptions);
    if (store && !screen.fresh) await context.addInitScript((s) => { try { if (!localStorage.getItem("mathpath.v1")) localStorage.setItem("mathpath.v1", s); } catch {} }, store);
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    let failed = "";
    try {
      await page.goto(base + (screen.path ?? "/"));
      await wait(page, 700);
      await page.getByRole("button", { name: /^Continue/ }).click({ timeout: 1500 }).catch(() => {}); // the "Hello" screen a returning learner sees first
      await page.getByRole("button", { name: "Got it" }).click({ timeout: 800 }).catch(() => {});
      await screen.go(page);
      await wait(page, 300);
    } catch (e) { failed = String(e.message).split("\n")[0].slice(0, 100); }
    let issues = [];
    if (!failed) {
      issues = await page.evaluate(AUDIT, { kind });
      if (shots) await page.screenshot({ path: `${out}/${screen.name}__${sizeName}.png` });
      if (issues.length || errors.length) await page.screenshot({ path: `${out}/PROBLEM__${screen.name}__${sizeName}.png` }).catch(() => {});
    } else await page.screenshot({ path: `${out}/COULD-NOT-REACH__${screen.name}__${sizeName}.png` }).catch(() => {});
    report.push({ size: sizeName, screen: screen.name, failed, errors, issues });
    await context.close();
  }
  const mine = report.filter((r) => r.size === sizeName);
  console.log(`${sizeName.padEnd(22)} ${mine.filter((r) => r.issues.length || r.errors.length || r.failed).length} of ${mine.length} screens flagged`);
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));

const flat = report.flatMap((r) => [...r.issues.map((i) => ({ ...i, screen: r.screen, size: r.size })), ...r.errors.map((e) => ({ type: "console-error", detail: e, screen: r.screen, size: r.size })), ...(r.failed ? [{ type: "could-not-reach", detail: r.failed, screen: r.screen, size: r.size }] : [])]);
const grouped = new Map();
for (const f of flat) { const k = `${f.type} | ${f.screen} | ${f.detail.replace(/\d+/g, "#")}`; const g = grouped.get(k) ?? { ...f, sizes: [] }; g.sizes.push(f.size); grouped.set(k, g); }
console.log(`\n${flat.length} problems in ${grouped.size} distinct groups\n`);
for (const g of [...grouped.values()].sort((a, b) => b.sizes.length - a.sizes.length)) console.log(`- [${g.type}] ${g.screen}: ${g.detail}\n    at ${g.sizes.length} size${g.sizes.length > 1 ? "s" : ""}: ${g.sizes.slice(0, 6).join(", ")}${g.sizes.length > 6 ? ", ..." : ""}`);
