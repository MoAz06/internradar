// The rows of the list on the home page. The same role in several cities is one row, and so are the roles of one
// company and one kind that close on the same day, or that have no deadline. A shared programme name ("SEB Tech
// Trainee Programme 2027-28: ...") becomes the row's title.
// No data import, so the browser can run it.

import { cleanTitle, fold, type Item } from "./items.ts";

export type Row = {
  /** The first role's id: stable while the filters change. */
  id: string;
  /** The roles in this row, in list order. */
  items: Item[];
  /** What the row says: the one title, the programme name, or the titles one after the other. */
  title: string;
  /** "4 roles" or "2 cities" when the row holds more than one role. */
  chip: string | null;
  cities: string[];
};

const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLong = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The part before ": " or " - " when it names a programme: "SEB Tech Trainee Programme 2027-28", "2027 Software Dev
 * Engineer Intern". A bare "Internship" or "Working Student" is not one. */
function headOf(title: string): string | null {
  const h = title.match(/^(.{8,}?)(?::\s|\s[-–|]\s)/)?.[1].trim();
  if (!h || h.split(/\s+/).length < 3 || h.split(/\s+/).filter((w) => /[a-z]{2}/i.test(w)).length < 2) return null;
  return /\b(program|programme|scheme|trainee)\b/i.test(h) || /\b20\d\d\b/.test(h) ? h : null;
}

/** Rows in the order of the roles. `merge` puts different roles of one company in one row; without it only
 * the same role in several cities shares a row (for the pay order, where each role has its own figure). */
export function toRows(items: Item[], merge = true): Row[] {
  // the same title, the same day, more than one city
  const same = new Map<string, Item[]>();
  for (const x of items) {
    const k = `${x.company}|${x.status}|${x.closes ?? ""}|${fold(cleanTitle(x.title, x.city, x.company))}`;
    same.set(k, [...(same.get(k) ?? []), x]);
  }
  let groups = [...same.values()];
  if (merge) {
    // one company, one kind of role, one deadline (or none): one row
    const byDay = new Map<string, Item[][]>();
    for (const g of groups) {
      const x = g[0];
      const k = `${x.company}|${x.kind}|${x.status}|${x.closes ?? ""}`;
      byDay.set(k, [...(byDay.get(k) ?? []), g]);
    }
    groups = [...byDay.values()].map((gs) => gs.flat());
  }
  const at = new Map(items.map((x, i) => [x.id, i]));
  return groups
    .map((g) => g.sort((a, b) => at.get(a.id)! - at.get(b.id)!))
    .sort((a, b) => at.get(a[0].id)! - at.get(b[0].id)!)
    .map((g) => {
      const titles = [...new Set(g.map((x) => cleanTitle(x.title, x.city, x.company)))];
      const cities = [...new Set(g.map((x) => x.city))];
      const heads = titles.map(headOf);
      const head = titles.length > 1 && heads.every((h) => h && h === heads[0]) ? heads[0]! : null;
      return {
        id: g[0].id,
        items: g,
        title: titles.length === 1 ? titles[0] : (head ?? (titles.length <= 3 ? titles.join(" · ") : `${titles.slice(0, 2).join(" · ")} and ${titles.length - 2} more`)),
        chip: g.length === 1 ? null : titles.length === 1 && cities.length > 1 ? `${cities.length} cities` : `${g.length} roles`,
        cities,
      };
    });
}

/** Rows on the first page of the home list. */
export const FIRST_PAGE = 25;

/** What the home page needs before the full list (/roles.json) has loaded: the roles of the first page in the
 * plain view (open roles, closing soonest), and the numbers that view shows. */
export type StartView = {
  first: Item[];
  /** open roles, the number above the list */
  shown: number;
  soon: number;
  fresh: number;
  withPay: number;
  rows: number;
  perHeading: [string, number][];
};

export function startView(items: Item[], now: string): StartView {
  const open = items.filter((x) => x.status === "open" || x.status === "rolling");
  const rows = toRows(open);
  const perHeading = new Map<string, number>();
  for (const r of rows) {
    const h = closesGroup(r.items[0], now);
    perHeading.set(h, (perHeading.get(h) ?? 0) + r.items.length);
  }
  return {
    first: rows.slice(0, FIRST_PAGE).flatMap((r) => r.items),
    shown: open.length,
    soon: items.filter((x) => x.status === "soon").length,
    fresh: items.filter((x) => x.fresh).length,
    withPay: open.filter((x) => x.pay).length,
    rows: rows.length,
    perHeading: [...perHeading],
  };
}

/** The cities of a row in a few words: "Amsterdam, London" or "Bristol and 3 more". */
export const citiesOf = (r: Row) => (r.cities.length <= 2 ? r.cities.join(", ") : `${r.cities[0]} and ${r.cities.length - 1} more`);

/** The pay of a row: the figure when every role in it names the same one. */
export function payOf(r: Row): string {
  const all = new Set(r.items.map((x) => x.pay?.short ?? ""));
  return all.size === 1 ? [...all][0] : "";
}

/** Weekday of a YYYY-MM-DD day, Monday 0. */
const weekday = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;

/** The heading a role sits under when the list goes by deadline. `now` is the build day. */
export function closesGroup(x: Item, now: string): string {
  if (x.status === "soon") return "Opening soon";
  if (x.status === "closed") return "Closed";
  if (x.daysLeft === null || !x.closes) return "No deadline listed";
  const toSunday = 6 - weekday(now);
  if (x.daysLeft <= 0) return "Closes today";
  if (x.daysLeft === 1) return "Closes tomorrow";
  if (x.daysLeft <= toSunday) return "Closes this week";
  if (x.daysLeft <= toSunday + 7) return "Closes next week";
  const [y, m] = x.closes.split("-").map(Number);
  return `Closes in ${monthLong[m - 1]}${String(y) === now.slice(0, 4) ? "" : ` ${y}`}`;
}

/** The deadline in the narrow column: "Today", "Fri" within the week (or "Tomorrow" without headings), else "27 Nov". */
export function closesShort(x: Item, headings: boolean): string | null {
  if ((x.status !== "open" && x.status !== "rolling") || x.daysLeft === null || !x.closes) return null;
  if (x.daysLeft <= 0) return "Today";
  if (x.daysLeft === 1 && !headings) return "Tomorrow";
  if (x.daysLeft <= 6) return dayShort[weekday(x.closes)];
  const [, m, d] = x.closes.split("-").map(Number);
  return `${d} ${monthShort[m - 1]}`;
}

/**
 * For a role that opens soon: a short label for the top right ("Opens 4 Jan", "Expected March", "No exact date") and
 * the company's own words as a note under the title, left out when they say no more than the label.
 */
export function soonLabel(x: Item): { label: string; note: string } {
  if (x.status !== "soon" || x.when.startsWith("Due ")) return { label: x.when, note: "" };
  let label = "No exact date";
  if (x.opens) {
    const [, m, d] = x.opens.split("-").map(Number);
    label = d ? `Opens ${d} ${monthShort[m - 1]}` : `Expected ${monthLong[m - 1]}`;
  }
  return { label, note: /^Opens [\w ]+$/.test(x.when) ? "" : x.when };
}
