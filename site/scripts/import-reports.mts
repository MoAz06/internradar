// Turns the CSV export of the share form (Tally: Responses, Download CSV) into report entries for site/data.
// It prints them grouped per company, for you to read, trim and paste into the company's `reports: []`.
// Nothing is written into the data: every report gets read by hand first.
//
// Run: npm run import-reports -- path/to/responses.csv
// The form's questions must have these labels (the same as the GitHub form):
//   Company · Role and location · When did you apply? · Timeline · The online test, if there was one ·
//   Weeks from applying to the final answer · Outcome · Anything the next person should know

import { readFileSync } from "node:fs";
import { companies } from "../data/companies.ts";

const file = process.argv[2];
if (!file) {
  console.error("Give the CSV file: npm run import-reports -- responses.csv");
  process.exit(1);
}

/** A small CSV reader: commas, quotes, doubled quotes and line breaks inside quotes. */
function parse(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows.filter((r) => r.some((c) => c.trim()));
}

const [head, ...rows] = parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
const col = (label: string) => head.findIndex((h) => h.trim().toLowerCase().startsWith(label.toLowerCase()));
const c = {
  company: col("Company"),
  role: col("Role and location"),
  applied: col("When did you apply"),
  timeline: col("Timeline"),
  test: col("The online test"),
  weeks: col("Weeks from applying"),
  outcome: col("Outcome"),
  notes: col("Anything the next person"),
};
const missing = Object.entries(c).filter(([k, i]) => i < 0 && k !== "test" && k !== "notes" && k !== "weeks");
if (missing.length) {
  console.error(`The CSV has no column for: ${missing.map(([k]) => k).join(", ")}. Columns found: ${head.join(" | ")}`);
  process.exit(1);
}

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const weeksOk = ["under 1", "1-2", "3-4", "5-8", "more than 8", "still waiting"];
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());

const byCompany = new Map<string, string[]>();
for (const r of rows) {
  const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const name = get(c.company);
  const role = get(c.role);
  // match the company by name; with several offices, the role's location picks one
  const hits = companies.filter((x) => fold(x.name) === fold(name) || fold(x.name).startsWith(fold(name) + " ") || fold(name).startsWith(fold(x.name)));
  const pick = hits.length > 1 ? (hits.find((x) => fold(role).includes(fold(x.city))) ?? null) : (hits[0] ?? null);
  const where = pick ? pick.slug : hits.length ? `? one of ${hits.map((x) => x.slug).join(", ")}` : `? no company called "${name}"`;
  const weeks = get(c.weeks);
  const entry = {
    role,
    applied: get(c.applied),
    timeline: get(c.timeline).split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
    outcome: get(c.outcome),
    ...(get(c.notes) ? { notes: get(c.notes) } : {}),
    ...(weeksOk.includes(weeks) ? { weeks } : {}),
    ...(get(c.test) ? { test: get(c.test) } : {}),
    added: today,
  };
  byCompany.set(where, [...(byCompany.get(where) ?? []), JSON.stringify(entry, null, 2).replace(/^/gm, "      ")]);
}

for (const [where, entries] of byCompany) {
  console.log(`\n// ${where}  (${entries.length})\n${entries.join(",\n")},`);
}
console.log(`\n${rows.length} responses. Read each one: no questions from tests or interviews, no names, then paste it under reports.`);
