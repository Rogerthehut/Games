import type { Glyph, Mark } from "../engine/types";

const RADIUS = { 1: 20, 2: 31, 3: 43 } as const;
let patternId = 0;

const regular = (n: number, r: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return [r * Math.sin(a), -r * Math.cos(a)] as const;
  });

/** Outlines are drawn pointing up, centred on 0,0, then turned by the mark's rotation. */
function outline(shape: Mark["shape"], r: number): readonly (readonly [number, number])[] | null {
  switch (shape) {
    case "circle": return null;
    case "square": return [[-0.78 * r, -0.78 * r], [0.78 * r, -0.78 * r], [0.78 * r, 0.78 * r], [-0.78 * r, 0.78 * r]];
    case "triangle": return [[0, -r], [0.87 * r, 0.5 * r], [-0.87 * r, 0.5 * r]];
    case "diamond": return [[0, -r], [0.7 * r, 0], [0, r], [-0.7 * r, 0]];
    case "pentagon": return regular(5, r);
    case "hexagon": return regular(6, r);
    case "heptagon": return regular(7, r);
    case "octagon": return regular(8, r);
    case "star": return Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * 2 * Math.PI, rr = i % 2 ? 0.45 * r : r;
      return [rr * Math.sin(a), -rr * Math.cos(a)] as const;
    });
    case "cross": { const w = 0.27 * r; return [[-w, -r], [w, -r], [w, -w], [r, -w], [r, w], [w, w], [w, r], [-w, r], [-w, w], [-r, w], [-r, -w], [-w, -w]]; }
    case "arrow": return [[0, -r], [0.62 * r, -0.05 * r], [0.25 * r, -0.05 * r], [0.25 * r, r], [-0.25 * r, r], [-0.25 * r, -0.05 * r], [-0.62 * r, -0.05 * r]];
    case "ell": return [[-0.6 * r, -r], [-0.08 * r, -r], [-0.08 * r, 0.42 * r], [0.7 * r, 0.42 * r], [0.7 * r, r], [-0.6 * r, r]];
    case "half": return null;
  }
}

const SHAPE_NAME: Record<Mark["shape"], string> = {
  circle: "circle", square: "square", triangle: "triangle", diamond: "diamond", pentagon: "pentagon", hexagon: "hexagon",
  heptagon: "heptagon", octagon: "octagon", star: "star", cross: "cross", arrow: "arrow", ell: "L shape", half: "half circle",
};

/** Words for a screen reader. */
export function describeGlyph(g: Glyph | null): string {
  if (!g) return "missing shape";
  if ("grid" in g) {
    const shaded = g.grid.flat().filter(Boolean).length;
    return `grid with ${shaded} shaded squares`;
  }
  return g.marks.map((m) => {
    const size = m.size === 1 ? "small" : m.size === 2 ? "medium" : "large";
    const fill = m.fill === "none" ? "empty" : m.fill === "solid" ? "black" : m.fill === "stripe" ? "striped" : "pale";
    const turn = m.rot % 360 ? `, turned ${((m.rot % 360) + 360) % 360} degrees` : "";
    return `${size} ${fill} ${SHAPE_NAME[m.shape]}${m.flip ? ", flipped" : ""}${turn}`;
  }).join(" and ");
}

function Shape({ mark, stripe }: { mark: Mark; stripe: string }) {
  const r = RADIUS[mark.size];
  const pts = outline(mark.shape, r);
  const fill = mark.fill === "none" ? "none" : mark.fill === "solid" ? "currentColor" : mark.fill === "stripe" ? `url(#${stripe})` : "currentColor";
  const opacity = mark.fill === "light" ? 0.22 : 1;
  const common = { fill, "fill-opacity": opacity, stroke: "currentColor", "stroke-width": 3.2, "stroke-linejoin": "round" as const };
  const transform = `translate(${50 + (mark.x ?? 0)} ${50 + (mark.y ?? 0)}) rotate(${mark.rot}) scale(${mark.flip ? -1 : 1} 1)`;
  return (
    <g transform={transform}>
      {mark.shape === "circle" ? <circle r={r} {...common} />
        : mark.shape === "half" ? <path d={`M ${-r} ${r * 0.3} A ${r} ${r} 0 0 1 ${r} ${r * 0.3} Z`} transform="translate(0 -4)" {...common} />
        : <polygon points={pts!.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")} {...common} />}
    </g>
  );
}

/** One picture. `size` is the width and height in CSS pixels. */
export function GlyphView({ glyph, size = 84, label }: { glyph: Glyph; size?: number; label?: string }) {
  const stripe = `stripe-${++patternId}`;
  if ("grid" in glyph) {
    const rows = glyph.grid.length, cols = glyph.grid[0].length;
    const cell = 80 / Math.max(rows, cols);
    const x0 = 50 - (cols * cell) / 2, y0 = 50 - (rows * cell) / 2;
    return (
      <svg class="glyph" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ?? describeGlyph(glyph)}>
        {glyph.grid.map((row, r) => row.map((v, c) => (
          <rect key={`${r}-${c}`} x={x0 + c * cell} y={y0 + r * cell} width={cell} height={cell}
            fill={v ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.6" opacity={v ? 1 : 0.55} />
        )))}
        <rect x={x0} y={y0} width={cols * cell} height={rows * cell} fill="none" stroke="currentColor" stroke-width="3" />
      </svg>
    );
  }
  return (
    <svg class="glyph" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ?? describeGlyph(glyph)}>
      <defs>
        <pattern id={stripe} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="none" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" stroke-width="3.4" />
        </pattern>
      </defs>
      {glyph.marks.map((m, i) => <Shape key={i} mark={m} stripe={stripe} />)}
    </svg>
  );
}

const Unknown = ({ size }: { size: number }) => (
  <span class="glyph-unknown" style={{ width: `${size}px`, height: `${size}px` }} role="img" aria-label="missing shape">?</span>
);

/** The picture part of a reasoning question. */
export function GlyphFigure({ layout, items, caption }: { layout: "series" | "analogy" | "mirror" | "single"; items: (Glyph | null)[]; caption?: string }) {
  const narrow = typeof matchMedia !== "undefined" && matchMedia("(max-width: 480px)").matches;
  const size = layout === "single" || layout === "mirror" ? (narrow ? 110 : 130)
    : layout === "analogy" ? (narrow ? 50 : 84)
    : items.length > 4 ? (narrow ? 54 : 80) : (narrow ? 70 : 90);
  const cell = (g: Glyph | null, i: number) => <div class="glyph-cell" key={i}>{g ? <GlyphView glyph={g} size={size} /> : <Unknown size={size} />}</div>;
  return (
    <figure class={`glyph-figure ${layout}`} aria-label={caption ?? "Picture puzzle"}>
      {layout === "analogy" ? (
        <div class="analogy-row">
          {cell(items[0], 0)}<span class="glyph-arrow" aria-label="is to">→</span>{cell(items[1], 1)}
          <span class="glyph-gap" aria-label="as">as</span>
          {cell(items[2], 2)}<span class="glyph-arrow" aria-label="is to">→</span>{cell(items[3], 3)}
        </div>
      ) : layout === "mirror" ? (
        <div class="mirror-row">{cell(items[0], 0)}<span class="mirror-line" aria-label="mirror line" /></div>
      ) : (
        <div class="series-row">{items.map((g, i) => <>{cell(g, i)}{layout === "series" && i < items.length - 1 && <span class="glyph-comma" aria-hidden="true" />}</>)}</div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
