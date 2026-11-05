import { useEffect, useRef } from "preact/hooks";
import type { Answer } from "../engine/types";
import { previewLatex } from "../engine/expr";
import { Icon } from "./icons";
import { Tex } from "./maths";

export type InputState = "idle" | "right" | "wrong" | "nearly";

const isTouch = () => typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;

interface Key { k: string; span?: number; fn?: boolean; label?: string }
const NUMBER_KEYS: Key[][] = [
  [{ k: "7" }, { k: "8" }, { k: "9" }, { k: "⌫", fn: true, label: "Delete" }],
  [{ k: "4" }, { k: "5" }, { k: "6" }, { k: "/", fn: true, label: "Fraction bar" }],
  [{ k: "1" }, { k: "2" }, { k: "3" }, { k: "−", fn: true, label: "Minus" }],
  [{ k: "0", span: 2 }, { k: ".", span: 2, label: "Decimal point" }],
];
const DIGIT_KEYS: Key[][] = [
  [{ k: "1" }, { k: "2" }, { k: "3" }], [{ k: "4" }, { k: "5" }, { k: "6" }], [{ k: "7" }, { k: "8" }, { k: "9" }],
  [{ k: "0", span: 2 }, { k: "⌫", fn: true, label: "Delete" }],
];
const EXPR_KEYS: Key[][] = [
  [{ k: "7" }, { k: "8" }, { k: "9" }, { k: "⌫", fn: true, label: "Delete" }],
  [{ k: "4" }, { k: "5" }, { k: "6" }, { k: "(", fn: true }],
  [{ k: "1" }, { k: "2" }, { k: "3" }, { k: ")", fn: true }],
  [{ k: "0" }, { k: "." }, { k: "x", fn: true }, { k: "^", fn: true, label: "To the power of" }],
  [{ k: "+", fn: true }, { k: "−", fn: true, label: "Minus" }, { k: "×", fn: true, label: "Times" }, { k: "/", fn: true, label: "Divide" }],
];

/** A keypad made for answers: big targets, only the keys this answer can use. Shown on touch screens. */
export function Keypad({ mode, onKey }: { mode: "number" | "expr" | "digits"; onKey: (k: string) => void }) {
  const rows = mode === "expr" ? EXPR_KEYS : mode === "digits" ? DIGIT_KEYS : NUMBER_KEYS;
  return (
    <div class={`keypad ${mode}`} role="group" aria-label="Number pad">
      {rows.flat().map((key, i) => (
        <button
          type="button" key={i} class={`pad-key ${key.fn ? "fn" : ""}`} style={key.span ? { gridColumn: `span ${key.span}` } : undefined}
          aria-label={key.label ?? key.k}
          onMouseDown={(e) => e.preventDefault()} // keep focus in the field
          onClick={() => onKey(key.k)}
        >
          {key.k === "⌫" ? <Icon name="backspace" size={22} /> : key.k}
        </button>
      ))}
    </div>
  );
}

/** Applies one keypad key to a string at a caret position. Returns the new text and caret. */
export function applyKey(text: string, key: string, from: number, to: number): { text: string; caret: number } {
  if (key === "⌫") {
    if (from !== to) return { text: text.slice(0, from) + text.slice(to), caret: from };
    return from === 0 ? { text, caret: 0 } : { text: text.slice(0, from - 1) + text.slice(to), caret: from - 1 };
  }
  const ins = key === "−" ? "-" : key;
  return { text: text.slice(0, from) + ins + text.slice(to), caret: from + ins.length };
}

export function AnswerInput(props: {
  answer: Answer;
  values: string[];
  onChange: (v: string[]) => void;
  onSubmit: () => void;
  disabled?: boolean;
  state?: InputState;
}) {
  const { answer, values, onChange, onSubmit, disabled, state = "idle" } = props;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focused = useRef(0);
  const touch = isTouch();
  const fraction = answer.kind === "number" && !!answer.simplestFraction;
  const fieldCount = answer.kind === "multi" ? answer.fields.length : fraction ? 2 : 1;
  const labels = answer.kind === "multi" ? answer.fields.map((f) => f.label) : [answer.label ?? ""];
  const keypadMode: "number" | "expr" | null = answer.kind === "expr" ? "expr" : "number";

  useEffect(() => { if (!disabled && !touch) refs.current[0]?.focus(); }, []);

  // A fraction answer is kept as "n/d" in values[0], so marking works unchanged.
  const get = (i: number): string => (fraction ? (values[0] ?? "").split("/")[i] ?? "" : values[i] ?? "");
  const put = (i: number, text: string) => {
    if (fraction) {
      const n = i === 0 ? text : get(0), d = i === 1 ? text : get(1);
      onChange([d !== "" || i === 1 ? `${n}/${d}` : n]);
      return;
    }
    const next = values.slice();
    next[i] = text;
    onChange(next);
  };

  const press = (key: string) => {
    // On a stacked fraction the fraction bar means "now the bottom number".
    if (fraction && key === "/") { focused.current = 1; refs.current[1]?.focus(); return; }
    const i = focused.current;
    const el = refs.current[i];
    const cur = get(i);
    const from = el?.selectionStart ?? cur.length, to = el?.selectionEnd ?? cur.length;
    const out = applyKey(cur, key, from, to);
    put(i, out.text);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(out.caret, out.caret); });
  };

  const field = (i: number, cls: string, label?: string) => (
    <input
      ref={(el) => { refs.current[i] = el; }}
      class={cls}
      value={get(i)}
      disabled={disabled}
      inputMode={touch ? "none" : answer.kind === "expr" ? "text" : "decimal"}
      enterKeyHint="done"
      autoCapitalize="off" autoComplete="off" spellcheck={false}
      placeholder={answer.kind === "expr" ? "Your answer, like 3x + 5" : ""}
      aria-label={label || (fraction ? (i === 0 ? "Top number" : "Bottom number") : "Your answer")}
      data-testid={`answer-${i}`}
      onFocus={() => (focused.current = i)}
      onInput={(e) => put(i, (e.target as HTMLInputElement).value)}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSubmit(); } }}
    />
  );

  const raw = answer.kind === "expr" ? previewLatex(values[0] ?? "") : null;
  const pv = raw && /[\\^]/.test(raw) ? raw : null; // only worth showing when it adds something: powers, fractions, brackets

  return (
    <div class="answer" data-state={state}>
      {fraction ? (
        <div class="frac" role="group" aria-label="Fraction">
          {field(0, "frac-input")}
          <span class="frac-bar" aria-hidden="true" />
          {field(1, "frac-input")}
        </div>
      ) : (
        <div class={`fields ${fieldCount > 1 ? "multi" : ""}`}>
          {labels.map((label, i) => (
            <label class="field" key={i}>
              {label && <span class="field-tag">{label.replace(/\s*=\s*$/, "")}{/=/.test(label) ? " =" : ""}</span>}
              {field(i, "field-input", label)}
            </label>
          ))}
        </div>
      )}
      <div class="preview" aria-live="polite">{pv && !disabled ? <Tex src={pv} /> : null}</div>
      {!disabled && touch && keypadMode && <Keypad mode={keypadMode} onKey={press} />}
    </div>
  );
}
