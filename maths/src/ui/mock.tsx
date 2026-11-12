import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { SKILL_BY_ID } from "../curriculum";
import type { AnsweredQuestion } from "../engine/activity";
import { check } from "../engine/check";
import { PAPERS, buildMock, type MockItem, type PaperKind } from "../engine/mock";
import { awardPathwayCertificate, buildPathwayTest, canTakePathwayTest, pathwayPassMark, pathwayTestName } from "../engine/pathway";
import { addPoints, recordAnswer, recordMistake, type MockRecord } from "../engine/progress";
import { recordWrongOnce } from "../engine/wrong-log";
import { mulberry32 } from "../engine/rng";
import type { Stage, Strand } from "../engine/types";
import { AnswerInput } from "./answer-input";
import { WorkingOut } from "./working-out";
import { useApp } from "./context";
import { FigureView } from "./figure";
import { Icon } from "./icons";
import { Maths } from "./maths";
import { Pip } from "./pip";
import { QBar, QTop } from "./qshell";
import { ExamTimer } from "./clock";

const clock = (s: number) => `${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, "0")}`;

export function Mock({ pathway }: { pathway?: Stage }) {
  const { profile, update, go, leave } = useApp();
  const [saved] = useState(() => pathway ? profile.pathwayDrafts?.[pathway] : undefined);
  const [kind, setKind] = useState<PaperKind>(profile.plan?.reasoning ? "both" : "maths");
  const format = PAPERS[kind];
  const { questions, sections } = useMemo(() => {
    if (saved) return { questions: saved.questions, sections: undefined as string[] | undefined };
    const seed = Date.now();
    const rng = mulberry32(seed);
    const items: { skillId: string; level: number; section?: string }[] = pathway ? buildPathwayTest(pathway, rng) : buildMock(rng, kind);
    return {
      questions: items.map((item, index) => SKILL_BY_ID[item.skillId].generate(mulberry32(seed + index * 7919), item.level)),
      sections: pathway ? undefined : (items as MockItem[]).map((item) => item.section),
    };
  }, [pathway, saved, kind]);
  const total = questions.length;
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [idx, setIdx] = useState(saved?.taken.length ?? 0);
  const q = questions[idx];
  const [values, setValues] = useState<string[]>(saved?.values ?? [""]);
  const [note, setNote] = useState("");
  const [taken, setTaken] = useState<AnsweredQuestion[]>(saved?.taken ?? []);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const finished = useRef(false);

  const start = () => { startedAt.current = Date.now(); setPhase("run"); };
  const endOnTime = () => finish([
    ...taken,
    ...questions.slice(taken.length).map((question) => ({ q: question, inputs: [""], correct: false })),
  ], format.seconds);

  useEffect(() => {
    if (phase !== "run" || pathway) return;
    const tick = () => {
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(seconds);
      if (seconds >= format.seconds) endOnTime();
    };
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [phase, pathway, taken]);

  const saveAndLeave = () => {
    if (!pathway || finished.current) return;
    update((p) => ({ ...p, lastSkill: q?.skill ?? p.lastSkill, pathwayDrafts: { ...p.pathwayDrafts, [pathway]: { questions, taken, values } } }));
    leave({ name: "map", stage: pathway });
  };

  const finish = (all: AnsweredQuestion[], secondsAtEnd?: number) => {
    if (finished.current) return;
    finished.current = true;
    setTaken(all);
    if (pathway) {
      const score = all.filter((item) => item.correct).length;
      const at = Date.now();
      update((p) => {
        const pathwayDrafts = { ...p.pathwayDrafts };
        delete pathwayDrafts[pathway];
        let n: typeof p = { ...p, pathwayDrafts };
        for (const t of all) if (!t.correct) n = recordWrongOnce(n, t.q, t.inputs, "paper", t.tag, t.message, at);
        return awardPathwayCertificate(n, pathway, score, all.length, at);
      });
      setPhase("done");
      return;
    }
    const seconds = secondsAtEnd ?? Math.floor((Date.now() - startedAt.current) / 1000);
    const by = new Map<Strand, { right: number; n: number }>();
    for (const t of all) {
      const st = SKILL_BY_ID[t.q.skill].strand;
      const e = by.get(st) ?? { right: 0, n: 0 };
      by.set(st, { right: e.right + (t.correct ? 1 : 0), n: e.n + 1 });
    }
    const bySection = new Map<string, { right: number; n: number }>();
    if (sections) all.forEach((t, i) => {
      const name = sections[i] ?? "Maths";
      const e = bySection.get(name) ?? { right: 0, n: 0 };
      bySection.set(name, { right: e.right + (t.correct ? 1 : 0), n: e.n + 1 });
    });
    const rec: MockRecord = {
      at: Date.now(), total: all.length, score: all.filter((t) => t.correct).length, seconds, limitSeconds: format.seconds,
      byStrand: [...by].map(([strand, v]) => ({ strand, ...v })),
      paper: kind, bySection: bySection.size > 1 ? [...bySection].map(([section, v]) => ({ section, ...v })) : undefined,
    };
    const attempted = secondsAtEnd === format.seconds ? taken : all;
    update((p) => {
      let n = p;
      for (const t of attempted) {
        n = recordAnswer(n, t.q.skill, t.correct ? "right" : "wrong");
        if (!t.correct && t.tag && t.message) n = recordMistake(n, t.tag, t.q.skill, t.message);
        if (!t.correct) n = recordWrongOnce(n, t.q, t.inputs, "paper", t.tag, t.message);
      }
      n = addPoints(n, 20 + rec.score);
      return { ...n, mocks: [...(n.mocks ?? []), rec], sessions: [...n.sessions, { at: startedAt.current, minutes: Math.max(1, Math.round(seconds / 60)), answered: attempted.length, correct: rec.score, skills: [...new Set(attempted.map((t) => t.q.skill))] }] };
    });
    setPhase("done");
  };

  const recorded = useRef(-1);
  const record = (inputs: string[], correct: boolean, tag?: string, message?: string) => {
    if (!q || finished.current || recorded.current === idx) return; // a double tap must not record the same question twice
    recorded.current = idx;
    if (!pathway && Date.now() >= startedAt.current + format.seconds * 1000) { endOnTime(); return; }
    const all = [...taken, { q, inputs, correct, tag, message }];
    setTaken(all);
    if (idx + 1 >= total) finish(all);
    else { setIdx(idx + 1); setValues([""]); setNote(""); }
  };
  const submit = () => {
    if (!q) return;
    const r = check(q, values);
    if (r.outcome === "invalid") { setNote("Type an answer, or choose “Leave blank”."); return; }
    record(values, r.outcome === "correct", r.tag, r.feedback);
  };

  if (phase === "intro") {
    if (pathway) {
      const ready = canTakePathwayTest(profile, pathway);
      return (
        <main class="splash">
          <div class="splash-in">
            <div class="pip-slot"><Pip pose="think" size={110} /></div>
            <h1>{pathwayTestName(pathway)}</h1>
            <p class="splash-sub">{ready
              ? `This test has questions from across your quarter pathway. You can save it and come back later. You need to answer at least ${pathwayPassMark(total)} of the ${total} questions correctly to earn your quarter certificate.`
              : "Practise every topic in this pathway to unlock the final test."}</p>
            {ready && <button class="btn primary big" onClick={start} data-testid="pathway-start">{saved ? `Continue from question ${idx + 1}` : "Start the test"} <Icon name="arrow" size={20} /></button>}
            <button class="linkish" onClick={() => leave({ name: "map", stage: pathway })}>Go back</button>
          </div>
        </main>
      );
    }
    return (
      <main class="splash">
        <div class="splash-in">
          <div class="pip-slot"><Pip pose="think" size={110} /></div>
          <h1>Practice paper</h1>
          <fieldset class="options paper-choice">
            <legend class="field-label">Which paper?</legend>
            {(Object.keys(PAPERS) as PaperKind[]).map((k) => (
              <label key={k} class={`option ${kind === k ? "on" : ""}`}>
                <input type="radio" name="paper" checked={kind === k} onChange={() => setKind(k)} data-testid={`paper-${k}`} />
                <span><strong>{PAPERS[k].title}</strong><br /><span class="small muted">{PAPERS[k].blurb}</span></span>
              </label>
            ))}
          </fieldset>
          <ul class="tips">
            <li>The paper ends when the timer reaches zero. Any unfinished questions will count as blank.</li>
            <li>No hints, and no marks until the end.</li>
            {kind !== "maths" && <li>Reasoning questions are multiple choice. Tap an answer (or press 1 to 5), then Next.</li>}
            <li>Then you'll see every miss, with the steps.</li>
          </ul>
          <p class="small muted">Written in a general 11+ style. Real tests vary in length, order and which parts they include, so check your school's own guidance.</p>
          <button class="btn primary big" onClick={start} data-testid="mock-start">Start <Icon name="arrow" size={20} /></button>
          <button class="linkish" onClick={() => leave({ name: "plan" })}>Not now</button>
        </div>
      </main>
    );
  }

  if (phase === "done") {
    const score = taken.filter((t) => t.correct).length;
    const missed = taken.filter((t) => !t.correct);
    const rec = pathway ? undefined : profile.mocks?.[profile.mocks.length - 1];
    const certificate = pathway && profile.certificates?.find((item) => item.stage === pathway);
    const prev = profile.mocks && profile.mocks.length > 1 ? profile.mocks[profile.mocks.length - 2] : undefined;
    return (
      <main class="page report">
        <div class="card hero">
          <h1>{pathway ? (certificate ? "You earned your certificate!" : "Keep going") : "Practice paper result"}</h1>
          <p class="big-level">{score} / {taken.length}</p>
          {pathway ? (
            <p class="lede">{certificate
              ? "You’ve completed this quarter pathway. Take a look at your certificate."
              : `You need at least ${pathwayPassMark(total)} correct answers to earn your certificate. Look through the questions below, then try again when you’re ready.`}</p>
          ) : <>
            <p class="lede">{rec && rec.seconds >= rec.limitSeconds ? "Time’s up. Unanswered questions were left blank." : `Finished in ${clock(rec?.seconds ?? elapsed)} of ${clock(rec?.limitSeconds ?? format.seconds)}.`}{prev && <> Last paper: {prev.score} / {prev.total}.</>}</p>
            <p class="small muted">An indicator for practice, not a prediction. Real 11+ pass marks vary by area and year, and this is not a standardised score.</p>
          </>}
        </div>
        {rec && (
          <div class="card">
            <h2>{rec.bySection ? "By part of the paper" : "By topic area"}</h2>
            <ul class="bars">
              {(rec.bySection ?? rec.byStrand.map((s) => ({ section: s.strand as string, right: s.right, n: s.n }))).map((s) => (
                <li key={s.section}>
                  <div class="bar-head"><span>{s.section}</span><span class="muted small">{s.right} of {s.n}</span></div>
                  <div class="bar-track"><i class="bar-fill" style={{ width: `${(100 * s.right) / s.n}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div class="card">
          <h2>{missed.length ? `Review: ${missed.length} to learn from` : "No mistakes to review"}</h2>
          <ul class="finding-list">
            {missed.map((t, i) => (
              <li key={i}>
                <p><Maths text={t.q.prompt} /></p>
                {t.q.answer.kind === "choice" ? (
                  <details class="see-question">
                    <summary class="small">See the question and answers</summary>
                    {t.q.figure && <FigureView fig={t.q.figure} />}
                    <AnswerInput answer={t.q.answer} values={t.inputs} onChange={() => {}} onSubmit={() => {}} disabled reveal state="wrong" />
                  </details>
                ) : t.q.figure && <FigureView fig={t.q.figure} />}
                <p class="small muted">Your answer: {t.inputs.every((v) => !v.trim()) ? "left blank" : t.q.answer.kind === "choice" ? (/^[0-4]$/.test(t.inputs[0]) ? `option ${"ABCDE"[+t.inputs[0]]}` : t.inputs.join(", ")) : t.inputs.join(", ")} · Correct: <Maths text={t.q.shown} /></p>
                <details><summary class="small">Show the steps</summary><ol class="steps">{t.q.solution.map((s, j) => <li key={j}><Maths text={s} /></li>)}</ol></details>
              </li>
            ))}
          </ul>
          {!pathway && <p class="small muted">Topics you missed will come back in your next practice sessions.</p>}
        </div>
        <div class="actions">
          {pathway && certificate && <button class="btn primary" onClick={() => go({ name: "certificate", stage: pathway })}>See your certificate</button>}
          <button class={certificate ? "btn" : "btn primary"} onClick={() => (pathway ? go({ name: "map", stage: pathway }) : leave({ name: "home" }))}>{pathway ? "Back to skills" : "Done"}</button>
        </div>
      </main>
    );
  }

  if (!q) return null;
  const left = format.seconds - elapsed;
  return (
    <div class="qpage" data-phase="ask">
      <QTop
        onClose={pathway ? saveAndLeave : () => taken.length ? finish(taken) : leave({ name: "plan" })} closeLabel={pathway ? "Save and leave pathway test" : "End the paper"} closeText={pathway ? "Save and leave" : undefined} index={idx} total={total}
        right={pathway ? undefined : <ExamTimer seconds={left} total={format.seconds} />}
      />
      <div class="qbody" key={idx}>
        <p class="q-topic">Question {idx + 1} of {total}{sections?.[idx] && kind !== "maths" ? ` · ${sections[idx]}` : ""}</p>
        <div class="question-desk">
          <div class="question-main">
            <p class="q-text" data-testid="question"><Maths text={q.prompt} /></p>
            {q.figure && <FigureView fig={q.figure} />}
            <AnswerInput answer={q.answer} skill={q.skill} values={values} onChange={setValues} onSubmit={submit} />
            <div class="fb-zone" aria-live="polite">
              {note && <div class="fb nearly" role="alert"><p>{note}</p></div>}
            </div>
          </div>
          <WorkingOut />
        </div>
      </div>
      <QBar
        help
        left={<button class="btn ghost" onClick={() => record([""], false)} data-testid="leave-blank">Leave blank</button>}
        right={<button class="btn primary" onClick={submit} disabled={!values.some((v) => v.trim())} data-testid="next">Next <Icon name="arrow" size={20} /></button>}
      />
    </div>
  );
}
