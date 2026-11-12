import admissions from "../src/parents/admissions.json";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";
import { POSTS, type Post } from "../src/blog/posts";
import readingList from "../src/blog/reading-list.json";
import { SOURCES } from "../src/blog/sources";
import { blocksToHtml, escapeHtml, plainText } from "../src/concepts/render";
import { SKILLS, STEM_SKILLS, STRANDS } from "../src/curriculum";
import { THEMES, themeOf } from "../src/curriculum/stem-themes";
import type { Skill } from "../src/engine/types";
import { companyLine, copyright, designer, footerGroups, legalPages } from "../src/legal/content";
import content from "../src/parents/content.json";

/**
 * Everything a search engine, a feed reader or an AI assistant can read without signing in: the blog and its feed, the reading list,
 * the "what we cover" pages, the sitemap and the long llms file. All of it is built from the same data the app uses.
 */
export const SITE = "https://yourquarter.co.uk";
/** When the public pages were last reviewed. Update it when the content changes in a way worth telling crawlers about. */
export const CONTENT_DATE = "2026-11-12";
const SITE_TITLE = "quarter";

const slash = `<span class="wordmark" role="img" aria-label="quarter"><span aria-hidden="true">qua<svg class="wordmark-slash" viewBox="0 0 14 20" focusable="false"><path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z"/></svg>ter</span><sup class="wordmark-tm" aria-hidden="true">™</sup></span>`;
const a = (href: string, label: string, extra = "") => `<a class="legal-link" href="${escapeHtml(href)}"${/^https?:/.test(href) && !/target=/.test(extra) ? ' target="_blank" rel="noopener noreferrer"' : ""}${extra}>${escapeHtml(label)}</a>`;
const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const rfc822 = (iso: string) => new Date(`${iso}T09:00:00Z`).toUTCString();
const json = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");

interface Shell { title: string; description: string; path: string; body: string; jsonLd: object[]; styles: string; type?: "website" | "article"; published?: string; modified?: string; back?: { href: string; label: string } }

/** A public page in the quarter style, with full search, sharing and icon tags. */
function shell(o: Shell) {
  const url = `${SITE}/${o.path === "index.html" ? "" : o.path}`;
  const groups = footerGroups({ hub: content.hub, faq: content.faq });
  const title = o.title.length > 52 ? o.title : `${o.title} | ${SITE_TITLE}`;
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<base href="/">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(o.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#0f766e">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon.svg?v=quarter" type="image/svg+xml" sizes="any">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="quarter blog" href="${SITE}/blog/rss.xml">
<meta property="og:type" content="${o.type ?? "website"}">
<meta property="og:site_name" content="quarter">
<meta property="og:locale" content="en_GB">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="quarter: maths and STEM practice for Years 3 to 13">
${o.published ? `<meta property="article:published_time" content="${o.published}">\n<meta property="article:modified_time" content="${o.modified ?? o.published}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(o.description)}">
<meta name="twitter:image" content="${SITE}/og-image.png">
<script type="application/ld+json">${json({ "@context": "https://schema.org", "@graph": o.jsonLd })}</script>
${o.styles}
</head>
<body>
<main class="page legal-page parent-resource concept-static">
<a class="legal-home" href="./" aria-label="Back to quarter"><img class="cube-mark" src="./icon.svg" alt="">${slash}</a>
<a class="btn small page-back" href="./" data-back><span aria-hidden="true">←</span> Back</a>
${o.back ? `<p>${a(o.back.href, o.back.label)}</p>` : ""}
<h1>${escapeHtml(o.title)}</h1>
${o.body}
<footer class="legal-footer"><div class="footer-groups">${groups.map((g, i) => `<nav aria-labelledby="footer-h${i}"><h2 id="footer-h${i}">${escapeHtml(g.heading)}</h2><ul>${g.links.map((l) => `<li>${a(l.href, l.label)}</li>`).join("")}</ul></nav>`).join("")}</div><div class="footer-credit"><img class="cube-mark" src="./icon.svg" alt=""><small>${copyright}</small><small>${designer.credit} · ${a(designer.href, designer.name)}</small></div><p class="footer-company small">${escapeHtml(companyLine)}</p></footer>
</main>
<script src="./back.js" defer></script>
</body>
</html>
`;
}

const crumbs = (items: { name: string; path: string }[]) => ({ "@type": "BreadcrumbList", itemListElement: [{ name: "quarter", path: "" }, ...items].map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE}/${it.path}` })) });
const publisher = { "@type": "Organization", "@id": `${SITE}/#org`, name: "quarter", url: `${SITE}/`, logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` } };

// ------------------------------------------------------------------ the blog
const postPath = (p: Post) => `blog/${p.slug}.html`;
const postJsonLd = (p: Post) => ({ "@type": "BlogPosting", "@id": `${SITE}/${postPath(p)}#article`, mainEntityOfPage: `${SITE}/${postPath(p)}`, headline: p.title, description: p.description, datePublished: p.date, dateModified: p.date, inLanguage: "en-GB", keywords: p.tags.join(", "), image: `${SITE}/og-image.png`, author: publisher, publisher });

function blogPages(styles: string) {
  const sorted = [...POSTS].sort((x, y) => y.date.localeCompare(x.date));
  const index = shell({
    title: "The quarter blog", path: "blog/index.html", styles,
    description: "Practical, friendly articles for parents on maths practice at home, times tables, the 11+, confidence, STEM and AI.",
    jsonLd: [{ "@type": "Blog", url: `${SITE}/blog/index.html`, name: "The quarter blog", inLanguage: "en-GB", publisher, blogPost: sorted.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/${postPath(p)}`, datePublished: p.date })) }, crumbs([{ name: "Blog", path: "blog/index.html" }])],
    body: `<p class="muted">Practical ideas for helping children with maths and STEM at home. ${a("blog/subscribe.html", "Subscribe with RSS")}.</p>
<ul class="rows sitemap-links">${sorted.map((p) => `<li><a class="row" href="${postPath(p)}"><span>${escapeHtml(p.title)}<small>${longDate(p.date)} · ${escapeHtml(p.description)}</small></span></a></li>`).join("")}</ul>
<p>${a("reading/index.html", "Reading list: articles from education organisations")}</p>`,
  });
  const posts = POSTS.map((p) => shell({
    title: p.title, path: postPath(p), styles, type: "article", published: p.date, back: { href: "blog/index.html", label: "All articles" },
    description: p.description,
    jsonLd: [postJsonLd(p), crumbs([{ name: "Blog", path: "blog/index.html" }, { name: p.title, path: postPath(p) }])],
    body: `<p class="muted">${longDate(p.date)} · ${escapeHtml(p.tags.join(", "))}</p>
${blocksToHtml(p.body)}
<section aria-labelledby="more"><h2 id="more">Go further</h2><ul>${p.related.map((r) => `<li>${a(r.path, r.label)}</li>`).join("")}<li>${a("./", "Try quarter")}</li></ul></section>`,
  }));
  return [{ path: "blog/index.html", html: index }, { path: "blog/subscribe.html", html: subscribePage(styles) }, ...POSTS.map((p, i) => ({ path: postPath(p), html: posts[i] }))];
}

// ------------------------------------------------------------------ subscribing, for people (the feed itself is for apps)
const FEED = `${SITE}/blog/rss.xml`;
const READERS: { name: string; blurb: string; href: string }[] = [
  { name: "Feedly", blurb: "Follow in Feedly", href: `https://feedly.com/i/subscription/feed/${encodeURIComponent(FEED)}` },
  { name: "Inoreader", blurb: "Follow in Inoreader", href: `https://www.inoreader.com/?add_feed=${encodeURIComponent(FEED)}` },
  { name: "NewsBlur", blurb: "Follow in NewsBlur", href: `https://www.newsblur.com/?url=${encodeURIComponent(FEED)}` },
  { name: "The Old Reader", blurb: "Follow in The Old Reader", href: `https://theoldreader.com/feeds/subscribe?url=${encodeURIComponent(FEED)}` },
];

function subscribePage(styles: string) {
  return shell({
    title: "Subscribe to the quarter blog", path: "blog/subscribe.html", styles, back: { href: "blog/index.html", label: "The blog" },
    description: "Follow the quarter blog in your feed reader, or copy the feed address.",
    jsonLd: [{ "@type": "WebPage", url: `${SITE}/blog/subscribe.html`, name: "Subscribe to the quarter blog", inLanguage: "en-GB", publisher }, crumbs([{ name: "Blog", path: "blog/index.html" }, { name: "Subscribe", path: "blog/subscribe.html" }])],
    body: `<p class="muted">Get new articles as they're published, in a feed reader you choose. There's no email and no account with us. Pick a reader below, or copy the feed address into any reader you already use.</p>
<h2>Follow in a reader</h2>
<ul class="rows sitemap-links subscribe-list">
${READERS.map((r) => `<li><a class="row" href="${escapeHtml(r.href)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(r.name)}<small>${escapeHtml(r.blurb)}</small></span></a></li>`).join("\n")}
<li><a class="row" href="feed:${FEED}"><span>Open in your feed app<small>For apps on your device that handle feed links</small></span></a></li>
</ul>
<h2>Or copy the feed address</h2>
<div class="feed-copy"><input id="feed-url" class="feed-url" type="text" readonly value="${FEED}" aria-label="Feed address" onfocus="this.select()"><button type="button" class="btn" data-copy="${FEED}" data-done="Copied">Copy</button></div>
<p class="small muted">New to feeds? An RSS reader is an app or website that collects articles from the sites you follow, so you don't have to visit each one. Paste the address above into a reader's "add feed" box.</p>
<p class="small muted">${a("blog/rss.xml", "View the raw feed")} (for apps and developers).</p>
<script src="./copy-feed.js" defer></script>`,
  });
}

/** A stylesheet so that opening the feed itself in a browser shows a readable page that points to the subscribe page, not raw XML. */
export function rssXsl() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/rss/channel">
<html lang="en-GB"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title><xsl:value-of select="title"/> (feed)</title>
<style>body{font:16px/1.55 system-ui,sans-serif;background:#f8f4e8;color:#1e2038;margin:0}main{max-width:720px;margin:0 auto;padding:32px 20px}h1{font-size:1.8rem;margin:.2em 0}.box{background:#fffdf6;border:1px solid #e4d9bd;border-radius:14px;padding:16px 18px;margin:18px 0}a{color:#1e2038}.btn{display:inline-block;padding:10px 18px;border-radius:999px;border:2px solid #e4d9bd;background:#fff;text-decoration:none;font-weight:700}li{margin:.7em 0}small{color:#5c5f78}</style></head>
<body><main>
<p><small>This is a feed: a page for feed readers and apps.</small></p>
<h1><xsl:value-of select="title"/></h1>
<p><xsl:value-of select="description"/></p>
<div class="box"><p><strong>Want new articles delivered to you?</strong> Choose a reader on the subscribe page, or copy this page's address into one.</p><p><a class="btn" href="${SITE}/blog/subscribe.html">Subscribe</a> <a class="btn" href="${SITE}/blog/index.html">Read the blog</a></p></div>
<h2>Latest articles</h2>
<ul><xsl:for-each select="item"><li><a href="{link}"><xsl:value-of select="title"/></a><br/><small><xsl:value-of select="pubDate"/> · <xsl:value-of select="description"/></small></li></xsl:for-each></ul>
</main></body></html>
</xsl:template>
</xsl:stylesheet>
`;
}

export function rssXml() {
  const sorted = [...POSTS].sort((x, y) => y.date.localeCompare(x.date));
  const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="rss.xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>The quarter blog</title>
<link>${SITE}/blog/index.html</link>
<description>Practical, friendly articles for parents on maths and STEM at home.</description>
<language>en-gb</language>
<lastBuildDate>${rfc822(sorted[0].date)}</lastBuildDate>
<atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
<image><url>${SITE}/icon-512.png</url><title>The quarter blog</title><link>${SITE}/blog/index.html</link></image>
${sorted.map((p) => `<item>
<title>${x(p.title)}</title>
<link>${SITE}/${postPath(p)}</link>
<guid isPermaLink="true">${SITE}/${postPath(p)}</guid>
<pubDate>${rfc822(p.date)}</pubDate>
${p.tags.map((t) => `<category>${x(t)}</category>`).join("")}
<description>${x(p.description)}</description>
<content:encoded><![CDATA[${blocksToHtml(p.body)}]]></content:encoded>
</item>`).join("\n")}
</channel>
</rss>
`;
}

// ------------------------------------------------------------------ the reading list
function readingPage(styles: string) {
  const items = readingList.items as { sourceId: string; source: string; title: string; url: string; date: string; summary: string }[];
  const used = SOURCES.filter((s) => items.some((i) => i.sourceId === s.id));
  return shell({
    title: "Reading list for parents", path: "reading/index.html", styles,
    description: "Recent articles from education organisations on maths, learning and schools, with links to the originals.",
    jsonLd: [{ "@type": "CollectionPage", url: `${SITE}/reading/index.html`, name: "Reading list for parents", inLanguage: "en-GB", dateModified: readingList.updated || CONTENT_DATE, publisher }, ...(items.length ? [{ "@type": "ItemList", itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: it.url, name: it.title })) }] : []), crumbs([{ name: "Reading list", path: "reading/index.html" }])],
    body: `<p class="muted">Recent articles from education organisations, gathered in one place. Each one opens on the original site.${readingList.updated ? ` Updated ${longDate(readingList.updated)}.` : ""}</p>
${items.length ? `<ul class="rows sitemap-links">${items.map((it) => `<li><a class="row" href="${escapeHtml(it.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(it.title)}<small>${escapeHtml(it.source)} · ${longDate(it.date)}${it.summary ? ` · ${escapeHtml(it.summary)}` : ""}</small></span></a></li>`).join("")}</ul>` : `<p>New articles will appear here soon.</p>`}
<section aria-labelledby="src"><h2 id="src">Where they come from</h2><ul>${(used.length ? used : SOURCES).map((s) => `<li>${a(s.home, s.name)}</li>`).join("")}</ul></section>
<p>${a("blog/index.html", "More from the quarter blog")}</p>`,
  });
}

// ------------------------------------------------------------------ what we cover
const NAME: Record<string, string> = { KS2: "Key Stage 2", KS3: "Key Stage 3", KS4: "GCSE", KS5: "A-level" };
const yearPath = (y: number) => `curriculum/year-${y}.html`;
const strandLabel = (s: string) => (s === "Ratio" ? "Ratio and proportion" : s);
const ageOf = (y: number) => `ages ${y + 4} to ${y + 5}`;
const mathsSkills = SKILLS.filter((s) => s.strand !== "STEM");
const topicList = (skills: Skill[]) => `<ul>${skills.map((s) => { return `<li><strong>${escapeHtml(plainText(s.name))}</strong>: ${escapeHtml(plainText(s.blurb))}</li>`; }).join("")}</ul>`;

function curriculumPages(styles: string) {
  const years = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const hub = shell({
    title: "What quarter covers", path: "curriculum/index.html", styles,
    description: `Every maths topic for Years 3 to 13 and the STEM lab, year by year: ${mathsSkills.length} maths topics plus computing, data science, AI and quantum ideas.`,
    jsonLd: [{ "@type": "CollectionPage", url: `${SITE}/curriculum/index.html`, name: "What quarter covers", inLanguage: "en-GB", publisher }, crumbs([{ name: "What quarter covers", path: "curriculum/index.html" }])],
    body: `<p class="muted">${mathsSkills.length} maths topics from Year 3 to A-level, following the National Curriculum for England, plus ${STEM_SKILLS.length} STEM lab topics. Pick a year to see what's covered.</p>
<ul class="rows sitemap-links">${years.map((y) => { const n = mathsSkills.filter((s) => s.year === y).length; const st = mathsSkills.find((s) => s.year === y)?.stage ?? "KS2"; return `<li><a class="row" href="${yearPath(y)}"><span>Year ${y} maths<small>${NAME[st]} · ${ageOf(y)} · ${n} topics</small></span></a></li>`; }).join("")}
<li><a class="row" href="curriculum/stem.html"><span>The STEM lab<small>Computing, data science, AI and quantum ideas · Years 3 to 13 · ${STEM_SKILLS.length} topics</small></span></a></li></ul>
<p>${a("11-plus-maths.html", "Getting started with 11+ maths")}</p>`,
  });
  const yearPages = years.map((y) => {
    const skills = mathsSkills.filter((s) => s.year === y).sort((p, q) => STRANDS.indexOf(p.strand) - STRANDS.indexOf(q.strand) || p.name.localeCompare(q.name));
    const stage = NAME[skills[0]?.stage ?? "KS2"];
    const strands = [...new Set(skills.map((s) => s.strand))];
    return shell({
      title: `Year ${y} maths topics`, path: yearPath(y), styles, back: { href: "curriculum/index.html", label: "What quarter covers" },
      description: `${skills.length} maths topics first taught in Year ${y} (${stage}, ${ageOf(y)}), from ${strands.slice(0, 3).map(strandLabel).join(", ").toLowerCase()} and more, with short practice on quarter.`,
      jsonLd: [{ "@type": "ItemList", name: `Year ${y} maths topics on quarter`, itemListElement: skills.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: plainText(s.name) })) }, crumbs([{ name: "What quarter covers", path: "curriculum/index.html" }, { name: `Year ${y}`, path: yearPath(y) }])],
      body: `<p class="muted">${stage} · ${ageOf(y)} · ${skills.length} topics first taught in Year ${y}. Earlier topics keep coming back in review.</p>
${strands.map((st) => `<section><h2>${escapeHtml(strandLabel(st))}</h2>${topicList(skills.filter((s) => s.strand === st))}</section>`).join("")}
<p>${y > 3 ? a(yearPath(y - 1), `Year ${y - 1}`) : ""}${y > 3 && y < 13 ? " · " : ""}${y < 13 ? a(yearPath(y + 1), `Year ${y + 1}`) : ""}</p>`,
    });
  });
  const stem = shell({
    title: "The STEM lab: computing, data and AI", path: "curriculum/stem.html", styles, back: { href: "curriculum/index.html", label: "What quarter covers" },
    description: "Topics in computing, data science, AI and machine learning, and quantum ideas, for every age from Year 3 to Year 13, with hands-on labs.",
    jsonLd: [{ "@type": "ItemList", name: "STEM lab topics on quarter", itemListElement: STEM_SKILLS.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: plainText(s.name) })) }, crumbs([{ name: "What quarter covers", path: "curriculum/index.html" }, { name: "The STEM lab", path: "curriculum/stem.html" }])],
    body: `<p class="muted">${STEM_SKILLS.length} topics in four themes, with ideas pitched for every age. The lab also has four hands-on activities: binary lamps, program the robot, teach a machine and a qubit playground.</p>
${THEMES.map((t) => `<section><h2>${escapeHtml(t.label)}</h2><p class="muted">${escapeHtml(t.blurb)}</p>${topicList(STEM_SKILLS.filter((s) => themeOf(s) === t.id).sort((p, q) => p.year - q.year))}</section>`).join("")}`,
  });
  return [{ path: "curriculum/index.html", html: hub }, ...years.map((y, i) => ({ path: yearPath(y), html: yearPages[i] })), { path: "curriculum/stem.html", html: stem }];
}

export function sitePages(styles: string): { path: string; html: string }[] {
  return [...blogPages(styles), { path: "reading/index.html", html: readingPage(styles) }, ...curriculumPages(styles)];
}

// ------------------------------------------------------------------ sitemap and llms-full
export function sitemapEntries(): { path: string; lastmod: string }[] {
  const e = (path: string, lastmod = CONTENT_DATE) => ({ path, lastmod });
  return [
    e(""), ...legalPages.map((p) => e(`?info=${p}`)), e("?info=sitemap"),
    e(content.hub.path), e(content.faq.path), ...content.guides.map((g) => e(g.path)),
    e("blog/index.html", [...POSTS].sort((x, y) => y.date.localeCompare(x.date))[0].date), ...POSTS.map((p) => e(postPath(p), p.date)),
    e("reading/index.html", readingList.updated || CONTENT_DATE),
    e("curriculum/index.html"), ...[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((y) => e(yearPath(y))), e("curriculum/stem.html"),
  ];
}
export const sitemapXml = () => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries().map((x) => `  <url>\n    <loc>${SITE}/${x.path}</loc>\n    <lastmod>${x.lastmod}</lastmod>\n  </url>`).join("\n")}\n</urlset>\n`;

/** A long plain-text description of the whole site, for AI assistants and other crawlers. */
export function llmsFull() {
  const lines: string[] = [];
  lines.push("# quarter: full site guide", "", "> quarter is a web app for maths practice (Years 3 to 13, ages 7 to 18, National Curriculum for England) with a STEM lab covering computing, data science, AI and quantum ideas. Parents create the account and children use it under their supervision.", "", `Site: ${SITE}/`, "Contact: hello@yourquarter.co.uk", "");
  lines.push("## What quarter covers: maths, year by year", "");
  for (const y of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
    const skills = mathsSkills.filter((s) => s.year === y);
    lines.push(`### Year ${y} (${NAME[skills[0]?.stage ?? "KS2"]}), ${skills.length} topics: ${SITE}/${yearPath(y)}`);
    for (const s of skills) lines.push(`- ${plainText(s.name)}: ${plainText(s.blurb)}`);
    lines.push("");
  }
  lines.push(`## The STEM lab: ${SITE}/curriculum/stem.html`, "");
  for (const t of THEMES) { lines.push(`### ${t.label}`); for (const s of STEM_SKILLS.filter((x) => themeOf(x) === t.id)) lines.push(`- ${plainText(s.name)} (Year ${s.year}): ${plainText(s.blurb)}`); lines.push(""); }
  lines.push("", "## Blog", "");
  for (const p of [...POSTS].sort((x, y) => y.date.localeCompare(x.date))) lines.push(`- [${p.title}](${SITE}/${postPath(p)}) (${p.date}): ${p.description}`);
  lines.push("", "## 11+ entrance tests by area (England and Northern Ireland)", "", `What is known about who sets each test and what it covers, with how sure we are (confirmed, reported or disputed) and a link to the source. Test providers and dates change each year, so always check the school's own page. Full finder: ${SITE}/11-plus-maths.html`, "");
  for (const a of admissions as { area: string; test?: { provider: string; status: string; note: string; parts?: string[]; checked: string; source?: { path: string } }; schools?: { name: string; test: string; note: string; parts?: string[]; source: { path: string } }[] }[]) {
    const t = a.test;
    lines.push(`### ${a.area}`, t ? `- Test: ${t.provider} (${t.status}, checked ${t.checked}). ${t.note}${t.parts?.length ? ` Covers: ${t.parts.join(", ")}.` : ""}${t.source ? ` Source: ${t.source.path}` : ""}` : "- Test: check the school and council pages (not recorded).");
    for (const sc of a.schools ?? []) lines.push(`- ${sc.name}: ${sc.test}. ${sc.note}${sc.parts?.length ? ` Covers: ${sc.parts.join(", ")}.` : ""} Source: ${sc.source.path}`);
    lines.push("");
  }
  lines.push("", `Feed: ${SITE}/blog/rss.xml`, "", "## Parent guides", "");
  for (const g of [content.hub, content.faq, ...content.guides]) lines.push(`- [${g.title}](${SITE}/${g.path}): ${g.description}`);
  lines.push("");
  return lines.join("\n");
}

// ------------------------------------------------------------------ the plugin
export function siteContent(): Plugin {
  const types: Record<string, string> = { xml: "application/xml; charset=utf-8", xsl: "text/xsl; charset=utf-8", txt: "text/plain; charset=utf-8", html: "text/html; charset=utf-8" };
  const extras = () => ({ "blog/rss.xml": rssXml(), "blog/rss.xsl": rssXsl(), "sitemap.xml": sitemapXml(), "llms-full.txt": llmsFull() });
  return {
    name: "quarter-site-content",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0]?.replace(/^\//, "") ?? "";
        const dev = '<link rel="stylesheet" href="/src/fonts.css"><link rel="stylesheet" href="/src/styles.css">';
        const page = sitePages(dev).find((p) => p.path === path), extra = (extras() as Record<string, string>)[path];
        if (!page && extra === undefined) return next();
        res.setHeader("Content-Type", types[(path.split(".").pop() ?? "html")] ?? types.html);
        res.end(page ? page.html : extra);
      });
    },
    writeBundle(options) {
      const directory = resolve(options.dir ?? "dist");
      const styles = readFileSync(resolve(directory, "index.html"), "utf8").match(/<link\b[^>]*\brel="stylesheet"[^>]*>/g)?.join("\n");
      if (!styles) throw new Error("quarter's built stylesheet is missing.");
      for (const p of sitePages(styles)) { mkdirSync(dirname(resolve(directory, p.path)), { recursive: true }); writeFileSync(resolve(directory, p.path), p.html); }
      for (const [path, text] of Object.entries(extras())) { mkdirSync(dirname(resolve(directory, path)), { recursive: true }); writeFileSync(resolve(directory, path), text); }
    },
  };
}
