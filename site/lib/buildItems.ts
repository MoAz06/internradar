import { companies, countries } from "../data/companies.ts";
import { fuzzyDate, live, stale, today } from "./live.ts";
import { shortKey, type Item } from "./items.ts";
import { historyStart, roleHistory } from "../data/history.ts";
import { payFor } from "../data/pay.ts";
import { companyNoSponsor, languagesOf, levelsOf, needsWorkRights } from "./eligibility.ts";
import { testsOf } from "./tests.ts";
import { reapplyRules, type ReapplyRule } from "../data/reapply.ts";

/** The company's step that says most in one line: the first about a test or an interview, else the first that
 * says anything. "You apply online" alone tells a student little. */
function companyStep(lines: string[]): string {
  const said = lines.filter((p) => !/not (described|stated)/i.test(p));
  const line = said.find((p) => /interview|assess|test|coding|exercise|hirevue|case|screening|call/i.test(p)) ?? said[0] ?? "";
  // on its own the line has nothing before it: "Then you have a call" becomes "You have a call"
  return line.replace(/^(?:then|next),?\s+(\w)/i, (_, c: string) => c.toUpperCase());
}

/** A rule counts for every entry of the same company: Google's for Google Amsterdam, London and Zurich. */
function strictRule(slug: string, name: string): ReapplyRule | undefined {
  return reapplyRules.find(
    (r) => r.group !== "welcome" && (r.slug === slug || companies.find((c) => c.slug === r.slug)?.name === name),
  );
}

/** "a year", "8 months", "30 days", "next season", "test once". */
function tagOf(r: ReapplyRule): string {
  if (r.group === "test") return "test once";
  if (r.group === "season") return "next season";
  if (r.waitMonths) return r.waitMonths === 12 ? "a year" : `${r.waitMonths} months`;
  if (r.waitDays) return `${r.waitDays} days`;
  return "a waiting time";
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** Every role, with its status as of the build date, sorted the way the list shows it:
 * open roles by deadline (soonest first, no deadline last), then the ones opening soon, then closed. */
export function buildItems(now = today()): Item[] {
  const items: Item[] = [];
  const seen = new Set<string>();
  for (const c of companies) {
    const countryName = countries.find((k) => k.code === c.country)?.name ?? c.country;
    c.roles.forEach((r) => {
      const l = live(r, now);
      const open = l.status === "open" || l.status === "rolling";
      const daysLeft = open && r.closes ? daysBetween(now, r.closes) : null;
      let when = l.short;
      if (daysLeft !== null) {
        when =
          daysLeft <= 0 ? "Closes today" : daysLeft === 1 ? "Closes tomorrow" : daysLeft <= 14 ? `Closes in ${daysLeft} days` : `Open until ${fuzzyDate(r.closes!)}`;
      } else if (l.status === "open") {
        when = "Open, no deadline listed";
      } else if (l.status === "rolling") {
        when = "Rolling, apply early";
      }
      // stable across data edits, so saved stars keep pointing at the same role
      let id = `${c.slug}|${r.title}|${r.source}`;
      while (seen.has(id)) id += "+";
      seen.add(id);
      const added = roleHistory[id]?.added ?? now;
      const strict = strictRule(c.slug, c.name);
      items.push({
        id,
        added,
        fresh: added > historyStart && daysBetween(added, now) <= 7,
        key: shortKey(id),
        company: c.name,
        slug: c.slug,
        city: r.city ?? c.city,
        country: r.country ?? c.country,
        countryName: r.country ? (countries.find((k) => k.code === r.country)?.name ?? r.country) : countryName,
        title: r.title,
        kind: r.kind,
        field: r.field,
        status: l.status,
        when,
        urgent: daysLeft !== null && daysLeft <= 7,
        daysLeft,
        start: r.start,
        opens: r.opens,
        closes: r.closes,
        process: r.process,
        // a role straight from the job board has no rule of its own: the company's rule, which covers every role
        reapply: r.reapply && !/^not stated/i.test(r.reapply) ? r.reapply : r.auto && !/^not stated/i.test(c.reapply) ? c.reapply : null,
        source: r.source,
        checked: r.checked,
        old: stale(r.checked, now),
        pay: payFor(c.slug, r.title, r.kind),
        levels: levelsOf(r.eligibility, r.title),
        // the role's own line, or a line on the company that says it sponsors no early careers role of this kind
        workRights: needsWorkRights(r.eligibility) || !!r.workRights || companyNoSponsor([...(c.pay ?? []), ...(c.notes ?? [])], r.kind),
        languages: r.language ? [...new Set([...languagesOf(r.eligibility), r.language])] : languagesOf(r.eligibility),
        auto: !!r.auto,
        tests: testsOf([...c.process, r.process ?? ""]),
        // the role's own line, else the company's first step that says something; the list shows one line of it
        how: (!r.auto && r.process && !/^not stated/i.test(r.process) ? r.process : companyStep(c.process))
          .replace(/\s+/g, " ")
          .trim(),
        reapplyTag: strict ? tagOf(strict) : "",
        reapplyRule: strict?.rule ?? "",
      });
    });
  }
  const rank = (x: Item) => (x.status === "open" || x.status === "rolling" ? 0 : x.status === "soon" ? 1 : 2);
  return items.sort((a, b) => rank(a) - rank(b) || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999) || a.company.localeCompare(b.company));
}
