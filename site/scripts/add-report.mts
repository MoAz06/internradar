// Puts one candidate report from an issue into site/data. The inbox repo's workflow runs it:
// first with --dry when an issue comes in (it writes the comment you read), then for real once you add the label "publish".
//
// Run: npm run add-report -- body.md [--dry] [--comment out.md]
// body.md is the issue body: the share form's, or the GitHub issue form's.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import type { CandidateReport } from "../data/types.ts";
import { outcomes, readIssue, warnings, weekOptions } from "../lib/reportForm.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--comment");
const dry = args.includes("--dry");
const commentFile = args.includes("--comment") ? args[args.indexOf("--comment") + 1] : "";
if (!file) {
  console.error("Give the issue body: npm run add-report -- body.md [--dry] [--comment out.md]");
  process.exit(2);
}

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const r = readIssue(readFileSync(file, "utf8"));
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());

// the share form names the slug; the GitHub form only has the name someone typed
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
const company =
  companies.find((c) => c.slug === r.slug) ??
  (r.company ? companies.filter((c) => fold(c.name) === fold(r.company.split(/[,(]/)[0])) : []).at(0);
const byName = !r.slug && company && companies.filter((c) => fold(c.name) === fold(company.name)).length > 1;

const blockers: string[] = [];
if (!company) blockers.push(`The company is not on the list (${r.company || "empty"}). Add it to site/data first, then write the slug after the name in the issue, like Optiver (\`optiver\`).`);
if (byName) blockers.push(`"${company!.name}" is on the list more than once. Write the right slug after the name in the issue, like Optiver (\`optiver\`).`);
if (!r.role) blockers.push("The role is empty.");
if (!r.applied) blockers.push("When they applied is empty.");
if (!r.timeline) blockers.push("The timeline is empty.");
if (!r.outcome) blockers.push("The outcome is empty.");
else if (!(outcomes as readonly string[]).includes(r.outcome)) blockers.push(`"${r.outcome}" is not one of the outcomes: ${outcomes.join(", ")}.`);

const entry: CandidateReport = {
  role: r.role,
  applied: r.applied,
  timeline: r.timeline.split("\n").map((l) => l.replace(/^[-*]\s+/, "").trim()).filter(Boolean),
  outcome: r.outcome,
  ...(r.notes ? { notes: r.notes.replace(/\s*\n\s*/g, " ") } : {}),
  ...((weekOptions as readonly string[]).includes(r.weeks) ? { weeks: r.weeks as CandidateReport["weeks"] } : {}),
  ...(r.test ? { test: r.test } : {}),
  added: today,
};
const look = warnings([r.role, r.applied, r.timeline, r.test, r.notes].join("\n"));

/** The entry as it goes in the data file, in the same style as the rest. */
function literal(e: CandidateReport, pad: string): string {
  const q = (s: string) => JSON.stringify(s);
  const lines = [`${pad}{`];
  for (const [k, v] of Object.entries(e)) {
    if (Array.isArray(v)) lines.push(`${pad}  ${k}: [`, ...v.map((x) => `${pad}    ${q(x)},`), `${pad}  ],`);
    else lines.push(`${pad}  ${k}: ${q(String(v))},`);
  }
  lines.push(`${pad}},`);
  return lines.join("\n");
}

function insert(slug: string): string {
  for (const f of readdirSync(dataDir).filter((f) => /^[a-z]{2}\.ts$/.test(f))) {
    const path = join(dataDir, f);
    const text = readFileSync(path, "utf8");
    const at = text.indexOf(`slug: ${JSON.stringify(slug)},`);
    if (at < 0) continue;
    const next = text.indexOf("\n    slug: ", at + 1);
    const end = next < 0 ? text.length : next;
    const empty = text.indexOf("\n    reports: [],", at);
    const full = text.indexOf("\n    reports: [\n", at);
    let out: string;
    if (empty > 0 && empty < end) {
      const i = empty + "\n    reports: [".length;
      out = `${text.slice(0, i)}\n${literal(entry, "      ")}\n    ${text.slice(i)}`;
    } else if (full > 0 && full < end) {
      const i = full + "\n    reports: [\n".length;
      out = `${text.slice(0, i)}${literal(entry, "      ")}\n${text.slice(i)}`;
    } else throw new Error(`No reports list found for ${slug} in ${f}`);
    writeFileSync(path, out);
    return f;
  }
  throw new Error(`${slug} is in no data file`);
}

const note = [
  company ? `**${company.name}, ${company.city}** (\`${company.slug}\`)` : `**Not on the list:** ${r.company.replace(/^not on the list:\s*/i, "")}`,
  "",
  "```ts",
  literal(entry, ""),
  "```",
  "",
  blockers.length ? `Can't publish yet:\n${blockers.map((b) => `- ${b}`).join("\n")}\n` : "",
  look.length ? `Read this one closely, it seems to have ${look.join(", ")}.` : "No names, links or questions found.",
  "",
  blockers.length
    ? "Edit the issue to fix it. This comment updates."
    : 'To put it on the site, add the label **publish**. To change it first, edit the issue; this comment updates. Not putting it on? Close the issue.',
]
  .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
  .join("\n");

if (commentFile) writeFileSync(commentFile, note + "\n");
// for the workflow: which labels the issue gets
console.log(`ok=${blockers.length ? "no" : "yes"}`);
console.log(`look=${look.length ? "yes" : "no"}`);
if (company) console.log(`slug=${company.slug}`);
if (company) console.log(`name=${company.name}`);

if (!dry) {
  if (blockers.length) {
    console.error(blockers.join("\n"));
    process.exit(1);
  }
  console.log(`file=${insert(company!.slug)}`);
}
