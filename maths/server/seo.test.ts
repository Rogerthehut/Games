import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import parents from "../src/parents/content.json";
import { contactEmail, legalPages } from "../src/legal/content";

const sitemap = readFileSync("public/sitemap.xml", "utf8");
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
    for (const f of ["favicon-32.png", "apple-touch-icon.png", "og-image.png", "icon-512.png", "icon.svg"]) {
      expect(() => readFileSync(`public/${f}`), f).not.toThrow();
    }
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain("application/ld+json");
    expect(html).toContain(contactEmail);
    expect(site("public/robots.txt")).toContain("Sitemap: https://yourquarter.co.uk/sitemap.xml");
  });
});
