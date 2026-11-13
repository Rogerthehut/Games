/**
 * Tells Bing and other IndexNow search engines which pages are new or changed, so they are crawled sooner. Run it after a deploy that
 * adds or changes public pages (a blog post, the curriculum pages).
 *
 *   npm run indexnow                          # every URL in the live sitemap
 *   npm run indexnow -- https://yourquarter.co.uk/blog/x   # only these URLs
 *
 * The key is public on purpose: it only proves we own the site, by being served at https://yourquarter.co.uk/<key>.txt (see public/).
 * Set SITE to submit for a different address, for example a test site that serves the same key file.
 */
import { readdirSync } from "node:fs";

const site = (process.env.SITE ?? "https://yourquarter.co.uk").replace(/\/$/, "");
const host = new URL(site).host;
const key = readdirSync(new URL("../public/", import.meta.url)).map((f) => /^([0-9a-f]{32})\.txt$/.exec(f)?.[1]).find(Boolean);
if (!key) { console.error("No IndexNow key file found in public/ (a 32-character hex name ending in .txt)."); process.exit(1); }

let urls = process.argv.slice(2).filter((a) => a.startsWith("http"));
if (!urls.length) {
  const res = await fetch(`${site}/sitemap.xml`);
  if (!res.ok) { console.error(`Couldn't read ${site}/sitemap.xml (${res.status}).`); process.exit(1); }
  urls = [...(await res.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}
urls = [...new Set(urls)].filter((u) => new URL(u).host === host); // IndexNow only accepts URLs on our own host
if (!urls.length) { console.error("No URLs to submit."); process.exit(1); }

for (let i = 0; i < urls.length; i += 10_000) {
  const batch = urls.slice(i, i + 10_000);
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation: `${site}/${key}.txt`, urlList: batch }),
  });
  // 200 and 202 both mean accepted. 403 means the key file wasn't found at keyLocation (not deployed yet); 422 means a URL didn't match the host.
  console.log(`${res.status} ${res.ok ? "accepted" : "refused"}: ${batch.length} URLs`);
  if (!res.ok) process.exitCode = 1;
}
