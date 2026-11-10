import { render } from "preact";
import "katex/dist/katex.min.css";
import "./fonts.css";
import "./styles.css";
import { LazyApp } from "./ui/app-lazy";
import { AccountGate, NotSetUp } from "./ui/account";
import { accountsOn, notSetUp } from "./account/config";
import { getInformationPage, LegalScreen, SitemapScreen } from "./ui/legal";
import { applyTheme, getTheme } from "./ui/skin";
import { tintScrollbars } from "./ui/scrollbars";

tintScrollbars();

const page = getInformationPage(location.search);
if (page) {
  applyTheme(getTheme());
  // these pages share index.html, so give each its own title and canonical address
  const names: Record<string, string> = { sitemap: "Sitemap", privacy: "Privacy notice", cookies: "Cookies and browser storage", terms: "Terms of use", licences: "Third-party licences" };
  document.title = `${names[page]} | quarter`;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", `https://yourquarter.co.uk/?info=${page}`);
}
document.getElementById("app")!.textContent = ""; // drop the plain-HTML summary that search engines and no-script visitors see
render(page === "sitemap" ? <SitemapScreen /> : page ? <LegalScreen page={page} /> : notSetUp ? <NotSetUp /> : accountsOn ? <AccountGate /> : <LazyApp />, document.getElementById("app")!);
