import { render } from "preact";
import "katex/dist/katex.min.css";
import "./fonts.css";
import "./styles.css";
import { LazyApp } from "./ui/app-lazy";
import { AccountGate, NotSetUp } from "./ui/account";
import { accountsOn, notSetUp } from "./account/config";
import { getInformationPage, LegalScreen, SitemapScreen } from "./ui/legal";
import { ContactScreen } from "./ui/contact";
import { applyTheme, getTheme } from "./ui/skin";
import { tintScrollbars } from "./ui/scrollbars";
import { OpsPage } from "./ui/ops-page";
import { installButtonHaptics } from "./native/bridge";

tintScrollbars();
installButtonHaptics();

const page = getInformationPage(location.search);
if (page) {
  applyTheme(getTheme());
  // these pages share index.html, so give each its own title and canonical address
  const names: Record<string, string> = { sitemap: "Sitemap", contact: "Message us", privacy: "Privacy notice", cookies: "Cookies and browser storage", terms: "Terms of use", licences: "Third-party licences" };
  document.title = `${names[page]} | quarter`;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", `https://yourquarter.co.uk/?info=${page}`);
}
document.getElementById("app")!.textContent = ""; // drop the plain-HTML summary that search engines and no-script visitors see
const ops = location.pathname === "/ops";
render(ops ? <OpsPage /> : page === "sitemap" ? <SitemapScreen /> : page === "contact" ? <ContactScreen /> : page ? <LegalScreen page={page} /> : notSetUp ? <NotSetUp /> : accountsOn ? <AccountGate /> : <LazyApp />, document.getElementById("app")!);

// crash reports: only where a Sentry address is set at build time (docs/MONITORING.md), and loaded after the app has started
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) void import("./monitoring/sentry").then((m) => m.startMonitoring()).catch(() => {});
