import { useEffect, useRef } from "preact/hooks";
import type { Answer } from "../engine/types";
import { previewLatex } from "../engine/expr";
import { Tex } from "./maths";

const KEYS: Record<Answer["kind"], string[]> = {
  number: ["−", "/", "."],
  multi: ["−", "/", "."],
  expr: ["x", "^", "(", ")", "+", "−", "×", "/"],
};

export function AnswerInput(props: {
  answer: Answer;
  values: string[];
  onChange: (v: string[]) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const { answer, values, onChange, onSubmit, disabled } = props;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focused = useRef(0);
  useEffect(() => { if (!disabled && matchMedia("(pointer: fine)").matches) refs.current[0]?.focus(); }, []);
  const labels = answer.kind === "multi" ? answer.fields.map((f) => f.label) : [answer.label ?? ""];

  const insert = (s: string) => {
    const i = focused.current;
    const el = refs.current[i];
    const cur = values[i] ?? "";
    const a = el?.selectionStart ?? cur.length, b = el?.selectionEnd ?? cur.length;
    const next = values.slice();
    next[i] = cur.slice(0, a) + s + cur.slice(b);
    onChange(next);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + s.length, a + s.length); });
  };

  return (
    <div class="answer">
      {labels.map((label, i) => {
        const raw = previewLatex(values[i] ?? "");
        const pv = raw && /[\\^]/.test(raw) ? raw : null; // only worth showing when it adds something: fractions, powers, brackets
        return (
          <div class="answer-row" key={i}>
            <label class="answer-field">
              {label && <span class="answer-label">{label}</span>}
              <input
                ref={(el) => { refs.current[i] = el; }}
                value={values[i] ?? ""}
                disabled={disabled}
                inputMode="text"
                enterKeyHint="done"
                autoCapitalize="off"
                autoComplete="off"
                spellcheck={false}
                aria-label={label || "Your answer"}
                onFocus={() => (focused.current = i)}
                onInput={(e) => { const n = values.slice(); n[i] = (e.target as HTMLInputElement).value; onChange(n); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } }}
              />
            </label>
            <div class="preview" aria-live="polite">{pv && !disabled ? <Tex src={pv} /> : null}</div>
          </div>
        );
      })}
      {!disabled && (
        <div class="keys" aria-label="Maths symbols">
          {KEYS[answer.kind].map((k) => (
            <button type="button" key={k} class="key" onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k === "−" ? "-" : k)}>{k}</button>
          ))}
        </div>
      )}
    </div>
  );
}
