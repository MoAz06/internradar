import type { RadarItem, Role, Status } from "../data/types.ts";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Today in Amsterdam as YYYY-MM-DD. The site is rebuilt every night, so this is the build date.
 * INTERNRADAR_TODAY=2026-12-20 overrides it, to test what the site looks like later. */
export function today(): string {
  const fake = process.env.INTERNRADAR_TODAY;
  if (fake && /^\d{4}-\d{2}-\d{2}$/.test(fake)) return fake;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
}

/** "2027-01-04" -> "4 Jan 2027", "2027-02" -> "Feb 2027" */
export function fuzzyDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return day ? `${day} ${months[m - 1]} ${y}` : `${months[m - 1]} ${y}`;
}

/** A date has passed once the day (or the whole month, for YYYY-MM) is over. */
function over(d: string, now: string): boolean {
  return d.length === 7 ? now.slice(0, 7) > d : now > d;
}

/** A date has come once that day (or the first of that month) is here. */
function reached(d: string, now: string): boolean {
  return d.length === 7 ? now.slice(0, 7) >= d : now >= d;
}

export type Live = {
  status: Status;
  /** Short text for the overview tables. */
  short: string;
  /** Longer text for the company page. */
  long: string;
};

/** Status as of today. A posted deadline that has passed turns the role closed. An opening date that
 * has come does not make it open: nobody has checked the posting yet, so it says so. */
export function live(r: Role, now = today()): Live {
  if (r.closes && r.status !== "closed" && over(r.closes, now)) {
    const when = fuzzyDate(r.closes);
    return { status: "closed", short: "Closed", long: `Closed, the deadline was ${when}` };
  }
  if (r.status === "soon" && r.opens && reached(r.opens, now)) {
    const when = fuzzyDate(r.opens);
    return { status: "soon", short: `Due ${when.replace(/ 20\d\d$/, "")}`, long: `Should be open since ${when}, not checked yet` };
  }
  const base: Record<Status, string> = { open: "Open", rolling: "Rolling", closed: "Closed", soon: "" };
  const short =
    r.status === "soon"
      ? r.applications.replace(/ 20\d\d$/, "")
      : r.closes
        ? `${base[r.status]} until ${fuzzyDate(r.closes).replace(/ 20\d\d$/, "")}`
        : base[r.status];
  return { status: r.status, short, long: r.applications };
}

/** Radar items whose date is still ahead or today. "4 Jan 2027" drops on 5 Jan; "Feb 2027" or
 * "First week of May 2027" drop once that month is over. */
export function upcoming(items: RadarItem[], now = today()): RadarItem[] {
  return items
    .filter((x) => {
      const precise = /^\d{1,2} /.test(x.opens);
      return !over(precise ? x.sortKey : x.sortKey.slice(0, 7), now);
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
