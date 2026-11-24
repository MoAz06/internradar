// What a visitor keeps in their own browser: the saved roles and, per role, how far the application got.
// Nothing leaves the browser. A link can carry both to another device.

export const SAVED_KEY = "internradar:saved";
export const PROGRESS_KEY = "internradar:progress";

export type Stage = "applied" | "test" | "interview" | "offer" | "rejected";
/** The stage and the day it was set, YYYY-MM-DD. */
export type Progress = Record<string, { stage: Stage; on: string }>;

export const stages: { id: Stage; label: string; code: string }[] = [
  { id: "applied", label: "Applied", code: "a" },
  { id: "test", label: "Online test", code: "t" },
  { id: "interview", label: "Interview", code: "i" },
  { id: "offer", label: "Offer", code: "o" },
  { id: "rejected", label: "Rejected", code: "r" },
];

export function readSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Fired on window after the saved list changes, so the count in the header follows. */
export const SAVED_EVENT = "internradar:saved";

export function writeSaved(ids: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // private mode or blocked storage: saving still works until the page closes
  }
  // after the current render: writeSaved runs inside state updaters, and the header sets its own state
  setTimeout(() => window.dispatchEvent(new Event(SAVED_EVENT)), 0);
}

export function readProgress(): Progress {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function writeProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // as above
  }
}

/** Today in the visitor's own time zone, YYYY-MM-DD. */
export function localDay(): string {
  return new Date().toLocaleDateString("en-CA");
}

export const VISIT_KEY = "internradar:last-visit";

/** The day of the visit before today, so pages can mark what's new since then. Counts today as a visit.
 * A second look on the same day keeps the same answer. Null on a first visit or with blocked storage. */
export function visitSince(): string | null {
  try {
    const day = localDay();
    const v = JSON.parse(localStorage.getItem(VISIT_KEY) ?? "null") as { visit: string; since: string | null } | null;
    const prev = v ? (v.visit === day ? v.since : v.visit) : null;
    localStorage.setItem(VISIT_KEY, JSON.stringify({ visit: day, since: prev }));
    return prev;
  } catch {
    return null;
  }
}

/** The day `n` months or days after `iso`. */
export function after(iso: string, months = 0, days = 0): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b`. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** One role in a link: key, then the stage code and the day without dashes, e.g. "k3x9a1b-r-20261118". */
export function encodeOne(key: string, p?: { stage: Stage; on: string }): string {
  const code = p && stages.find((s) => s.id === p.stage)?.code;
  return code ? `${key}-${code}-${p.on.replace(/-/g, "")}` : key;
}

export function decodeOne(part: string): { key: string; progress?: { stage: Stage; on: string } } {
  const [key, code, day] = part.split("-");
  const stage = stages.find((s) => s.code === code)?.id;
  if (!stage || !/^\d{8}$/.test(day ?? "")) return { key };
  return { key, progress: { stage, on: `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)}` } };
}

/** Whether people come back, without cookies or ids: the browser keeps its own first and last visit day,
 * and once a day sends only an event name. "first-visit" on the first day, then "back-week-1" (1 to 6 days
 * after the first visit), "back-weeks-2-4" or "back-month-plus". GoatCounter only ever sees those names. */
export function returnEvent(seen: { first: string; last: string } | null, day: string): { event: string | null; seen: { first: string; last: string } } {
  if (!seen?.first) return { event: "first-visit", seen: { first: day, last: day } };
  if (seen.last === day) return { event: null, seen };
  const days = Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${seen.first}T12:00:00Z`)) / 86_400_000);
  const event = days < 7 ? "back-week-1" : days < 28 ? "back-weeks-2-4" : "back-month-plus";
  return { event, seen: { first: seen.first, last: day } };
}

export const ASKED_KEY = "internradar:asked";

/** "role id:stage" for every stage where the visitor already answered the "share how it went" question,
 * by sharing or by "Not now", so it isn't asked twice. */
export function readAsked(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(ASKED_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function writeAsked(list: string[]) {
  try {
    localStorage.setItem(ASKED_KEY, JSON.stringify(list.slice(-300)));
  } catch {
    // blocked storage: the question comes back next time, nothing worse
  }
}

/** The stages worth a report, and what the quick share form should have picked for each.
 * Rejected has no pick: the list doesn't know whether it came after the test or the interview. */
export const askAt: Partial<Record<Stage, { end?: string; ask: string }>> = {
  test: { end: "test-wait", ask: "You did the online test. Which one was it, and how long?" },
  interview: { end: "int-now", ask: "You're in the interviews. Which test came before, and how many rounds so far?" },
  offer: { end: "offer", ask: "Congratulations. How did the process go, from the test to the offer?" },
  rejected: { ask: "Sorry it didn't work out. How far you got still helps the next person." },
};

export const FOLLOW_KEY = "internradar:following";
/** Fired on window after the followed companies change. */
export const FOLLOW_EVENT = "internradar:following";

/** Company slugs the visitor follows. Their new roles show on Today and in the reminders. */
export function readFollowing(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function writeFollowing(slugs: string[]) {
  try {
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(slugs));
  } catch {
    // blocked storage: following still works until the page closes
  }
  setTimeout(() => window.dispatchEvent(new Event(FOLLOW_EVENT)), 0);
}
