// Writes README.md tables and companies/*.md from site/data.
// The data files are the only place to edit. Run: npm run gen
// npm run check fails if the generated files are out of date.

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies, countries, lastChecked, links, radar } from "../data/companies.ts";
import type { Company, Role } from "../data/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const check = process.argv.includes("--check");
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${months[m - 1]}`;
};
const long = (iso: string) => `${short(iso)} ${iso.slice(0, 4)}`;
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;

let stale: string[] = [];
function write(path: string, text: string) {
  const full = join(root, path);
  const old = existsSync(full) ? readFileSync(full, "utf8").replace(/\r\n/g, "\n") : null;
  if (old === text) return;
  stale.push(path);
  if (!check) writeFileSync(full, text);
}

function status(r: Role): string {
  const until = r.closes ? ` until ${short(r.closes)}` : "";
  if (r.status === "open") return `🟢${until}`;
  if (r.status === "rolling") return `🟢 rolling${until}`;
  if (r.status === "closed") return "🔴";
  return `🟡 ${r.applications.replace(/^Opens /, "")}`;
}

function city(c: Company) {
  return c.city === "Amsterdam" ? "AMS" : c.city;
}

// ---------- README ----------

function badges(): string {
  const roles = companies.reduce((n, c) => n + c.roles.length, 0);
  const date = long(lastChecked).replace(/ /g, "%20");
  return [
    `![companies](https://img.shields.io/badge/companies-${companies.length}-blue)`,
    `![roles](https://img.shields.io/badge/roles-${roles}-blue)`,
    `![checked](https://img.shields.io/badge/last%20checked-${date}-green)`,
  ].join(" ");
}

function list(): string {
  const out: string[] = [];
  const jump = countries.map((k) => `[${k.flag} ${k.name}](#${k.slug})`);
  out.push(`**Jump to:** ${[...jump, "[On the radar](#on-the-radar)", "[How to read this](#how-to-read-this)"].join(" · ")}`);
  out.push("");
  out.push(`<a id="on-the-radar"></a>`);
  out.push("## On the radar");
  out.push("");
  out.push("What opens next. Put it in your calendar now, most of these close within weeks.");
  out.push("");
  out.push("| Opens | Company | Role | What to expect |");
  out.push("| --- | --- | --- | --- |");
  for (const r of [...radar].sort((a, b) => a.sortKey.localeCompare(b.sortKey))) {
    out.push(`| **${cell(r.opens)}** | [${cell(r.company)}](companies/${r.slug}.md) | ${cell(r.role)} | ${cell(r.expect.replace(/ · /g, ", "))} |`);
  }
  out.push("");
  out.push("🟢 open · 🟡 opens soon · 🔴 closed · OA = online assessment · AC = assessment centre · AMS = Amsterdam");
  for (const k of countries) {
    const here = companies.filter((c) => c.country === k.code);
    out.push("");
    out.push(`<a id="${k.slug}"></a>`);
    out.push(`## ${k.flag} ${k.name}`);
    out.push("");
    if (here.length === 0) {
      out.push("Nothing yet. [Add the first one.](CONTRIBUTING.md) · [⬆ back to top](#internradar)");
      continue;
    }
    out.push("| Company | Role | City | Status | Start | Process | Re-apply | Checked |");
    out.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const c of here) {
      for (const r of c.roles) {
        const shortDuration = r.duration && /^\d+(\.\d+)?\s*(weeks?|months?|wk|mo)/i.test(r.duration);
        const start = r.start === "Not stated" ? "–" : shortDuration ? `${r.start}, ${r.duration}` : r.start;
        out.push(
          `| [${cell(c.name)}](companies/${c.slug}.md) | ${cell(r.title)} | ${cell(city(c))} | ${cell(status(r))} | ${cell(start)} | ${cell(r.process)} | ${cell(r.reapply)} | ${short(r.checked)} |`,
        );
      }
    }
    out.push("");
    out.push(`${here.length} ${here.length === 1 ? "company" : "companies"}. Eligibility, pay, visa and the full process are on the company pages. [⬆ back to top](#internradar)`);
  }
  return out.join("\n");
}

function replaceBlock(text: string, name: string, body: string): string {
  const start = `<!-- gen:${name} -->`;
  const end = `<!-- /gen:${name} -->`;
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) throw new Error(`README.md is missing ${start} ... ${end}`);
  return text.slice(0, a + start.length) + "\n" + body + "\n" + text.slice(b);
}

let readme = readFileSync(join(root, "README.md"), "utf8").replace(/\r\n/g, "\n");
readme = replaceBlock(readme, "badges", badges());
readme = replaceBlock(readme, "list", list());
write("README.md", readme);

// ---------- companies/<slug>.md ----------

function page(c: Company): string {
  const o: string[] = [];
  o.push(`# ${c.name}`, "");
  o.push(`Location: ${c.city}, ${countryName(c.country)}`);
  o.push(`Careers page: ${c.careersUrl}`, "");
  o.push("## Roles", "");
  o.push("| Role | Applications | Start | Duration | Who can apply | Source | Checked |");
  o.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of c.roles) {
    o.push(
      `| ${cell(r.title)} | ${cell(r.applications)} | ${cell(r.start)} | ${cell(r.duration ?? "Not stated")} | ${cell(r.eligibility)} | [link](${r.source}) | ${r.checked} |`,
    );
  }
  o.push("", "## Process, as the company describes it", "");
  for (const p of c.process) o.push(`- ${p}`);
  o.push("", "## Re-apply rule", "", c.reapply);
  o.push("", "## Pay, relocation, visa", "");
  for (const p of c.pay) o.push(`- ${p}`);
  if (c.notes?.length) {
    o.push("", "## Notes", "");
    for (const n of c.notes) o.push(`- ${n}`);
  }
  o.push("", "## Candidate reports", "");
  if (c.reports.length === 0) {
    o.push(`None yet. Went through this process? [Share what it looked like](https://internradar.eu/share/?company=${c.slug}#form).`);
  } else {
    for (const r of c.reports) {
      o.push(`**${r.role}, applied ${r.applied}.** ${r.timeline.join(" → ")}. Outcome: ${r.outcome}.${r.notes ? " " + r.notes : ""}`, "");
    }
    if (o.at(-1) === "") o.pop();
  }
  o.push("", "## Sources", "");
  for (const s of c.sources) o.push(`- ${s.url} checked ${s.checked}`);
  o.push("", "<!-- Generated from site/data. Edit the data file, then run npm run gen in site/. -->", "");
  return o.join("\n");
}

const slugs = new Set<string>();
for (const c of companies) {
  if (slugs.has(c.slug)) throw new Error(`duplicate slug ${c.slug}`);
  slugs.add(c.slug);
  write(`companies/${c.slug}.md`, page(c));
}
for (const f of readdirSync(join(root, "companies"))) {
  if (f.startsWith("_") || !f.endsWith(".md")) continue;
  if (!slugs.has(f.slice(0, -3))) {
    stale.push(`companies/${f}`);
    if (!check) unlinkSync(join(root, "companies", f));
  }
}

if (check && stale.length) {
  console.error(`Out of date: ${stale.join(", ")}\nRun npm run gen in site/ and commit the result.`);
  process.exit(1);
}
console.log(stale.length ? `Updated ${stale.length} files.` : "Everything up to date.");
