// Which pages to tell search engines about after a build (scripts/google-index.mts and scripts/indexnow.mts).

import { roleHistory } from "../data/history.ts";
import { roleHref } from "./items.ts";
import { cityPages, countryPages, fieldPages, fieldPlacePages } from "./landing.ts";
import { today } from "./live.ts";
import { rolePages } from "./rolePages.ts";

export const site = "https://internradar.eu";

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export type Changed = {
  /** Role pages that came on the list or opened in the last `days` days. */
  updated: string[];
  /** Role pages that closed in that time: the page stays for old links, but its job markup is gone. */
  deleted: string[];
  /** The pages that change every night: the list, the edition, the country, city and field pages. */
  lists: string[];
  /** Every role page you can apply to now. */
  open: string[];
};

export function changedPages(now = today(), days = 2): Changed {
  const updated: string[] = [];
  const deleted: string[] = [];
  const open: string[] = [];
  for (const { item: x } of rolePages(now)) {
    const url = `${site}${roleHref(x.key)}`;
    const last = roleHistory[x.id]?.statuses.at(-1);
    if (x.status === "open" || x.status === "rolling") {
      open.push(url);
      const openedOn = last && (last[1] === "open" || last[1] === "rolling") ? last[0] : x.added;
      if (daysBetween(x.added, now) <= days || daysBetween(openedOn, now) <= days) updated.push(url);
    } else if (x.status === "closed") {
      // a deadline that passed closes a role without a line in the history, so the deadline counts too
      const closedOn = last && last[1] === "closed" ? last[0] : x.closes;
      if (closedOn) {
        const ago = daysBetween(closedOn, now);
        if (ago >= 0 && ago <= days) deleted.push(url);
      }
    }
  }
  const lists = [
    "/",
    "/edition/",
    "/radar/",
    "/countries/",
    "/nl/",
    ...countryPages()
      .filter((p) => p.code !== "NL")
      .map((p) => `/countries/${p.slug}/`),
    ...cityPages().map((p) => `/cities/${p.slug}/`),
    ...fieldPages().map((p) => `/fields/${p.slug}/`),
    ...fieldPlacePages().map((p) => p.path),
  ].map((p) => `${site}${p}`);
  return { updated, deleted, lists, open };
}
