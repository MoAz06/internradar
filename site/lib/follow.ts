// Email alerts per company: "email me when Optiver opens a role". The site and the Worker both use this file,
// so the form, the links in the emails and the nightly email agree. The Worker keeps the addresses (see worker/).

import type { Item } from "./items.ts";

export const SITE = "https://internradar.eu";

/** How many companies one address can follow, so one form can't fill the store. */
export const MAX_COMPANIES = 60;

/** A role worth an email to the people following its company. */
export type FollowEvent = {
  /** stable per role and kind, so nobody gets the same role twice */
  id: string;
  slug: string;
  company: string;
  title: string;
  city: string;
  kind: "new" | "opened";
  /** the day it happened, YYYY-MM-DD in Amsterdam */
  day: string;
  when: string;
  url: string;
};

/** What the site publishes every night as /changes.json, for the Worker's morning run. */
export type Changes = { built: string; companies: Record<string, string>; events: FollowEvent[] };

const dayMs = 86_400_000;
const back = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) - n * dayMs).toISOString().slice(0, 10);

/** The roles of the last three days that are new or just opened. Three days, so a night the email didn't go out
 * is caught up the next morning; the Worker remembers what it sent. `history` is roleHistory from data/history.ts. */
export function changesFrom(
  items: Item[],
  history: Record<string, { added: string; statuses: [string, string][] }>,
  historyStart: string,
  now: string,
): FollowEvent[] {
  const since = back(now, 2);
  const out: FollowEvent[] = [];
  for (const x of items) {
    if (x.status !== "open" && x.status !== "rolling" && x.status !== "soon") continue;
    const base = { slug: x.slug, company: x.company, title: x.title, city: x.city, when: x.when, url: `${SITE}/roles/${x.key}/` };
    // new on the list: not part of the starting set
    if (x.added > historyStart && x.added >= since && x.added <= now) {
      out.push({ ...base, id: `${x.key}:new`, kind: "new", day: x.added });
      continue;
    }
    if (x.status === "soon") continue;
    // opened: a date that came, or a status that went from soon or closed to open
    const opensDay = x.opens && /^\d{4}-\d{2}-\d{2}$/.test(x.opens) ? x.opens : "";
    const statuses = history[x.id]?.statuses ?? [];
    const last = statuses.at(-1);
    const before = statuses.at(-2);
    const flipped = last && before && (last[1] === "open" || last[1] === "rolling") && before[1] !== "open" && before[1] !== "rolling" ? last[0] : "";
    const day = [opensDay, flipped].filter((d) => d && d >= since && d <= now).sort().at(-1);
    if (day) out.push({ ...base, id: `${x.key}:opened`, kind: "opened", day });
  }
  return out;
}

// ---------- links in the emails ----------
// The address never goes in a link. A link carries the hash of the address, the company and a signature, so
// nobody can switch someone else's alerts on or off.

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** The id an address is kept under: the first 16 bytes of its SHA-256, so the store never needs the address as a key. */
export async function userId(email: string): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(email));
  return [...new Uint8Array(h).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The signature on a link: what it does ("on" or "off"), for whom and for which company ("*" for all). */
export async function sign(secret: string, action: "on" | "off", user: string, slug: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(`${action}|${user}|${slug}`)));
}

/** Compares in constant time, so the time a check takes says nothing about the right signature. */
export function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function link(base: string, secret: string, action: "on" | "off", user: string, slug: string): Promise<string> {
  const p = new URLSearchParams({ u: user, c: slug, t: await sign(secret, action, user, slug) });
  return `${base}/follow/${action === "on" ? "confirm" : "stop"}?${p}`;
}

// ---------- the form ----------

const slugOk = (s: string) => /^[a-z0-9][a-z0-9-]{0,79}$/.test(s);

/** Cleans what the form sends and says what's missing. */
export function cleanFollow(raw: Record<string, unknown>): { email: string; slug: string; problems: string[] } {
  const email = String(raw.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  const slug = String(raw.company ?? "").trim();
  const problems: string[] = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push("an email address that works");
  if (!slugOk(slug)) problems.push("the company");
  return { email, slug, problems };
}

// ---------- the emails ----------

/** The email that asks to confirm, so nobody can sign someone else up. */
export function confirmMail(company: string, confirm: string): { subject: string; text: string } {
  return {
    subject: `Confirm: email me when ${company} opens a role`,
    text: [
      `Someone, hopefully you, asked internradar.eu to send an email when ${company} opens a new role.`,
      "",
      "Confirm it here:",
      confirm,
      "",
      "Didn't ask for this? Then ignore this email. Nothing is sent without the click, and the request is forgotten.",
      "",
      "internradar.eu, tech internships in Europe",
    ].join("\n"),
  };
}

/** The morning email: the new and opened roles at the companies this person follows. */
export function alertMail(events: FollowEvent[], stops: Record<string, string>, stopAll: string): { subject: string; text: string } {
  const names = [...new Set(events.map((e) => e.company))];
  const one = events.length === 1 ? events[0] : null;
  const subject = one
    ? `${one.company} ${one.kind === "new" ? "has a new role" : "opened a role"}: ${one.title}`
    : names.length === 1
      ? `${events.length} roles at ${names[0]}`
      : `New roles at ${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const lines: string[] = [];
  for (const name of names) {
    lines.push(name, "");
    for (const e of events.filter((x) => x.company === name)) {
      lines.push(`${e.title}`, `${e.city}. ${e.kind === "new" ? "New on the list" : "Just opened"}. ${e.when}.`, e.url, "");
    }
  }
  const slugs = [...new Set(events.map((e) => e.slug))];
  return {
    subject: subject.length > 120 ? `${subject.slice(0, 117)}...` : subject,
    text: [
      ...lines,
      "---",
      "You get this because you asked internradar.eu for an email when these companies open a role.",
      ...slugs.map((s) => `Stop ${events.find((e) => e.slug === s)!.company}: ${stops[s]}`),
      `Stop all: ${stopAll}`,
    ].join("\n"),
  };
}
