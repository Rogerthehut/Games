import { companyLine, contactEmail, copyright, designer, footerTagline, type FooterGroup } from "./content";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The full page footer for the static pages (the same layout as `LegalFooter full` in src/ui/legal.tsx): the brand and a short line on the
 * left, the link columns, then a slim bar with the copyright, the company line, the feed, the email address and the credit.
 * `link` makes an anchor the way the calling page makes them; `brand` is the page's own logo and wordmark markup.
 */
export function footerHtml(groups: FooterGroup[], link: (href: string, label: string) => string, brand: string): string {
  const nav = groups.map((g, i) => `<nav aria-labelledby="footer-h${i}"><h2 id="footer-h${i}">${esc(g.heading)}</h2><ul>${g.links.map((l) => `<li>${link(l.href, l.label)}</li>`).join("")}</ul></nav>`).join("");
  return `<footer class="legal-footer full">
<div class="footer-top">
<div class="footer-brand"><a class="legal-home" href="./" aria-label="quarter home">${brand}</a><p class="footer-tagline">${esc(footerTagline)}</p><p class="footer-contact"><a class="legal-link" href="mailto:${esc(contactEmail)}">${esc(contactEmail)}</a></p></div>
<div class="footer-groups">${nav}</div>
</div>
<div class="footer-bottom">
<div class="footer-legal"><small>${esc(copyright)}</small><small class="footer-company">${esc(companyLine)}</small></div>
<div class="footer-meta">${link("blog/subscribe.html", "Subscribe to the blog")}<small>${esc(designer.credit)} · ${link(designer.href, designer.name)}</small></div>
</div>
</footer>`;
}

/** The logo and wordmark as the static pages draw them (kept the same as src/ui/wordmark.tsx). */
export const BRAND_HTML = `<img class="cube-mark" src="./icon.svg" alt=""><span class="wordmark" role="img" aria-label="quarter"><span aria-hidden="true">qua<svg class="wordmark-slash" viewBox="0 0 14 20" focusable="false"><path fill="currentColor" d="M1 19 5.8 1H9L7.4 7.1C9 4.8 11 4 13.5 4.7l-.9 3.4c-2.7-1-4.9.2-6.2 3.1L4.3 19Z"/></svg>ter</span><sup class="wordmark-tm" aria-hidden="true">™</sup></span>`;
