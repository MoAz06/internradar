// The open roles as plain data, for /open-roles.json and the counts in /llms.txt. Short field names in plain
// words, no internal ids. Rebuilt with the site every night.

import { companies } from "../data/companies.ts";
import { roleHref, type Item } from "./items.ts";

const site = "https://internradar.eu";

export type OpenRole = {
  company: string;
  city: string;
  /** two-letter code, like "NL" */
  country: string;
  countryName: string;
  title: string;
  /** Internship, Graduate or Thesis */
  type: string;
  field: string;
  /** open, rolling or soon (applications not open yet) */
  status: string;
  /** last day to apply, YYYY-MM-DD, when the posting names one */
  closes: string | null;
  /** when applications open, for a role that isn't open yet */
  opens: string | null;
  posting: string;
  rolePage: string;
  companyPage: string;
  /** the pay the company states, in its own words, or null */
  pay: string | null;
  /** online test and interview tools the company names in its hiring steps */
  tests: string[];
  /** the role or the company says you need the right to work there already, or that it doesn't sponsor visas */
  needsWorkRights: boolean;
  /** the day it came on the list */
  added: string;
};

export function openRoles(items: Item[]): OpenRole[] {
  return items
    .filter((x) => x.status !== "closed")
    .map((x) => ({
      company: x.company,
      city: x.city,
      country: x.country,
      countryName: x.countryName,
      title: x.title,
      type: x.kind,
      field: x.field,
      status: x.status,
      closes: x.closes ?? null,
      opens: x.status === "soon" ? (x.opens ?? null) : null,
      posting: x.source,
      rolePage: `${site}${roleHref(x.key)}`,
      companyPage: `${site}/companies/${x.slug}/`,
      pay: x.pay?.label ?? null,
      tests: x.tests,
      needsWorkRights: x.workRights,
      added: x.added,
    }));
}

/** How many companies, open roles and countries, for the text in /llms.txt. */
export function counts(rows: OpenRole[]) {
  return { companies: companies.length, roles: rows.length, countries: new Set(companies.map((c) => c.country)).size };
}
