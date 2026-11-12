import { printPage } from "../native/bridge";
import { useEffect, useMemo, useState } from "preact/hooks";
import { PAPERS, type PaperKind } from "../engine/mock";
import { PRINTABLE, buildPrintPaper, clampNumber, fieldsOf, randomPaperNumber, unitOf } from "../engine/print-paper";
import { useApp } from "./context";
import { FigureView } from "./figure";
import { Icon } from "./icons";
import { Maths } from "./maths";

type What = "paper" | "answers";

/**
 * A practice paper to print or save as PDF: the questions with room to work, then (printed separately) an answer sheet and a mark scheme
 * with the steps. The paper number identifies the paper, so the same number always makes the same one.
 */
export function PrintPaper({ kind: first, number: firstNumber }: { kind: PaperKind; number?: number }) {
  const { go, leave } = useApp();
  const [kind, setKind] = useState<PaperKind>(PRINTABLE.includes(first) ? first : "maths");
  const [number, setNumber] = useState(() => clampNumber(firstNumber ?? randomPaperNumber()));
  const [typed, setTyped] = useState(String(number));
  const [printing, setPrinting] = useState<What | null>(null);
  const paper = useMemo(() => buildPrintPaper(kind, number), [kind, number]);
  const roomy = paper.questions.length <= 30;
  const minutes = Math.round(paper.seconds / 60);

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add(`printing-${printing}`);
    const done = () => { document.body.classList.remove(`printing-${printing}`); setPrinting(null); };
    addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => printPage(), 80);
    return () => { clearTimeout(t); removeEventListener("afterprint", done); document.body.classList.remove(`printing-${printing}`); };
  }, [printing]);

  const pick = (n: number) => { const v = clampNumber(n); setNumber(v); setTyped(String(v)); };
  const head = (what: string) => (
    <header class="pp-head">
      <div><strong class="pp-brand">quarter</strong><span> · {paper.title} · Paper no. {paper.number}</span></div>
      <div class="pp-what">{what}</div>
    </header>
  );

  return (
    <main class="pp" data-testid="print-paper">
      <div class="pp-toolbar">
        <button type="button" class="btn" onClick={() => leave({ name: "mock" })} data-testid="pp-back"><Icon name="back" size={18} /> Back</button>
        <h1>Print a practice paper</h1>
        <p class="small muted">Choose a paper, then print it, or save it as a PDF from the print window. Print the answers and mark scheme separately, so they can be kept for the marker. The same paper number always makes the same paper.</p>
        <fieldset class="options paper-choice">
          <legend class="field-label">Which paper</legend>
          {PRINTABLE.map((k) => (
            <label key={k} class={`option ${kind === k ? "on" : ""}`}>
              <input type="radio" name="pp-kind" checked={kind === k} onChange={() => setKind(k)} data-testid={`pp-kind-${k}`} />
              <span><strong>{PAPERS[k].title}</strong><br /><span class="small muted">{PAPERS[k].blurb}</span></span>
            </label>
          ))}
        </fieldset>
        <div class="pp-number">
          <label>Paper number <input type="number" min="1" max="9999" inputMode="numeric" value={typed} onInput={(e) => setTyped((e.target as HTMLInputElement).value)} onChange={() => pick(Number(typed))} data-testid="pp-number" /></label>
          <button type="button" class="btn" onClick={() => pick(randomPaperNumber())} data-testid="pp-new">A different paper</button>
        </div>
        <div class="pp-actions">
          <button type="button" class="btn primary" onClick={() => setPrinting("paper")} data-testid="pp-print-paper"><Icon name="book" size={18} /> Print the paper</button>
          <button type="button" class="btn" onClick={() => setPrinting("answers")} data-testid="pp-print-answers">Print answers and mark scheme</button>
          <button type="button" class="linkish" onClick={() => go({ name: "mock" })}>Do it on screen instead</button>
        </div>
      </div>

      <section class="pp-sheet pp-paper" aria-label="The paper">
        {head("Practice paper")}
        <div class="pp-box">
          <p>Name <span class="pp-line" /> Date <span class="pp-line short" /> Mark <span class="pp-line short" /> / {paper.marks}</p>
          <p class="small">Time allowed: <strong>{minutes} minutes</strong>. {paper.marks} questions, 1 mark each. Write your answer on the answer line. Show your working in the space. No calculator.</p>
        </div>
        <ol class={`pp-questions${roomy ? " roomy" : ""}`}>
          {paper.questions.map((q) => (
            <li key={q.n} class="pp-q" data-testid="pp-question">
              <span class="pp-n">{q.n}.</span>
              <div class="pp-body">
                <p class="pp-text"><Maths text={q.question.prompt} /></p>
                {q.question.figure && <div class="pp-fig"><FigureView fig={q.question.figure} locked /></div>}
                <div class="pp-answer">
                  {fieldsOf(q.question).length ? fieldsOf(q.question).map((f) => <span key={f}>{f} <span class="pp-line short" /></span>) : <span>Answer <span class="pp-line" /> {unitOf(q.question)}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p class="pp-end">End of paper</p>
      </section>

      <section class="pp-sheet pp-answers" aria-label="Answers and mark scheme">
        {head("Answers and mark scheme")}
        <h2>Answers</h2>
        <ol class="pp-key">
          {paper.questions.map((q) => <li key={q.n}><span class="pp-n">{q.n}.</span> <Maths text={q.question.shown} /></li>)}
        </ol>
        <p class="small">1 mark for each correct answer ({paper.marks} marks). Accept equivalent forms, such as 0.5 for ½.</p>
        <h2>Mark scheme with the steps</h2>
        <ol class="pp-scheme">
          {paper.questions.map((q) => (
            <li key={q.n} class="pp-s">
              <p><strong>{q.n}.</strong> <span class="pp-topic">{q.skill}</span></p>
              <p class="small"><Maths text={q.question.prompt} /></p>
              <ul>{q.question.solution.map((s, i) => <li key={i}><Maths text={s} /></li>)}</ul>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
