// Builds data/history.ts from the git history of site/data: when each role first showed up on the list,
// and every change of its status (soon -> open -> closed) with the date of the commit.
// This is what "New" labels, the feeds and, next year, "last year it opened on ..." are made from.
// Needs the full git history, so it runs on your machine, not in CI. Run: npm run history

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Company } from "../data/types.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(site, "..");
const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: 1 << 28 });

type Snapshot = { date: string; companies: Company[] };

async function load(dir: string): Promise<Company[]> {
  const mod = (await import(pathToFileURL(join(dir, "companies.ts")).href)) as { companies: Company[] };
  return mod.companies;
}

// every commit that touched the data, oldest first, plus the working copy as of today
const commits = git("log", "--reverse", "--format=%H %ad", "--date=format:%Y-%m-%d", "--", "site/data")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => l.split(" ") as [string, string]);

const snaps: Snapshot[] = [];
const tmp = mkdtempSync(join(tmpdir(), "internradar-history-"));
try {
  for (const [sha, date] of commits) {
    const dir = join(tmp, sha);
    // git show each data file into a folder of its own, then import it like the real data
    const files = git("ls-tree", "--name-only", `${sha}:site/data`).trim().split("\n").filter((f) => f.endsWith(".ts"));
    execFileSync("node", ["-e", "require('fs').mkdirSync(process.argv[1],{recursive:true})", dir]);
    for (const f of files) writeFileSync(join(dir, f), git("show", `${sha}:site/data/${f}`));
    if (!files.includes("companies.ts")) continue;
    try {
      snaps.push({ date, companies: await load(dir) });
    } catch (e) {
      console.warn(`skipped ${sha.slice(0, 7)} (${date}): ${(e as Error).message.split("\n")[0]}`);
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
snaps.push({ date: today, companies: await load(join(site, "data")) });

type RoleHistory = { added: string; statuses: [date: string, status: string][]; closes?: [date: string, closes: string][] };
const roles: Record<string, RoleHistory> = {};
const companiesAdded: Record<string, string> = {};

for (const s of snaps) {
  for (const c of s.companies) {
    companiesAdded[c.slug] ??= s.date;
    const seen = new Set<string>();
    for (const r of c.roles) {
      let id = `${c.slug}|${r.title}|${r.source}`;
      while (seen.has(id)) id += "+";
      seen.add(id);
      const h = (roles[id] ??= { added: s.date, statuses: [] });
      if (h.statuses.at(-1)?.[1] !== r.status) h.statuses.push([s.date, r.status]);
      if (r.closes && h.closes?.at(-1)?.[1] !== r.closes) (h.closes ??= []).push([s.date, r.closes]);
    }
  }
}

// The list was built in its first days; everything on it by this day counts as the starting set, not as new.
const BASELINE = "2026-11-17";
const first = [snaps[0]?.date ?? today, BASELINE].sort().at(-1)!;
const out = `// Made by scripts/history.mts from the git history of site/data. Don't edit by hand: run npm run history.

/** Roles added on or before this day were part of the starting set, so they don't count as new. */
export const historyStart = ${JSON.stringify(first)};

/** Per role id (slug|title|source): the day it was added, and each status (and deadline) with the day it was set. */
export const roleHistory: Record<string, { added: string; statuses: [string, string][]; closes?: [string, string][] }> = ${JSON.stringify(roles, null, 0)
  .replace(/^\{/, "{\n  ")
  .replace(/\},"/g, '},\n  "')
  .replace(/\}$/, "\n}")};

/** Per company slug: the day it was added. */
export const companyAdded: Record<string, string> = ${JSON.stringify(companiesAdded, null, 2)};
`;
writeFileSync(join(site, "data", "history.ts"), out);
console.log(`${snaps.length} snapshots from ${snaps[0]?.date} to ${today}, new counted after ${first}, ${Object.keys(roles).length} roles, ${Object.keys(companiesAdded).length} companies`);
