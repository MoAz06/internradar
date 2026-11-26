// The week in one image (app/week): what closes in the next seven days, else what is new, else what is open.

import type { Item } from "./items.ts";

const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const isOpen = (x: Item) => x.status === "open" || x.status === "rolling";
export const ROWS = 6;

export type WeekRow = { x: Item; tag: "closes" | "new" | "open" };

/** The week in one image: the head, up to six roles, and how many are open. */
export function weekOf(roles: Item[], now: string) {
  const open = roles.filter(isOpen);
  const closing = open.filter((x) => x.closes && days(now, x.closes) >= 0 && days(now, x.closes) <= 7).sort((a, b) => a.closes!.localeCompare(b.closes!));
  const fresh = open.filter((x) => x.fresh && !closing.includes(x)).sort((a, b) => b.added.localeCompare(a.added));
  const head = closing.length
    ? `${closing.length} tech ${closing.length === 1 ? "role closes" : "roles close"} this week`
    : fresh.length
      ? `${fresh.length} new tech ${fresh.length === 1 ? "role" : "roles"} this week`
      : `${open.length} tech ${open.length === 1 ? "role" : "roles"} open now`;
  // what the head is about first, one per company so one company with ten postings doesn't fill the image, then a
  // second per company; after the closing ones, what is new; open ones only when nothing closes and nothing is new
  const lists = closing.length ? [closing, fresh] : fresh.length ? [fresh] : [open];
  const picked: Item[] = [];
  const per = new Map<string, number>();
  for (const list of lists)
    for (const cap of [1, 2])
      for (const x of list) {
        if (picked.length >= ROWS || picked.includes(x) || (per.get(x.company) ?? 0) >= cap) continue;
        picked.push(x);
        per.set(x.company, (per.get(x.company) ?? 0) + 1);
      }
  const tag = (x: Item): WeekRow["tag"] => (closing.includes(x) ? "closes" : fresh.includes(x) ? "new" : "open");
  // closing ones by deadline, then the new ones
  const rows: WeekRow[] = picked.map((x) => ({ x, tag: tag(x) })).sort((a, b) => (a.tag === "closes" ? 0 : 1) - (b.tag === "closes" ? 0 : 1) || (a.x.closes ?? "").localeCompare(b.x.closes ?? ""));
  return { head, rows, open: open.length, closing: closing.length };
}
