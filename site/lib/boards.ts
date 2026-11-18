// The job boards the companies on the list use, and what counts as an early-career role on them.
// Used by the nightly discover run and by the script that turns what it finds into drafts.

import { companies, countries } from "../data/companies.ts";

export type Board =
  | { ats: "greenhouse"; board: string }
  | { ats: "lever"; board: string; eu: boolean }
  | { ats: "ashby"; board: string }
  | { ats: "smartrecruiters"; board: string }
  | { ats: "workday"; origin: string; tenant: string; site: string };

export const boardKey = (b: Board) => (b.ats === "workday" ? `workday:${b.tenant}/${b.site}` : `${b.ats}:${b.board.toLowerCase()}`);

export function boardOf(url: string): Board | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const h = u.hostname;
  const parts = u.pathname.split("/").filter(Boolean);
  if (h.endsWith("greenhouse.io")) {
    if (u.searchParams.get("for")) return { ats: "greenhouse", board: u.searchParams.get("for")! };
    if (h.startsWith("boards-api") && parts[1] === "boards" && parts[2]) return { ats: "greenhouse", board: parts[2] };
    if (parts[0] && parts[0] !== "embed") return { ats: "greenhouse", board: parts[0] };
    return null;
  }
  if (h === "jobs.lever.co" || h === "jobs.eu.lever.co") return parts[0] ? { ats: "lever", board: parts[0], eu: h.includes(".eu.") } : null;
  if (h === "api.lever.co" || h === "api.eu.lever.co") return parts[2] ? { ats: "lever", board: parts[2], eu: h.includes(".eu.") } : null;
  if (h === "jobs.ashbyhq.com") return parts[0] ? { ats: "ashby", board: parts[0] } : null;
  if (h === "jobs.smartrecruiters.com" || h === "careers.smartrecruiters.com") return parts[0] ? { ats: "smartrecruiters", board: parts[0] } : null;
  if (h === "api.smartrecruiters.com" && parts[2]) return { ats: "smartrecruiters", board: parts[2] };
  const wd = h.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com$/);
  if (wd) {
    const p = parts.filter((x) => !/^[a-z]{2}-[A-Z]{2}$/.test(x));
    if (p[0] === "wday" && p[1] === "cxs" && p[3]) return { ats: "workday", origin: u.origin, tenant: p[2], site: p[3] };
    if (p[0]) return { ats: "workday", origin: u.origin, tenant: wd[1], site: p[0] };
  }
  return null;
}

/** The posting's own id, so a role on the list matches the same job on the board. */
export function jobId(url: string): string | null {
  const m =
    url.match(/[?&]token=(\d+)/) ??
    url.match(/[?&]gh_jid=(\d+)/) ??
    url.match(/\/jobs\/(\d{5,})/) ??
    url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i) ??
    url.match(/_([A-Z]{0,4}[-_]?\d{4,}(?:-\d+)?)(?:[/?#]|$)/) ??
    url.match(/\/(\d{9,})(?:[-/?#]|$)/);
  return m ? m[1].toLowerCase() : null;
}

export const early =
  /\b(intern|interns|internship|internships|graduate|graduates|grad|new grad|student|students|trainee|traineeship|placement|thesis|praktik\w*|praktikum|werkstudent\w*|working student|stagiair\w*|stage|stagiaire|alternance|alternant|tirocinio|tirocinante|pr[aá]cticas|becari[oa]|summer analyst|summer associate|early careers?|apprentice\w*|ausbildung|duales studium|masterarbeit|abschlussarbeit|exjobb|harjoittelija|trainee\w*)\b/i;
export const tech =
  /\b(software|softwareentwickl\w*|developer|data|ai|machine learning|ml|deep learning|quant\w*|hardware|embedded|firmware|fpga|asic|chip|silicon|semiconductor|cloud|security|cyber\w*|devops|platform engineer\w*|backend|back-end|front-?end|full-?stack|compiler|gpu|computer|informati\w*|it|algorithm\w*|robotic\w*|infrastructure|sre|analytics|mlops|llm|computer vision|simulation|electronic\w*|elektronik|programm\w*|c\+\+|python|java|rust|tech|research engineer|research scientist|digital design|verification|test automation)\b/i;

/** Only the 16 countries the list covers, by name, local name or a city on it. */
const europe = new RegExp(
  [
    ...countries.map((k) => k.name),
    "UK", "England", "Scotland", "Wales", "Deutschland", "Nederland", "Schweiz", "Suisse", "Svizzera", "España", "Italia", "Sverige",
    "Danmark", "Suomi", "Norge", "Polska", "Österreich", "Belgique", "België",
    ...new Set(companies.map((c) => c.city)),
    "London", "Dublin", "Paris", "Berlin", "Munich", "München", "Zurich", "Zürich", "Geneva", "Lausanne", "Basel", "Amsterdam",
    "Rotterdam", "Utrecht", "Eindhoven", "Delft", "The Hague", "Den Haag", "Leiden", "Stockholm", "Gothenburg", "Copenhagen",
    "Helsinki", "Espoo", "Oslo", "Madrid", "Barcelona", "Lisbon", "Porto", "Warsaw", "Krakow", "Kraków", "Wroclaw", "Vienna", "Wien",
    "Brussels", "Antwerp", "Milan", "Milano", "Rome", "Turin", "Cambridge", "Oxford", "Edinburgh", "Manchester", "Bristol",
    "Hamburg", "Frankfurt", "Stuttgart", "Cologne", "Köln", "Dresden", "Aachen", "Karlsruhe", "Lyon", "Toulouse", "Grenoble", "Sophia",
  ]
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "i",
);
/** Workday often starts with a country code: "GB - Bristol", "DEU - Munich". Upper case only, as a whole word. */
const codes = /\b(GB|GBR|DE|DEU|NL|NLD|CH|CHE|IE|IRL|FR|FRA|SE|SWE|DK|DNK|FI|FIN|NO|NOR|ES|ESP|PT|PRT|PL|POL|AT|AUT|BE|BEL|IT|ITA)\b/;
export const inEurope = (loc: string) => europe.test(loc) || codes.test(loc);

/** A title as it is compared: lower case, single spaces. */
export const normTitle = (t: string) => t.toLowerCase().replace(/\s+/g, " ").trim();

/** One company entry a board belongs to. */
export type BoardCompany = { slug: string; name: string; city: string };

/** What discover found: a role on a board that is not on the list yet. */
export type Found = {
  board: string;
  /** The board itself, so the drafts script can read the posting. */
  spec: Board;
  /** Every company entry that uses this board; the posting's city decides which one it is. */
  companies: BoardCompany[];
  company: string;
  title: string;
  url: string;
  location: string;
  /** The board's own id or path for the posting. */
  ref: string;
  /** When the board says it was first published, YYYY-MM-DD, or "" when the board doesn't say. */
  posted: string;
  tech: boolean;
};

/** Stable key for a posting: never proposed twice under the same key. */
export const postingKey = (f: Pick<Found, "board" | "url">) => `${f.board}#${jobId(f.url) ?? f.url}`;
