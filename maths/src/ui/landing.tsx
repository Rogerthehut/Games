import { useEffect, useRef, useState } from "preact/hooks";
import { ActivityArt } from "./activity-art";
import { Icon } from "./icons";
import { LegalFooter } from "./legal";
import { CubeMark, Wordmark } from "./wordmark";
import parentContent from "../parents/content.json";

/** A ragged, torn-paper edge. It is painted in the colour of the section above and hangs over the top of the section below. */
function Torn({ color, seed = 1 }: { color: string; seed?: number }) {
  let n = seed * 9301 + 49297;
  const rand = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const pts: string[] = [];
  for (let x = 0; x <= 1200; x += 30) pts.push(`${x} ${(3 + rand() * 15).toFixed(1)}`);
  return (
    <svg class="torn" viewBox="0 0 1200 22" preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ color }}>
      <path fill="currentColor" d={`M0 0H1200V${pts[pts.length - 1].split(" ")[1]}L${[...pts].reverse().join("L")}Z`} />
    </svg>
  );
}

const Sparkle = () => (
  <svg class="sparkle" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path fill="currentColor" d="M50 0c4 28 22 46 50 50-28 4-46 22-50 50-4-28-22-46-50-50C28 46 46 28 50 0Z" /></svg>
);

const TOPIC_AREAS = ["Number", "Ratio", "Algebra", "Measures", "Geometry", "Statistics", "Calculus", "Reasoning"];

/** A link to where independent reviews live (for example the Trustpilot page). Until one is set, the strip says reviews are on their way. */
const REVIEW_URL = ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_REVIEWS_URL ?? "").trim();

/**
 * Holds the place of the "Try one" card and loads it only when it is about to scroll into view, so the questions, the maths renderer and
 * the pictures don't weigh down the first load of the page.
 */
function TryLoader({ onStart }: { onStart(kind: "sign-up" | "sign-in"): void }) {
  const slot = useRef<HTMLDivElement>(null);
  const [Card, setCard] = useState<((p: { onStart(kind: "sign-up" | "sign-in"): void }) => preact.JSX.Element) | null>(null);
  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const load = () => { void import("./landing-try").then((m) => setCard(() => m.TryCard)); };
    if (typeof IntersectionObserver === "undefined") { load(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div class="try-slot" ref={slot}>{Card ? <Card onStart={onStart} /> : <div class="try-card try-ghost" aria-hidden="true" />}</div>;
}

/** Scroll to a section without touching the address, because the sign-in form reads the address hash. */
const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

/** Faint hand-written sums scattered behind the hero, like chalk on a classroom board. Decorative only. */
const SCRIBBLES: { t: string; x: number; y: number; r: number; s: number; pink?: boolean; hide?: boolean }[] = [
  { t: "3 × 4 = 12", x: 2, y: 2, r: -7, s: 1.1 },
  { t: "½ + ¼ = ¾", x: 58, y: 6, r: 4, s: 1.2, hide: true },
  { t: "x² + 2x = 15", x: 1, y: 70, r: 5, s: 1.15, hide: true },
  { t: "π", x: 90, y: 9, r: 12, s: 2.4 },
  { t: "7 × 8 = 56", x: 77, y: 84, r: -5, s: 1.1 },
  { t: "√81 = 9", x: 41, y: 90, r: 3, s: 1.05, hide: true },
  { t: "a² + b² = c²", x: 66, y: 62, r: -4, s: 1, hide: true },
  { t: "25% of 80 = 20", x: 14, y: 90, r: -3, s: 1, hide: true },
  { t: "÷", x: 47, y: 15, r: 10, s: 2.2, pink: true },
  { t: "y = mx + c", x: 82, y: 38, r: 6, s: 1.05, hide: true },
  { t: "∑", x: 44, y: 66, r: -9, s: 2.3, pink: true, hide: true },
  { t: "12 ÷ 3 = 4", x: 88, y: 66, r: 7, s: .95 },
  { t: "∞", x: 33, y: 5, r: -6, s: 2.2, hide: true },
  { t: "%", x: 94, y: 92, r: -10, s: 2.2, pink: true },
  { t: "θ = 45°", x: 24, y: 7, r: 5, s: 1.05, hide: true },
  { t: "2 + 3 = 5", x: 54, y: 78, r: -6, s: 1, hide: true },
];
function Scribbles() {
  return (
    <div class="l-scribbles" aria-hidden="true">
      {SCRIBBLES.map((c, i) => (
        <span key={i} class={`l-scribble${c.pink ? " pink" : ""}${c.hide ? " l-hide-sm" : ""}`} style={{ left: `${c.x}%`, top: `${c.y}%`, rotate: `${c.r}deg`, fontSize: `calc(var(--l-scrib) * ${c.s})` }}>{c.t}</span>
      ))}
      <svg class="l-squiggle" viewBox="0 0 220 24" style={{ left: "5%", top: "30%" }}><path d="M2 14c18-14 30 12 48 0s30-12 48 0 30 12 48 0 30-12 50 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
      <svg class="l-squiggle" viewBox="0 0 120 60" style={{ left: "62%", top: "46%" }}><path d="M4 50C20 8 60 4 108 16m-16-14 18 14-20 12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
    </div>
  );
}

/** What visitors see before they sign in. Keep the claims to what the app really does. */
export function Landing({ onStart }: { onStart(kind: "sign-up" | "sign-in"): void }) {
  const ticker = [...TOPIC_AREAS, ...TOPIC_AREAS];
  return (
    <main class="landing" id="main">
      <header class="l-nav">
        <div class="l-wrap l-nav-in">
          <a class="legal-home" href="./" aria-label="quarter home"><CubeMark /><Wordmark /></a>
          <span class="l-beta-tab" role="note">Public beta</span>
          <nav class="l-nav-links" aria-label="On this page">
            <button type="button" onClick={() => jump("what")}>Discover</button>
            <button type="button" onClick={() => jump("how")}>How it works</button>
            <button type="button" onClick={() => jump("trust")}>Our ethos</button>
            <a href={parentContent.hub.path}>Parent guides</a>
            <a href={parentContent.faq.path}>FAQs</a>
          </nav>
          <div class="l-nav-actions">
            <button type="button" class="l-btn l-btn-line" onClick={() => onStart("sign-in")} data-testid="landing-sign-in">Sign in</button>
            <button type="button" class="l-btn l-btn-dark l-hide-sm" onClick={() => onStart("sign-up")}>Create an account <Icon name="arrow" size={18} /></button>
          </div>
        </div>
      </header>

      <section class="l-hero" aria-labelledby="hero">
        <Scribbles />
        <div class="l-wrap l-hero-grid">
          <div class="l-hero-copy">
            <p class="l-kicker">Maths and STEM for Years 3 to 13</p>
            <h1 id="hero">Maths practice that starts <em class="l-mark">where your child is</em></h1>
            <p class="l-lead">Short, friendly sessions that follow the National Curriculum for England, from Year 3 up to A-level, with a STEM lab for computing, data and AI. quarter finds the right starting point, explains mistakes clearly, and shows you what’s going well.</p>
            <div class="l-cta">
              <button type="button" class="l-btn l-btn-dark l-btn-big" onClick={() => onStart("sign-up")} data-testid="landing-sign-up">Create an account <Icon name="arrow" size={20} /></button>
              <button type="button" class="l-btn l-btn-line l-btn-big" onClick={() => onStart("sign-in")}>Sign in</button>
            </div>
            <p class="l-note">Set up by a parent or guardian. Children don’t need their own login, and a nickname for the child is all we need. quarter is in public beta, so it’s free while we polish it.</p>
          </div>
          <div class="l-devices" aria-hidden="true">
            <div class="l-monitor">
              <div class="l-mon-bezel"><div class="l-screen l-screen-wide"><img src="./landing/desktop.webp" alt="" width="1440" height="900" fetchpriority="high" /></div></div>
              <i class="l-neck" /><i class="l-base" />
            </div>
            <div class="l-tablet">
              <div class="l-screen l-screen-wide"><img src="./landing/tablet.webp" alt="" width="1400" height="973" loading="lazy" /><i class="l-tcam" /></div>
            </div>
            <div class="l-phone l-phone-a l-ios">
              <span class="l-side l-side-l" /><span class="l-side l-side-r" />
              <div class="l-screen"><img src="./landing/iphone.webp" alt="" width="390" height="844" loading="lazy" /><i class="l-cam" /><i class="l-home" /></div>
            </div>
            <div class="l-phone l-phone-b l-android">
              <span class="l-side l-side-r" />
              <div class="l-screen"><img src="./landing/android.webp" alt="" width="390" height="844" loading="lazy" /><i class="l-cam" /><i class="l-home" /></div>
            </div>
          </div>
        </div>
      </section>

      <section class="l-reviews" aria-labelledby="reviews">
        <Torn color="#f6f1e4" seed={5} />
        <div class="l-wrap l-reviews-in">
          <h2 id="reviews">Good words travel.</h2>
          <span class="l-reviews-rule" aria-hidden="true" />
          <p>{REVIEW_URL
            ? <>quarter’s gathering its first independent reviews. <a class="legal-link" href={REVIEW_URL} target="_blank" rel="noopener">Read or leave a review</a>.</>
            : "quarter’s gathering its first independent reviews. We’ll share them here once they’re available."}</p>
        </div>
      </section>

      <div class="l-ticker" aria-hidden="true">
        <Torn color="#fffdf8" seed={3} />
        <div class="l-ticker-track">{ticker.map((name, i) => <span key={i}><Sparkle />{name}</span>)}</div>
      </div>

      <section class="l-dark" aria-labelledby="how">
        <div class="l-wrap l-how">
          <h2 id="how">How it <em>works</em></h2>
          <ol class="l-steps">
            <li><span class="l-num" aria-hidden="true">01</span><div><h3>A short check-up</h3><p>A few questions find the starting point and any gaps, so practice isn’t too easy or too hard.</p></div></li>
            <li><span class="l-num" aria-hidden="true">02</span><div><h3>A plan that targets the gaps</h3><p>The check-up builds a plan of focused questions on the topics your child finds tricky. Repeat the check-up every few weeks to see how they’ve moved.</p></div></li>
            <li><span class="l-num" aria-hidden="true">03</span><div><h3>Little and often</h3><p>Ten-minute sessions with worked explanations, hints and a skills map. No timers, apart from the clearly labelled timed paper.</p></div></li>
            <li><span class="l-num" aria-hidden="true">04</span><div><h3>See exactly where they’re stuck</h3><p>The grown-ups’ area lists the questions your child got wrong, what they answered and why that may be happening, with methods to try together.</p></div></li>
          </ol>
        </div>
      </section>

      <section class="l-inside" aria-labelledby="what">
        <Torn color="#121522" seed={7} />
        <div class="l-wrap l-inside-grid">
          <h2 id="what">What’s <em>inside</em></h2>
          <ul class="l-cards">
            <li><button type="button" class="activity-card activity-skills" onClick={() => onStart("sign-up")}>
              <span class="activity-label">01 / Curriculum</span>
              <span class="activity-title">The whole curriculum</span>
              <span class="activity-detail">Maths from place value in Year 3 to calculus in Year 13, each skill explained step by step, plus a STEM lab of computing, data science, AI and quantum ideas.</span>
              <ActivityArt kind="skills" />
              <span class="activity-action">Get started<span aria-hidden="true">↗</span></span>
            </button></li>
            <li><button type="button" class="activity-card activity-checkup" onClick={() => onStart("sign-up")}>
              <span class="activity-label">02 / 11+</span>
              <span class="activity-title">11+ practice</span>
              <span class="activity-detail">Maths and reasoning papers, including verbal and non-verbal reasoning, plus a guide to finding your local 11+ test.</span>
              <ActivityArt kind="checkup" />
              <span class="activity-action">Get started<span aria-hidden="true">↗</span></span>
            </button></li>
            <li><button type="button" class="activity-card activity-practice" onClick={() => onStart("sign-up")}>
              <span class="activity-label">03 / Working</span>
              <span class="activity-title">Show your working</span>
              <span class="activity-detail">Pen-and-paper style working tools, and answer hints that tell children exactly how to write their answer.</span>
              <ActivityArt kind="practice" />
              <span class="activity-action">Get started<span aria-hidden="true">↗</span></span>
            </button></li>
            <li><button type="button" class="activity-card activity-plan" onClick={() => onStart("sign-up")}>
              <span class="activity-label">04 / AI tutor</span>
              <span class="activity-title">An optional AI tutor</span>
              <span class="activity-detail">It’s off until you turn it on. It guides and explains without just giving the answer, and you can read every conversation.</span>
              <ActivityArt kind="tutor" />
              <span class="activity-action">Get started<span aria-hidden="true">↗</span></span>
            </button></li>
            <li><button type="button" class="activity-card activity-checkup" onClick={() => onStart("sign-up")}>
              <span class="activity-label">05 / Learning report</span>
              <span class="activity-title">Drill down into where they’re struggling</span>
              <span class="activity-detail">Pick any week or month and see the exact questions your child got wrong, the likely reasons, and the methods to work through together, with study guides and lessons to match.</span>
              <ActivityArt kind="checkup" />
              <span class="activity-action">Get started<span aria-hidden="true">↗</span></span>
            </button></li>
            <li class="l-try-cell"><TryLoader onStart={onStart} /></li>
          </ul>
        </div>
      </section>

      <section class="l-trust" aria-labelledby="trust">
        <Torn color="#f8e3d2" seed={11} />
        <div class="l-wrap l-trust-grid">
          <h2 id="trust">Built with <em>privacy</em> in mind</h2>
          <div>
            <ul class="l-checks">
              <li><Icon name="check" size={20} />No adverts and no analytics cookies.</li>
              <li><Icon name="check" size={20} />We only keep nicknames, school years and progress. We don’t keep real names, photos or birthdays.</li>
              <li><Icon name="check" size={20} />AI tutor chats stay on your device.</li>
              <li><Icon name="check" size={20} />Download everything we hold, or delete your account, whenever you like.</li>
            </ul>
            <p class="l-links"><a class="legal-link" href="./?info=privacy">Read the privacy notice</a> · <a class="legal-link" href={parentContent.hub.path}>Parent guides</a> · <a class="legal-link" href={parentContent.faq.path}>FAQs</a></p>
          </div>
        </div>
      </section>

      <section class="l-final" aria-labelledby="start">
        <div class="l-wrap">
          <div class="l-banner">
            <Sparkle />
            <h2 id="start">Ready to try it?</h2>
            <button type="button" class="l-btn l-btn-dark l-btn-big" onClick={() => onStart("sign-up")}>Create an account <Icon name="arrow" size={20} /></button>
          </div>
        </div>
      </section>

      <div class="l-foot"><div class="l-wrap"><LegalFooter full /></div></div>
    </main>
  );
}
