import katex from "katex";

const SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g;

function tex(src: string, display: boolean): string {
  return katex.renderToString(src, { throwOnError: false, displayMode: display, output: "html", strict: "ignore" });
}

/** Text with $inline$ and $$display$$ maths. Content comes from our own generators. */
export function Maths({ text, class: cls }: { text: string; class?: string }) {
  const parts = text.split(SPLIT).filter(Boolean);
  return (
    <span class={cls}>
      {parts.map((p, i) =>
        p.startsWith("$$") ? (
          <span key={i} class="maths-block" dangerouslySetInnerHTML={{ __html: tex(p.slice(2, -2), true) }} />
        ) : p.startsWith("$") ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: tex(p.slice(1, -1), false) }} />
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

export function Tex({ src }: { src: string }) {
  return <span dangerouslySetInnerHTML={{ __html: tex(src, false) }} />;
}
