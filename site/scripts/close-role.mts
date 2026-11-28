// Roles whose posting is gone. Two jobs, both run by the inbox repo's workflow:
//
//   --drafts --seen seen.txt --out dir   reads .linkcheck.json (npm run linkcheck) and writes one draft per gone
//                                        posting that has no issue yet: NNN.title.txt and NNN.body.md
//   body.md [--dry] [--comment out.md]   sets the role in the draft to closed in site/data, with the Applications
//                                        line from the draft. --dry only writes the comment.
//   --auto open.json                     closes the roles whose posting is gone for a second night: an open closing
//                                        draft from an earlier night, and the link still gone in .linkcheck.json.
//                                        Prints the numbers of those drafts, one a line, for the workflow to close.
//
//   --reopen .listed.json                opens a role again that closed by itself because its posting was gone, when
//                                        its job board lists that same posting again. Prints the links, one a line.
//
// A posting gone for one night is only proposed: a link can move, or a board can be down for a night.
// Gone two nights in a row, it closes by itself, unless the draft was closed (= "it moved") before that.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import { editRoleOf } from "../lib/dataFile.ts";
import { longDate } from "../lib/format.ts";
import { sections } from "../lib/issueSections.ts";
import { reopenBlock } from "../lib/reopen.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(site, "data");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : "");

/** The hidden line that ties an issue to one posting link. */
export const closeKey = (url: string) => `<!-- close-key: ${url} -->`;

/** The hidden line that says which role on that link: one posting can be six cities or two programmes. */
export const closeRole = (slug: string, title: string) => `<!-- close-role: ${slug} | ${title} -->`;

/** The company and the title named in an issue, when the issue has the line. Older issues only have the link. */
export function whichRole(body: string): { slug: string; title: string } | null {
  const m = body.match(/<!-- close-role: (\S+) \| (.+?) -->/);
  return m ? { slug: m[1], title: m[2] } : null;
}

/** The role an issue is about: by company and title when the issue names them, else the first open role on the link. */
function roleOf(url: string, who: { slug: string; title: string } | null) {
  const company = who ? companies.find((c) => c.slug === who.slug) : companies.find((c) => c.roles.some((r) => r.source === url));
  const role = who
    ? company?.roles.find((r) => r.source === url && r.title === who.title)
    : (company?.roles.find((r) => r.source === url && r.status !== "closed") ?? company?.roles.find((r) => r.source === url));
  return { company, role };
}

/** Sets the role with this posting link to closed, in whichever data file has it. With a company and a title it
 * is that role; without, the first on the link that is still open. false when none has it. */
function closeInData(url: string, applications: string, who: { slug: string; title: string } | null): boolean {
  const edit = (block: string) =>
    block
      .replace(/(\n        status: )"[a-z]+",/, '$1"closed",')
      .replace(/(\n        applications: )".*",/, `$1${JSON.stringify(applications)},`)
      .replace(/(\n        checked: )"[\d-]+",/, `$1"${today}",`);
  for (const f of readdirSync(dataDir).filter((f) => /^[a-z]{2}\.ts$/.test(f))) {
    const path = join(dataDir, f);
    // a Windows checkout has CRLF; written back with LF, which git stores anyway
    const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
    const out = editRoleOf(text, url, edit, who?.slug, who?.title);
    if (out === null) continue;
    writeFileSync(path, out);
    return true;
  }
  return false;
}

if (args.includes("--reopen")) {
  const listed = new Set(JSON.parse(readFileSync(arg("--reopen"), "utf8")) as string[]);
  for (const f of readdirSync(dataDir).filter((f) => /^[a-z]{2}\.ts$/.test(f))) {
    const path = join(dataDir, f);
    // a Windows checkout has CRLF; written back with LF, which git stores anyway
    let text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
    let changed = false;
    for (const url of listed) {
      // every role on the link, not only the first: one posting can be several cities
      let from = 0;
      for (;;) {
        const at = text.indexOf(`source: ${JSON.stringify(url)},`, from);
        if (at < 0) break;
        const start = text.lastIndexOf("\n      {\n", at);
        const end = text.indexOf("\n      },", at);
        if (start < 0 || end < 0) break;
        from = end;
        const open = reopenBlock(text.slice(start, end), today);
        if (!open) continue;
        text = text.slice(0, start) + open + text.slice(end);
        from = start + open.length;
        changed = true;
        console.log(url);
      }
    }
    if (changed) writeFileSync(path, text);
  }
  process.exit(0);
}

if (args.includes("--auto")) {
  const open = JSON.parse(readFileSync(arg("--auto"), "utf8")) as { number: number; body: string; createdAt: string }[];
  const check = JSON.parse(readFileSync(join(site, ".linkcheck.json"), "utf8")) as { checkedAt: string; gone: { url: string }[] };
  const gone = new Set(check.gone.map((g) => g.url));
  const day = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date(iso));
  for (const i of open) {
    const url = i.body.match(/<!-- close-key: (\S+) -->/)?.[1];
    // opened tonight: the first night it was gone, so it waits
    if (!url || day(i.createdAt) >= today || !gone.has(url)) continue;
    const who = whichRole(i.body);
    const { role } = roleOf(url, who);
    const applications = (sections(i.body).get("applications") ?? "").replace(/\s+/g, " ").trim();
    if (!role || role.status === "closed" || !applications || applications.length > 160 || /—/.test(applications)) continue;
    if (closeInData(url, applications, who)) console.log(i.number);
  }
  process.exit(0);
}

if (args.includes("--drafts")) {
  const seen = arg("--seen") && existsSync(arg("--seen")) ? readFileSync(arg("--seen"), "utf8") : "";
  const out = arg("--out");
  mkdirSync(out, { recursive: true });
  const check = JSON.parse(readFileSync(join(site, ".linkcheck.json"), "utf8")) as { checkedAt: string; gone: { url: string; why: string }[] };
  // an issue from before the close-role line only names the link, and settled every role on it; since then each
  // role on a shared link gets an issue of its own
  const settled = (url: string) => {
    const key = closeKey(url);
    for (let at = seen.indexOf(key); at >= 0; at = seen.indexOf(key, at + key.length)) {
      if (!seen.slice(at + key.length).trimStart().startsWith("<!-- close-role: ")) return true;
    }
    return false;
  };
  let n = 0;
  for (const g of check.gone) {
    if (settled(g.url)) continue;
    for (const c of companies) {
      for (const r of c.roles.filter((r) => r.source === g.url && r.status !== "closed")) {
        if (seen.includes(closeRole(c.slug, r.title))) continue;
        n++;
        const id = String(n).padStart(3, "0");
        writeFileSync(join(out, `${id}.title.txt`), `[closed] ${c.name}, ${c.city}: ${r.title}`);
        writeFileSync(
          join(out, `${id}.body.md`),
          [
            closeKey(g.url),
            closeRole(c.slug, r.title),
            `The posting for **${r.title}** at ${c.name}, ${c.city} (\`${c.slug}\`) was gone when the nightly check ran on ${longDate(check.checkedAt)} (${g.why}).`,
            "",
            `Open it to be sure: ${g.url}`,
            "",
            "- Gone for good: add the label **publish**. The role turns to closed on the site, with the Applications line below. Still gone the next night, it closes by itself.",
            "- It moved, or it's still open: close this issue and fix the link by hand if it moved. This posting won't be proposed again.",
            "",
            "### Applications",
            "",
            `The posting was taken down by ${longDate(check.checkedAt)}`,
            "",
          ].join("\n"),
        );
        // one issue per company per night on a shared link; a second role of the same company gets its own next night
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
const who = whichRole(body);
const applications = (sections(body).get("applications") ?? "").replace(/\s+/g, " ").trim();
const { company, role } = roleOf(url, who);
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
  const done = closeInData(url, applications, who);
  if (!done) throw new Error(`No data file has ${url}${who ? ` for ${who.slug}` : ""}`);
}
