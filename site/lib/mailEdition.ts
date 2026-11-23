// The Monday email, one edition per country plus one for all of Europe.
//
// Each edition answers three questions in this order: what closes this week, what is new, and what opens soon.
// The subject and the first line carry the most urgent names, so the inbox alone already tells the reader
// what is going on. Built from the same data as the site, so every line links to the role's own page with
// its process and re-apply rule.

import type { Company } from "../data/types.ts";
import { countries } from "../data/companies.ts";
import { buildItems } from "./buildItems.ts";
import { isoWeek } from "./edition.ts";
import { cleanTitle, roleHref, shortProcess, type Item } from "./items.ts";

export { cleanTitle, shortProcess };
import { today } from "./live.ts";

const site = "https://internradar.eu";

export type Edition = {
  /** "NL", "GB", ... or "EU" for all of Europe. */
  code: Company["country"] | "EU";
  name: string;
  /** The Buttondown tag readers pick at sign-up. */
  tag: string;
};

export const editions: Edition[] = [
  { code: "EU", name: "Europe", tag: "All of Europe" },
  ...countries.map((c) => ({ code: c.code, name: c.name, tag: c.name })),
];

/** Roles of one company that go in one line: the same deadline when they close, or just the same company. */
export type Group = {
  company: string;
  slug: string;
  cities: string[];
  roles: { title: string; href: string }[];
  daysLeft: number | null;
  closes?: string;
  when: string;
  opens?: string;
  /** How they hire, the same line as on the site. */
  process: string;
  /** A strict re-apply rule in two or three words, the same label as on the site. */
  reapplyTag: string;
};

export type MailEdition = {
  edition: Edition;
  /** "nl-2026-w48", so a second run in the same week can tell it was made already. */
  key: string;
  week: number;
  subject: string;
  preheader: string;
  closing: Group[];
  closingMore: number;
  fresh: Group[];
  freshMore: number;
  coming: Group[];
  html: string;
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "today", "tomorrow", "Friday", "next Monday" or "on 4 Dec", for a deadline seen from the day the mail goes out. */
export function dayWord(daysLeft: number, closes: string): string {
  if (daysLeft <= 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  const day = weekdays[new Date(`${closes}T12:00:00Z`).getUTCDay()];
  if (daysLeft <= 6) return day;
  if (daysLeft <= 13) return `next ${day}`;
  const [, m, d] = closes.split("-").map(Number);
  return `on ${d} ${shortMonths[m - 1]}`;
}

/** "2027-01-04" -> "4 January", "2027-01" -> "in January" */
function openWord(opens: string): string {
  const [, m, d] = opens.split("-").map(Number);
  return d ? `${d} ${months[m - 1]}` : `in ${months[m - 1]}`;
}

const and = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const href = (x: Item) => `${site}${roleHref(x.key)}`;

/** One line per company (and per deadline, for roles that close), in the order the items come. */
function group(items: Item[], byDeadline: boolean): Group[] {
  const out = new Map<string, Group>();
  for (const x of items) {
    // by name, so Google Amsterdam and Google London are one line
    const k = byDeadline ? `${x.company}|${x.closes ?? ""}` : x.company;
    const g = out.get(k);
    if (g) {
      // the same role in another city is one link
      const title = cleanTitle(x.title, x.city, x.company);
      if (!g.roles.some((r) => r.title === title)) g.roles.push({ title, href: href(x) });
      if (!g.cities.includes(x.city)) g.cities.push(x.city);
      continue;
    }
    out.set(k, {
      company: x.company,
      slug: x.slug,
      cities: [x.city],
      roles: [{ title: cleanTitle(x.title, x.city, x.company), href: href(x) }],
      daysLeft: x.daysLeft,
      closes: x.closes,
      when: x.when,
      opens: x.opens,
      process: x.how ? shortProcess(x.how) : "",
      reapplyTag: x.reapplyTag,
    });
  }
  return [...out.values()];
}

const where = (g: Group) => (g.cities.length <= 2 ? and(g.cities) : `${g.cities.length} cities`);

// ---------- the words ----------

function subjectOf(closing: Group[], fresh: Group[], coming: Group[]): string {
  if (closing.length) {
    const [a, b] = closing;
    const da = dayWord(a.daysLeft!, a.closes!);
    if (!b) return `${a.company} closes ${da}`;
    const db = dayWord(b.daysLeft!, b.closes!);
    if (a.company === b.company) return `${a.company} closes ${da}`;
    return da === db ? `${a.company} and ${b.company} close ${da}` : `${a.company} closes ${da}, ${b.company} ${db}`;
  }
  if (fresh.length) return `New: ${and(fresh.slice(0, 3).map((g) => g.company))}`;
  const c = coming.find((g) => g.opens);
  return c ? `${c.company} opens ${openWord(c.opens!)}` : `${coming[0].company}: ${coming[0].when}`;
}

function preheaderOf(closing: Group[], fresh: Group[], coming: Group[]): string {
  const parts: string[] = [];
  const later = closing.slice(2).map((g) => g.company).filter((n) => !closing.slice(0, 2).some((g) => g.company === n));
  const names = [...new Set(later)].slice(0, 2);
  if (closing.length && names.length) parts.push(`${and(names)} ${names.length === 1 ? "closes" : "close"} this week too.`);
  if (fresh.length && closing.length) parts.push(`New roles at ${and(fresh.slice(0, 3).map((g) => g.company))}.`);
  // with nothing closing the subject names the companies, so the first line names the roles
  if (fresh.length && !closing.length) {
    const roles = fresh.flatMap((g) => g.roles.map((r) => `${r.title} at ${g.company}`));
    parts.push(`${roles[0]}${roles.length > 1 ? `, and ${roles.length - 1} more` : ""}.`);
  }
  const c = coming.find((g) => g.opens);
  // without anything closing or new, the subject already names the first opening
  if (c && (closing.length || fresh.length)) parts.push(`${c.company} opens ${openWord(c.opens!)}.`);
  if (!parts.length) parts.push(coming.slice(1).map((g) => `${g.company}: ${g.when.replace(/\.$/, "")}.`).join(" ") || "Nothing closes this week.");
  return parts.join(" ");
}

// ---------- the HTML ----------
// Email clients want tables and inline styles. Light paper and ink from the site; Georgia where the web fonts don't load.

const ink = "#1f2421";
const muted = "#4b5048";
const dim = "#5d6258";
const paper = "#f5f0e6";
const line = "#d9d1c1";
const link = "#0f5a46";
const closed = "#a3171f";
const soon = "#a3421a";
const signal = "#2b6a2b";
const serif = "Georgia,'Times New Roman',serif";
const display = "'Libre Baskerville',Georgia,'Times New Roman',serif";
const sans = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const a = (url: string, text: string, style = "") => `<a href="${esc(url)}" style="color:${link};${style}">${esc(text)}</a>`;

function label(text: string, color: string, top: boolean): string {
  const rule = top ? `border-top:1px solid ${line};padding-top:14px;margin-top:22px;` : "margin-top:18px;";
  return `<div style="${rule}font-family:${sans};font-size:11px;font-weight:700;letter-spacing:1.5px;color:${color};">${text}</div>`;
}

/** Two titles, or one when there are more; the rest is one link to the company page, so a company with ten roles stays one short line. */
function roleLinks(g: Group): string {
  const n = g.roles.length > 2 ? 1 : g.roles.length;
  const shown = g.roles.slice(0, n).map((r) => a(r.href, r.title, "font-weight:bold;text-decoration:none;")).join(`<span style="color:${dim};"> · </span>`);
  const rest = g.roles.length - n;
  return rest > 0 ? `${shown}<span style="color:${dim};"> and </span>${a(`${site}/companies/${g.slug}/`, `${rest} more`)}` : shown;
}

/** The line under a role, as on the site: a strict re-apply rule first, then how they hire. */
function howLine(g: Group): string {
  const tag = g.reapplyTag ? `<b style="color:${soon};">Re-apply: ${esc(g.reapplyTag)}.</b>` : "";
  const process = g.process ? esc(g.process.endsWith(".") ? g.process : `${g.process}.`) : "";
  return [tag, process].filter(Boolean).join(" ");
}

function closingRow(g: Group): string {
  const day = dayWord(g.daysLeft!, g.closes!);
  const color = g.daysLeft! <= 2 ? closed : soon;
  const head = `<b style="color:${color};">Closes ${day}.</b>`;
  return `<div style="margin-top:12px;">
<div style="font-family:${serif};font-size:16px;line-height:1.4;color:${ink};">${roleLinks(g)} <span style="color:${muted};">· ${esc(g.company)}, ${esc(where(g))}</span></div>
<div style="font-family:${serif};font-size:14px;line-height:1.5;color:${muted};margin-top:2px;">${[head, howLine(g)].filter(Boolean).join(" ")}</div>
</div>`;
}

function freshRow(g: Group): string {
  const how = howLine(g);
  return `<div style="margin-top:10px;">
<div style="font-family:${serif};font-size:15px;line-height:1.5;color:${ink};">${roleLinks(g)} <span style="color:${muted};">· ${esc(g.company)}, ${esc(where(g))}</span></div>
${how ? `<div style="font-family:${serif};font-size:14px;line-height:1.5;color:${muted};margin-top:2px;">${how}</div>
` : ""}</div>`;
}

function comingRow(g: Group): string {
  const when = g.when.endsWith(".") ? g.when : `${g.when}.`;
  return `<div style="margin-top:8px;font-family:${serif};font-size:15px;line-height:1.5;color:${ink};"><b>${esc(g.company)}</b> ${a(g.roles[0].href, g.roles[0].title, "text-decoration:none;")}<span style="color:${muted};">. ${esc(when)}</span></div>`;
}

function render(m: Omit<MailEdition, "html">, perCountry: boolean): string {
  const e = m.edition;
  const all = e.code === "EU" ? `${site}/` : `${site}/?country=${countries.find((c) => c.code === e.code)!.slug}`;
  const button = e.code === "EU" ? "Every role on internradar" : `Every role in ${e.name === "Netherlands" || e.name === "United Kingdom" ? `the ${e.name}` : e.name}`;
  const parts: string[] = [];
  if (m.closing.length) {
    parts.push(label("CLOSES THIS WEEK", closed, false), ...m.closing.map(closingRow));
    if (m.closingMore) parts.push(`<div style="margin-top:10px;font-family:${serif};font-size:14px;color:${dim};">And ${m.closingMore} more this week, ${a(all, "all on the site")}.</div>`);
  }
  if (m.fresh.length) {
    parts.push(label("NEW", signal, parts.length > 0), ...m.fresh.map(freshRow));
    if (m.freshMore) parts.push(`<div style="margin-top:10px;font-family:${serif};font-size:14px;color:${dim};">And new roles at ${m.freshMore} more ${m.freshMore === 1 ? "company" : "companies"}.</div>`);
  }
  if (m.coming.length) parts.push(label("OPENS SOON", dim, parts.length > 0), ...m.coming.map(comingRow));

  // Buttondown's naked template sends this body as it is, so the unsubscribe link has to be in it ({{ unsubscribe_url }})
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(m.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${paper};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${paper};">
<tr><td style="padding:0 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-bottom:2px solid ${ink};">
<tr><td style="padding-bottom:6px;font-family:${display};font-size:22px;font-weight:bold;color:${ink};">internradar</td>
<td align="right" style="padding-bottom:6px;font-family:${sans};font-size:12px;color:${dim};">${esc(e.name)} · week ${m.week}</td></tr>
</table>
${parts.join("\n")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
<tr><td align="center" bgcolor="${ink}" style="background:${ink};padding:13px 12px;">
<a href="${esc(all)}" style="font-family:${sans};font-size:15px;font-weight:bold;color:${paper};text-decoration:none;display:block;">${esc(button)}</a>
</td></tr>
</table>
<div style="margin-top:18px;font-family:${serif};font-size:13px;font-style:italic;line-height:1.55;color:${dim};">Applied to one of these? ${a(`${site}/share/`, "Tell the next person how it went")}, without your name.${perCountry ? ` Want other countries? ${a(`${site}/alerts/`, "Pick another edition")}.` : ""}</div>
<div style="margin-top:14px;font-family:${sans};font-size:12px;color:${dim};">${a("{{ unsubscribe_url }}", "Unsubscribe", `color:${dim};`)}</div>
</td></tr>
</table>
</td></tr>
</table>`;
}

/** The editions for the week of `now`, one per edition that has something to say. */
/** `perCountry` off: only the edition for all of Europe. */
export function mailEditions(now = today(), perCountry = true): MailEdition[] {
  const items = buildItems(now);
  const { year, week } = isoWeek(now);
  const out: MailEdition[] = [];
  for (const e of perCountry ? editions : editions.filter((x) => x.code === "EU")) {
    const mine = e.code === "EU" ? items : items.filter((x) => x.country === e.code);
    const open = mine.filter((x) => x.status === "open" || x.status === "rolling");
    const cap = e.code === "EU" ? 6 : 5;

    const closingItems = open.filter((x) => x.daysLeft !== null && x.daysLeft <= 7);
    const closingAll = group(
      closingItems.sort((p, q) => p.daysLeft! - q.daysLeft! || p.company.localeCompare(q.company)),
      true,
    );
    const closingIds = new Set(closingItems.map((x) => x.id));
    const freshAll = group(
      open.filter((x) => x.fresh && !closingIds.has(x.id)),
      false,
    ).sort((p, q) => q.roles.length - p.roles.length || p.company.localeCompare(q.company));
    const comingAll = group(
      mine.filter((x) => x.status === "soon").sort((p, q) => (p.opens ?? "9999").localeCompare(q.opens ?? "9999") || p.company.localeCompare(q.company)),
      false,
    );

    const closing = closingAll.slice(0, cap);
    const fresh = freshAll.slice(0, 4);
    // openings with a date first; the vaguer ones only when there is little else
    const dated = comingAll.filter((g) => g.opens);
    const coming = (dated.length >= 2 ? dated : [...dated, ...comingAll.filter((g) => !g.opens)]).slice(0, 4);
    if (!closing.length && !fresh.length && !coming.length) continue;

    const m = {
      edition: e,
      key: `${e.code.toLowerCase()}-${year}-w${week}`,
      week,
      subject: subjectOf(closing, fresh, coming),
      preheader: preheaderOf(closing, fresh, coming),
      closing,
      closingMore: closingAll.slice(cap).reduce((n, g) => n + g.roles.length, 0),
      fresh,
      freshMore: freshAll.length - fresh.length,
      coming,
    };
    out.push({ ...m, html: render(m, perCountry) });
  }
  return out;
}
