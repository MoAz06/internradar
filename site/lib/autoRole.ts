// A role from a job board that can go on the list without a person filling in a draft first.
//
// Only what can be read off the board without guessing goes in: the title, the link, the company entry, the city,
// kind and field from the title, and a deadline or duration when the posting names exactly one. Who can apply,
// the process and the re-apply rule stay empty: the site shows "on the posting" and the company's own process.
// Anything the rules below aren't sure about stays a draft for a person. Every role put on this way is in the
// next morning's issue, where a wrong one is taken off with one tick.

import type { Company, Role, RoleKind } from "../data/types.ts";
import { division, type Found, normTitle } from "./boards.ts";
import { needsWorkRights } from "./eligibility.ts";
import { sameCity } from "./places.ts";
import { entryInCountry, fieldOf, kindOf, matchCompanies, readPosting, roleLimits, shortDate } from "./roleDraft.ts";

/** Not early career, whatever else the title says. */
const senior = /\b(senior|sr\.?|lead|principal|staff|manager|head|director|experienced|expert|vp|chief)\b/i;
/** Jobs that are not a tech study's, even when "engineer" or "data" is in the title. */
const notTech =
  /\b(physical\)? security|security (officer|guard|specialist)|marketing|sales|business develop\w*|data protection|datenschutz|technician|techniker|\w*management\w*|\w*logisti\w*|kundenauftrag\w*|einkauf|vertrieb|account (manager|executive)|finance|financial|accounting|audit\w*|tax|controlling|hr|human resources|people|talent|recruit\w*|legal|law|compliance|procurement|purchasing|supply chain|logistics|warehouse|communications?|pr|public relations|journalis\w*|content|social media|designer|(graphic|product|ux|ui|visual|interior|fashion|service) design\w*|ux|graphic|operations|office|admin\w*|assistant|executive assistant|customer|support|service desk|helpdesk|quality|mechanical|civil|chemical|chemistry|biolog\w*|clinical|medical|nurse|pharma\w*|manufacturing|production|facilit\w*|construction|real estate|strategy|consult\w*|beratung|product manager|project manager|program manager|investment|banking|analyst relations|policy|translator|teacher|tutor)\b/i;
/** Early career, but a trade school or an apprenticeship, not for students at a university. */
const notStudy = /\b(junior|entry[- ]level|apprentice\w*|ausbildung|duales studium|dual study|azubi|lehrling|vocational)\b/i;
/** A title that is plainly a tech role. "IT" only in capitals, so "it" in a sentence doesn't count. */
const strongTech =
  /\b(software|softwareentwickl\w*|developer|entwickler\w*|programmier\w*|programming|data|machine learning|ml|ai|deep learning|computer vision|llm|nlp|quant|quants|quantitative|algorithm\w*|hardware|embedded|firmware|fpga|asic|silicon|semiconductor|chip design|digital design|verification|backend|back-end|front-?end|full-?stack|devops|mlops|sre|cloud|cyber\w*|security engineer\w*|information security|compiler|gpu|computer science|informatik\w*|informatics|informatica|informatique|information technology|information systems|robotic\w*|research engineer|research scientist|test automation|electronic\w*|elektronik\w*|computer architecture|cryptograph\w*|automotive security|platform engineer\w*|infrastructure engineer\w*)\b/i;
const strongIT = /\bIT\b/;
/** "3+ years of experience": a job for people who have worked already. */
const yearsAsked = /\b([2-9]|1\d)\s*\+?\s*(?:-\s*\d+\s*)?(?:years?|jahre\w*|jaar|ans|años|anni)\s+(?:of\s+)?(?:\w+\s+){0,2}(?:experience|erfahrung|ervaring|expérience|experiencia|esperienza)/i;

// ---------- which language the posting is in ----------

const stop: Record<string, string[]> = {
  English: ["the", "and", "you", "with", "for", "our", "your", "will", "are", "this", "that", "have"],
  German: ["und", "der", "die", "das", "mit", "für", "wir", "sie", "ist", "ein", "eine", "bei", "von", "zu", "dich", "du"],
  Dutch: ["het", "een", "van", "en", "je", "jij", "wij", "met", "voor", "naar", "bij", "ons", "zijn", "jouw"],
  French: ["le", "la", "les", "et", "des", "vous", "nous", "pour", "avec", "une", "dans", "est", "sur", "du"],
  Spanish: ["el", "los", "las", "y", "con", "para", "una", "en", "del", "por", "tu", "nuestro", "es"],
  Italian: ["il", "di", "che", "e", "per", "con", "una", "della", "sono", "nel", "gli", "del"],
  Swedish: ["och", "att", "det", "som", "en", "för", "med", "är", "på", "vi", "du", "av"],
  Danish: ["og", "at", "det", "som", "en", "for", "med", "er", "på", "vi", "du", "af", "til"],
  Norwegian: ["og", "å", "det", "som", "en", "for", "med", "er", "på", "vi", "du", "av", "til", "ikke"],
  Finnish: ["ja", "on", "että", "sinä", "me", "olet", "kanssa", "tai", "meidän", "työ"],
  Polish: ["i", "w", "na", "z", "do", "się", "jest", "nie", "oraz", "dla", "który", "jesteś"],
  Portuguese: ["o", "os", "e", "com", "para", "uma", "em", "do", "da", "nos", "você", "não"],
};

/** The language most of the posting is in, or "" for English or when it can't be told. */
export function postingLanguage(text: string): string {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (words.length < 40) return "";
  const count = new Map<string, number>();
  for (const w of words) count.set(w, (count.get(w) ?? 0) + 1);
  const score = (lang: string) => stop[lang].reduce((n, w) => n + (count.get(w) ?? 0), 0) / stop[lang].length;
  const best = Object.keys(stop).sort((a, b) => score(b) - score(a))[0];
  // a posting in English with a few lines in German is still English
  return best === "English" || score(best) < score("English") * 1.5 ? "" : best;
}

// ---------- the rules ----------

export type Auto = { ok: true; slug: string; company: Company; role: Role } | { ok: false; why: string };
type Before = { ok: true; company: Company; city: string; title: string; kind: RoleKind } | { ok: false; why: string };

/** The rules that need only what the board's list gives: title, location, company. The nightly run checks these
 * first, so it only reads the postings that can still pass. `skip` is every link in data/skip.ts. */
export function beforeText(f: Found, all: Company[], skip: Set<string> = new Set()): Before {
  const no = (why: string): Before => ({ ok: false, why });
  const title = f.title.replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim();

  if (!f.tech) return no("not a tech title");
  if (skip.has(f.url)) return no("on the skip list");
  if (title.length > roleLimits.title) return no("title too long");
  if (senior.test(title)) return no("senior title");
  if (notStudy.test(title)) return no("junior or apprenticeship");
  if (notTech.test(title) && !division.test(title)) return no("not a tech job");
  if (!strongTech.test(title) && !strongIT.test(title) && !division.test(title)) return no("title not plainly tech");
  const kind = kindOf(title);
  if (!kind) return no("kind not clear from the title");

  // the company entry: one entry by its city, or the same company's entry in the posting's country
  const { matched, guess } = matchCompanies(f);
  let slug = "";
  let city = "";
  if (matched.length > 1) return no("more than one entry fits");
  if (guess) return no("no city given");
  if (matched.length === 1) slug = matched[0].slug;
  else {
    const near = entryInCountry(f, all);
    if (!near) return no("no entry in that country");
    slug = near.entry.slug;
    city = near.place.city;
  }
  const company = all.find((c) => c.slug === slug);
  if (!company) return no("entry not in the data");
  if (city && sameCity(city, company.city)) city = "";

  if (all.some((c) => c.roles.some((r) => r.source === f.url))) return no("already on the list");
  const where = city || company.city;
  if (company.roles.some((r) => normTitle(r.title) === normTitle(title) && sameCity(r.city ?? company.city, where))) return no("same title already there");
  return { ok: true, company, city, title, kind };
}

/**
 * Whether a posting can go on the list by itself, and the role as it would go in.
 * `text` is the posting's text, "" when it couldn't be read.
 */
export function autoRole(f: Found, text: string, all: Company[], today: string, skip: Set<string> = new Set()): Auto {
  const b = beforeText(f, all, skip);
  if (!b.ok) return b;
  const { company, city, title, kind } = b;
  if (!text) return { ok: false, why: "posting couldn't be read" };
  if (yearsAsked.test(text)) return { ok: false, why: "asks for years of experience" };

  const p = readPosting(text, title);
  const closes = p.closes && p.closes >= today ? p.closes : "";
  if (p.closes && !closes) return { ok: false, why: "deadline has passed" };
  const language = postingLanguage(text);

  const role: Role = {
    title,
    kind,
    field: fieldOf(title),
    status: p.rolling ? "rolling" : "open",
    applications: closes ? `Closes ${shortDate(closes)}` : p.rolling ? "Rolling, no deadline listed" : "Open, no deadline listed",
    ...(closes ? { closes } : {}),
    start: "",
    ...(p.duration && kind !== "Graduate" ? { duration: p.duration } : {}),
    eligibility: "",
    process: "",
    reapply: "",
    source: f.url,
    checked: today,
    ...(city ? { city } : {}),
    ...(language ? { language } : {}),
    ...(needsWorkRights(text) ? { workRights: true } : {}),
    auto: true,
  };
  return { ok: true, slug: company.slug, company, role };
}

// ---------- the morning issue ----------

/** A role the nightly run put on the list, as the morning issue shows it. */
export type Planned = { slug: string; name: string; city: string; role: Role };
const urlMark = (url: string) => `<!-- url: ${url} -->`;

const shortDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** One line per role, grouped by company, with a box to tick for the ones that should go. */
export function morningIssue(put: Planned[], day: string): string {
  const by = new Map<string, Planned[]>();
  for (const p of put) by.set(`${p.name}, ${p.city}`, [...(by.get(`${p.name}, ${p.city}`) ?? []), p]);
  const groups = [...by].sort((a, b) => a[0].localeCompare(b[0]));
  return [
    `<!-- auto-roles: ${day} -->`,
    `Put on the list on the night of ${shortDay(day)}, straight from the job boards: ${put.length} ${put.length === 1 ? "role" : "roles"}. They are on the site now, marked as not checked by hand yet.`,
    "",
    "Tick every role that shouldn't be on the list, then close this issue. Ticked roles come off the list and never come back. Nothing happens before you close it.",
    "",
    ...groups.flatMap(([head, ps]) => [
      `### ${head}`,
      "",
      ...ps.map((p) => {
        const r = p.role;
        const facts = [r.kind, r.field, r.applications, r.language ? `posting in ${r.language}` : "", r.workRights ? "needs work rights" : ""].filter(Boolean).join(" · ");
        return `- [ ] [${r.title.replace(/[[\]]/g, "")}](${r.source}) · ${facts} ${urlMark(r.source)}`;
      }),
      "",
    ]),
  ].join("\n");
}

/** The posting links of the roles ticked in a morning issue. */
export const tickedIn = (body: string): string[] => [...body.matchAll(/^\s*[-*] \[[xX]\] .*<!-- url: (\S+) -->/gm)].map((m) => m[1]);
