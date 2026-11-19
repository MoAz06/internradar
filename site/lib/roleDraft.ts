// A new role found on a job board, as a draft issue in the private inbox, and back.
//
// The draft only fills in what can be read off the board without guessing: the title, the link, which company
// entry it belongs to, and that it's open. Everything a script could get wrong carries "(check)", and nothing
// with "(check)" in it can be published. Eligibility is always written by a person. Lines from the posting are
// quoted under the fields, to write from; they never go on the site themselves.

import type { Company, Field, Role, RoleKind, Status } from "../data/types.ts";
import { normTitle, postingKey, type BoardCompany, type Found } from "./boards.ts";
import { sections } from "./issueSections.ts";
import { placeOf, sameCity, type Place } from "./places.ts";

export const kinds: RoleKind[] = ["Internship", "Graduate", "Thesis"];
export const fields: Field[] = ["Software", "Data and AI", "Quant", "Hardware and embedded", "Other tech"];
export const statuses: Status[] = ["open", "soon", "closed", "rolling"];
export const CHECK = "(check)";

/** Longest value per field, in characters. Well above what's on the list now. */
export const roleLimits = { title: 160, applications: 160, start: 100, duration: 100, eligibility: 400, process: 200, reapply: 120 } as const;

// ---------- reading a posting ----------

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", bull: "•" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (entities[e.toLowerCase()] ?? m),
  );

/** HTML (also HTML that is itself entity-encoded, as Greenhouse sends it) to plain lines. */
export function htmlToText(html: string): string {
  let s = html;
  if (/&lt;\/?[a-z]/i.test(s)) s = decode(s);
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|li|ul|ol|h\d|tr|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decode(s)
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && l !== "-")
    .join("\n");
}

// ---------- which company entry, by city ----------

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const cityNames: Record<string, string[]> = {
  munich: ["munchen", "muenchen"],
  zurich: ["zuerich"],
  "the hague": ["den haag", "'s-gravenhage"],
  cologne: ["koln"],
  vienna: ["wien"],
  milan: ["milano"],
  krakow: ["cracow"],
  gothenburg: ["goteborg"],
  copenhagen: ["kobenhavn"],
  brussels: ["bruxelles", "brussel"],
  lisbon: ["lisboa"],
  warsaw: ["warszawa"],
  geneva: ["geneve"],
  rome: ["roma"],
  turin: ["torino"],
  antwerp: ["antwerpen"],
  nuremberg: ["nurnberg"],
  wroclaw: ["wroclaw"],
};
const names = (city: string) => [fold(city), ...(cityNames[fold(city)] ?? [])];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Parts of a location that are in North America, so "Cambridge, MA" is not Cambridge in England. */
const america = /\b(united states|usa|u\.s\.a?\.?|canada|remote us)\b|,\s*(al|ak|az|ar|ca|co|ct|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc|on|qc|bc)\b/i;

const mentions = (text: string, c: BoardCompany) => names(c.city).some((n) => new RegExp(`(^|[^a-z])${esc(n)}([^a-z]|$)`).test(fold(text)));

/** The company entries on this board whose city the posting names. Looks at the location first, then the title. */
export function matchCompanies(f: Pick<Found, "location" | "title" | "companies">): { matched: BoardCompany[]; guess: boolean } {
  const location = f.location
    .split(/[;|]/)
    .filter((p) => !america.test(p))
    .join("; ");
  let matched = f.companies.filter((c) => mentions(location, c));
  if (!matched.length) matched = f.companies.filter((c) => mentions(f.title, c));
  if (matched.length) return { matched, guess: false };
  // no city to go on ("3 Locations", "In-Office"): with one entry on the board that's the likely one, but it's a guess
  const unreadable = !f.location || f.location === "not given" || /^\d+ locations?$/i.test(f.location) || /^(in-office|remote|hybrid|on-?site)$/i.test(f.location);
  return unreadable && f.companies.length === 1 ? { matched: f.companies, guess: true } : { matched: [], guess: false };
}

/** No entry for the posting's city, but one for the same company in the same country: the role goes there,
 * with its own city. Bosch in Reutlingen goes to the Bosch entry in Germany. */
export function entryInCountry(f: Pick<Found, "location" | "companies">, all: Company[]): { entry: BoardCompany; place: Place } | null {
  const place = placeOf(f.location);
  if (!place) return null;
  const entry = f.companies.find((c) => all.find((x) => x.slug === c.slug)?.country === place.country);
  return entry ? { entry, place } : null;
}

// ---------- kind and field, from the title ----------

/** Sorting a role into the site's filters. A guess from the title: it always gets "(check)". */
export function kindOf(title: string): RoleKind | "" {
  if (/\b(thesis|masterarbeit|abschlussarbeit|bachelorarbeit|exjobb|afstudeer\w*|th[eè]se|tesi)\b/i.test(title)) return "Thesis";
  if (
    /\b(intern|interns|internship|internships|praktik\w*|werkstudent\w*|working student|stagiair\w*|stage|stagiaire|alternance|alternant|tirocin\w*|pr[aá]cticas|becari[oa]|summer analyst|summer associate|placement|harjoittelija|apprentice\w*|year in industry|student)\b/i.test(
      title,
    )
  )
    return "Internship";
  if (/\b(graduate|graduates|grad|new grad|trainee\w*|early careers?|junior|entry level|campus hire)\b/i.test(title)) return "Graduate";
  return "";
}

export function fieldOf(title: string): Field {
  if (/\b(quant|quants|quantitative|trading|trader|market mak\w*)\b/i.test(title)) return "Quant";
  if (/\b(hardware|embedded|firmware|fpga|asic|chip|silicon|semiconductor|electronic\w*|elektronik|digital design|verification|dft|analog|rf|pcb|vlsi)\b/i.test(title))
    return "Hardware and embedded";
  if (/\b(data|machine learning|ml|ai|deep learning|analytics|llm|computer vision|research scientist|mlops|nlp)\b/i.test(title)) return "Data and AI";
  if (/\b(software|softwareentwickl\w*|developer|backend|back-end|front-?end|full-?stack|devops|sre|cloud|security|cyber\w*|platform|compiler|programming|programmier\w*|engineer\w*|it)\b/i.test(title))
    return "Software";
  return "Other tech";
}

// ---------- lines in the posting worth quoting ----------

const monthNames: [number, string[]][] = [
  [1, ["january", "jan", "januar", "janvier", "januari", "enero", "gennaio"]],
  [2, ["february", "feb", "februar", "fevrier", "februari", "febrero", "febbraio"]],
  [3, ["march", "mar", "marz", "mars", "maart", "marzo"]],
  [4, ["april", "apr", "avril", "abril", "aprile"]],
  [5, ["may", "mai", "mei", "mayo", "maggio"]],
  [6, ["june", "jun", "juni", "juin", "junio", "giugno"]],
  [7, ["july", "jul", "juli", "juillet", "julio", "luglio"]],
  [8, ["august", "aug", "aout", "augustus", "agosto"]],
  [9, ["september", "sep", "sept", "septembre", "septiembre", "settembre"]],
  [10, ["october", "oct", "oktober", "octobre", "octubre", "ottobre"]],
  [11, ["november", "nov", "novembre", "noviembre"]],
  [12, ["december", "dec", "dezember", "decembre", "diciembre", "dicembre"]],
];
const monthOf = new Map(monthNames.flatMap(([n, l]) => l.map((w) => [w, n] as const)));
const MONTH = `(${[...monthOf.keys()].sort((a, b) => b.length - a.length).join("|")})`;
const pad2 = (n: number) => String(n).padStart(2, "0");
const realDate = (y: number, m: number, d: number) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? `${y}-${pad2(m)}-${pad2(d)}` : "";
};

/** Full dates (with a year) in a sentence, as YYYY-MM-DD. 03/04/2027 is skipped: day and month can't be told apart. */
export function datesIn(sentence: string): string[] {
  const s = fold(sentence);
  const out: string[] = [];
  for (const m of s.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th|er)?\\.?\\s+(?:of\\s+)?${MONTH}\\.?,?\\s+(20\\d\\d)\\b`, "g")))
    out.push(realDate(Number(m[3]), monthOf.get(m[2])!, Number(m[1])));
  for (const m of s.matchAll(new RegExp(`\\b${MONTH}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)\\b`, "g")))
    out.push(realDate(Number(m[3]), monthOf.get(m[1])!, Number(m[2])));
  for (const m of s.matchAll(/\b(20\d\d)-(\d\d)-(\d\d)\b/g)) out.push(realDate(Number(m[1]), Number(m[2]), Number(m[3])));
  for (const m of s.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](20\d\d)\b/g)) {
    const [d, mo] = [Number(m[1]), Number(m[2])];
    if (d > 12) out.push(realDate(Number(m[3]), mo, d));
  }
  return [...new Set(out.filter(Boolean))];
}

const sentencesOf = (text: string) =>
  text
    .split("\n")
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

const deadlineCue = /\b(deadline|apply by|applications? (?:will )?close|closing date|closes on|no later than|bewerbungsschluss|bewerben bis|einsendeschluss|date limite|uiterlijk|sluitingsdatum)\b/i;
const startCue = /\b(start(?:s|ing)?|commenc\w*|begin(?:s|ning)?|beginnt|d[ée]but|startdatum|eintritt|ab sofort)\b/i;
const notDuration = /\b(experience|notice|within|every|per|ago|after|before|respond|response|hear back|leave|holiday|vacation|parental|years? of|probation|contract renewal|older|younger|graduated)\b/i;
const durationRe = /\b(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2}))?[\s-]*(weeks?|months?|wochen|monate|maanden|weken|mois|semaines)\b/gi;
const SEASON = "(summer|spring|autumn|fall|winter|sommer|fruhjahr|herbst|zomer|ete)";

const unitOf = (u: string) => (/^(weeks?|wochen|weken|semaines)$/i.test(u) ? "weeks" : "months");
const short = (s: string, n = 300) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export type Found2 = { duration: string; closes: string; start: string; rolling: boolean; quotes: { head: string; lines: string[] }[] };

/** What the posting's text says about duration, deadline and start, with the lines it comes from.
 * A value is only given when exactly one reading turns up; otherwise only the lines. */
export function readPosting(text: string, title: string): Found2 {
  const sents = sentencesOf(text);
  const quotes: Found2["quotes"] = [];

  const durLines: string[] = [];
  const durs = new Set<string>();
  for (const s of sents) {
    if (notDuration.test(s)) continue;
    const hits = [...s.matchAll(durationRe)];
    if (!hits.length) continue;
    durLines.push(s);
    for (const h of hits) durs.add(`${h[1]}${h[2] ? `-${h[2]}` : ""} ${unitOf(h[3])}`);
  }
  if (durLines.length) quotes.push({ head: "Duration", lines: durLines.slice(0, 3) });

  const dlLines: string[] = [];
  const closes = new Set<string>();
  for (const s of sents) {
    if (!deadlineCue.test(s)) continue;
    dlLines.push(s);
    for (const d of datesIn(s)) closes.add(d);
  }
  if (dlLines.length) quotes.push({ head: "Deadline", lines: dlLines.slice(0, 3) });

  const stLines: string[] = [];
  const starts = new Set<string>();
  const startValue = (s: string) => {
    const f = fold(s);
    for (const m of f.matchAll(new RegExp(`\\b${MONTH}\\s+(20\\d\\d)\\b`, "g")))
      starts.add(`${monthNames[monthOf.get(m[1])! - 1][1][0].replace(/^./, (c) => c.toUpperCase())} ${m[2]}`);
    for (const m of f.matchAll(new RegExp(`\\b${SEASON}\\s+(20\\d\\d)\\b`, "g"))) starts.add(`${m[1].replace(/^./, (c) => c.toUpperCase())} ${m[2]}`);
  };
  const t = title.match(/\b(20\d\d)\s+start\b|\bstart(?:ing)?\s+(?:in\s+)?(20\d\d)\b/i);
  if (t) starts.add(t[1] ?? t[2]);
  else startValue(title);
  for (const s of sents) {
    if (!startCue.test(s) || !/20\d\d/.test(s)) continue;
    stLines.push(s);
    startValue(s);
  }
  if (stLines.length) quotes.push({ head: "Start", lines: stLines.slice(0, 3) });

  const rollLines = sents.filter((s) => /\brolling\b|first come,? first served|as soon as we find|until (?:the role|the position|filled)/i.test(s));
  if (rollLines.length) quotes.push({ head: "Applications", lines: rollLines.slice(0, 2) });

  // the requirements block: the lines under a heading like "What we look for"
  const lines = text.split("\n");
  const reqHead =
    /^(requirements?|qualifications?|minimum qualifications|preferred qualifications|what we('re| are) looking for|who you are|about you|you have|you are|your profile|what you('ll)? bring|what you need|we expect|what we expect|skills|wat wij vragen|wat we vragen|jouw profiel|dein profil|ihr profil|profil recherch[ée]|votre profil|who we('re| are) looking for|you should have|is this you|you might be a fit)\b/i;
  const req: string[] = [];
  for (let i = 0; i < lines.length && !req.length; i++) {
    if (!reqHead.test(lines[i].replace(/^[-#*\s]+/, "")) || lines[i].length > 80) continue;
    for (let j = i + 1; j < lines.length && req.length < 6; j++) {
      const l = lines[j];
      if (!l.startsWith("- ") && l.length < 60 && /:$|^[A-Z][^.]*$/.test(l) && req.length) break;
      req.push(l.replace(/^- /, ""));
    }
  }
  if (req.length) quotes.push({ head: "Eligibility", lines: req });

  // the process: lines that name a step, and the list under a line like "The process includes:"
  const step = /\b(interview\w*|assessment\w*|online test|hirevue|codility|hackerrank|coding challenge|case study|recruitment process|hiring process|selection process|application process)\b/i;
  const proc: string[] = [];
  for (let i = 0; i < lines.length && proc.length < 6; i++) {
    if (!step.test(lines[i])) continue;
    if (!proc.includes(lines[i].replace(/^- /, ""))) proc.push(lines[i].replace(/^- /, ""));
    if (!/:$/.test(lines[i])) continue;
    // the steps under it: a list, or short lines when the page doesn't mark them as one
    for (let j = i + 1; j < lines.length && (lines[j].startsWith("- ") || (lines[j].length < 100 && !/:$/.test(lines[j]))) && proc.length < 9; j++)
      if (!proc.includes(lines[j].replace(/^- /, ""))) proc.push(lines[j].replace(/^- /, ""));
  }
  if (proc.length) quotes.push({ head: "Process", lines: proc });

  for (const q of quotes) q.lines = q.lines.map((l) => short(l));
  return {
    duration: durs.size === 1 ? [...durs][0] : "",
    closes: closes.size === 1 ? [...closes][0] : "",
    start: starts.size === 1 ? [...starts][0] : "",
    rolling: rollLines.length > 0,
    quotes,
  };
}

// ---------- the draft ----------

export type RoleDraft = {
  key: string;
  repostKey: string;
  title: string;
  /** The issue's own title. */
  issueTitle: string;
  body: string;
  slug: string;
};

const sameAll = (vals: string[]) => (vals.length && vals.every((v) => v === vals[0]) ? vals[0] : "");
const checked = (v: string) => (v ? `${v} ${CHECK}` : "");
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${shortMonths[m - 1]} ${y}`;
};

export const repostKeyOf = (name: string, title: string, where: string) => `${fold(name).replace(/[^a-z0-9]/g, "")}|${normTitle(title)}|${fold(where)}`;

/**
 * One draft per company entry the posting belongs to. A posting in a city that has no entry yet gets one draft
 * marked "Not on the list", so it's seen; it can only be published once that entry exists.
 * `text` is the posting's text, "" when it couldn't be read.
 */
export function draftsFor(f: Found, text: string, all: Company[], checkedAt: string): RoleDraft[] {
  const { matched, guess } = matchCompanies(f);
  const p = readPosting(text, f.title);
  const kind = kindOf(f.title);
  const field = fieldOf(f.title);
  const base = postingKey(f);
  const name = f.companies[0]?.name ?? f.company;

  const one = (c: BoardCompany | null, place?: Place): RoleDraft => {
    const full = c ? all.find((x) => x.slug === c.slug) : undefined;
    const siblings = full ? full.roles.filter((r) => !kind || r.kind === kind) : [];
    const process = sameAll(siblings.map((r) => r.process)) || sameAll(full?.roles.map((r) => r.process) ?? []);
    const reapply = sameAll(siblings.map((r) => r.reapply)) || full?.reapply || "";
    const applications = p.closes ? `Closes ${shortDate(p.closes)}` : p.rolling ? "Rolling, no deadline listed" : "Open, no deadline listed";
    const where = place ? place.city : c ? c.city : f.location;
    const companyLine = c ? `${c.name}, ${c.city} (\`${c.slug}\`)${guess ? ` ${CHECK}` : ""}` : `Not on the list: ${name}, ${f.location}`;
    const part = (h: string, v: string) => `### ${h}\n\n${v || "_No response_"}`;
    const intro = [
      `<!-- role-key: ${base}@${c ? c.slug : "new"} -->`,
      `<!-- repost-key: ${repostKeyOf(name, f.title, where)} -->`,
      "",
      `Found on the job board on ${checkedAt}${f.posted ? `, which says it was first published on ${f.posted}` : ""}. Location there: ${f.location}.`,
      "",
      `Open the posting, fill in what's empty, and fix or keep every value with ${CHECK}: take the ${CHECK} away once you've seen it on the posting. Then add the label **publish**. Not for the list? Close the issue.`,
      text ? "" : "\nThe posting's text couldn't be read, so there are no lines from it below.",
    ];
    const quotes = p.quotes.length
      ? p.quotes.map((q) => `**${q.head}**\n${q.lines.map((l) => `> ${l}`).join("\n")}`).join("\n\n")
      : "Nothing found to quote.";
    const body = [
      intro.join("\n"),
      part("Company", companyLine),
      ...(place ? [part("City", `${place.city}, ${place.country}`)] : []),
      part("Title", f.title),
      part("Posting", f.url),
      part("Kind", checked(kind)),
      part("Field", checked(field)),
      part("Status", "open"),
      part("Applications", checked(applications)),
      part("Opens", ""),
      part("Closes", checked(p.closes)),
      part("Start", checked(p.start)),
      part("Duration", checked(p.duration)),
      part("Eligibility", ""),
      part("Process", checked(process)),
      part("Reapply", checked(reapply)),
      part("From the posting (not published)", quotes),
    ].join("\n\n");
    return {
      key: `${base}@${c ? c.slug : "new"}`,
      repostKey: repostKeyOf(name, f.title, where),
      title: f.title,
      issueTitle: `[role] ${name}, ${where}: ${f.title}`.slice(0, 200),
      body,
      slug: c?.slug ?? "",
    };
  };
  if (matched.length) return matched.map((c) => one(c));
  const near = entryInCountry(f, all);
  return near ? [one(near.entry, near.place)] : [one(null)];
}

/** The tech roles that have no issue yet, best first: roles at entries already on the list, then the newest.
 * `seen` is the text of every earlier draft issue. A closed issue counts too: it means "not for the list". */
export function pickNew(found: Found[], seen: string, all: Company[] = []): { f: Found; keys: string[]; matched: boolean }[] {
  const picks: { f: Found; keys: string[]; matched: boolean }[] = [];
  const taken = new Set<string>();
  for (const f of found.filter((x) => x.tech)) {
    const { matched } = matchCompanies(f);
    const name = f.companies[0]?.name ?? f.company;
    const base = postingKey(f);
    const near = matched.length ? null : entryInCountry(f, all);
    const keys = matched.length ? matched.map((c) => `${base}@${c.slug}`) : near ? [`${base}@${near.entry.slug}`, `${base}@new`] : [`${base}@new`];
    const reposts = matched.length
      ? matched.map((c) => repostKeyOf(name, f.title, c.city))
      : near
        ? [repostKeyOf(name, f.title, near.place.city), repostKeyOf(name, f.title, f.location)]
        : [repostKeyOf(name, f.title, f.location)];
    // an issue for this posting, or for the same role under an earlier posting id, already exists
    if (seen.includes(f.url) || keys.some((k) => seen.includes(k)) || reposts.some((k) => seen.includes(k))) continue;
    // the same role twice on one night: only once
    if (reposts.some((k) => taken.has(k))) continue;
    reposts.forEach((k) => taken.add(k));
    picks.push({ f, keys, matched: matched.length > 0 || !!near });
  }
  return picks.sort(
    (a, b) => Number(b.matched) - Number(a.matched) || (b.f.posted || "").localeCompare(a.f.posted || "") || a.f.title.localeCompare(b.f.title),
  );
}

// ---------- reading a draft back, and checking it ----------

const heads = ["company", "city", "title", "posting", "kind", "field", "status", "applications", "opens", "closes", "start", "duration", "eligibility", "process", "reapply"] as const;
export type RoleIssue = Record<(typeof heads)[number], string> & { slug: string; key: string };

export function readRoleIssue(body: string): RoleIssue {
  const parts = sections(body);
  const out = { key: body.match(/<!-- role-key: (\S+) -->/)?.[1] ?? "" } as RoleIssue;
  // every field is one line on the site
  for (const h of heads) out[h] = (parts.get(h) ?? "").replace(/\s*\n\s*/g, " ").trim();
  out.slug = out.company.match(/\(`([a-z0-9-]+)`\)/)?.[1] ?? "";
  return out;
}

/** Words that read like a machine wrote them. Only a hint, for the fields a person writes. */
const machineWords =
  /\b(delve|leverag\w*|seamless\w*|robust|cutting-edge|dynamic|passionate|vibrant|foster\w*|empower\w*|unlock\w*|journey|tapestry|realm|elevate\w*|in today's|whether you're|not only|thrive|synerg\w*|holistic|game-?changer|embark\w*)\b/i;

export type Checked = { role: Role | null; company: Company | null; blockers: string[]; warnings: string[] };

/** Everything that keeps a draft off the site, and the role as it would go in. */
export function checkRole(r: RoleIssue, all: Company[], today: string): Checked {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const company = all.find((c) => c.slug === r.slug) ?? null;

  const withCheck = heads.filter((h) => r[h].toLowerCase().includes(CHECK));
  if (withCheck.length) blockers.push(`Still marked ${CHECK}: ${withCheck.join(", ")}. Look each one up on the posting, fix it if needed, and take the ${CHECK} away.`);
  if (!company)
    blockers.push(
      /^not on the list/i.test(r.company)
        ? `This city isn't on the list yet. Add the company entry in site/data first, then write its slug in the Company field, like Optiver, Amsterdam (\`optiver\`).`
        : `No company slug found in the Company field. Write it like Optiver, Amsterdam (\`optiver\`).`,
    );

  const required = ["title", "posting", "kind", "field", "status", "applications", "start", "eligibility", "process", "reapply"] as const;
  const empty = required.filter((h) => !r[h]);
  if (empty.length) blockers.push(`Empty: ${empty.join(", ")}. Write "Not stated" where the posting doesn't say.`);

  const kind = r.kind.replace(CHECK, "").trim();
  const field = r.field.replace(CHECK, "").trim();
  const status = r.status.replace(CHECK, "").trim();
  if (kind && !kinds.includes(kind as RoleKind)) blockers.push(`Kind "${kind}" is not one of: ${kinds.join(", ")}.`);
  if (field && !fields.includes(field as Field)) blockers.push(`Field "${field}" is not one of: ${fields.join(", ")}.`);
  if (status && !statuses.includes(status as Status)) blockers.push(`Status "${status}" is not one of: ${statuses.join(", ")}.`);

  const opens = r.opens.replace(CHECK, "").trim();
  const closes = r.closes.replace(CHECK, "").trim();
  if (opens && !/^\d{4}-\d{2}(-\d{2})?$/.test(opens)) blockers.push(`Opens "${opens}" should be YYYY-MM-DD, or YYYY-MM if the posting only names the month.`);
  if (closes) {
    const m = closes.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m || !realDate(Number(m[1]), Number(m[2]), Number(m[3]))) blockers.push(`Closes "${closes}" should be a real date, YYYY-MM-DD.`);
    else if (closes < today && status !== "closed") blockers.push(`Closes ${closes} has passed. Fix the date, or set the status to closed.`);
  }

  for (const [h, max] of Object.entries(roleLimits)) {
    const v = r[h as keyof typeof roleLimits];
    if (v.length > max) blockers.push(`${h} is ${v.length} characters, at most ${max}. Keep it to a few words.`);
  }
  const dashed = heads.filter((h) => r[h].includes("—"));
  if (dashed.length) blockers.push(`An em dash in: ${dashed.join(", ")}. Use a comma, a semicolon or a full stop.`);

  let url: URL | null = null;
  try {
    url = new URL(r.posting);
  } catch {
    // reported below
  }
  if (r.posting && (!url || url.protocol !== "https:")) blockers.push(`Posting "${r.posting}" is not an https link.`);
  if (url) {
    const on = all.find((c) => c.roles.some((x) => x.source === r.posting));
    if (on) blockers.push(`This posting is already on the list, at ${on.name}, ${on.city}.`);
  }
  // City: "Edinburgh, GB", for a role in another office than the entry's own city
  const cityField = r.city.replace(CHECK, "").trim();
  const cm = cityField.match(/^(.+),\s*([A-Z]{2})$/);
  if (cityField && !cm) blockers.push(`City "${cityField}" should be the city and the country code, like Edinburgh, GB.`);
  const own = cm && company && !sameCity(cm[1], company.city) ? { city: cm[1].trim(), country: cm[2] as Company["country"] } : null;
  if (own && company && own.country !== company.country)
    blockers.push(`${company.name}, ${company.city} is in ${company.country}, the city is in ${own.country}. Pick the entry in that country, or add one.`);
  const sameRole = (x: Role) => normTitle(x.title) === normTitle(r.title) && (x.city ?? company?.city ?? "") === (own?.city ?? company?.city ?? "");
  if (company && company.roles.some(sameRole))
    blockers.push(`${company.name}, ${own?.city ?? company.city} already has a role called "${r.title}". Is it the same one?`);

  const written = [r.applications, r.start, r.duration, r.eligibility, r.process, r.reapply].join("\n");
  const machine = written.match(machineWords);
  if (machine) warnings.push(`the word "${machine[0]}", which reads like a machine wrote it`);
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(written)) warnings.push("an email address");
  if (/https?:\/\/|www\./i.test(written)) warnings.push("a link in the text");
  if (/(?:\+?\d[\s-]?){9,}/.test(written)) warnings.push("a phone number");

  if (blockers.length || !company) return { role: null, company, blockers, warnings };
  const role: Role = {
    title: r.title,
    kind: kind as RoleKind,
    field: field as Field,
    status: status as Status,
    applications: r.applications,
    ...(opens ? { opens } : {}),
    ...(closes ? { closes } : {}),
    start: r.start,
    ...(r.duration ? { duration: r.duration } : {}),
    eligibility: r.eligibility,
    process: r.process,
    reapply: r.reapply,
    source: r.posting,
    checked: today,
    ...(own ? { city: own.city, ...(own.country !== company.country ? { country: own.country } : {}) } : {}),
  };
  return { role, company, blockers, warnings };
}
