import { useState } from "preact/hooks";
import { companyLine, contactEmail, cookiesSections, copyright, footerGroups, designer, icoComplaints, legalPages, legalTitles, legalUpdated, licencesSections, privacySections, termsSections, type LegalPage } from "../legal/content";
import { CubeMark, Wordmark } from "./wordmark";
import { Icon } from "./icons";
import { primaryNav, tabHref } from "./navigation";
import parentContent from "../parents/content.json";

const NOTICE_KEY = "quarter.storage-notice.v1";
export const legalHref = (page: LegalPage) => `./?info=${page}`;
export const sitemapHref = "./?info=sitemap";

export function getInformationPage(search: string): LegalPage | "sitemap" | undefined {
  const page = new URLSearchParams(search).get("info");
  return page === "sitemap" ? page : legalPages.find((entry) => entry === page);
}

export function LegalFooter() {
  return (
    <footer class="legal-footer">
      <div class="footer-groups">
        {footerGroups(parentContent).map((group, i) => (
          <nav key={group.heading} aria-labelledby={`footer-h${i}`}>
            <h2 id={`footer-h${i}`}>{group.heading}</h2>
            <ul>{group.links.map((link) => <li key={link.href}><a class="legal-link" href={link.href}>{link.label}</a></li>)}</ul>
          </nav>
        ))}
      </div>
      <div class="footer-credit">
        <CubeMark />
        <small>{copyright}</small>
        <small>{designer.credit} · <a class="legal-link" href={designer.href}>{designer.name}</a></small>
      </div>
      <p class="footer-company small">{companyLine}</p>
    </footer>
  );
}

export function SitemapScreen() {
  return (
    <main class="page legal-page">
      <a class="legal-home" href="./" aria-label="Back to quarter"><CubeMark /><Wordmark /></a>
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
            {[["curriculum/index.html", "What quarter covers"], ["curriculum/stem.html", "The STEM lab"], ["learn/index.html", "Study guides"], ["blog/index.html", "Blog"], ["reading/index.html", "Reading list"]].map(([path, title]) => (
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
      <LegalFooter />
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
      {page === "privacy" && <p><a class="legal-link" href={icoComplaints}>Make a privacy complaint to the ICO</a></p>}
      <LegalFooter />
    </main>
  );
}

