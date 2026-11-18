// Roles whose posting is gone. Two jobs, both run by the inbox repo's workflow:
//
//   --drafts --seen seen.txt --out dir   reads .linkcheck.json (npm run linkcheck) and writes one draft per gone
//                                        posting that has no issue yet: NNN.title.txt and NNN.body.md
//   body.md [--dry] [--comment out.md]   sets the role in the draft to closed in site/data, with the Applications
//                                        line from the draft. --dry only writes the comment.
//
// A gone posting is only proposed, never closed by itself: a link can move, or a board can be down for a night.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import { longDate } from "../lib/format.ts";
import { sections } from "../lib/issueSections.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(site, "data");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : "");

/** The hidden line that ties an issue to one posting link. */
export const closeKey = (url: string) => `<!-- close-key: ${url} -->`;

if (args.includes("--drafts")) {
  const seen = arg("--seen") && existsSync(arg("--seen")) ? readFileSync(arg("--seen"), "utf8") : "";
  const out = arg("--out");
  mkdirSync(out, { recursive: true });
  const check = JSON.parse(readFileSync(join(site, ".linkcheck.json"), "utf8")) as { checkedAt: string; gone: { url: string; why: string }[] };
  let n = 0;
  for (const g of check.gone) {
    if (seen.includes(closeKey(g.url))) continue;
    for (const c of companies) {
      for (const r of c.roles.filter((r) => r.source === g.url && r.status !== "closed")) {
        n++;
        const id = String(n).padStart(3, "0");
        writeFileSync(join(out, `${id}.title.txt`), `[closed] ${c.name}, ${c.city}: ${r.title}`);
        writeFileSync(
          join(out, `${id}.body.md`),
          [
            closeKey(g.url),
            `The posting for **${r.title}** at ${c.name}, ${c.city} (\`${c.slug}\`) was gone when the nightly check ran on ${longDate(check.checkedAt)} (${g.why}).`,
            "",
            `Open it to be sure: ${g.url}`,
            "",
            "- Gone for good: add the label **publish**. The role turns to closed on the site, with the Applications line below.",
            "- It moved, or it's still open: close this issue and fix the link by hand if it moved. This posting won't be proposed again.",
            "",
            "### Applications",
            "",
            `The posting was taken down by ${longDate(check.checkedAt)}`,
            "",
          ].join("\n"),
        );
        // only one role per link is closed by one issue; a second role on the same link gets its own next night
        break;
      }
    }
  }
  writeFileSync(join(out, "summary.md"), `${check.gone.length} postings gone, ${n} new closing drafts.\n`);
  console.log(`${n} closing drafts`);
  process.exit(0);
}

const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--comment");
if (!file) {
  console.error("Give the issue body: node scripts/close-role.mts body.md [--dry] [--comment out.md]");
  process.exit(2);
}
const body = readFileSync(file, "utf8");
const url = body.match(/<!-- close-key: (\S+) -->/)?.[1] ?? "";
const applications = (sections(body).get("applications") ?? "").replace(/\s+/g, " ").trim();
const company = companies.find((c) => c.roles.some((r) => r.source === url));
const role = company?.roles.find((r) => r.source === url);
const blockers = [
  !url && "The hidden close-key line is missing from the issue.",
  url && !role && "No role on the list has this posting link any more.",
  role?.status === "closed" && "This role is already closed.",
  !applications && "The Applications line is empty.",
  applications.length > 160 && "The Applications line is longer than 160 characters.",
  /—/.test(applications) && "The Applications line has an em dash.",
].filter(Boolean) as string[];

const note = [
  role ? `**${company!.name}, ${company!.city}**: ${role.title}` : `Posting: ${url || "unknown"}`,
  "",
  role ? `On the site it becomes: status **closed**, applications "${applications}".` : "",
  "",
  blockers.length ? `Can't close it yet:\n${blockers.map((b) => `- ${b}`).join("\n")}` : "To close it on the site, add the label **publish**.",
]
  .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
  .join("\n");
if (arg("--comment")) writeFileSync(arg("--comment"), note + "\n");
console.log(`ok=${blockers.length ? "no" : "yes"}`);
if (company) console.log(`slug=${company.slug}`);
if (company) console.log(`name=${company.name}`);
if (role) console.log(`title=${role.title}`);

if (!args.includes("--dry")) {
  if (blockers.length) {
    console.error(blockers.join("\n"));
    process.exit(1);
  }
  let done = false;
  for (const f of readdirSync(dataDir).filter((f) => /^[a-z]{2}\.ts$/.test(f))) {
    const path = join(dataDir, f);
    // a Windows checkout has CRLF; written back with LF, which git stores anyway
    const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
    const at = text.indexOf(`source: ${JSON.stringify(url)},`);
    if (at < 0) continue;
    // the role object around the link: from the "{" before it to the "}," after it
    const start = text.lastIndexOf("\n      {\n", at);
    const end = text.indexOf("\n      },", at);
    const block = text
      .slice(start, end)
      .replace(/(\n        status: )"[a-z]+",/, '$1"closed",')
      .replace(/(\n        applications: )".*",/, `$1${JSON.stringify(applications)},`)
      .replace(/(\n        checked: )"[\d-]+",/, `$1"${today}",`);
    writeFileSync(path, text.slice(0, start) + block + text.slice(end));
    done = true;
    break;
  }
  if (!done) throw new Error(`No data file has ${url}`);
}
