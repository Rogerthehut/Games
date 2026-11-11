import admissions from "../parents/admissions.json";
import { CONCEPTS } from "../concepts/library";
import { REASONING_SKILLS, SKILLS, STEM_SKILLS, STRANDS } from "../curriculum";
import { PAPERS } from "../engine/mock";
import type { Skill, Stage } from "../engine/types";

/**
 * The quarter curriculum booklet, built from the same data the app runs on, so it can never drift from what is really covered.
 * Each page is 794 by 1123 pixels (A4). The same pages are printed to the PDF and shown in the flip-through reader.
 */
export interface BookletPage { chapter: string; title: string; html: string; frame?: "none" | "normal" }

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** Strips the $…$ maths markers and symbols that do not print well, so blurbs read as plain text. */
const plain = (s: string) => esc(s.replace(/\$([^$]*)\$/g, "$1").replace(/\\(?:times|cdot)/g, "×").replace(/\\div/g, "÷").replace(/\\(?:frac)\{([^}]*)\}\{([^}]*)\}/g, "$1/$2").replace(/\\pi/g, "π").replace(/[{}\\]/g, ""));

const WORDMARK = `<span class="bk-wm">qua<svg viewBox="0 0 14 20"><path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z"/></svg>ter<sup>™</sup></span>`;
const CUBE = `<svg class="bk-cube" viewBox="0 0 96 96" aria-hidden="true"><rect x="3" y="3" width="90" height="90" rx="16" fill="#121522"/><rect x="15" y="15" width="30" height="30" rx="5" fill="#f5dc63"/><rect x="51" y="15" width="30" height="30" rx="5" fill="#f782a9"/><rect x="15" y="51" width="30" height="30" rx="5" fill="#8294e9"/><rect x="51" y="51" width="30" height="30" rx="5" fill="#4cc6a7"/></svg>`;

const STAGES: Stage[] = ["KS2", "KS3", "KS4", "KS5"];
const YEARS: Record<Stage, number[]> = { KS2: [3, 4, 5, 6], KS3: [7, 8, 9], KS4: [10, 11], KS5: [12, 13] };
const AGES: Record<Stage, string> = { KS2: "ages 7 to 11", KS3: "ages 11 to 14", KS4: "ages 14 to 16", KS5: "ages 16 to 18" };
const NAME: Record<Stage, string> = { KS2: "Key Stage 2", KS3: "Key Stage 3", KS4: "GCSE", KS5: "A-level" };
const OPENER_TONE: Record<Stage, string> = { KS2: "", KS3: "mint", KS4: "rose", KS5: "peri" };
const INTRO: Record<Stage, string> = {
  KS2: "The foundation. Number sense, the four operations, fractions, measures and shape, built up year by year with short practice, picture models and plenty of coming back to old ideas.",
  KS3: "Where arithmetic turns into algebra. Ratio and proportion, geometry, probability and the ideas GCSE rests on, with every method shown step by step.",
  KS4: "Foundation and Higher content: algebra, geometry and trigonometry, statistics and probability, and problem solving, with the methods taught before the exam wording.",
  KS5: "Pure maths, statistics and mechanics: calculus, sequences and series, proof, distributions and modelling, with accurate notation and justified answers.",
};
const strandRank = (s: Skill) => STRANDS.indexOf(s.strand);

/** A rough height for a topic row, so pages can be filled without text running off the bottom. */
function rowHeight(s: { name: string; blurb: string; talkAbout: string }) {
  const right = Math.ceil(plain(s.blurb).length / 84) * 18 + Math.ceil((plain(s.talkAbout).length + 5) / 92) * 16;
  const left = Math.ceil(s.name.length / 24) * 19 + 24;
  return 21 + Math.max(right, left);
}
function paginate<T>(items: T[], height: (t: T) => number, first: number, rest: number): T[][] {
  const pages: T[][] = [[]]; let used = 0, budget = first;
  for (const it of items) {
    const h = height(it) + 8;
    if (used + h > budget && pages[pages.length - 1].length) { pages.push([]); used = 0; budget = rest; }
    pages[pages.length - 1].push(it); used += h;
  }
  return pages;
}

const topicRow = (s: { name: string; blurb: string; talkAbout: string; strand?: string }) =>
  `<div class="bk-topic"><div><h3>${plain(s.name)}</h3>${s.strand ? `<span class="bk-chip ${esc(s.strand)}">${esc(s.strand === "Ratio" ? "Ratio and proportion" : s.strand === "STEM" ? "STEM" : s.strand)}</span>` : ""}</div><div><p>${plain(s.blurb)}</p><p class="ask">Ask: ${plain(s.talkAbout)}</p></div></div>`;

const page = (chapter: string, title: string, body: string, kicker = chapter, big?: string): BookletPage => ({
  chapter, title, frame: "normal",
  html: `<div class="bk-body">${big ?? `<div><p class="bk-kicker">${esc(kicker)}</p><h2>${esc(title)}</h2></div>`}${body}</div>`,
});
const cont = (chapter: string, title: string, body: string): BookletPage => ({ chapter, title, frame: "normal", html: `<div class="bk-body"><div><p class="bk-kicker">${esc(chapter)}</p><h3 style="font-size:24px">${esc(title)} <span class="bk-muted" style="font-size:15px;font-family:var(--bk-body);font-weight:700">(continued)</span></h3></div>${body}</div>` });

function topicPages(chapter: string, title: string, kicker: string, items: { name: string; blurb: string; talkAbout: string; strand?: string }[], intro = ""): BookletPage[] {
  const parts = paginate(items, rowHeight, 860 - (intro ? 50 : 0), 940);
  return parts.map((p, i) => {
    const body = `${i === 0 && intro ? `<p class="bk-lead" style="font-size:14.5px">${esc(intro)}</p>` : ""}<div class="bk-topics">${p.map(topicRow).join("")}</div>`;
    return i === 0 ? page(chapter, title, body, kicker) : cont(chapter, title, body);
  });
}

export function bookletPages(): BookletPage[] {
  const maths = SKILLS.filter((s) => s.strand !== "STEM");
  const byStage = (st: Stage) => maths.filter((s) => s.stage === st);
  const pages: BookletPage[] = [];

  // ---- cover
  pages.push({ chapter: "Cover", title: "Cover", frame: "none", html: `<div class="bk cover">
    ${CUBE}
    <div class="bk-note y"><b>Years 3 to 13</b><span>Maths from age 7 to A-level</span></div>
    <div class="bk-note m"><b>STEM lab</b><span>Code, data, AI and quantum ideas</span></div>
    <div class="bk-cover-title">${WORDMARK}<h1>The <em>curriculum</em></h1><p>Everything your child can learn on quarter, year by year, with questions to ask at home.</p>
      <div class="bk-tiles"><i style="background:#f5dc63"></i><i style="background:#f782a9"></i><i style="background:#8294e9"></i><i style="background:#4cc6a7"></i></div></div>
    <div class="bk-cover-foot"><span>A reference for parents and carers</span><span>quarter™ is a trading name of Wristed Ltd</span></div></div>` });

  // ---- welcome
  pages.push(page("Welcome", "Welcome", `
    <p class="bk-lead">This booklet is a map of everything quarter covers, so you can see where your child is, what comes next and how to help at home.</p>
    <div class="bk-cols">
      <div class="bk-card gold"><h3>How to use it</h3><ul class="bk-list"><li>Find your child's school year in the chapters that follow.</li><li>Read what each topic covers, in plain words.</li><li>Use the “Ask” question beside a topic to start a conversation about it.</li></ul></div>
      <div class="bk-card mint"><h3>What you'll find</h3><ul class="bk-list"><li>Maths from Year 3 to A-level, topic by topic.</li><li>The 11+ strand and practice papers.</li><li>The STEM lab: computing, data, AI and quantum ideas.</li><li>The study library, tools and the parents' area.</li></ul></div>
    </div>
    <div class="bk-callout">Short, regular practice beats long sessions. Ten minutes most days is plenty.</div>
    <div class="bk-card"><h3>The idea behind quarter</h3><p>Every question works out its own answer, so hints, worked steps and feedback always match the question. Topics come back later, a little at a time, so what's learned stays learned. Children are never rushed on normal practice, and the only timed activity is the clearly labelled 11+ practice paper.</p></div>`, "Welcome"));

  // ---- how it works (the contents page is slotted in after this)
  pages.push(page("How quarter works", "How quarter works", `
    <ol class="bk-steps">
      <li><div><strong>A short check-up finds the starting point</strong>About 24 questions that adapt to your child, so the first plan fits them, not just their school year.</div></li>
      <li><div><strong>A weekly plan keeps things steady</strong>Each week focuses on a few topics, with review of earlier ones mixed in.</div></li>
      <li><div><strong>Practice is short and kind</strong>A hint is always there, “Show the steps” explains a worked answer, and an optional AI tutor can talk a problem through without giving the answer away.</div></li>
      <li><div><strong>Working-out tools help on paper and on screen</strong>Counters, number lines, grids and method sheets are a tap away, and the keyboard works everywhere.</div></li>
      <li><div><strong>Topics return at the right moment</strong>Anything that was tricky comes back sooner. Anything secure comes back later.</div></li>
      <li><div><strong>You see the progress</strong>The parents' area shows what's secure, what needs attention, and a progress report you can print or save for any dates you choose.</div></li>
    </ol>
    <div class="bk-cols">
      <div class="bk-card rose"><h3>What the status words mean</h3><ul class="bk-list"><li><b>New</b>: not tried yet.</li><li><b>Learning</b>: being worked on.</li><li><b>Getting there</b>: mostly right, still wobbly.</li><li><b>Got it</b>: secure, and brought back later to stay that way.</li></ul></div>
      <div class="bk-card peri"><h3>Where it works</h3><p>In any modern browser on phones, tablets and computers. Progress is saved to your account, so a child can carry on from any device.</p></div>
    </div>`, "Using quarter"));

  // ---- at a glance
  pages.push(page("At a glance", "At a glance", `
    <div class="bk-stats">
      <div class="bk-stat" style="background:var(--bk-gold)"><b>${maths.length}</b><span>maths topics</span></div>
      <div class="bk-stat" style="background:var(--bk-rose)"><b>${REASONING_SKILLS.length}</b><span>11+ reasoning topics</span></div>
      <div class="bk-stat" style="background:var(--bk-mint)"><b>${STEM_SKILLS.length}</b><span>STEM lab topics</span></div>
      <div class="bk-stat" style="background:var(--bk-peri)"><b>${CONCEPTS.length}</b><span>illustrated study guides</span></div>
    </div>
    <div class="bk-cols">
      ${STAGES.map((st) => `<div class="bk-card ${["gold", "mint", "rose", "peri"][STAGES.indexOf(st)]}"><h3>${NAME[st]}</h3><p class="bk-muted" style="margin-bottom:6px">Years ${YEARS[st][0]} to ${YEARS[st][YEARS[st].length - 1]}, ${AGES[st]}</p><p><b>${byStage(st).length}</b> topics</p><p class="bk-small" style="margin-top:6px">${[...new Set(byStage(st).sort((a, b) => strandRank(a) - strandRank(b)).map((s) => s.strand === "Ratio" ? "Ratio and proportion" : s.strand))].join(" · ")}</p></div>`).join("")}
    </div>
    <div class="bk-card"><h3>Also included</h3><ul class="bk-list"><li>Times tables revision with an optional timed check.</li><li>11+ practice papers and a finder for local test details, covering ${admissions.length} areas.</li><li>An AI tutor for children and an assistant for parents, both optional.</li><li>Money topics from Year 3, with real-life contexts.</li><li>Read-aloud, sound and motion controls, and light, dark or automatic themes.</li></ul></div>`, "The whole picture"));

  // ---- the stages
  for (const st of STAGES) {
    const yrs = YEARS[st], strands = [...new Set(byStage(st).sort((a, b) => strandRank(a) - strandRank(b)).map((s) => s.strand))];
    pages.push({ chapter: NAME[st], title: NAME[st], frame: "none", html: `<div class="bk opener ${OPENER_TONE[st]}"><div class="bk-opener">
      <p class="bk-kicker">Years ${yrs[0]} to ${yrs[yrs.length - 1]} · ${AGES[st]}</p><div class="big">${st === "KS2" ? "KS2" : st === "KS3" ? "KS3" : st === "KS4" ? "GCSE" : "A"}</div><h2>${NAME[st]}</h2><p class="bk-lead">${esc(INTRO[st])}</p>
      <div class="bk-strands">${strands.map((s) => `<span class="bk-chip ${s}" style="font-size:13px;padding:3px 12px">${s === "Ratio" ? "Ratio and proportion" : s}</span>`).join("")}</div>
      <div class="bk-year-dots">${yrs.map((y) => `<i class="on">${y}</i>`).join("")}</div></div></div>` });
    for (const y of yrs) {
      const items = byStage(st).filter((s) => s.year === y).sort((a, b) => strandRank(a) - strandRank(b) || a.name.localeCompare(b.name));
      if (!items.length) continue;
      pages.push(...topicPages(NAME[st], `Year ${y}`, `${NAME[st]} · ${AGES[st].replace("ages ", "age ")}`, items.map((s) => ({ name: s.name, blurb: s.blurb, talkAbout: s.talkAbout, strand: s.strand })),
        `${items.length} topics first taught in Year ${y}. Earlier topics keep coming back in review.`));
    }
  }

  // ---- the 11+
  pages.push({ chapter: "The 11+", title: "The 11+", frame: "none", html: `<div class="bk opener rose"><div class="bk-opener"><p class="bk-kicker">Years 4 to 6</p><div class="big">11+</div><h2>Preparing for selective schools</h2><p class="bk-lead">Maths topics at the right level, verbal and non-verbal reasoning, problem solving, practice papers and a finder for what your local test involves.</p></div></div>` });
  pages.push(page("The 11+", "What's in the 11+ strand", `
    <div class="bk-cols3">
      <div class="bk-card rose"><h3>Verbal reasoning</h3><p>Word and letter patterns, codes, analogies, odd words out and hidden words.</p></div>
      <div class="bk-card peri"><h3>Non-verbal reasoning</h3><p>Shapes and pictures: series, matrices, reflections, rotations and odd one out.</p></div>
      <div class="bk-card mint"><h3>Problem solving</h3><p>Logic puzzles, finding the error, combinations and “always, sometimes, never” reasoning.</p></div>
    </div>
    <div class="bk-card gold"><h3>Practice papers</h3><div class="bk-cols3" style="margin-top:6px">${(["maths", "reasoning", "both"] as const).map((k) => `<div><b>${esc(PAPERS[k].title)}</b><p class="bk-muted">${esc(PAPERS[k].blurb)}</p></div>`).join("")}</div><p style="margin-top:8px">Papers are timed, with no hints, and marks are shown at the end with the topics to revisit. They're the one place quarter uses a countdown.</p></div>
    <div class="bk-card"><h3>Local test finder</h3><p>Tests differ between areas and schools. The finder in the parents' guides covers ${admissions.length} areas of England and Northern Ireland: search by postcode, area or school, see what's known about each test and follow the links to the official admissions pages.</p></div>
    <div class="bk-callout">Start early and keep it light. Twenty minutes a few times a week beats a last-minute rush.</div>`, "Selective school preparation"));
  const reasoning = REASONING_SKILLS.map((s) => ({ name: s.name, blurb: s.blurb, talkAbout: s.talkAbout, strand: "Reasoning", id: s.id }));
  const sections: [string, string][] = [["vr-", "Verbal reasoning"], ["nvr-", "Non-verbal reasoning"], ["ps-", "Problem solving"]];
  for (const [prefix, label] of sections) pages.push(...topicPages("The 11+", label, "The 11+", reasoning.filter((r) => r.id.startsWith(prefix))));

  // ---- the STEM lab
  pages.push({ chapter: "The STEM lab", title: "The STEM lab", frame: "none", html: `<div class="bk opener mint"><div class="bk-opener"><p class="bk-kicker">Years 3 to 13</p><div class="big">STEM</div><h2>The STEM lab</h2><p class="bk-lead">Computing, data science, AI and machine learning, and the ideas of quantum physics, with topics for every age and hands-on labs to build and try.</p></div></div>` });
  pages.push(page("The STEM lab", "How the STEM lab works", `
    <p class="bk-lead">The lab sits next to the maths activities, with its own sticky note on Today. It has its own topics and progress, separate from the maths plan, so children can explore for the fun of it.</p>
    <div class="bk-theme" style="background:var(--bk-peri)"><h3>Computing</h3><p>Precise instructions, loops, sorting and searching, binary and hexadecimal, tracing code, logic, storage and secret codes.</p></div>
    <div class="bk-theme" style="background:var(--bk-gold)"><h3>Data science</h3><p>Reading survey data, spotting outliers and checking whether data is fair.</p></div>
    <div class="bk-theme" style="background:var(--bk-rose)"><h3>AI and machine learning</h3><p>Learning from examples, bias in data, nearest neighbour, a tiny artificial neuron, accuracy, spam filters, gradient descent and a neural network layer.</p></div>
    <div class="bk-theme" style="background:var(--bk-mint)"><h3>Quantum ideas</h3><p>Packets of energy, qubits and probability, how many states qubits hold, and the X and H gates.</p></div>
    <div class="bk-card"><h3>Build it labs</h3><div class="bk-cols"><p><b>Binary lamps.</b> Switch lamps on and off to build numbers.</p><p><b>Program the robot.</b> Queue up instructions to reach the star.</p><p><b>Teach a machine.</b> Place dots and see how a nearest-neighbour model decides.</p><p><b>Qubit playground.</b> Try the X and H gates and measure the qubit.</p></div></div>`, "Beyond maths"));
  for (const st of STAGES) {
    const items = STEM_SKILLS.filter((s) => s.stage === st).sort((a, b) => a.year - b.year || a.name.localeCompare(b.name));
    if (items.length) pages.push(...topicPages("The STEM lab", `${NAME[st]} STEM topics`, `The STEM lab · Years ${YEARS[st][0]} to ${YEARS[st][YEARS[st].length - 1]}`, items.map((s) => ({ name: s.name, blurb: s.blurb, talkAbout: s.talkAbout, strand: "STEM" }))));
  }

  // ---- tools
  pages.push(page("Tools and extras", "Tools and extras", `
    <div class="bk-cols">
      <div class="bk-card gold"><h3>Times tables</h3><p>A grid that fills in as facts become quick, short rounds that lean on the tricky ones, and an optional timed check. It has its own sticky note on Today.</p></div>
      <div class="bk-card mint"><h3>Working-out tools</h3><p>Counters, number lines, grids, abacus and bean-counting tools, and method sheets, beside every question.</p></div>
      <div class="bk-card rose"><h3>The AI tutor</h3><p>An optional chat that helps a child think a problem through without handing over the answer. Switch it on or off in the parents' area. Chats stay on the device.</p></div>
      <div class="bk-card peri"><h3>The parents' assistant</h3><p>Ask how to explain a topic, what to practise next or how to help at home, in plain language.</p></div>
      <div class="bk-card"><h3>Progress report</h3><p>Choose any dates with a calendar picker, then print or save what was practised, what's secure and what needs attention.</p></div>
      <div class="bk-card"><h3>Look and feel</h3><p>Light, dark or automatic themes, read-aloud, sound effects you can switch off, reduced motion, and a layout that fits phones, tablets and computers.</p></div>
    </div>
    <div class="bk-card"><h3>The grown-ups' area</h3><p>Protected by a quick maths question and an optional PIN. It holds progress, settings, the tutor switch, feedback and your subscription, and lets you export or delete everything saved under your account.</p></div>`, "Around the questions"));

  // ---- study library
  const lib = [...CONCEPTS].sort((a, b) => a.title.localeCompare(b.title));
  const libPages = paginate(lib, () => 54, 760, 880);
  libPages.forEach((chunk, i) => {
    const body = `${i === 0 ? `<p class="bk-lead" style="font-size:14.5px">Short illustrated guides to the big ideas, written for learners with a section for grown-ups. Find them from any topic or at <b>yourquarter.co.uk/learn</b>.</p>` : ""}<div class="bk-lib">${chunk.map((c) => `<div class="bk-card"><h3>${esc(c.title)}</h3><p>${plain(c.summary)}</p><small>${esc(c.years)}</small></div>`).join("")}</div>`;
    pages.push(i === 0 ? page("Study library", "Study library", body, "Ideas, explained") : cont("Study library", "Study library", body));
  });

  // ---- helping at home
  pages.push(page("Helping at home", "Helping at home", `
    <div class="bk-cols">
      <div class="bk-card gold"><h3>Before practice</h3><ul class="bk-list"><li>Pick a calm moment, and stop when focus fades.</li><li>Two or three topics are enough for a sitting.</li><li>Have paper and a pencil to hand.</li></ul></div>
      <div class="bk-card mint"><h3>During practice</h3><ul class="bk-list"><li>Let them try first. A hint is always there.</li><li>Ask them to explain a step in their own words.</li><li>Praise the effort and the method, not just the answer.</li></ul></div>
      <div class="bk-card rose"><h3>When something's tricky</h3><ul class="bk-list"><li>Use “Show the steps”, then try a fresh question.</li><li>Use a real object: coins, a ruler, slices of fruit.</li><li>Come back to it tomorrow. Topics return on their own.</li></ul></div>
      <div class="bk-card peri"><h3>After practice</h3><ul class="bk-list"><li>Look at the “Ask” question for the topic.</li><li>Spot the topic in real life: shopping, cooking, travel.</li><li>Check the parents' area now and then, and celebrate what's secure.</li></ul></div>
    </div>
    <div class="bk-callout">If a topic feels too easy or too hard, try one from the year above or below. The map is there to be explored.</div>
    <div class="bk-card"><h3>Keeping in touch</h3><p>Questions, ideas and feedback are always welcome through the feedback form in the parents' area, or at <b>yourquarter.co.uk</b>.</p></div>`, "Practical tips"));

  // ---- back cover
  pages.push({ chapter: "Back cover", title: "Back cover", frame: "none", html: `<div class="bk cover" style="display:grid;place-items:center;text-align:center"><div>${WORDMARK.replace('class="bk-wm"', 'class="bk-wm" style="font-size:64px"')}<p style="margin-top:18px;font-size:18px">Maths and STEM, one quarter at a time.</p><div class="bk-tiles" style="justify-content:center"><i style="background:#f5dc63"></i><i style="background:#f782a9"></i><i style="background:#8294e9"></i><i style="background:#4cc6a7"></i></div><p class="bk-small" style="margin-top:36px">quarter™ is a trading name of Wristed Ltd (company number 12397793)</p></div></div>` });

  return pages;
}

export interface BookletBuilt { pages: { n: number; chapter: string; title: string; html: string }[]; contents: { chapter: string; page: number }[] }

/** All the pages with their frames, page numbers and a contents page, ready to print or to flip through. */
export function buildBooklet(): BookletBuilt {
  const raw = bookletPages();
  const withToc = [...raw.slice(0, 3), { chapter: "Contents", title: "Contents", frame: "normal" as const, html: "" }, ...raw.slice(3)];
  const first = new Map<string, number>();
  withToc.forEach((p, i) => { if (!first.has(p.chapter)) first.set(p.chapter, i + 1); });
  const order = ["Welcome", "How quarter works", "At a glance", ...STAGES.map((s) => NAME[s]), "The 11+", "The STEM lab", "Tools and extras", "Study library", "Helping at home"];
  const sub: Record<string, string> = { "Welcome": "How to use this booklet", "How quarter works": "From check-up to progress report", "At a glance": "Numbers and stages", "Key Stage 2": "Years 3 to 6", "Key Stage 3": "Years 7 to 9", "GCSE": "Years 10 and 11", "A-level": "Years 12 and 13", "The 11+": "Reasoning, papers and the test finder", "The STEM lab": "Computing, data, AI and quantum ideas", "Tools and extras": "Times tables, tutor, reports", "Study library": "Illustrated guides", "Helping at home": "Practical tips" };
  const toc = `<div class="bk-body"><div><p class="bk-kicker">Inside</p><h2>Contents</h2></div><ul class="bk-toc">${order.map((c) => `<li><span><strong>${esc(c)}</strong><small>${esc(sub[c] ?? "")}</small></span><b>${first.get(c) ?? ""}</b></li>`).join("")}</ul></div>`;
  const pages = withToc.map((p, i) => {
    const n = i + 1;
    const html = p.chapter === "Contents" ? toc : p.html;
    if (p.frame === "none") return { n, chapter: p.chapter, title: p.title, html };
    return { n, chapter: p.chapter, title: p.title, html: `<div class="bk"><div class="bk-head"><span>${esc(p.chapter)}</span>${WORDMARK}</div>${html}<div class="bk-foot"><span>The quarter curriculum</span><b>${n}</b></div></div>` };
  });
  return { pages, contents: order.map((c) => ({ chapter: c, page: first.get(c) ?? 1 })) };
}
