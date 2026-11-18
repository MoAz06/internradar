// Keeps data/opened.ts: for each posting link on the list, the day its job board says it was first published.
// Discover writes what it saw tonight to .opened.json; this adds it to what was kept before. A date is never
// dropped or moved later, so a posting that is taken down keeps its date. Next season this is what
// "last year it went up on ..." is made from. The inbox repo runs it every night after discover.
// Run: node scripts/opened.mts

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { opened } from "../data/opened.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const tonight = existsSync(join(site, ".opened.json")) ? (JSON.parse(readFileSync(join(site, ".opened.json"), "utf8")) as Record<string, string>) : {};

const kept: Record<string, string> = { ...opened };
let added = 0;
for (const [url, day] of Object.entries(tonight)) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
  if (!kept[url]) added++;
  if (!kept[url] || day < kept[url]) kept[url] = day;
}

const lines = Object.keys(kept)
  .sort()
  .map((url) => `  ${JSON.stringify(url)}: ${JSON.stringify(kept[url])},`);
writeFileSync(
  join(site, "data", "opened.ts"),
  [
    "// Made by scripts/opened.mts from what the job boards say. Don't edit by hand.",
    "",
    "/** Posting link to the day its job board says it was first published (YYYY-MM-DD). */",
    "export const opened: Record<string, string> = {",
    ...lines,
    "};",
    "",
  ].join("\n"),
);
console.log(`${Object.keys(kept).length} posting dates kept, ${added} new`);
