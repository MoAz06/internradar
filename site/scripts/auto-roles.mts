// Roles that go on the list straight from the job boards, without a draft, and the morning check of them.
// The rules are in lib/autoRole.ts. The inbox workflow runs it every night, after discover:
//
//   --plan --seen seen.txt --cap 150 --out dir   picks the roles: dir/plan.json and dir/summary.md
//   --apply dir/plan.json --issue issue.md       puts them in site/data (skips any that are there by now)
//                                                and writes the morning issue for the ones it put in
//   --covered open.json                          the open drafts whose posting is on the list now, one number a line
//   --review body.md                             the morning issue, closed: ticked roles come off the list for good
//
// seen.txt is every closed draft issue: a draft closed without publishing means "not for the list".
// open.json is `gh issue list --json number,body` of the open drafts.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import { skip } from "../data/skip.ts";
import type { Company } from "../data/types.ts";
import { autoRole, beforeText, morningIssue, tickedIn, type Planned } from "../lib/autoRole.ts";
import type { Found } from "../lib/boards.ts";
import { addSkip, insertEntry, removeRole } from "../lib/dataFile.ts";
import { postingText } from "../lib/postingText.ts";
import { pickNew } from "../lib/roleDraft.ts";

const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? args[args.indexOf(name) + 1] : "");
const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(site, "data");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
const dataFiles = () => readdirSync(dataDir).filter((f) => /^[a-z]{2}\.ts$/.test(f));


// ---------- picking ----------

if (args.includes("--plan")) {
  const out = arg("--out");
  const cap = Math.max(0, Number(arg("--cap") || 150));
  const seen = arg("--seen") ? readFileSync(arg("--seen"), "utf8") : "";
  const { found } = JSON.parse(readFileSync(join(site, ".discover.json"), "utf8")) as { found: Found[] };
  const skipped = new Set(skip.map((s) => s.url));
  const why = new Map<string, number>();
  const tally = (w: string) => why.set(w, (why.get(w) ?? 0) + 1);

  const plan: Planned[] = [];
  for (const { f } of pickNew(found, seen, companies)) {
    if (plan.length >= cap) break;
    const b = beforeText(f, companies, skipped);
    if (!b.ok) {
      tally(b.why);
      continue;
    }
    const text = await postingText(f).catch(() => "");
    // the roles put in already this run count too, so one role on two boards goes in once
    const all = companies.map((c) => (plan.some((p) => p.slug === c.slug) ? { ...c, roles: [...c.roles, ...plan.filter((p) => p.slug === c.slug).map((p) => p.role)] } : c));
    const a = autoRole(f, text, all, today, skipped);
    if (!a.ok) {
      tally(a.why);
      continue;
    }
    plan.push({ slug: a.slug, name: a.company.name, city: a.role.city ?? a.company.city, role: a.role });
  }

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
  const reasons = [...why].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${n}`);
  const summary = `${plan.length} roles go on the list by themselves${plan.length >= cap ? ` (at most ${cap} a night)` : ""}. Left for a draft: ${reasons.join(", ") || "none"}.`;
  writeFileSync(join(out, "summary.md"), summary + "\n");
  console.log(summary);
}

// ---------- putting them in ----------

if (args.includes("--apply")) {
  const plan = JSON.parse(readFileSync(arg("--apply"), "utf8")) as Planned[];
  // a Windows checkout has CRLF; written back with LF, which git stores anyway
  const files = new Map(dataFiles().map((f) => [f, readFileSync(join(dataDir, f), "utf8").replace(/\r\n/g, "\n")]));
  const put: Planned[] = [];
  for (const p of plan) {
    // run again on a newer master: whatever is there by now stays as it is
    if ([...files.values()].some((t) => t.includes(`source: ${JSON.stringify(p.role.source)},`))) continue;
    for (const [f, text] of files) {
      const next = insertEntry(text, p.slug, "roles", p.role);
      if (next === null) continue;
      files.set(f, next);
      put.push(p);
      break;
    }
  }
  for (const [f, text] of files) writeFileSync(join(dataDir, f), text);
  if (arg("--issue")) writeFileSync(arg("--issue"), put.length ? morningIssue(put, today) + "\n" : "");
  console.log(`${put.length} of ${plan.length} roles put on the list`);
}

// ---------- drafts that are done ----------

if (args.includes("--covered")) {
  const open = JSON.parse(readFileSync(arg("--covered"), "utf8")) as { number: number; body: string }[];
  const onList = new Set(companies.flatMap((c: Company) => c.roles.map((r) => r.source)));
  for (const i of open) {
    // closing drafts are about roles on the list; only new-role drafts count here
    if (!i.body.includes("<!-- role-key:")) continue;
    const url = i.body.match(/### Posting\s+(\S+)/)?.[1];
    if (url && onList.has(url)) console.log(i.number);
  }
}

// ---------- the morning check ----------

if (args.includes("--review")) {
  const body = readFileSync(arg("--review"), "utf8");
  const day = body.match(/<!-- auto-roles: (\S+) -->/)?.[1] ?? today;
  const ticked = tickedIn(body);
  let skipText = readFileSync(join(dataDir, "skip.ts"), "utf8").replace(/\r\n/g, "\n");
  let gone = 0;
  for (const url of ticked) {
    for (const f of dataFiles()) {
      const path = join(dataDir, f);
      const next = removeRole(readFileSync(path, "utf8").replace(/\r\n/g, "\n"), url);
      if (next === null) continue;
      writeFileSync(path, next);
      gone++;
      break;
    }
    skipText = addSkip(skipText, url, `Taken off in the check of the roles added on ${day}`);
  }
  writeFileSync(join(dataDir, "skip.ts"), skipText);
  console.log(`${ticked.length} ticked, ${gone} taken off the list`);
}
