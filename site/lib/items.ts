import type { Field, RoleKind, Status } from "../data/types.ts";
import type { Pay } from "../data/pay.ts";
import type { Level } from "./eligibility.ts";

/** One role as the search list on the home page needs it. Built at build time, so it holds no functions. */
export type Item = {
  /** Day the role was added to the list, from the git history. */
  added: string;
  /** Added in the last 7 days, after the starting set. */
  fresh: boolean;
  id: string;
  /** Short, stable code for the id, used in "open on another device" links. */
  key: string;
  company: string;
  slug: string;
  city: string;
  country: string;
  countryName: string;
  title: string;
  kind: RoleKind;
  field: Field;
  status: Status;
  /** Status in words, e.g. "Closes in 5 days" or "Opens Jan 2027". */
  when: string;
  /** True when the deadline is a week away or less. */
  urgent: boolean;
  /** Days until the deadline, for sorting. */
  daysLeft: number | null;
  start: string;
  /** YYYY-MM-DD or YYYY-MM, only when the company names it. */
  opens?: string;
  /** Last day to apply, YYYY-MM-DD, only when the posting names it. */
  closes?: string;
  process: string;
  reapply: string | null;
  source: string;
  checked: string;
  old: boolean;
  /** Pay the company states for this role (data/pay.ts). */
  pay?: Pay;
  /** Study levels the eligibility line names; null when it names none. */
  levels: Level[] | null;
  /** The role says you need the right to work there already, or that it doesn't sponsor visas. */
  workRights: boolean;
  /** Languages other than English the role asks for, or that the posting is written in. */
  languages: string[];
  /** Put on the list straight from the job board, not looked at by a person yet. */
  auto: boolean;
  /** How they hire, in one short line: the role's own process, or the company's for a role without one. */
  how: string;
  /** A strict re-apply rule in two or three words ("a year", "next season", "test once"), or "" when there is none. */
  reapplyTag: string;
  /** That rule in a sentence, for the tooltip. */
  reapplyRule: string;
};

export const kinds: RoleKind[] = ["Internship", "Graduate", "Thesis"];
export const fields: Field[] = ["Software", "Data and AI", "Quant", "Hardware and embedded", "Other tech"];

/** A process line short enough for one or two lines on a phone, cut where the company's own list has a break. */
export function shortProcess(text: string, max = 130): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = Math.max(cut.lastIndexOf(";"), cut.lastIndexOf(","));
  return `${(at > 40 ? cut.slice(0, at) : cut.slice(0, cut.lastIndexOf(" "))).replace(/[,;:\s]+$/, "")}, and more`;
}

/** The title without what the line already says: "(x/f/m)", and the city or company at the end.
 * A role in "London and Glasgow" also loses "London" or "Glasgow" at the end. */
export function cleanTitle(title: string, city: string, company: string): string {
  let t = title.replace(/\s*\((?:[mfwdx]\s*\/\s*){1,3}[mfwdx]\)/gi, "").replace(/\s+/g, " ").trim();
  const places = [city, ...city.split(/,\s*|\s+and\s+/)].filter(Boolean);
  for (const end of [...places, company]) {
    const at = t.toLowerCase().lastIndexOf(end.toLowerCase());
    if (at > 0 && at + end.length === t.length) {
      const cut = t.slice(0, at).replace(/[\s,–—\-|(]+$/, "");
      if (cut.length >= 8) t = cut;
    }
  }
  return t.replace(/\(\s*\)$/, "").trim();
}

/** Where a role's own page lives (app/roles/[key]). */
export const roleHref = (key: string) => `/roles/${key}/`;

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The status in two or three words, for narrow rows: "3 days", "12 Dec", "Rolling", "Opens Jan 2027".
 * `left` overrides the days counted at build time, for pages that count from the visitor's own today. */
export function shortWhen(x: Pick<Item, "status" | "when" | "daysLeft" | "closes">, left = x.daysLeft): string {
  if (x.status === "closed") return "Closed";
  if (x.status === "soon") return x.when;
  if (left !== null && x.closes) {
    if (left <= 0) return "Today";
    if (left === 1) return "Tomorrow";
    if (left <= 14) return `${left} days`;
    const [, m, d] = x.closes.split("-").map(Number);
    return `${d} ${monthNames[m - 1]}`;
  }
  return x.status === "rolling" ? "Rolling" : "Open";
}

/** One role in /reminders.json, for the service worker: short names keep the file small.
 * n country, y kind, l levels (only when named), w needs work rights, g asks for another language. */
export function reminderRow(x: Item) {
  return {
    k: x.key,
    s: x.slug,
    c: x.company,
    t: x.title,
    d: x.closes ?? null,
    a: x.added,
    n: x.country,
    y: x.kind,
    ...(x.levels ? { l: x.levels } : {}),
    ...(x.workRights ? { w: 1 } : {}),
    ...(x.languages.length ? { g: 1 } : {}),
  };
}

/** Words for searching: lower case, accents stripped, so "zurich" finds "Zürich". */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** FNV-1a hash of the id in base 36, about 7 characters. Short enough to put 50 saved roles in a link. */
export function shortKey(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** A prefilled GitHub issue for a mistake in one role. Opens the form; nothing is sent until the person submits it. */
export function reportUrl(x: { company: string; title: string; source: string }): string {
  const title = `[fix] ${x.company}: ${x.title}`;
  const body = `Role: ${x.title}
Company: ${x.company}
Posting: ${x.source}

What's wrong, and where did you see the right information?
`;
  return `https://github.com/MoAz06/internradar/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
