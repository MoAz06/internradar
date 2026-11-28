// What changed on each day since the list started keeping history: roles that came on, opened, opened again or
// closed. The pages under /changes/ come from here. A role's first status is the day it came on the list, so it
// counts as added, not as opened.

import { historyStart, roleHistory } from "../data/history.ts";
import type { Item } from "./items.ts";
import { today } from "./live.ts";
import { rolePages } from "./rolePages.ts";

export type DayChanges = { day: string; added: Item[]; opened: Item[]; reopened: Item[]; closed: Item[] };

export const countOf = (d: DayChanges) => d.added.length + d.opened.length + d.reopened.length + d.closed.length;

let cache: { now: string; days: DayChanges[] } | null = null;

/** Every day with a change, newest first. */
export function changeDays(now = today()): DayChanges[] {
  if (cache?.now === now) return cache.days;
  const byDay = new Map<string, DayChanges>();
  const on = (day: string) => {
    let d = byDay.get(day);
    if (!d) byDay.set(day, (d = { day, added: [], opened: [], reopened: [], closed: [] }));
    return d;
  };
  const isOpen = (s: string) => s === "open" || s === "rolling";
  for (const { item: x } of rolePages(now)) {
    const h = roleHistory[x.id];
    if (!h) continue;
    if (h.added > historyStart && h.added <= now) on(h.added).added.push(x);
    for (let i = 1; i < h.statuses.length; i++) {
      const [day, status] = h.statuses[i];
      const before = h.statuses[i - 1][1];
      if (day <= historyStart || day > now) continue;
      if (isOpen(status) && !isOpen(before)) (before === "closed" ? on(day).reopened : on(day).opened).push(x);
      else if (status === "closed" && before !== "closed") on(day).closed.push(x);
    }
    // a deadline that passed closes a role without a line in the history: it closed after its last day
    if (x.status === "closed" && x.closes && x.closes > historyStart && x.closes < now && !h.statuses.some(([, s]) => s === "closed")) on(x.closes).closed.push(x);
  }
  const days = [...byDay.values()].filter((d) => countOf(d) > 0).sort((a, b) => b.day.localeCompare(a.day));
  cache = { now, days };
  return days;
}

/** "12 new, 3 opened, 29 closed": the day in a few words. */
export function summarise(d: DayChanges): string {
  const parts = [
    d.added.length && `${d.added.length} new`,
    d.opened.length && `${d.opened.length} opened`,
    d.reopened.length && `${d.reopened.length} open again`,
    d.closed.length && `${d.closed.length} closed`,
  ].filter(Boolean);
  return parts.join(", ");
}
