import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import parents from "../src/parents/content.json";
import { contactEmail, legalPages } from "../src/legal/content";

import { sitemapXml } from "../scripts/site-pages";
const sitemap = sitemapXml();
const site = (p: string) => readFileSync(p, "utf8");

describe("search and sharing set-up", () => {
  it("lists every public page in the sitemap and llms.txt", () => {
    const paths = [parents.hub.path, parents.faq.path, ...parents.guides.map((g) => g.path), ...legalPages.map((p) => `?info=${p}`), "?info=sitemap"];
    for (const p of paths) {
      expect(sitemap, p).toContain(`<loc>https://yourquarter.co.uk/${p}</loc>`);
    }
    for (const p of [parents.hub.path, parents.faq.path, ...parents.guides.map((g) => g.path)]) expect(site("public/llms.txt"), p).toContain(`https://yourquarter.co.uk/${p}`);
  });
  it("has the icons, share image and details the head points at", () => {
    const html = site("index.html");
    for (const f of ["favicon-32.png", "apple-touch-icon.png", "og-image-2.png", "icon-512.png", "icon.svg"]) {
      expect(() => readFileSync(`public/${f}`), f).not.toThrow();
    }
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain("application/ld+json");
    expect(html).toContain(contactEmail);
    expect(site("public/robots.txt")).toContain("Sitemap: https://yourquarter.co.uk/sitemap.xml");
  });
});

import { existsSync } from "node:fs";
import { SITE, llmsFull, rssXml, rssXsl, sitePages } from "../scripts/site-pages";
import { POSTS } from "../src/blog/posts";

describe("the public pages (blog, reading list, what quarter covers)", () => {
  const pages = sitePages('<link rel="stylesheet" href="/x.css">');
  const titleOf = (html: string) => /<title>([^<]*)<\/title>/.exec(html)![1];
  const descOf = (html: string) => /<meta name="description" content="([^"]*)"/.exec(html)![1];
  it("each have a title, a description, a canonical address and one heading", () => {
    for (const p of pages) {
      expect(titleOf(p.html).length, p.path).toBeLessThanOrEqual(70);
      expect(descOf(p.html).length, p.path).toBeGreaterThan(50);
      expect(descOf(p.html).length, p.path).toBeLessThanOrEqual(175);
      expect(p.html, p.path).toContain(`<link rel="canonical" href="${SITE}/${p.path}">`);
      expect((p.html.match(/<h1>/g) ?? []).length, p.path).toBe(1);
      expect(p.html, p.path).toContain("application/ld+json");
      expect(p.html, p.path).not.toMatch(/NaN|undefined|\[object/);
    }
  });
  it("never repeat a title or a description", () => {
    for (const f of [titleOf, descOf]) { const all = pages.map((p) => f(p.html)); expect(new Set(all).size).toBe(all.length); }
  });
  it("only link to pages and files that exist", () => {
    const known = new Set([...pages.map((p) => p.path), "index.html", "parents.html", "faqs.html", "11-plus-maths.html", "key-stage-2-maths.html", "maths-practice-at-home.html", "learn/index.html"]);
    for (const p of pages) for (const m of p.html.matchAll(/<a [^>]*href="([^"]+)"/g)) {
      const href = m[1].split("#")[0];
      if (!href || /^(https?:|mailto:|feed:)/.test(href) || href.startsWith("./") || href.startsWith("?")) continue;
      expect(known.has(href) || href.startsWith("learn/") || href === "blog/rss.xml" || existsSync(`public/${href}`), `${p.path} -> ${href}`).toBe(true);
    }
  });
  it("send people to a readable subscribe page, not the raw feed", () => {
    const index = pages.find((x) => x.path === "blog/index.html")!.html, sub = pages.find((x) => x.path === "blog/subscribe.html")!.html;
    expect(index).toContain('href="blog/subscribe.html"');
    expect(index).not.toMatch(/<a [^>]*href="blog\/rss\.xml"[^>]*>Subscribe/);
    for (const reader of ["Feedly", "Inoreader", "NewsBlur", "The Old Reader"]) expect(sub).toContain(reader);
    expect(sub).toContain(`value="${SITE}/blog/rss.xml"`);
    expect(sub).toContain("data-copy");
    expect(rssXml()).toContain('<?xml-stylesheet type="text/xsl" href="rss.xsl"?>');
    expect(rssXsl()).toContain("blog/subscribe.html");
  });
  it("publish every article in a valid feed", () => {
    const rss = rssXml();
    expect(rss).toContain('<rss version="2.0"');
    for (const p of POSTS) { expect(rss).toContain(`<guid isPermaLink="true">${SITE}/blog/${p.slug}.html</guid>`); expect(rss).toContain(`<title>${p.title.replace(/&/g, "&amp;")}</title>`); }
    expect((rss.match(/<item>/g) ?? []).length).toBe(POSTS.length);
  });
  it("describe the whole site for AI assistants", () => {
    const t = llmsFull();
    expect(t).toContain("Year 3");
    expect(t).toContain("STEM lab");
    expect(t).toContain(`${SITE}/blog/rss.xml`);
  });
  it("has the icons the head and the manifest name", () => {
    for (const f of ["favicon.ico", "favicon-16.png", "favicon-32.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", ".well-known/security.txt"]) expect(existsSync(`public/${f}`), f).toBe(true);
    expect(site("public/robots.txt")).toContain("Disallow: /api/");
  });
});
