import { companies, countries } from "../data/companies.ts";
import { fuzzyDate, live, stale, today } from "./live.ts";
import type { Item } from "./items.ts";

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
      items.push({
        id,
        company: c.name,
        slug: c.slug,
        city: c.city,
        country: c.country,
        countryName,
        title: r.title,
        kind: r.kind,
        field: r.field,
        status: l.status,
        when,
        urgent: daysLeft !== null && daysLeft <= 7,
        daysLeft,
        start: r.start,
        process: r.process,
        reapply: /^not stated/i.test(r.reapply) ? null : r.reapply,
        source: r.source,
        checked: r.checked,
        old: stale(r.checked, now),
      });
    });
  }
  const rank = (x: Item) => (x.status === "open" || x.status === "rolling" ? 0 : x.status === "soon" ? 1 : 2);
  return items.sort((a, b) => rank(a) - rank(b) || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999) || a.company.localeCompare(b.company));
}
