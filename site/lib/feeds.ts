import { historyStart, roleHistory } from "../data/history.ts";
import type { Item } from "./items.ts";
import { longDate } from "./format.ts";

const site = "https://internradar.eu";

/** Something worth a feed entry: a role that's new on the list, or one that went from "opens soon" to open. */
export type FeedEntry = { date: string; kind: "new" | "opened"; item: Item };

/** New and newly opened roles, newest first. The starting set of the list doesn't count as new. */
export function feedEntries(items: Item[], max = 50): FeedEntry[] {
  const out: FeedEntry[] = [];
  for (const item of items) {
    if (item.added > historyStart) out.push({ date: item.added, kind: "new", item });
    const s = roleHistory[item.id]?.statuses ?? [];
    for (let i = 1; i < s.length; i++) {
      const opened = s[i - 1][1] === "soon" && (s[i][1] === "open" || s[i][1] === "rolling");
      if (opened && s[i][0] > historyStart && s[i][0] !== item.added) out.push({ date: s[i][0], kind: "opened", item });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.item.company.localeCompare(b.item.company)).slice(0, max);
}

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pub = (d: string) => new Date(`${d}T08:00:00Z`).toUTCString();

/** An RSS 2.0 feed. `start` is the first entry, so a fresh subscription shows what it follows. */
export function rss(o: { title: string; path: string; page: string; description: string; entries: FeedEntry[]; start: string }): string {
  const items = o.entries.map((e) => {
    const i = e.item;
    const head = e.kind === "new" ? "New" : "Open now";
    // a date rather than "closes in 5 days", which would be wrong by the time someone reads it
    const when = i.closes && i.status !== "closed" ? `Apply by ${longDate(i.closes)}` : i.when;
    const body = `${i.city}, ${i.countryName}. ${when}.${i.process ? ` Process: ${i.process.replace(/[.\s]+$/, "")}.` : ""}`;
    return `<item>
<title>${x(`${head}: ${i.company}, ${i.title}`)}</title>
<link>${x(i.source)}</link>
<guid isPermaLink="false">internradar-${e.kind}-${i.key}-${e.date}</guid>
<pubDate>${pub(e.date)}</pubDate>
<description>${x(`${body} More on ${site}/companies/${i.slug}/`)}</description>
</item>`;
  });
  items.push(`<item>
<title>${x(o.start)}</title>
<link>${site}${o.page}</link>
<guid isPermaLink="false">internradar-start-${o.path}</guid>
<pubDate>${pub(historyStart)}</pubDate>
<description>${x("New roles, and roles that open, show up here from now on.")}</description>
</item>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${x(o.title)}</title>
<link>${site}${o.page}</link>
<atom:link href="${site}${o.path}" rel="self" type="application/rss+xml"/>
<description>${x(o.description)}</description>
<language>en</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join("\n")}
</channel>
</rss>
`;
}

export const rssHeaders = { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } };
