/**
 * Builds the reading list: npx tsx scripts/fetch-reading-list.ts
 * Reads each public feed in src/blog/sources.ts, keeps the newest few relevant items (title, link, date and a short excerpt only),
 * and writes src/blog/reading-list.json. A source that can't be reached keeps whatever it had before. Review the file before committing.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES } from "../src/blog/sources";

const PER_SOURCE = 5, EXCERPT = 220;
const file = resolve(dirname(fileURLToPath(import.meta.url)), "../src/blog/reading-list.json");

export interface ReadingItem { sourceId: string; source: string; title: string; url: string; date: string; summary: string }

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", hellip: "…" };
const decode = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, n) => entities[n.toLowerCase()] ?? m);
const strip = (s: string) => decode(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "";
const short = (s: string) => (s.length <= EXCERPT ? s : `${s.slice(0, EXCERPT).replace(/\s+\S*$/, "")}…`);

export function parseFeed(xml: string): { title: string; url: string; date: string; summary: string }[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  return blocks.flatMap((b) => {
    const title = strip(tag(b, "title"));
    const url = decode((b.match(/<link\b[^>]*\bhref="([^"]+)"/i)?.[1] ?? strip(tag(b, "link"))) || "").trim();
    const when = strip(tag(b, "published") || tag(b, "updated") || tag(b, "pubDate") || tag(b, "dc:date"));
    const date = when && !Number.isNaN(Date.parse(when)) ? new Date(when).toISOString().slice(0, 10) : "";
    const summary = short(strip(tag(b, "summary") || tag(b, "description") || tag(b, "content:encoded") || tag(b, "content")));
    return title && /^https:\/\//.test(url) && date ? [{ title, url, date, summary }] : [];
  });
}

/** Fetches a feed. Falls back to curl, which honours a proxy set in the environment. */
async function get(url: string): Promise<string> {
  const ua = "Mozilla/5.0 (compatible; quarter-reading-list)";
  try {
    const res = await fetch(url, { headers: { "User-Agent": ua, Accept: "application/rss+xml, application/atom+xml, text/xml, */*" }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    if ((e as Error).message.startsWith("HTTP")) throw e;
    return execFileSync("curl", ["-sSfL", "-m", "25", "-A", ua, url], { encoding: "utf8", maxBuffer: 10_000_000 });
  }
}

async function main() {
  const before: { items: ReadingItem[] } = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { items: [] };
  const items: ReadingItem[] = [];
  for (const s of SOURCES) {
    try {
      const found = parseFeed(await get(s.feed)).filter((i) => !s.match || s.match.test(`${i.title} ${i.summary}`)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, PER_SOURCE);
      if (!found.length) throw new Error("no relevant items");
      items.push(...found.map((i) => ({ sourceId: s.id, source: s.name, ...i })));
      console.log(`${s.name}: ${found.length} items`);
    } catch (e) {
      const kept = before.items.filter((i) => i.sourceId === s.id);
      items.push(...kept);
      console.log(`${s.name}: couldn't read the feed (${(e as Error).message}), kept ${kept.length} earlier items`);
    }
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  writeFileSync(file, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), items }, null, 2) + "\n");
  console.log(`${items.length} items written to src/blog/reading-list.json`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
