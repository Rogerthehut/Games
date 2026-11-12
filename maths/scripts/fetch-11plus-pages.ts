/**
 * Collects the official 11+ pages for the areas whose test isn't recorded yet, so they can be read and cited.
 *
 *   npx tsx scripts/fetch-11plus-pages.ts            # the areas with no test recorded
 *   npx tsx scripts/fetch-11plus-pages.ts bcp reading  # just these
 *   npx tsx scripts/fetch-11plus-pages.ts --all         # every area, to fill in the per-school table
 *
 * For each area it reads the school and council pages already linked in src/parents/admissions.json, plus up to three more pages on the
 * same site whose link text looks about the entrance test (admissions, 11+, entrance, selective, test, register, eligibility). The readable
 * text goes to docs/research/11plus/<area>.md with the address and date of each page, so nothing is quoted from memory. Commit and push
 * the folder, then the details can be filled into admissions.json with quotes and sources. Needs a normal internet connection (for
 * example the Replit shell), because some council and school sites aren't reachable from every network.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const admissions: { id: string; area: string; links: { label: string; path: string }[]; test?: unknown }[] = JSON.parse(readFileSync(resolve(root, "src/parents/admissions.json"), "utf8"));
const args = process.argv.slice(2);
const all = args.includes("--all");
const wanted = args.filter((a) => !a.startsWith("--"));
const areas = admissions.filter((a) => (wanted.length ? wanted.includes(a.id) : all || !a.test));
const KEYWORDS = /11\s*\+|eleven|entrance|selective|selection|admission|test|register|registration|eligib|sat|exam|assessment|how to apply|year 7/i;
const MAX_TEXT = 40_000, EXTRA_PAGES = 3;
const ua = "Mozilla/5.0 (compatible; quarter-research)";

const get = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url, { headers: { "User-Agent": ua, Accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    if ((e as Error).message.startsWith("HTTP")) throw e;
    return execFileSync("curl", ["-sSfL", "-m", "30", "-A", ua, url], { encoding: "utf8", maxBuffer: 20_000_000 });
  }
};
const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", pound: "£" };
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&([a-z]+);/gi, (m, n) => entities[n.toLowerCase()] ?? m);
const text = (html: string) => decode(html.replace(/<(script|style|noscript|svg|nav|footer|header)\b[\s\S]*?<\/\1>/gi, " ").replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
const links = (html: string, base: string) => [...html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)].flatMap((m) => {
  try { const u = new URL(decode(m[1]), base); const label = text(m[2]).slice(0, 80); return u.protocol.startsWith("http") && KEYWORDS.test(`${label} ${u.pathname}`) && !/\.(pdf|jpg|png|docx?)$/i.test(u.pathname) ? [{ url: u.href, label }] : []; } catch { return []; }
});

mkdirSync(resolve(root, "docs/research/11plus"), { recursive: true });
for (const area of areas) {
  const out: string[] = [`# ${area.area} (${area.id})`, "", `Collected ${new Date().toISOString().slice(0, 10)} by scripts/fetch-11plus-pages.ts. Read before quoting; the text is machine-extracted.`, ""];
  const seen = new Set<string>();
  for (const l of area.links) {
    let extra: { url: string; label: string }[] = [];
    for (const [label, url] of [[l.label, l.path], ...extra.map((x) => [x.label, x.url] as [string, string])]) {
      if (seen.has(url)) continue; seen.add(url);
      try {
        const html = await get(url);
        out.push(`## ${label}`, `Address: ${url}`, "", text(html).slice(0, MAX_TEXT), "");
        if (label === l.label) {
          const host = new URL(url).host;
          extra = links(html, url).filter((x) => new URL(x.url).host === host && !seen.has(x.url)).slice(0, EXTRA_PAGES);
          for (const x of extra) { seen.add(x.url); try { out.push(`## ${x.label} (linked from the page above)`, `Address: ${x.url}`, "", text(await get(x.url)).slice(0, MAX_TEXT), ""); } catch (e) { out.push(`## ${x.label}`, `Address: ${x.url}`, `Could not be read: ${(e as Error).message}`, ""); } }
        }
      } catch (e) { out.push(`## ${label}`, `Address: ${url}`, `Could not be read: ${(e as Error).message}`, ""); }
    }
  }
  writeFileSync(resolve(root, `docs/research/11plus/${area.id}.md`), out.join("\n"));
  console.log(`${area.id}: ${seen.size} pages`);
}
