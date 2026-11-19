// What a visitor picks once about themselves, kept in this browser only. The list, Today and the reminders
// then show the roles that fit. public/sw.js has the same `fits` for the reminders; test-site checks both agree.

import type { RoleKind } from "../data/types.ts";
import type { Level } from "./eligibility.ts";

export type Profile = {
  level?: Level;
  /** Country codes, e.g. ["NL", "DE"]. Empty means every country. */
  countries?: string[];
  /** Empty means every kind. */
  kinds?: RoleKind[];
  /** Needs a visa: hide roles that don't sponsor or want work rights already. */
  visa?: boolean;
  /** Hide roles that ask for a language besides English. */
  english?: boolean;
};

/** The facts about a role that a profile looks at. */
export type Fit = { country: string; kind: RoleKind; levels: Level[] | null; workRights: boolean; languages: string[] };

export const PROFILE_KEY = "internradar:profile";
export const PROFILE_EVENT = "internradar:profile";

export function isEmpty(p: Profile | null): boolean {
  return !p || (!p.level && !p.countries?.length && !p.kinds?.length && !p.visa && !p.english);
}

/** A role that names no level fits every level, like in the list filters. */
export function fits(x: Fit, p: Profile): boolean {
  if (p.countries?.length && !p.countries.includes(x.country)) return false;
  if (p.kinds?.length && !p.kinds.includes(x.kind)) return false;
  if (p.level && x.levels && !x.levels.includes(p.level)) return false;
  if (p.visa && x.workRights) return false;
  if (p.english && x.languages.length) return false;
  return true;
}

export function readProfile(): Profile | null {
  try {
    const v = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
    return v && typeof v === "object" && !isEmpty(v) ? (v as Profile) : null;
  } catch {
    return null;
  }
}

export function writeProfile(p: Profile | null) {
  try {
    if (isEmpty(p)) localStorage.removeItem(PROFILE_KEY);
    else localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // blocked storage: nothing to keep
  }
  setTimeout(() => window.dispatchEvent(new Event(PROFILE_EVENT)), 0);
}

const levelWords: Record<Level, string> = { bachelor: "Bachelor's", master: "Master's", phd: "PhD" };
const kindWords: Record<RoleKind, string> = { Internship: "internships", Graduate: "graduate roles", Thesis: "thesis roles" };

/** The profile in a few words: "Master's · Netherlands, Germany · internships · needs a visa". */
export function profileWords(p: Profile, countryName: (code: string) => string): string {
  return [
    p.level && levelWords[p.level],
    p.countries?.length ? p.countries.map(countryName).join(", ") : "",
    p.kinds?.length ? p.kinds.map((k) => kindWords[k]).join(", ") : "",
    p.visa && "needs a visa",
    p.english && "English only",
  ]
    .filter(Boolean)
    .join(" · ");
}
