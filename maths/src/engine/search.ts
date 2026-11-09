import type { Stage } from "./types";

type CurriculumScope = { year?: number; stage?: Stage };

const words = (text: string, wildcards = false): string[] =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().match(wildcards ? /[a-z0-9*?]+/g : /[a-z0-9]+/g) ?? [];

// Match a whole word. After a star, try consuming one more character if the suffix fails.
function glob(pattern: string, word: string) {
  let i = 0, j = 0, star = -1, retry = 0;
  while (j < word.length) {
    if (pattern[i] === "?" || pattern[i] === word[j]) { i++; j++; }
    else if (pattern[i] === "*") { star = i++; retry = j; }
    else if (star !== -1) { i = star + 1; j = ++retry; }
    else return false;
  }
  return /^\**$/.test(pattern.slice(i));
}

function distance(a: string, b: string) {
  let older: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j], older[j - 2] + 1);
      }
    }
    older = previous;
    previous = row;
  }
  return previous[b.length];
}

function wordScore(query: string, word: string) {
  if (/[*?]/.test(query)) return glob(query, word) ? 4 : 0;
  if (word === query) return 6;
  if (word.startsWith(query)) return 4;
  const tolerance = query.length >= 7 ? 2 : query.length >= 4 ? 1 : 0;
  if (tolerance && Math.abs(query.length - word.length) <= tolerance && distance(query, word) <= tolerance) return 1;
  return 0;
}

export function makeSearchIndex<T extends { title: string; keywords: string } & CurriculumScope>(items: T[]) {
  const index = items.map((item) => {
    const title = words(item.title);
    return { item, title, phrase: title.join(" "), keywords: [...new Set(words(item.keywords))] };
  });
  return (query: string): T[] => {
    const years = new Set<number>();
    const stages = new Set<string>();
    const topic = query.slice(0, 120).toLowerCase()
      .replace(/\b(?:year\s*|y)(\d{1,2})(?![\w*?])/g, (_, year) => {
        years.add(Number(year));
        return " ";
      })
      .replace(/\b(?:key[\s-]+stage\s*|ks\s*)(\d{1,2})(?![\w*?])/g, (_, stage) => {
        stages.add(`KS${Number(stage)}`);
        return " ";
      })
      .replace(/\b(gcse|a[\s-]+level)(?![\w*?])/g, (stage) => {
        stages.add(stage === "gcse" ? "KS4" : "KS5");
        return " ";
      });
    const terms = [...new Set(words(topic, true))];
    if (!years.size && !stages.size && !terms.some((term) => /[a-z0-9?]/.test(term))) return [];
    if (years.size > 1 || stages.size > 1) return [];
    const phrase = words(topic).join(" ");
    const literal = !/[*?]/.test(topic);
    const matches = index.flatMap(({ item, title, keywords, phrase: name }) => {
      if ((years.size && (item.year === undefined || !years.has(item.year))) ||
          (stages.size && (!item.stage || !stages.has(item.stage)))) return [];
      let score = 0;
      for (const term of terms) {
        const best = Math.max(0,
          ...title.map((word) => wordScore(term, word) * 3),
          ...keywords.map((word) => wordScore(term, word)));
        if (!best) return [];
        score += best;
      }
      if (literal && name === phrase) score += 100;
      else if (literal && name.startsWith(phrase + " ")) score += 30;
      return [{ item, score }];
    });
    return matches.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title)).map(({ item }) => item);
  };
}
