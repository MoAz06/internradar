// Turns what discover found into draft issues for the private inbox, at most --cap a night.
// It reads .discover.json, leaves out every posting that already has an issue (open or closed: a closed issue
// means "not for the list", for good), reads the posting itself for the rest, and writes one title and body
// per draft into --out. The inbox workflow makes the issues.
//
// Run: npm run role-drafts -- --seen seen.txt --cap 10 --out drafts/
// seen.txt is every earlier draft issue's body, one after the other.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import type { Found } from "../lib/boards.ts";
import { postingText } from "../lib/postingText.ts";
import { draftsFor, pickNew, type RoleDraft } from "../lib/roleDraft.ts";

const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : "");
const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = arg("--out");
const cap = Math.max(0, Number(arg("--cap") || 10));
if (!out) {
  console.error("Run: npm run role-drafts -- --seen seen.txt --cap 10 --out drafts/");
  process.exit(2);
}
const seen = arg("--seen") && existsSync(arg("--seen")) ? readFileSync(arg("--seen"), "utf8") : "";
const { checkedAt, failed, found } = JSON.parse(readFileSync(join(site, ".discover.json"), "utf8")) as { checkedAt: string; failed: string[]; found: Found[] };

// ---------- what's new ----------

// roles the nightly run just put on the list straight from the board are in the data now, not drafts
const onList = new Set(companies.flatMap((c) => c.roles.map((r) => r.source)));

const picks = pickNew(found.filter((f) => !onList.has(f.url)), seen, companies);

// ---------- the drafts ----------

mkdirSync(out, { recursive: true });
const drafts: RoleDraft[] = [];
let unread = 0;
let used = 0;
for (const p of picks) {
  if (drafts.length >= cap) break;
  used++;
  const text = await postingText(p.f).catch(() => "");
  if (!text) unread++;
  drafts.push(...draftsFor(p.f, text, companies, checkedAt));
}

drafts.forEach((d, i) => {
  const n = String(i + 1).padStart(3, "0");
  writeFileSync(join(out, `${n}.title.txt`), d.issueTitle);
  writeFileSync(join(out, `${n}.body.md`), d.body + "\n");
});

const left = picks.length - used;
const summary = [
  `Night of ${checkedAt}: ${found.filter((f) => f.tech).length} tech roles on the boards that are not on the list, ${picks.length} without an issue yet.`,
  `${drafts.length} new drafts${unread ? `, ${unread} without the posting's text` : ""}. ${left} wait for a next night (at most ${cap} a night).`,
  failed.length ? `Could not read: ${failed.join(", ")}.` : "",
]
  .filter(Boolean)
  .join("\n");
writeFileSync(join(out, "summary.md"), summary + "\n");
console.log(summary);
