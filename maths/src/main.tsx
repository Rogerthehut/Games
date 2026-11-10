import { render } from "preact";
import "katex/dist/katex.min.css";
import "./fonts.css";
import "./styles.css";
import { App } from "./ui/app";
import { AccountGate, NotSetUp } from "./ui/account";
import { accountsOn, notSetUp } from "./account/config";
import { getInformationPage, LegalScreen, SitemapScreen } from "./ui/legal";
import { applyTheme, getTheme } from "./ui/skin";
import { tintScrollbars } from "./ui/scrollbars";

tintScrollbars();

const page = getInformationPage(location.search);
if (page) applyTheme(getTheme());
document.getElementById("app")!.textContent = ""; // drop the plain-HTML summary that search engines and no-script visitors see
render(page === "sitemap" ? <SitemapScreen /> : page ? <LegalScreen page={page} /> : notSetUp ? <NotSetUp /> : accountsOn ? <AccountGate /> : <App />, document.getElementById("app")!);
