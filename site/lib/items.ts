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
