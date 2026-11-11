import katex from "katex";
import { figureSvg } from "./figures";
import type { Block, Concept } from "./types";

/** Turning a concept into HTML text, for the public study pages made at build time. The app draws the same content with its own components. */
const SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g;
export const escapeHtml = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Text with $inline$ and $$display$$ maths, as HTML. */
export function mathsToHtml(text: string): string {
  return text.split(SPLIT).filter(Boolean).map((part) => {
    if (part.startsWith("$$")) return katex.renderToString(part.slice(2, -2), { throwOnError: false, displayMode: true, output: "html", strict: "ignore" });
    if (part.startsWith("$")) return katex.renderToString(part.slice(1, -1), { throwOnError: false, output: "html", strict: "ignore" });
    return escapeHtml(part);
  }).join("");
}

/** The plain words of some text, with the maths markers taken out. Used for search and descriptions. */
export const plainText = (text: string) => text.replace(/\$\$?([^$]+)\$\$?/g, "$1").replace(/\\[a-zA-Z]+/g, "").replace(/[{}^_]/g, "");

export const blocksToHtml = (blocks: Block[]): string => blocks.map((b) => "p" in b ? `<p>${mathsToHtml(b.p)}</p>` : "h" in b ? `<h3>${escapeHtml(b.h)}</h3>` : `<ul>${b.list.map((i) => `<li>${mathsToHtml(i)}</li>`).join("")}</ul>`).join("\n");

export const conceptPath = (id: string) => `learn/${id}.html`;

/** The body of a concept page, as HTML. */
export function conceptBodyHtml(c: Concept, skillNames: Record<string, string>): string {
  return `<p class="concept-years">${escapeHtml(c.years)}</p>
<p class="concept-summary">${escapeHtml(c.summary)}</p>
<figure class="concept-figure">${figureSvg(c.figure.id, c.figure.param)}<figcaption>${mathsToHtml(c.figure.caption)}</figcaption></figure>
<section aria-labelledby="c-kid"><h2 id="c-kid">For learners</h2>${blocksToHtml(c.kid)}</section>
<section class="concept-example" aria-labelledby="c-ex"><h2 id="c-ex">A worked example</h2><p>${mathsToHtml(c.example.prompt)}</p><ol>${c.example.steps.map((s) => `<li>${mathsToHtml(s)}</li>`).join("")}</ol></section>
<section aria-labelledby="c-grown"><h2 id="c-grown">For grown-ups</h2>${blocksToHtml(c.grownUp)}</section>
<section aria-labelledby="c-why"><h2 id="c-why">Why it matters</h2><p>${mathsToHtml(c.why)}</p></section>
${c.skills.length ? `<section aria-labelledby="c-skills"><h2 id="c-skills">Topics in quarter that use this</h2><ul>${c.skills.map((id) => `<li>${escapeHtml(skillNames[id] ?? id)}</li>`).join("")}</ul></section>` : ""}
<section aria-labelledby="c-more"><h2 id="c-more">Read more</h2><ul>${c.further.map((f) => `<li><a class="legal-link" href="${escapeHtml(f.url)}" rel="noopener noreferrer">${escapeHtml(f.label)}</a></li>`).join("")}</ul></section>`;
}
