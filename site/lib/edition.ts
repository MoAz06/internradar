import { radar } from "../data/companies.ts";
import { buildItems } from "./buildItems.ts";
import { longDate } from "./format.ts";
import { today, upcoming } from "./live.ts";

/** ISO week number and the Monday that starts it, for a YYYY-MM-DD date. */
export function isoWeek(d: string): { year: number; week: number; monday: string } {
  const t = new Date(`${d}T00:00:00Z`);
  const dow = (t.getUTCDay() + 6) % 7; // Monday 0
  const monday = new Date(t);
  monday.setUTCDate(t.getUTCDate() - dow);
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.floor((thursday.getTime() - jan1.getTime()) / 86_400_000 / 7) + 1;
  return { year: thursday.getUTCFullYear(), week, monday: monday.toISOString().slice(0, 10) };
}

/** What this week's edition holds. The site is rebuilt every night, so it fills up and empties as the week goes. */
export function edition(now = today()) {
  const items = buildItems(now);
  const { year, week, monday } = isoWeek(now);
  const open = items.filter((x) => x.status === "open" || x.status === "rolling");
  return {
    year,
    week,
    monday,
    title: `The week of ${longDate(monday)}`,
    closingThis: open.filter((x) => x.daysLeft !== null && x.daysLeft <= 6),
    closingNext: open.filter((x) => x.daysLeft !== null && x.daysLeft >= 7 && x.daysLeft <= 13),
    opening: items.filter((x) => x.status === "soon"),
    radarNext: upcoming(radar, now).slice(0, 8),
    openCount: open.length,
  };
}
