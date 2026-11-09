import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { Icon } from "./icons";

type Counter = "rose" | "mint";
type Picked = { colour: Counter; from?: number };
type Point = { x: number; y: number };
type Stroke = { points: Point[]; erase: boolean; width: number };
type DrawingSize = "Small" | "Medium" | "Large";

const PLACES = ["Thousands", "Hundreds", "Tens", "Ones"];
const EMPTY_ABACUS = [0, 0, 0, 0];
const DRAWING_SIZES: DrawingSize[] = ["Small", "Medium", "Large"];
const PEN_WIDTHS: Record<DrawingSize, number> = { Small: 5, Medium: 12, Large: 24 };
const ERASER_WIDTHS: Record<DrawingSize, number> = { Small: 18, Medium: 36, Large: 120 };

export function WorkingOut({ suggestCounters = false }: { suggestCounters?: boolean }) {
  const [tool, setTool] = useState<"counters" | "paper" | "abacus">(suggestCounters ? "counters" : "paper");
  const [digits, setDigits] = useState(EMPTY_ABACUS);
  const changeBeads = (column: number, change: number) => {
    setDigits((previous) => previous.map((digit, index) => index === column ? Math.min(9, Math.max(0, digit + change)) : digit));
  };
  const [cells, setCells] = useState<(Counter | null)[]>(() => Array(20).fill(null));
  const [picked, setPicked] = useState<Picked | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [eraser, setEraser] = useState(false);
  const [penSize, setPenSize] = useState<DrawingSize>("Small");
  const [eraserSize, setEraserSize] = useState<DrawingSize>("Medium");
  const sizeLabel = eraser ? "Eraser size" : "Pen size";
  const selectedSize = eraser ? eraserSize : penSize;
  const [squared, setSquared] = useState(true);
  const [questionWidth, setQuestionWidth] = useState(50);
  const [paperHeight, setPaperHeight] = useState<number>();
  const paperResize = useRef<{ y: number; height: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const drag = useRef<Picked | null>(null);
  const drawing = useRef<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const place = (counter: Picked, index: number) => {
    setCells((previous) => previous.map((value, i) => {
      if (i === index) return counter.colour;
      if (i === counter.from) return previous[index];
      return value;
    }));
    setPicked(null);
  };

  const tapCell = (index: number) => {
    const colour = cells[index];
    if (picked?.from === index) setPicked(null);
    else if (picked && (!colour || picked.from !== undefined)) place(picked, index);
    else if (colour) setPicked({ colour, from: index });
  };

  const dragProps = (counter: Picked) => ({
    draggable: true,
    onDragStart: (event: JSX.TargetedDragEvent<HTMLButtonElement>) => {
      drag.current = counter;
      setPicked(counter);
      event.dataTransfer?.setData("text/plain", "MathPath counter");
    },
    onDragEnd: () => { drag.current = null; setPicked(null); },
  });

  useEffect(() => {
    const paper = canvas.current;
    const ctx = paper?.getContext("2d");
    if (!paper || !ctx) return;
    ctx.clearRect(0, 0, paper.width, paper.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(paper).color;
    for (const { points: [start, ...points], erase, width } of strokes) {
      ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      if (!points.length) ctx.lineTo(start.x + 0.01, start.y);
      for (const point of points) ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }, [strokes, tool]);

  const paperPoint = (event: JSX.TargetedPointerEvent<HTMLCanvasElement>) => {
    const paper = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1200, Math.max(0, (event.clientX - paper.left) * 1200 / paper.width)),
      y: Math.min(600, Math.max(0, (event.clientY - paper.top) * 600 / paper.height)),
    };
  };

  function resizeQuestion(handle: HTMLDivElement, percent: number) {
    const width = Math.min(62, Math.max(32, Math.round(percent)));
    handle.closest<HTMLElement>(".question-desk")?.style.setProperty("--question-share", `${width}%`);
    setQuestionWidth(width);
  }

  function resizePaper(height: number) {
    setPaperHeight(Math.min(760, Math.max(160, Math.round(height))));
  }

  return (
    <section id="question-tools" class="working-out" aria-label="Working-out tools" tabIndex={-1} hidden>
      <div class="workspace-divider" role="separator" tabIndex={0} aria-label="Resize question and working area"
        aria-orientation="vertical" aria-valuemin={32} aria-valuemax={62} aria-valuenow={questionWidth}
        onPointerDown={(event) => {
          if (event.button === 0) event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const handle = event.currentTarget;
          if (!handle.hasPointerCapture(event.pointerId)) return;
          const bounds = handle.closest(".question-desk")?.getBoundingClientRect();
          if (bounds?.width) resizeQuestion(handle, (event.clientX - bounds.left) / bounds.width * 100);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          resizeQuestion(event.currentTarget, questionWidth + (event.key === "ArrowLeft" ? -3 : 3));
        }} />
      <div class="working-tools help-tools" role="group" aria-label="Pick a maths tool">
        <button type="button" class="btn" aria-pressed={tool === "counters"} onClick={() => setTool("counters")}><Icon name="counters" size={22} /> Count with beans</button>
        <button type="button" class="btn" aria-pressed={tool === "paper"} onClick={() => setTool("paper")}><Icon name="pencil" size={22} /> Work it out</button>
        <button type="button" class="btn" aria-pressed={tool === "abacus"} onClick={() => setTool("abacus")}><Icon name="beads" size={22} /> Count with abacus</button>
      </div>

      {tool === "abacus" ? <>
        <p class="small muted">Tap + to add a bead. Tap − to take one away.</p>
        <p class="abacus-number" aria-live="polite">Your number: <strong>{Number(digits.join("")).toLocaleString("en-GB")}</strong></p>
        <div class="abacus">
          {PLACES.map((place, column) => (
            <div class="abacus-column" role="group" aria-label={place} key={place}>
              <strong>{place}</strong>
              <div class="abacus-rod" aria-hidden="true">
                {Array.from({ length: digits[column] }, (_, i) => <span key={i} />)}
              </div>
              <output aria-label={`${place} beads`}>{digits[column]}</output>
              <div class="abacus-buttons">
                <button type="button" class="btn" aria-label={`Remove one from ${place.toLowerCase()}`} disabled={digits[column] === 0} onClick={() => changeBeads(column, -1)}>−</button>
                <button type="button" class="btn" aria-label={`Add one to ${place.toLowerCase()}`} disabled={digits[column] === 9} onClick={() => changeBeads(column, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" class="btn ghost" disabled={!digits.some(Boolean)} onClick={() => setDigits(EMPTY_ABACUS)}>Clear abacus</button>
      </> : tool === "counters" ? <>
        <p class="small muted" aria-live="polite">{picked ? "Tap an empty square." : "Pick a bean colour."}</p>
        <div class="working-tools">
          {(["rose", "mint"] as const).map((colour) => (
            <button key={colour} type="button" class="btn bean-pool" aria-pressed={picked?.colour === colour && picked.from === undefined}
              onClick={() => setPicked({ colour })} {...dragProps({ colour })}>
              <span class={`bean ${colour}`} />{colour === "rose" ? "Pink bean" : "Green bean"}
            </button>
          ))}
        </div>
        {[0, 10].map((offset) => (
          <div key={offset} class="ten-frame" role="group" aria-label={`Ten-frame ${offset / 10 + 1}`}>
            {cells.slice(offset, offset + 10).map((colour, cell) => {
              const index = offset + cell;
              return (
                <button key={index} ref={(element) => { cellRefs.current[index] = element; }} type="button" class="ten-cell"
                  aria-label={`Square ${index + 1}, ${colour === "rose" ? "pink bean" : colour ? "green bean" : "empty"}`}
                  aria-pressed={picked?.from === index}
                  onClick={() => tapCell(index)}
                  onKeyDown={(event) => {
                    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 }[event.key];
                    if (step === undefined) return;
                    event.preventDefault();
                    cellRefs.current[index + step]?.focus();
                  }}
                  {...(colour ? dragProps({ colour, from: index }) : {})}
                  onDragOver={(event) => { if (drag.current) event.preventDefault(); }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const counter = drag.current;
                    if (counter && (!colour || counter.from !== undefined)) place(counter, index);
                  }}>
                  {colour && <span class={`bean ${colour}`} />}
                </button>
              );
            })}
          </div>
        ))}
        <div class="working-tools">
          <button type="button" class="btn ghost" disabled={picked?.from === undefined} onClick={() => {
            setCells((previous) => previous.map((value, index) => index === picked?.from ? null : value));
            setPicked(null);
          }}>Remove selected bean</button>
          <button type="button" class="btn ghost" disabled={!cells.some(Boolean)} onClick={() => { setCells(Array(20).fill(null)); setPicked(null); }}>Clear board</button>
        </div>
      </> : <>
        <p class="small muted">Draw with a finger, mouse or stylus, or type your steps below.</p>
        <div class="working-tools">
          <button type="button" class="btn ghost" aria-pressed={squared} onClick={() => setSquared(!squared)}><Icon name="grid" size={16} />Squared paper</button>
          <button type="button" class="btn ghost" aria-pressed={expanded} onClick={() => { setPaperHeight(undefined); setExpanded(!expanded); }}><Icon name={expanded ? "shrink" : "expand"} size={16} />{expanded ? "Shrink paper" : "Expand paper"}</button>
          <button type="button" class="btn ghost" aria-pressed={eraser} onClick={() => setEraser(!eraser)}><Icon name="eraser" size={16} />Eraser</button>
          <button type="button" class="btn ghost" disabled={!strokes.length} onClick={() => setStrokes((previous) => previous.slice(0, -1))}><Icon name="undo" size={16} />Undo stroke</button>
        </div>
        <div class="working-tools drawing-sizes" role="group" aria-label={sizeLabel}>
          <span aria-hidden="true">{sizeLabel}</span>
          {DRAWING_SIZES.map((size) => (
            <button key={size} type="button" class="btn ghost" aria-pressed={size === selectedSize}
              onClick={() => (eraser ? setEraserSize : setPenSize)(size)}>
              <span class={`size-swatch ${size.toLowerCase()}`} aria-hidden="true" />{size}
            </button>
          ))}
        </div>
        <canvas ref={canvas} class={`scrap-paper ${squared ? "squared" : ""} ${expanded ? "expanded" : ""}`} style={paperHeight === undefined ? undefined : { height: `${paperHeight}px` }} width={1200} height={600} role="img" aria-label={eraser ? "Drawing area, eraser on" : "Drawing area"}
          onPointerDown={(event) => {
            if (event.button !== 0 || drawing.current !== null) return;
            const focused = document.activeElement;
            if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) focused.blur();
            const point = paperPoint(event);
            drawing.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            const width = eraser ? ERASER_WIDTHS[eraserSize] : PEN_WIDTHS[penSize];
            setStrokes((previous) => [...previous, { points: [point], erase: eraser, width }]);
          }}
          onPointerMove={(event) => {
            if (drawing.current !== event.pointerId) return;
            const point = paperPoint(event);
            setStrokes((previous) => {
              const last = previous[previous.length - 1];
              return [...previous.slice(0, -1), { ...last, points: [...last.points, point] }];
            });
          }}
          onLostPointerCapture={(event) => { if (drawing.current === event.pointerId) drawing.current = null; }} />
        <button type="button" class="paper-resize" aria-label="Resize paper. Use the up and down arrows or drag."
          onPointerDown={(event) => {
            if (event.button !== 0 || !canvas.current) return;
            paperResize.current = { y: event.clientY, height: canvas.current.getBoundingClientRect().height };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = paperResize.current;
            if (start && event.currentTarget.hasPointerCapture(event.pointerId)) resizePaper(start.height + event.clientY - start.y);
          }}
          onLostPointerCapture={() => { paperResize.current = null; }}
          onKeyDown={(event) => {
            if ((event.key !== "ArrowUp" && event.key !== "ArrowDown") || !canvas.current) return;
            event.preventDefault();
            resizePaper(canvas.current.getBoundingClientRect().height + (event.key === "ArrowDown" ? 24 : -24));
          }}>Drag to resize paper</button>
        <label class="working-note">Sticky note
          <textarea rows={3} value={notes} onInput={(event) => setNotes(event.currentTarget.value)} placeholder="Type a step or a reminder…" />
        </label>
      </>}
    </section>
  );
}
