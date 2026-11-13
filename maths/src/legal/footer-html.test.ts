import { describe, expect, it } from "vitest";
import { BRAND_HTML, footerHtml } from "./footer-html";
import { footerGroups, footerTagline } from "./content";

const link = (href: string, label: string) => `<a class="legal-link" href="${href}">${label}</a>`;
const groups = footerGroups({ hub: { path: "parents.html", title: "Parent guides" }, faq: { path: "faqs.html" } });

describe("the page footer", () => {
  it("has three groups, each with links", () => {
    expect(groups.map((g) => g.heading)).toEqual(["For parents", "Explore", "Legal"]);
    for (const g of groups) expect(g.links.length).toBeGreaterThan(1);
  });
  it("draws every link, the brand, the tagline, the email address and the feed for the static pages", () => {
    const html = footerHtml(groups, link, BRAND_HTML);
    for (const g of groups) for (const l of g.links) expect(html).toContain(`href="${l.href}"`);
    expect(html).toContain("footer-top"); expect(html).toContain("footer-bottom");
    expect(html).toContain(footerTagline);
    expect(html).toContain("?info=contact"); expect(html).not.toContain("mailto:");
    expect(html).toContain("https://uk.trustpilot.com/review/yourquarter.co.uk");
    expect(html).toContain("blog/subscribe.html"); expect(html).not.toContain("rss.xml");
    expect(html).toContain('class="wordmark"');
  });
});
