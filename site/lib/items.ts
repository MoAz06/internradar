import type { Field, RoleKind, Status } from "../data/types.ts";

/** One role as the search list on the home page needs it. Built at build time, so it holds no functions. */
export type Item = {
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
};

export const kinds: RoleKind[] = ["Internship", "Graduate", "Thesis"];
export const fields: Field[] = ["Software", "Data and AI", "Quant", "Hardware and embedded", "Other tech"];

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
