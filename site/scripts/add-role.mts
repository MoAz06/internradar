// Puts one role from a draft issue into site/data. The inbox repo's workflow runs it:
// first with --dry when a draft comes in or is edited (it writes the comment you read), then for real once you add
// the label "publish". Anything still marked "(check)", empty or invalid stops it; see checkRole in lib/roleDraft.ts.
//
// Run: npm run add-role -- body.md [--dry] [--comment out.md]

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import { addSource, insertEntry, literal } from "../lib/dataFile.ts";
import { checkRole, readRoleIssue } from "../lib/roleDraft.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--comment");
const dry = args.includes("--dry");
const commentFile = args.includes("--comment") ? args[args.indexOf("--comment") + 1] : "";
if (!file) {
  console.error("Give the issue body: npm run add-role -- body.md [--dry] [--comment out.md]");
  process.exit(2);
}

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
const r = readRoleIssue(readFileSync(file, "utf8"));
const { role, company, blockers, warnings } = checkRole(r, companies, today);

const preview = role ?? {
  title: r.title,
  kind: r.kind,
  field: r.field,
  status: r.status,
  applications: r.applications,
  opens: r.opens || undefined,
  closes: r.closes || undefined,
  start: r.start,
  duration: r.duration || undefined,
  eligibility: r.eligibility,
  process: r.process,
  reapply: r.reapply,
  source: r.posting,
  checked: today,
};

const note = [
  company ? `**${company.name}, ${company.city}** (\`${company.slug}\`)` : `**Company:** ${r.company || "empty"}`,
  "",
  "```ts",
  literal(preview, ""),
  "```",
  "",
  blockers.length ? `Can't publish yet:\n${blockers.map((b) => `- ${b}`).join("\n")}\n` : "",
  warnings.length ? `Read this one closely, it seems to have ${warnings.join(", ")}.` : "",
  "",
  blockers.length
    ? "Edit the issue to fix it. This comment updates."
    : "To put it on the site, add the label **publish**. To change it first, edit the issue; this comment updates. Not putting it on? Close the issue.",
]
  .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
  .join("\n");

if (commentFile) writeFileSync(commentFile, note + "\n");
// for the workflow: which labels the issue gets
console.log(`ok=${blockers.length ? "no" : "yes"}`);
console.log(`look=${warnings.length ? "yes" : "no"}`);
console.log(`newcity=${/^not on the list/i.test(r.company) ? "yes" : "no"}`);
if (company) console.log(`slug=${company.slug}`);
if (company) console.log(`name=${company.name}`);
console.log(`title=${r.title}`);

if (!dry) {
  if (!role || !company) {
    console.error(blockers.join("\n"));
    process.exit(1);
  }
  let done = "";
  for (const f of readdirSync(dataDir).filter((f) => /^[a-z]{2}\.ts$/.test(f))) {
    const path = join(dataDir, f);
    const withRole = insertEntry(readFileSync(path, "utf8"), company.slug, "roles", role);
    if (withRole === null) continue;
    writeFileSync(path, addSource(withRole, company.slug, role.source, today));
    done = f;
    break;
  }
  if (!done) throw new Error(`${company.slug} is in no data file`);
  console.log(`file=${done}`);
}
