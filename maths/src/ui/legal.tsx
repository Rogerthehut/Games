import { useState } from "preact/hooks";
import { companyLine, contactEmail, cookiesSections, copyright, footerGroups, footerTagline, trustpilot, designer, icoComplaints, legalPages, legalTitles, legalUpdated, licencesSections, privacySections, termsSections, type LegalPage } from "../legal/content";
import { CubeMark, Wordmark } from "./wordmark";
import { Icon } from "./icons";
import { primaryNav, tabHref } from "./navigation";
import parentContent from "../parents/content.json";

const NOTICE_KEY = "quarter.storage-notice.v1";
export const legalHref = (page: LegalPage) => `./?info=${page}`;
/** Back to the page the visitor came from on this site, or to the home page. */
export function BackLink() {
  const back = (e: Event) => {
    let same = false;
    try { same = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch { /* no referrer */ }
    if (history.length > 1 && same) { e.preventDefault(); history.back(); }
  };
  return <a class="btn small page-back" href="./" onClick={back}><span aria-hidden="true">←</span> Back</a>;
}
export const sitemapHref = "./?info=sitemap";

export function getInformationPage(search: string): LegalPage | "sitemap" | undefined {
  const page = new URLSearchParams(search).get("info");
  return page === "sitemap" ? page : legalPages.find((entry) => entry === page);
}

/**
 * The footer. `full` is the page footer (landing, legal and static pages): the brand and a short line on the left, the link columns, and a slim
 * bar for the copyright, company line, feed, email and credit. Without it, a compact version for use inside cards and the sign-in screens.
 * The static pages draw the same thing from src/legal/footer-html.ts.
 */
export function LegalFooter({ full }: { full?: boolean }) {
  const groups = (
    <div class="footer-groups">
      {footerGroups(parentContent).map((group, i) => (
        <nav key={group.heading} aria-labelledby={`footer-h${i}`}>
          <h2 id={`footer-h${i}`}>{group.heading}</h2>
          <ul>{group.links.map((link) => <li key={link.href}><a class="legal-link" href={link.href}>{link.label}</a></li>)}</ul>
        </nav>
      ))}
    </div>
  );
  if (full) return (
    <footer class="legal-footer full">
      <div class="footer-top">
        <div class="footer-brand">
          <a class="legal-home" href="./" aria-label="quarter home"><CubeMark /><Wordmark /></a>
          <p class="footer-tagline">{footerTagline}</p>
          <p class="footer-contact"><a class="legal-link" href={`mailto:${contactEmail}`}>{contactEmail}</a></p>
          <p class="footer-review"><a class="legal-link" href={trustpilot.href} target="_blank" rel="noopener noreferrer"><svg class="footer-star" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" fill="#00b67a" /></svg><span>{trustpilot.label}</span></a></p>
        </div>
        {groups}
      </div>
      <div class="footer-bottom">
        <div class="footer-legal"><small>{copyright}</small><small class="footer-company">{companyLine}</small></div>
        <div class="footer-meta">
          <a class="legal-link" href="blog/subscribe.html">Subscribe to the blog</a>
          <small>{designer.credit} · <a class="legal-link" href={designer.href} target="_blank" rel="noopener noreferrer">{designer.name}</a></small>
        </div>
      </div>
    </footer>
  );
  return (
    <footer class="legal-footer">
      {groups}
      <div class="footer-credit">
        <CubeMark />
        <small>{copyright}</small>
        <small>{designer.credit} · <a class="legal-link" href={designer.href} target="_blank" rel="noopener noreferrer">{designer.name}</a></small>
      </div>
      <p class="footer-company small">{companyLine}</p>
    </footer>
  );
}

export function SitemapScreen() {
  return (
    <main class="page legal-page">
      <a class="legal-home" href="./" aria-label="Back to quarter"><CubeMark /><Wordmark /></a>
      <BackLink />
      <h1>Sitemap</h1>
      <p class="muted">Find your way around quarter.</p>
      <nav aria-label="Sitemap">
        <section aria-labelledby="sitemap-app">
          <h2 id="sitemap-app">Learning</h2>
          <ul class="rows sitemap-links">
            {primaryNav.map(({ id, label, icon }) => (
              <li key={id}>
                <a class="row" href={tabHref(id)}><Icon name={icon} size={18} /><span>{label}</span><Icon name="chevron" size={18} /></a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="sitemap-parents">
          <h2 id="sitemap-parents">For parents</h2>
          <ul class="rows sitemap-links">
            {[parentContent.hub, parentContent.faq, ...parentContent.guides].map(({ path, title }) => (
              <li key={path}>
                <a class="row" href={path}><span>{title}</span><Icon name="chevron" size={18} /></a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="sitemap-learn">
          <h2 id="sitemap-learn">Explore</h2>
          <ul class="rows sitemap-links">
            {[["curriculum/index.html", "What quarter covers"], ["curriculum/stem.html", "The STEM lab"], ["blog/index.html", "Blog"], ["reading/index.html", "Reading list"]].map(([path, title]) => (
              <li key={path}>
                <a class="row" href={path}><span>{title}</span><Icon name="chevron" size={18} /></a>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="sitemap-info">
          <h2 id="sitemap-info">Site information</h2>
          <ul class="rows sitemap-links">
            {legalPages.map((page) => (
              <li key={page}>
                <a class="row" href={legalHref(page)}><span>{legalTitles[page]}</span><Icon name="chevron" size={18} /></a>
              </li>
            ))}
          </ul>
        </section>
      </nav>
      <LegalFooter full />
    </main>
  );
}

export function BrowserStorageNotice() {
  const [show, setShow] = useState(() => {
    try { return localStorage.getItem(NOTICE_KEY) !== "seen"; }
    catch { return true; }
  });
  if (!show) return null;

  return (
    <aside class="browser-storage-notice" aria-label="Cookies and browser storage">
      <div>
        <strong>Saving your progress</strong>
        <p>quarter saves progress to your account and keeps a copy in this browser. It uses only the cookies needed to sign in, and no advertising or analytics cookies. <a class="legal-link" href={legalHref("cookies")}>Cookies and browser storage</a></p>
      </div>
      <button class="btn small" type="button" onClick={() => {
        try { localStorage.setItem(NOTICE_KEY, "seen"); } catch { /* Dismiss for this view if storage is blocked. */ }
        setShow(false);
      }}>Got it</button>
    </aside>
  );
}

export function LegalScreen({ page }: { page: LegalPage }) {
  const sections = page === "privacy" ? privacySections(false) : {
    cookies: cookiesSections, terms: termsSections, licences: licencesSections,
  }[page];
  return (
    <main class="page legal-page">
      <a class="legal-home" href="./" aria-label="Back to quarter"><CubeMark /><Wordmark /></a>
      <BackLink />
      <h1>{legalTitles[page]}</h1>
      <p class="small muted">Updated {legalUpdated[page]}</p>
      {page !== "licences" && <p class="small">Questions about this page? Email <a class="legal-link" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>}
      {sections.map(({ title, paragraphs }) => (
        <section key={title}>
          <h2>{title}</h2>
          {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
      {page === "terms" && <p><a class="legal-link" href={legalHref("licences")}>Read the third-party licences</a></p>}
      {page === "licences" && <p><a class="legal-link" href="./third-party-licences.txt">Read the full licence notices (plain text)</a></p>}
      {page === "privacy" && <p><a class="legal-link" href={icoComplaints} target="_blank" rel="noopener noreferrer">Make a privacy complaint to the ICO</a></p>}
      <LegalFooter full />
    </main>
  );
}

