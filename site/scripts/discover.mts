// Looks for internships and graduate roles that are not on the list yet, on the job boards the companies
// on internradar already use (Greenhouse, Lever, Ashby, SmartRecruiters, Workday). It only reads their
// public job APIs and writes a report. It never changes the data: every new role still gets checked by hand
// on its own posting before it goes in.
//
// Writes .discover.json (read by scripts/role-drafts.mts) and .discover.md. Run: npm run discover
// --only nxp,thales reads only the boards of companies whose slug starts with, or whose name is, one of those
// words, and writes .discover-only.json instead (auto-roles --found reads it). The full report stays as it was.
// A role that was looked at and is not for the list goes in data/skip.ts, so it doesn't come back.

import { writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies, countries } from "../data/companies.ts";
import { skip } from "../data/skip.ts";
import { boardKey, boardOf, early, inEurope, jobId, normTitle, tech, type Board, type BoardCompany, type Found } from "../lib/boards.ts";
import { readBoard } from "../lib/readBoard.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
/** At most this many per board in the report; a big board gets a link to the rest. */
const PER_BOARD = 12;
const args = process.argv.slice(2);
const only = args.includes("--only") ? (args[args.indexOf("--only") + 1] ?? "").toLowerCase().split(",").map((w) => w.trim()).filter(Boolean) : [];
if (args.includes("--only") && !only.length) throw new Error("--only needs company words, like --only nxp,thales");
const picked = (c: { slug: string; name: string }) => only.some((w) => c.slug.startsWith(w) || c.name.toLowerCase() === w);

// ---------- run ----------

const boards = new Map<string, { board: Board; names: Set<string>; entries: Map<string, BoardCompany>; known: Map<string, Set<string>>; titles: Set<string> }>();
for (const c of companies) {
  for (const url of [c.careersUrl, ...c.roles.map((r) => r.source), ...c.sources.map((s) => s.url)]) {
    const b = boardOf(url);
    if (!b) continue;
    const k = boardKey(b);
    if (!boards.has(k)) boards.set(k, { board: b, names: new Set(), entries: new Map(), known: new Map(), titles: new Set() });
    const e = boards.get(k)!;
    e.names.add(c.name);
    e.entries.set(c.slug, { slug: c.slug, name: c.name, city: c.city });
    for (const r of c.roles) {
      if (boardKey(boardOf(r.source) ?? b) !== k) continue;
      const id = jobId(r.source);
      // which posting links on the list belong to this job id, for the posting dates below
      if (id) e.known.set(id, (e.known.get(id) ?? new Set()).add(r.source));
      e.titles.add(normTitle(r.title));
    }
  }
}

if (only.length) {
  for (const [k, e] of boards) if (![...e.entries.values()].some(picked)) boards.delete(k);
  if (!boards.size) throw new Error(`No board belongs to ${only.join(", ")}`);
}

const skipIds = new Set(skip.map((s) => jobId(s.url) ?? s.url));
const found: Found[] = [];
const failed: string[] = [];
/** Posting link on the list to the day its job board says it was first published. Kept by scripts/opened.mts. */
const postedOn: Record<string, string> = {};
// Workday answers 429 when several of its boards are read at once, so those go one by one in a lane of their own
const all = [...boards.entries()];
const rest = all.filter(([, e]) => e.board.ats !== "workday");
const lanes = [all.filter(([, e]) => e.board.ats === "workday"), ...[0, 1, 2, 3].map((i) => rest.filter((_, j) => j % 4 === i))];
await Promise.all(
  lanes.map(async (list) => {
    for (const [key, e] of list) {
      const jobs = await readBoard(e.board).catch(() => null);
      if (!jobs) {
        failed.push(key);
        continue;
      }
      const seen = new Set<string>();
      for (const j of jobs) {
        if (!j.title || !j.url) continue;
        const id = jobId(j.url) ?? j.url;
        if (seen.has(id)) continue;
        seen.add(id);
        if (e.known.has(id)) {
          if (j.posted) for (const src of e.known.get(id)!) postedOn[src] = j.posted;
          continue;
        }
        if (skipIds.has(id) || skipIds.has(j.url)) continue;
        if (e.titles.has(normTitle(j.title))) continue;
        if (!early.test(j.title)) continue;
        // a location we can't read ("3 Locations") is kept, the check by hand decides
        if (j.location && !/^\d+ locations?$/i.test(j.location) && !inEurope(j.location)) continue;
        found.push({
          board: key,
          spec: e.board,
          companies: [...e.entries.values()],
          company: [...e.names].join(" / "),
          title: j.title.trim(),
          url: j.url,
          location: j.location || "not given",
          ref: j.ref,
          posted: j.posted,
          tech: tech.test(j.title),
        });
      }
    }
  }),
);

found.sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
const checkedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
if (only.length) {
  writeFileSync(join(site, ".discover-only.json"), JSON.stringify({ checkedAt, boards: boards.size, failed, found }, null, 1));
  console.log(`${boards.size} boards (${[...boards.keys()].join(", ")}), ${found.length} new (${found.filter((f) => f.tech).length} tech), ${failed.length} failed${failed.length ? ": " + failed.join(", ") : ""}`);
  console.log("Wrote .discover-only.json; the full report is untouched. Next: auto-roles --plan --found .discover-only.json");
  process.exit(0);
}
writeFileSync(join(site, ".discover.json"), JSON.stringify({ checkedAt, boards: boards.size, failed, found }, null, 1));
writeFileSync(join(site, ".opened.json"), JSON.stringify(postedOn, null, 1));

const md = join(site, ".discover.md");
rmSync(md, { force: true });
const techFound = found.filter((f) => f.tech);
const other = found.filter((f) => !f.tech);
if (found.length) {
  const lines = [
    `The nightly check on ${checkedAt} read ${boards.size} job boards of companies on the list and found ${found.length} early-career roles in Europe that are not on it.`,
    "",
    `## Tech roles (${techFound.length})`,
    "",
  ];
  const byBoard = new Map<string, Found[]>();
  for (const f of techFound) byBoard.set(f.board, [...(byBoard.get(f.board) ?? []), f]);
  for (const [, list] of [...byBoard].sort((a, b) => a[1][0].company.localeCompare(b[1][0].company))) {
    lines.push("", `**${list[0].company}** (${list.length})`, "");
    for (const f of list.slice(0, PER_BOARD)) lines.push(`- [${f.title}](${f.url}), ${f.location}`);
    if (list.length > PER_BOARD) lines.push(`- and ${list.length - PER_BOARD} more`);
  }
  if (other.length) lines.push("", `${other.length} more early-career roles have titles that don't look like tech. They don't get a draft.`);
  if (failed.length) lines.push("", `Could not read: ${failed.join(", ")}.`);
  writeFileSync(md, lines.join("\n") + "\n");
}

console.log(`${boards.size} boards, ${found.length} new (${techFound.length} tech), ${failed.length} failed${failed.length ? ": " + failed.join(", ") : ""}`);
