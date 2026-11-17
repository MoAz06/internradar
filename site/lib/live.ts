import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RadarItem, Role, Status } from "../data/types.ts";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fullMonths = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

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

/** Latest start date named in the start text, as YYYY-MM-DD or YYYY-MM. Only dates with a year count:
 * "May, June or July 2027" -> 2027-07, "1 March 2027" -> 2027-03-01, "Summer 2027" -> 2027-08.
 * Texts that leave the start open ("Earliest 4 Jan 2027", "any month", "Not stated") give nothing. */
export function startBy(start: string): string | undefined {
  if (/not stated|unclear|earliest|as early as|\bany\b|flexib|still names|throughout|agreed|agreement/i.test(start)) return;
  const found: string[] = [];
  const re = /(?:(\d{1,2})\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(20\d\d)/gi;
  for (const m of start.matchAll(re)) {
    const mm = String(fullMonths.findIndex((f) => f.startsWith(m[2].toLowerCase())) + 1).padStart(2, "0");
    found.push(m[1] ? `${m[3]}-${mm}-${m[1].padStart(2, "0")}` : `${m[3]}-${mm}`);
  }
  const summer = start.match(/summer\s+(20\d\d)/i);
  if (summer) found.push(`${summer[1]}-08`);
  // a month without a day runs to its end, so "2027-07" comes after "2027-07-15"
  const end = (d: string) => (d.length === 7 ? `${d}-32` : d);
  return found.sort((a, b) => end(a).localeCompare(end(b))).at(-1);
}

type LinkCheck = { checkedAt: string; gone: { url: string; why: string }[] };
let linkCheck: LinkCheck | null | undefined;

/** Result of the nightly link check (npm run linkcheck), if it ran before this build. */
function lastLinkCheck(): LinkCheck | null {
  if (linkCheck !== undefined) return linkCheck;
  const file = join(process.cwd(), ".linkcheck.json");
  try {
    linkCheck = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as LinkCheck) : null;
  } catch {
    linkCheck = null;
  }
  return linkCheck;
}

export type Live = {
  status: Status;
  /** Short text for the overview tables. */
  short: string;
  /** Longer text for the company page. */
  long: string;
};

/** Status as of today.
 * - A posted deadline that has passed turns the role closed.
 * - A start date that has passed turns it closed too: the internship has begun.
 * - A posting the nightly link check could not find shows as gone until someone checks it by hand.
 * - An opening date that has come does not make it open: nobody has checked the posting yet, so it says so. */
export function live(r: Role, now = today()): Live {
  if (r.status !== "closed") {
    if (r.closes && over(r.closes, now)) {
      return { status: "closed", short: "Closed", long: `Closed, the deadline was ${fuzzyDate(r.closes)}` };
    }
    const by = startBy(r.start);
    if (by && over(by, now)) {
      return { status: "closed", short: "Closed", long: `Closed, the start date (${fuzzyDate(by)}) has passed` };
    }
    const lc = lastLinkCheck();
    const gone = lc?.gone.find((g) => g.url === r.source);
    if (lc && gone) {
      const when = fuzzyDate(lc.checkedAt);
      return { status: "closed", short: "Posting gone", long: `Posting gone on ${when} (${gone.why}), not checked by hand yet` };
    }
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

/** True when a check date is more than three months old. */
export function stale(checked: string, now = today()): boolean {
  const [y, m, d] = now.split("-").map(Number);
  const limit = new Date(Date.UTC(y, m - 4, d)).toISOString().slice(0, 10);
  return checked < limit;
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
