// When a company's roles went up, per hiring season. A season runs from June to May: "2026-27" is the
// season of the internships in summer 2027, whose first postings (quant firms) go up in July 2026. The dates come from two places that are never thrown away:
// data/opened.ts (the day a job board says a posting went up) and data/history.ts (the day a role came on the list,
// or turned from "soon" or "closed" to open). Next season this is where "last season it opened on ..." comes from.

import type { Company } from "../data/types.ts";
import { opened } from "../data/opened.ts";
import { historyStart, roleHistory } from "../data/history.ts";

/** "2026-27" for any day from 1 June 2026 to 31 May 2027. */
export function seasonOf(day: string): string {
  const [y, m] = day.split("-").map(Number);
  const start = m >= 6 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
}

export type FirstSeen = { day: string; title: string; source: string; from: "board" | "list" };

/** Per season, the first day one of the company's roles went up. The list's own dates count only after
 * historyStart: before that, a role was on the list because the list began, not because it opened. */
export function firstSeen(c: Company, history = roleHistory, start = historyStart): Map<string, FirstSeen> {
  const out = new Map<string, FirstSeen>();
  const put = (f: FirstSeen) => {
    const s = seasonOf(f.day);
    const had = out.get(s);
    if (!had || f.day < had.day) out.set(s, f);
  };
  for (const r of c.roles) {
    const board = opened[r.source];
    if (board) put({ day: board, title: r.title, source: r.source, from: "board" });
    const h = history[`${c.slug}|${r.title}|${r.source}`];
    if (!h) continue;
    // the first status is the day it came on the list: that counts only when it came on open
    for (const [day, status] of h.statuses)
      if (day > start && (status === "open" || status === "rolling")) put({ day, title: r.title, source: r.source, from: "list" });
  }
  return out;
}

/** The first season the list followed. A season before it only has postings that were still up in November 2026,
 * so its first day would be wrong: it is never shown. */
export const firstSeason = "2026-27";

/** The season before this one: "2025-26" for "2026-27". */
export function seasonBefore(season: string): string {
  const y = Number(season.slice(0, 4)) - 1;
  return `${y}-${String(y + 1).slice(2)}`;
}
