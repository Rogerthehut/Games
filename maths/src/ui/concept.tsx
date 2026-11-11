import { useState } from "preact/hooks";
import { CONCEPT_BY_ID, figureSvg, type Block, type Concept } from "../concepts";
import { plainText } from "../concepts/render";
import { SKILL_BY_ID } from "../curriculum";
import { useApp } from "./context";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { readPracticeQuestion, stopPracticeNarration } from "./practice-audio";

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => "p" in b ? <p key={i}><Maths text={b.p} /></p> : "h" in b ? <h3 key={i}>{b.h}</h3> : <ul key={i}>{b.list.map((t, j) => <li key={j}><Maths text={t} /></li>)}</ul>)}
    </>
  );
}

const spoken = (blocks: Block[]) => blocks.flatMap((b) => ("p" in b ? [b.p] : "h" in b ? [] : b.list)).map(plainText).join(" ");

/** A study page: a picture, plain words for the learner, a worked example, and notes for the grown-up. */
export function ConceptPage({ id }: { id: string }) {
  const { go, leave, profile } = useApp();
  const concept: Concept | undefined = CONCEPT_BY_ID[id];
  const [row, setRow] = useState(concept?.figure.param ?? -1);
  const [reading, setReading] = useState(false);
  if (!concept) return <div class="concept-page"><p>That study page could not be found.</p><button class="btn" onClick={() => leave({ name: "home" })}>Back</button></div>;
  const figure = concept.figure.id === "pascal" ? figureSvg("pascal", row) : figureSvg(concept.figure.id, concept.figure.param);
  const read = () => {
    if (typeof speechSynthesis === "undefined") return;
    if (reading) { stopPracticeNarration(); setReading(false); return; }
    setReading(true);
    readPracticeQuestion(`${concept.title}. ${spoken(concept.kid)}`, profile.narrationVoice ?? "female", (s) => setReading(s === "loading" || s === "playing" || s === "fallback"));
  };

  return (
    <article class="concept-page" data-testid="concept-page">
      <button type="button" class="btn ghost concept-back" onClick={() => { stopPracticeNarration(); leave({ name: "map" }); }}><Icon name="back" size={18} /> Back</button>
      <p class="concept-years">{concept.years}</p>
      <h1>{concept.title}</h1>
      <p class="concept-summary">{concept.summary}</p>

      <figure class="concept-figure">
        <div dangerouslySetInnerHTML={{ __html: figure }} />
        {concept.figure.id === "pascal" && (
          <div class="concept-rows" role="group" aria-label="Highlight a row of the triangle">
            {Array.from({ length: 7 }, (_, n) => <button type="button" key={n} class={`chip-btn${row === n ? " on" : ""}`} aria-pressed={row === n} onClick={() => setRow(row === n ? -1 : n)}>Row {n}</button>)}
          </div>
        )}
        <figcaption><Maths text={concept.figure.caption} /></figcaption>
      </figure>

      <section aria-labelledby="ck">
        <h2 id="ck">For learners</h2>
        <Blocks blocks={concept.kid} />
        {typeof speechSynthesis !== "undefined" && <button type="button" class={`btn concept-read${reading ? " on" : ""}`} onClick={read} data-testid="concept-read"><Icon name="speaker" size={20} /> {reading ? "Stop" : "Read to me"}</button>}
      </section>

      <section class="concept-example" aria-labelledby="ce">
        <h2 id="ce">A worked example</h2>
        <p><Maths text={concept.example.prompt} /></p>
        <ol>{concept.example.steps.map((s, i) => <li key={i}><Maths text={s} /></li>)}</ol>
      </section>

      <section aria-labelledby="cg">
        <h2 id="cg">For grown-ups</h2>
        <Blocks blocks={concept.grownUp} />
      </section>

      <section aria-labelledby="cw">
        <h2 id="cw">Why it matters</h2>
        <p><Maths text={concept.why} /></p>
      </section>

      <section aria-labelledby="cs">
        <h2 id="cs">Practise this</h2>
        <ul class="concept-skills">
          {concept.skills.filter((s) => SKILL_BY_ID[s]).map((s) => (
            <li key={s}><button type="button" class="row" onClick={() => go({ name: "map", skill: s })}><span>{SKILL_BY_ID[s].name}<small>Year {SKILL_BY_ID[s].year}</small></span><Icon name="chevron" size={18} /></button></li>
          ))}
        </ul>
        {concept.related.length > 0 && (
          <>
            <h3>Related ideas</h3>
            <div class="concept-related">{concept.related.filter((r) => CONCEPT_BY_ID[r]).map((r) => <button key={r} type="button" class="chip-btn" onClick={() => go({ name: "concept", id: r })}>{CONCEPT_BY_ID[r].title}</button>)}</div>
          </>
        )}
      </section>

      <section aria-labelledby="cf">
        <h2 id="cf">Read more</h2>
        <ul>{concept.further.map((f) => <li key={f.url}><a class="legal-link" href={f.url} target="_blank" rel="noopener noreferrer">{f.label}</a></li>)}</ul>
      </section>
    </article>
  );
}
