import { Icon } from "./icons";
import { LegalFooter } from "./legal";
import { CubeMark, Wordmark } from "./wordmark";
import parentContent from "../parents/content.json";

/** What visitors see before they sign in. Keep the claims to what the app really does. */
export function Landing({ onStart }: { onStart(kind: "sign-up" | "sign-in"): void }) {
  return (
    <main class="landing" id="main">
      <header class="landing-bar">
        <a class="legal-home" href="./" aria-label="quarter home"><CubeMark /><Wordmark /></a>
        <button type="button" class="btn" onClick={() => onStart("sign-in")} data-testid="landing-sign-in">Sign in</button>
      </header>

      <section class="landing-hero" aria-labelledby="hero">
        <p class="landing-kicker">Maths for Years 3 to 13</p>
        <h1 id="hero">Maths practice that starts where your child is</h1>
        <p class="landing-lead">Short, friendly sessions that follow the National Curriculum for England, from Year 3 up to A-level. quarter finds the right starting point, explains mistakes clearly, and shows you what is going well.</p>
        <div class="landing-cta">
          <button type="button" class="btn primary big" onClick={() => onStart("sign-up")} data-testid="landing-sign-up">Create a parent account <Icon name="arrow" size={20} /></button>
          <button type="button" class="btn big" onClick={() => onStart("sign-in")}>Sign in</button>
        </div>
        <p class="small muted">Set up by a parent or guardian. Children don't need their own login, and a nickname is all we need.</p>
      </section>

      <section class="landing-section" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol class="landing-steps">
          <li><span class="step-n" aria-hidden="true">1</span><div><h3>A short check-up</h3><p>A few questions find the starting point and any gaps, so practice is neither too easy nor too hard.</p></div></li>
          <li><span class="step-n" aria-hidden="true">2</span><div><h3>Little and often</h3><p>Ten-minute sessions with worked explanations, hints and a skills map. No timers, apart from the clearly labelled timed paper.</p></div></li>
          <li><span class="step-n" aria-hidden="true">3</span><div><h3>Progress you can see</h3><p>The grown-ups' area shows what is secure, what is tricky, and what to talk about together.</p></div></li>
        </ol>
      </section>

      <section class="landing-section" aria-labelledby="what">
        <h2 id="what">What is inside</h2>
        <ul class="landing-grid">
          <li><Icon name="route" size={26} /><h3>The whole curriculum</h3><p>Primary and secondary maths, from place value in Year 3 to calculus in Year 13, each skill explained step by step.</p></li>
          <li><Icon name="target" size={26} /><h3>11+ practice</h3><p>Maths and reasoning papers, including verbal and non-verbal reasoning, plus a guide to finding your local 11+ test.</p></li>
          <li><Icon name="pencil" size={26} /><h3>Show your working</h3><p>Pen-and-paper style working tools, and answer hints that tell children exactly how to write their answer.</p></li>
          <li><Icon name="chat" size={26} /><h3>An optional AI tutor</h3><p>Off until you turn it on. It guides and explains without just giving the answer, and you can read every conversation.</p></li>
        </ul>
      </section>

      <section class="landing-section landing-trust" aria-labelledby="trust">
        <h2 id="trust">Built with families in mind</h2>
        <ul>
          <li>No adverts and no analytics cookies.</li>
          <li>We keep nicknames, school years and progress. Not real names, photos or birthdays.</li>
          <li>Tutor chats stay on your device.</li>
          <li>Download everything we hold, or delete your account, whenever you like.</li>
        </ul>
        <p><a class="legal-link" href="./?info=privacy">Read the privacy notice</a> · <a class="legal-link" href={parentContent.hub.path}>Parent guides</a> · <a class="legal-link" href={parentContent.faq.path}>FAQs</a></p>
      </section>

      <section class="landing-final" aria-labelledby="start">
        <h2 id="start">Ready to try it?</h2>
        <button type="button" class="btn primary big" onClick={() => onStart("sign-up")}>Create a parent account <Icon name="arrow" size={20} /></button>
      </section>

      <LegalFooter />
    </main>
  );
}
