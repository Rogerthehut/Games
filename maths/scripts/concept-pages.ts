import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { CONCEPTS } from "../src/concepts/library";
import { conceptBodyHtml, conceptPath, escapeHtml, plainText } from "../src/concepts/render";
import { SKILL_BY_ID } from "../src/curriculum";
import { companyLine, copyright, designer, footerGroups } from "../src/legal/content";
import content from "../src/parents/content.json";

/** The public study pages: one for each idea in the library, and an index. They are plain HTML, so people and search engines can read them. */
const SITE = "https://yourquarter.co.uk";
const skillNames = Object.fromEntries(Object.keys(SKILL_BY_ID).map((id) => [id, SKILL_BY_ID[id].name]));
const slash = `<span class="wordmark" aria-hidden="true">qua<svg class="wordmark-slash" viewBox="0 0 14 20" focusable="false"><path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z"/></svg>ter<sup class="wordmark-tm">™</sup></span>`;
const link = (href: string, label: string) => `<a class="legal-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;

function shell(opts: { title: string; description: string; path: string; body: string; jsonLd: object; styles: string }) {
  const groups = footerGroups({ hub: content.hub, faq: content.faq });
  const url = `${SITE}/${opts.path}`;
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<base href="/">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(opts.title)} | quarter</title>
<meta name="description" content="${escapeHtml(opts.description)}">
<link rel="canonical" href="${url}">
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
<meta property="og:title" content="${escapeHtml(opts.title)} | quarter">
<meta property="og:description" content="${escapeHtml(opts.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(opts.jsonLd).replace(/</g, "\\u003c")}</script>
${opts.styles}
</head>
<body>
<main class="page legal-page parent-resource concept-static">
<a class="legal-home" href="./" aria-label="Back to quarter"><img class="cube-mark" src="./icon.svg" alt="">${slash}</a>
<p>${link("learn/index.html", "All study guides")}</p>
<h1>${escapeHtml(opts.title)}</h1>
${opts.body}
<footer class="legal-footer"><div class="footer-groups">${groups.map((g, i) => `<nav aria-labelledby="footer-h${i}"><h2 id="footer-h${i}">${escapeHtml(g.heading)}</h2><ul>${g.links.map((l) => `<li>${link(l.href, l.label)}</li>`).join("")}</ul></nav>`).join("")}</div><div class="footer-credit"><img class="cube-mark" src="./icon.svg" alt=""><small>${copyright}</small><small>${designer.credit} · ${link(designer.href, designer.name)}</small></div><p class="footer-company small">${escapeHtml(companyLine)}</p></footer>
</main>
</body>
</html>
`;
}

const crumbs = (name: string, path: string) => ({ "@type": "BreadcrumbList", itemListElement: [
  { "@type": "ListItem", position: 1, name: "quarter", item: `${SITE}/` },
  { "@type": "ListItem", position: 2, name: "Study guides", item: `${SITE}/learn/index.html` },
  ...(path === "learn/index.html" ? [] : [{ "@type": "ListItem", position: 3, name, item: `${SITE}/${path}` }]),
] });

export function conceptPages(styles: string): { path: string; html: string }[] {
  const publisher = { "@type": "Organization", name: "quarter", url: `${SITE}/`, logo: `${SITE}/icon-512.png` };
  const index = shell({
    title: "Study guides", path: "learn/index.html", styles,
    description: "Short, illustrated explanations of the ideas in school maths, written for learners and for the grown-ups helping them.",
    jsonLd: { "@context": "https://schema.org", "@graph": [{ "@type": "CollectionPage", url: `${SITE}/learn/index.html`, name: "Study guides", inLanguage: "en-GB" }, crumbs("Study guides", "learn/index.html")] },
    body: `<p class="muted">Short, illustrated explanations of the ideas behind school maths. Each one has plain words for the learner, a worked example, and notes for the grown-up helping them.</p>
<ul class="rows sitemap-links">${CONCEPTS.map((c) => `<li><a class="row" href="${conceptPath(c.id)}"><span>${escapeHtml(c.title)}<small>${escapeHtml(c.years)} · ${escapeHtml(c.summary)}</small></span></a></li>`).join("")}</ul>
<p class="small muted">Looking for full lessons? ${`<a class="legal-link" href="https://www.thenational.academy/" rel="noopener noreferrer">Oak National Academy</a>`} offers free lessons for England's curriculum. It is a separate website, not run by quarter.</p>`,
  });
  const pages = CONCEPTS.map((c) => shell({
    title: c.title, path: conceptPath(c.id), styles,
    description: plainText(c.summary),
    jsonLd: { "@context": "https://schema.org", "@graph": [{ "@type": "Article", url: `${SITE}/${conceptPath(c.id)}`, headline: c.title, description: plainText(c.summary), inLanguage: "en-GB", publisher }, crumbs(c.title, conceptPath(c.id))] },
    body: conceptBodyHtml(c, skillNames),
  }));
  return [{ path: "learn/index.html", html: index }, ...CONCEPTS.map((c, i) => ({ path: conceptPath(c.id), html: pages[i] }))];
}

export function conceptStudyPages(): Plugin {
  return {
    name: "quarter-study-pages",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0]?.replace(/^\//, "");
        if (!path?.startsWith("learn/")) return next();
        const page = conceptPages('<link rel="stylesheet" href="/src/fonts.css"><link rel="stylesheet" href="/src/styles.css">').find((p) => p.path === path);
        if (!page) return next();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(page.html);
      });
    },
    writeBundle(options) {
      const directory = resolve(options.dir ?? "dist");
      const index = readFileSync(resolve(directory, "index.html"), "utf8");
      const styles = index.match(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)?.join("\n");
      if (!styles) throw new Error("quarter's built stylesheet is missing.");
      mkdirSync(resolve(directory, "learn"), { recursive: true });
      for (const page of conceptPages(styles)) writeFileSync(resolve(directory, page.path), page.html);
    },
  };
}
