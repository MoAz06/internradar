import type { Field, RoleKind, Status } from "../data/types.ts";

/** One role as the search list on the home page needs it. Built at build time, so it holds no functions. */
export type Item = {
  id: string;
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
  /** Process as steps when it is a short list, otherwise null and `process` is shown as text. */
  steps: string[] | null;
  process: string;
  reapply: string | null;
  source: string;
  checked: string;
  old: boolean;
};

export const kinds: RoleKind[] = ["Internship", "Graduate", "Thesis"];
export const fields: Field[] = ["Software", "Data and AI", "Quant", "Hardware and embedded", "Other tech"];

/** "Coding test, 1-2 phone screens, onsite final round" -> three steps. Long or loose texts stay text. */
export function toSteps(process: string): string[] | null {
  if (/^not stated/i.test(process)) return null;
  const parts = process
    .split(/,\s*(?:then\s+|and\s+)?|;\s*|\s+then\s+|\s*→\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2 || parts.length > 6) return null;
  if (parts.some((p) => p.split(/\s+/).length > 6)) return null;
  return parts.map((p) => p[0].toUpperCase() + p.slice(1));
}

/** Words for searching: lower case, accents stripped, so "zurich" finds "Zürich". */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
