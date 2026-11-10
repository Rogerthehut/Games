import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { copyright, designer, footerGroups } from "../src/legal/content";
import content from "../src/parents/content.json";
import admissions from "../src/parents/admissions.json";

type Link = { path: string; label: string };
type Section = { heading: string; paragraphs: string[]; link?: Link };
const { hub, faq, guides } = content;
const pages = [hub, faq, ...guides];

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function link({ path, label }: Link, css = "legal-link") {
  return `<a class="${css}" href="${escapeHtml(path)}">${escapeHtml(label)}</a>`;
}

function sectionBody(section: Section) {
  return section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
    + (section.link ? `<p>${link(section.link)}</p>` : "");
}

const TEST_STATUS = {
  confirmed: "Confirmed on an official page",
  reported: "Reported by tutoring sites. Check the official page",
  disputed: "Sources disagree. Check with the school",
} as const;

function checkedOn(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function testNote(test: (typeof admissions)[number]["test"]) {
  if (!test) return `<p class="test-provider unchecked"><strong>Test provider:</strong> not checked yet. Ask the school or council.</p>`;
  return `<p class="test-provider ${test.status}"><strong>Test provider:</strong> ${escapeHtml(test.provider)}</p>
<p class="small muted">${TEST_STATUS[test.status as keyof typeof TEST_STATUS]}. Checked ${checkedOn(test.checked)}. ${escapeHtml(test.note)}${test.source ? ` ${link(test.source)}` : ""}</p>`;
}

function testFinder() {
  return `<section id="test-finder" aria-labelledby="test-finder-title" class="test-finder">
<h2 id="test-finder-title">Find your local 11+ test</h2>
<p>Search by area, school or test name. The directory covers state selective admissions and includes Northern Ireland’s transfer test. Open the official admissions page for your child’s entry year and look for any familiarisation materials it recommends.</p>
<p class="small muted">Test providers change, and councils and schools can run different tests. We show who sets each test only where we have checked, and say how sure we are. Always confirm with the school before choosing what to practise.</p>
<div class="test-finder-search" hidden>
<label for="test-finder-query">Search 11+ guidance</label>
<input id="test-finder-query" type="search" placeholder="For example, Bromley or Tiffin" autocomplete="off">
<p class="small muted" role="status"></p>
</div>
<ul class="rows sitemap-links">${admissions.map(({ id, area, keywords, links, test }) => `
<li id="${id}" data-test-area="${escapeHtml(area + " " + keywords)}">
<article class="test-finder-entry">
<h3>${escapeHtml(area)}</h3>
${testNote(test)}
<ul>${links.map((item) => `<li>${link(item)}</li>`).join("")}</ul>
</article>
</li>`).join("")}</ul>
<p>For a school that is missing, check its admissions page or use the ${link({path:"https://www.gov.uk/schools-admissions",label:"GOV.UK school admissions guide"})} to find the relevant council.</p>
</section><script src="./test-finder.js" defer></script>`;
}

function documentHtml(page: (typeof pages)[number], styles: string) {
  const body = page === hub
    ? `<nav aria-label="Parent resources"><ul class="rows sitemap-links">${[faq, ...guides].map(({ path, title, description }) =>
      `<li><a class="row" href="${path}"><span>${escapeHtml(title)}<small>${escapeHtml(description)}</small></span></a></li>`).join("")}</ul></nav>`
    : "sections" in page
      ? page.sections.map((section, index) => page === faq
        ? `<details class="parent-faq"><summary>${escapeHtml(section.heading)}</summary><div>${sectionBody(section)}</div></details>`
        : `<section><h2>${escapeHtml(section.heading)}</h2>${sectionBody(section)}</section>${page.path === "11-plus-maths.html" && index === 0 ? `<p>${link({ path: "#test-finder", label: "Find your local 11+ test" })}</p>` : ""}`).join("")
      : "";
  const groups = footerGroups({ hub, faq });
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(page.title)} | quarter</title>
<meta name="description" content="${escapeHtml(page.description)}">
<link rel="canonical" href="https://yourquarter.co.uk/${page.path}">
<link rel="icon" href="./icon.svg?v=quarter" type="image/svg+xml">
${styles}
</head>
<body>
<main class="page legal-page parent-resource">
<a class="legal-home" href="./" aria-label="Back to quarter"><img class="cube-mark" src="./icon.svg" alt=""><span class="wordmark" aria-hidden="true">qua<svg class="wordmark-slash" viewBox="0 0 14 20" focusable="false"><path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z"/></svg>ter<sup class="wordmark-tm">™</sup></span></a>
${page === hub ? "" : `<p>${link({ path: hub.path, label: "All parent guides" })}</p>`}
<h1>${escapeHtml(page.title)}</h1>
<p class="muted">${escapeHtml(page.description)}</p>
${body}
${page.path === "11-plus-maths.html" ? testFinder() : ""}
<footer class="legal-footer"><div class="footer-groups">${groups.map((group, i) => `<nav aria-labelledby="footer-h${i}"><h2 id="footer-h${i}">${escapeHtml(group.heading)}</h2><ul>${group.links.map((item) => `<li>${link({ path: item.href, label: item.label })}</li>`).join("")}</ul></nav>`).join("")}</div><div class="footer-credit"><img class="cube-mark" src="./icon.svg" alt=""><small>${copyright}</small><small>Designed and built by ${link({path:designer.href,label:designer.name})}</small></div></footer>
</main>
</body>
</html>
`;
}

export function parentPages(): Plugin {
  return {
    name: "quarter-parent-pages",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0];
        const page = pages.find((item) => `/${item.path}` === path);
        if (!page) return next();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(documentHtml(page, '<link rel="stylesheet" href="/src/fonts.css"><link rel="stylesheet" href="/src/styles.css">'));
      });
    },
    writeBundle(options) {
      const directory = resolve(options.dir ?? "dist");
      const index = readFileSync(resolve(directory, "index.html"), "utf8");
      const styles = index.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)?.join("\n");
      if (!styles) throw new Error("quarter's built stylesheet is missing.");
      for (const page of pages) {
        writeFileSync(resolve(directory, page.path), documentHtml(page, styles));
      }
    },
  };
}
