import type { RadarItem } from "../data/types.ts";
import { shortKey, type Item } from "./items.ts";

/** One all-day entry in a calendar file. */
export type CalEvent = { uid: string; date: string; summary: string; description: string; url: string };

/** Deadlines of open roles, and opening days of roles that open soon. Only exact dates, no months. */
export function eventsFor(items: Item[]): CalEvent[] {
  const out: CalEvent[] = [];
  for (const x of items) {
    const where = `${x.company}, ${x.city}`;
    if (x.closes && x.status !== "closed") {
      out.push({
        uid: `${x.key}-closes@internradar.eu`,
        date: x.closes,
        summary: `Deadline: ${x.company}, ${x.title}`,
        description: `Last day to apply. ${where}. Posting: ${x.source}`,
        url: x.source,
      });
    }
    if (x.opens && x.opens.length === 10 && x.status === "soon") {
      out.push({
        uid: `${x.key}-opens@internradar.eu`,
        date: x.opens,
        summary: `Opens: ${x.company}, ${x.title}`,
        description: `Applications should open today. ${where}. Posting: ${x.source}`,
        url: x.source,
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Short key of a radar entry, for its calendar file. */
export const radarKey = (r: RadarItem) => shortKey(r.slug + r.role);

/** Radar entries with an exact opening day ("4 Jan 2027"); month-only ones are left out. */
export function radarEvents(radar: RadarItem[], now: string): CalEvent[] {
  return radar
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.sortKey) && /^\d{1,2} /.test(r.opens) && r.sortKey >= now)
    .map((r) => ({
      uid: `${radarKey(r)}-radar@internradar.eu`,
      date: r.sortKey,
      summary: `Opens: ${r.company}, ${r.role}`,
      description: `Expected to open today. ${r.expect}. More: https://internradar.eu/companies/${r.slug}/`,
      url: `https://internradar.eu/companies/${r.slug}/`,
    }));
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines in a calendar file may be at most 75 bytes; longer ones continue on the next line after a space. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = "";
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const day = (d: string) => d.replace(/-/g, "");
export function nextDay(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** A calendar file (RFC 5545) with all-day events. `stamp` is the build or download time. */
export function toIcs(name: string, events: CalEvent[], stamp = new Date()): string {
  const ts = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//internradar//deadlines//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "X-WR-TIMEZONE:Europe/Amsterdam",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${ts}`,
      `DTSTART;VALUE=DATE:${day(e.date)}`,
      `DTEND;VALUE=DATE:${day(nextDay(e.date))}`,
      `SUMMARY:${esc(e.summary)}`,
      `DESCRIPTION:${esc(e.description)}`,
      `URL:${e.url}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
