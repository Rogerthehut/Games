import { STRANDS } from "../curriculum";
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

/** What visitors see before they sign in. Keep the claims to what the app really does. */
export function Landing({ onStart }: { onStart(kind: "sign-up" | "sign-in"): void }) {
  const ticker = [...STRANDS, ...STRANDS];
  return (
    <main class="landing" id="main">
      <header class="l-nav">
        <div class="l-wrap l-nav-in">
          <a class="legal-home" href="./" aria-label="quarter home"><CubeMark /><Wordmark /></a>
          <div class="l-nav-actions">
            <button type="button" class="l-btn l-btn-line" onClick={() => onStart("sign-in")} data-testid="landing-sign-in">Sign in</button>
            <button type="button" class="l-btn l-btn-dark l-hide-sm" onClick={() => onStart("sign-up")}>Create a parent account <Icon name="arrow" size={18} /></button>
          </div>
        </div>
      </header>

      <section class="l-hero" aria-labelledby="hero">
        <div class="l-wrap l-hero-grid">
          <div class="l-hero-copy">
            <p class="l-kicker">Maths for Years 3 to 13</p>
            <h1 id="hero">Maths practice that starts <em class="l-mark">where your child is</em></h1>
            <p class="l-lead">Short, friendly sessions that follow the National Curriculum for England, from Year 3 up to A-level. quarter finds the right starting point, explains mistakes clearly, and shows you what is going well.</p>
            <div class="l-cta">
              <button type="button" class="l-btn l-btn-dark l-btn-big" onClick={() => onStart("sign-up")} data-testid="landing-sign-up">Create a parent account <Icon name="arrow" size={20} /></button>
              <button type="button" class="l-btn l-btn-line l-btn-big" onClick={() => onStart("sign-in")}>Sign in</button>
            </div>
            <p class="l-note">Set up by a parent or guardian. Children don't need their own login, and a nickname is all we need.</p>
          </div>
          <div class="l-phones" aria-hidden="true">
            <div class="l-phone l-phone-a"><img src="./landing/app-today.webp" alt="" width="390" height="844" fetchpriority="high" /></div>
            <div class="l-phone l-phone-b"><img src="./landing/app-skills.webp" alt="" width="390" height="844" loading="lazy" /></div>
          </div>
        </div>
      </section>

      <div class="l-ticker" aria-hidden="true">
        <Torn color="#f6f1e4" seed={3} />
        <div class="l-ticker-track">{ticker.map((name, i) => <span key={i}><Sparkle />{name}</span>)}</div>
      </div>

      <section class="l-dark" aria-labelledby="how">
        <div class="l-wrap l-how">
          <h2 id="how">How it <em>works</em></h2>
          <ol class="l-steps">
            <li><span class="l-num" aria-hidden="true">01</span><div><h3>A short check-up</h3><p>A few questions find the starting point and any gaps, so practice is neither too easy nor too hard.</p></div></li>
            <li><span class="l-num" aria-hidden="true">02</span><div><h3>Little and often</h3><p>Ten-minute sessions with worked explanations, hints and a skills map. No timers, apart from the clearly labelled timed paper.</p></div></li>
            <li><span class="l-num" aria-hidden="true">03</span><div><h3>Progress you can see</h3><p>The grown-ups' area shows what is secure, what is tricky, and what to talk about together.</p></div></li>
          </ol>
        </div>
      </section>

      <section class="l-inside" aria-labelledby="what">
        <Torn color="#121522" seed={7} />
        <div class="l-wrap">
          <h2 id="what">What is <em>inside</em></h2>
          <ul class="l-cards">
            <li class="l-card l-mint"><span class="l-chip">01</span><h3>The whole curriculum</h3><p>Primary and secondary maths, from place value in Year 3 to calculus in Year 13, each skill explained step by step.</p><div class="l-art"><Icon name="route" size={84} /></div></li>
            <li class="l-card l-blue"><span class="l-chip">02</span><h3>11+ practice</h3><p>Maths and reasoning papers, including verbal and non-verbal reasoning, plus a guide to finding your local 11+ test.</p><div class="l-art"><Icon name="target" size={84} /></div></li>
            <li class="l-card l-pink"><span class="l-chip">03</span><h3>Show your working</h3><p>Pen-and-paper style working tools, and answer hints that tell children exactly how to write their answer.</p><div class="l-art"><Icon name="pencil" size={84} /></div></li>
            <li class="l-card l-amber"><span class="l-chip">04</span><h3>An optional AI tutor</h3><p>Off until you turn it on. It guides and explains without just giving the answer, and you can read every conversation.</p><div class="l-art"><Icon name="chat" size={84} /></div></li>
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
              <li><Icon name="check" size={20} />We keep nicknames, school years and progress. Not real names, photos or birthdays.</li>
              <li><Icon name="check" size={20} />Tutor chats stay on your device.</li>
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
            <button type="button" class="l-btn l-btn-dark l-btn-big" onClick={() => onStart("sign-up")}>Create a parent account <Icon name="arrow" size={20} /></button>
          </div>
        </div>
      </section>

      <div class="l-foot"><div class="l-wrap"><LegalFooter /></div></div>
    </main>
  );
}
