import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { companyLine, copyright, designer, footerGroups } from "../src/legal/content";
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
  return `<a class="${css}" href="${escapeHtml(path)}"${/^https?:/.test(path) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(label)}</a>`;
}

function sectionBody(section: Section) {
  return section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
    + (section.link ? `<p>${link(section.link)}</p>` : "");
}

const TEST_STATUS = {
  confirmed: "Confirmed on an official page",
  reported: "Stated on a school or tutoring page. Check the official page",
  disputed: "Sources disagree. Check with the school",
} as const;

function checkedOn(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function testNote(test: (typeof admissions)[number]["test"]) {
  if (!test) return `<p class="test-provider unchecked"><strong>Test provider:</strong> the school and council publish this each year. Check their admissions pages below for the test your child will sit.</p>`;
  return `<p class="test-provider ${test.status}"><strong>Test provider:</strong> ${escapeHtml(test.provider)}</p>
<p class="small muted">${TEST_STATUS[test.status as keyof typeof TEST_STATUS]}. Checked ${checkedOn(test.checked)}. ${escapeHtml(test.note)}${test.source ? ` ${link(test.source)}` : ""}</p>${"parts" in test && test.parts?.length ? `\n<p class="small muted"><strong>Covers:</strong> ${test.parts.map(escapeHtml).join(", ")}.</p>` : ""}`;
}

type School = { name: string; type?: string; test: string; parts?: string[]; note: string; source: { label: string; path: string }; checked: string };
/** A table of the schools we've checked in an area. Only schools whose own page we've read are listed. */
function schoolTable(schools: School[] | undefined) {
  if (!schools?.length) return "";
  return `<div class="school-table-wrap"><table class="school-table"><caption>Schools we've checked</caption><thead><tr><th scope="col">School</th><th scope="col">Entry test</th><th scope="col">What we found</th></tr></thead><tbody>${schools.map((s) => `<tr><th scope="row">${escapeHtml(s.name)}${s.type ? `<br><span class="small muted">${escapeHtml(s.type)}</span>` : ""}</th><td>${escapeHtml(s.test)}${s.parts?.length ? `<br><span class="small muted">${s.parts.map(escapeHtml).join(", ")}</span>` : ""}</td><td>${escapeHtml(s.note)} <span class="small muted">Checked ${checkedOn(s.checked)}.</span> ${link(s.source)}</td></tr>`).join("")}</tbody></table></div>`;
}

function testFinder() {
  return `<section id="test-finder" aria-labelledby="test-finder-title" class="test-finder">
<h2 id="test-finder-title">Find your local 11+ test</h2>
<p>Search by area, school or test name. The directory covers state selective admissions and includes Northern Ireland’s transfer test. Open the official admissions page for your child’s entry year and look for any familiarisation materials it recommends.</p>
<p class="small muted">Test providers change, and councils and schools can run different tests. We show who sets each test where we’ve been able to check, and say how sure we are. Elsewhere, the links point you to the source. Always confirm with the school before choosing what to practise.</p>
<div class="test-finder-search" hidden>
<label for="test-finder-query">Search by postcode, area or school</label>
<input id="test-finder-query" type="search" placeholder="For example, BR1 3AB, Bromley or Tiffin" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="search">
<p class="small muted" role="status" aria-live="polite"></p>
<p class="small muted test-finder-privacy">If you type a postcode, only its first half (such as BR1) is used to find your council area. The rest is never sent or kept.</p>
</div>
<ul class="rows sitemap-links">${admissions.map(({ id, area, keywords, links, test, councils, ...rest }) => `
<li id="${id}" data-test-area="${escapeHtml(area + " " + keywords)}" data-councils="${escapeHtml(councils.join("|"))}">
<article class="test-finder-entry">
<h3>${escapeHtml(area)}</h3>
${testNote(test)}
${schoolTable((rest as { schools?: School[] }).schools)}
<ul>${links.map((item) => `<li>${link(item)}</li>`).join("")}</ul>
</article>
</li>`).join("")}</ul>
<p>For a school that is missing, check its admissions page or use the ${link({path:"https://www.gov.uk/schools-admissions",label:"GOV.UK school admissions guide"})} to find the relevant council.</p>
</section><script src="./test-finder.js" defer></script>`;
}

/** Structured data for search engines and AI tools: FAQs as questions and answers, guides as articles. */
function jsonLd(page: (typeof pages)[number]) {
  const url = `https://yourquarter.co.uk/${page.path}`;
  const publisher = { "@type": "Organization", name: "quarter", url: "https://yourquarter.co.uk/", logo: "https://yourquarter.co.uk/icon-512.png" };
  const crumbs = { "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "quarter", item: "https://yourquarter.co.uk/" },
    ...(page === hub ? [] : [{ "@type": "ListItem", position: 2, name: hub.title, item: `https://yourquarter.co.uk/${hub.path}` }]),
    { "@type": "ListItem", position: page === hub ? 2 : 3, name: page.title, item: url },
  ] };
  const main = page === faq && "sections" in page
    ? { "@type": "FAQPage", url, inLanguage: "en-GB", mainEntity: page.sections.map((q) => ({ "@type": "Question", name: q.heading, acceptedAnswer: { "@type": "Answer", text: q.paragraphs.join(" ") } })) }
    : page === hub
      ? { "@type": "CollectionPage", url, name: page.title, description: page.description, inLanguage: "en-GB" }
      : { "@type": "Article", url, headline: page.title, description: page.description, inLanguage: "en-GB", publisher };
  return JSON.stringify({ "@context": "https://schema.org", "@graph": [main, crumbs] }).replace(/</g, "\\u003c");
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
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0f766e">
<link rel="icon" href="./icon.svg?v=quarter" type="image/svg+xml">
<link rel="icon" href="./favicon.ico" sizes="48x48">
<link rel="icon" href="./favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="./favicon-16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="./apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="quarter blog" href="https://yourquarter.co.uk/blog/rss.xml">
<meta property="og:type" content="article">
<meta property="og:site_name" content="quarter">
<meta property="og:locale" content="en_GB">
<meta property="og:title" content="${escapeHtml(page.title)} | quarter">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="https://yourquarter.co.uk/${page.path}">
<meta property="og:image" content="https://yourquarter.co.uk/og-image.png">
<meta property="og:image:alt" content="quarter: maths and STEM practice for Years 3 to 13">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(page.title)} | quarter">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
<meta name="twitter:image" content="https://yourquarter.co.uk/og-image.png">
<script type="application/ld+json">${jsonLd(page)}</script>
${styles}
</head>
<body>
<main class="page legal-page parent-resource">
<a class="legal-home" href="./" aria-label="Back to quarter"><img class="cube-mark" src="./icon.svg" alt=""><span class="wordmark" role="img" aria-label="quarter"><span aria-hidden="true">qua<svg class="wordmark-slash" viewBox="0 0 14 20" focusable="false"><path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z"/></svg>ter</span><sup class="wordmark-tm" aria-hidden="true">™</sup></span></a>
<a class="btn small page-back" href="./" data-back><span aria-hidden="true">←</span> Back</a>
${page === hub ? "" : `<p>${link({ path: hub.path, label: "All parent guides" })}</p>`}
<h1>${escapeHtml(page.title)}</h1>
<p class="muted">${escapeHtml(page.description)}</p>
${body}
${page.path === "11-plus-maths.html" ? testFinder() : ""}
<footer class="legal-footer"><div class="footer-groups">${groups.map((group, i) => `<nav aria-labelledby="footer-h${i}"><h2 id="footer-h${i}">${escapeHtml(group.heading)}</h2><ul>${group.links.map((item) => `<li>${link({ path: item.href, label: item.label })}</li>`).join("")}</ul></nav>`).join("")}</div><div class="footer-credit"><img class="cube-mark" src="./icon.svg" alt=""><small>${copyright}</small><small>${designer.credit} · ${link({path:designer.href,label:designer.name})}</small></div><p class="footer-company small">${escapeHtml(companyLine)}</p></footer>
</main>
<script src="./back.js" defer></script>
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
