import { render } from "preact";
import "katex/dist/katex.min.css";
import "./fonts.css";
import "./styles.css";
import { App } from "./ui/app";
import { AccountGate } from "./ui/account";
import { accountsOn } from "./account/config";
import { getInformationPage, LegalScreen, SitemapScreen } from "./ui/legal";
import { applyTheme, getTheme } from "./ui/skin";
import { tintScrollbars } from "./ui/scrollbars";

tintScrollbars();

const page = getInformationPage(location.search);
if (page) applyTheme(getTheme());
render(page === "sitemap" ? <SitemapScreen /> : page ? <LegalScreen page={page} /> : accountsOn ? <AccountGate /> : <App />, document.getElementById("app")!);
