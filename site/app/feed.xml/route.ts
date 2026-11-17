import { edition } from "@/lib/edition";
import type { Item } from "@/lib/items";

export const dynamic = "force-static";

const site = "https://internradar.eu";
const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const line = (i: Item) => `<li>${x(i.when)}: <a href="${x(i.source)}">${x(i.company)}, ${x(i.title)}</a> (${x(i.city)})</li>`;

/** One item per week: the edition. Readers see a new entry each Monday; during the week the same entry fills up. */
export function GET() {
  const e = edition();
  const body = [
    `<h2>Closing this week</h2><ul>${e.closingThis.map(line).join("") || "<li>Nothing</li>"}</ul>`,
    `<h2>Closing next week</h2><ul>${e.closingNext.map(line).join("") || "<li>Nothing</li>"}</ul>`,
    `<h2>Opening soon</h2><ul>${e.opening.map(line).join("") || "<li>Nothing</li>"}</ul>`,
  ].join("");
  const pub = new Date(`${e.monday}T07:00:00Z`).toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>internradar, the weekly edition</title>
<link>${site}/edition/</link>
<atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>
<description>Tech internship deadlines in Europe that close this week and next, and what opens soon.</description>
<language>en</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<item>
<title>${x(e.title)}: ${e.closingThis.length} closing this week</title>
<link>${site}/edition/</link>
<guid isPermaLink="false">internradar-edition-${e.year}-w${e.week}</guid>
<pubDate>${pub}</pubDate>
<description>${x(body)}</description>
</item>
</channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
