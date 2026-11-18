// Looks for internships and graduate roles that are not on the list yet, on the job boards the companies
// on internradar already use (Greenhouse, Lever, Ashby, SmartRecruiters, Workday). It only reads their
// public job APIs and writes a report. It never changes the data: every new role still gets checked by hand
// on its own posting before it goes in.
//
// Writes .discover.json and .discover.md (for the GitHub issue). Run: npm run discover
// A role that was looked at and is not for the list goes in data/skip.ts, so it doesn't come back.

import { writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies, countries } from "../data/companies.ts";
import { skip } from "../data/skip.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "internradar-discover (+https://internradar.eu)";
const TIMEOUT = 25_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- fetching, gently ----------

const hostQueue = new Map<string, Promise<unknown>>();
function perHost<T>(url: string, job: () => Promise<T>): Promise<T> {
  const host = new URL(url).hostname;
  const prev = hostQueue.get(host) ?? Promise.resolve();
  const run = prev.then(job, job);
  // Workday rate-limits hard, so it gets a longer gap between requests
  const gap = host.endsWith("myworkdayjobs.com") ? 2000 : 500;
  hostQueue.set(host, run.then(() => sleep(gap), () => sleep(gap)));
  return run;
}

async function json<T>(url: string, body?: unknown): Promise<T | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await perHost(url, () =>
        fetch(url, {
          method: body ? "POST" : "GET",
          headers: { "User-Agent": UA, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(TIMEOUT),
        }),
      );
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      // timeout or network: try again
    }
    await sleep((url.includes("myworkdayjobs.com") ? 20_000 : 4000) * (attempt + 1));
  }
  return null;
}

// ---------- which board a posting lives on ----------

type Board =
  | { ats: "greenhouse"; board: string }
  | { ats: "lever"; board: string; eu: boolean }
  | { ats: "ashby"; board: string }
  | { ats: "smartrecruiters"; board: string }
  | { ats: "workday"; origin: string; tenant: string; site: string };

const boardKey = (b: Board) => (b.ats === "workday" ? `workday:${b.tenant}/${b.site}` : `${b.ats}:${b.board.toLowerCase()}`);

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
function jobId(url: string): string | null {
  const m =
    url.match(/[?&]token=(\d+)/) ??
    url.match(/[?&]gh_jid=(\d+)/) ??
    url.match(/\/jobs\/(\d{5,})/) ??
    url.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i) ??
    url.match(/_([A-Z]{0,4}[-_]?\d{4,}(?:-\d+)?)(?:[/?#]|$)/) ??
    url.match(/\/(\d{9,})(?:[-/?#]|$)/);
  return m ? m[1].toLowerCase() : null;
}

// ---------- what counts ----------

const early =
  /\b(intern|interns|internship|internships|graduate|graduates|grad|new grad|student|students|trainee|traineeship|placement|thesis|praktik\w*|praktikum|werkstudent\w*|working student|stagiair\w*|stage|stagiaire|alternance|alternant|tirocinio|tirocinante|pr[aá]cticas|becari[oa]|summer analyst|summer associate|early careers?|apprentice\w*|ausbildung|duales studium|masterarbeit|abschlussarbeit|exjobb|harjoittelija|trainee\w*)\b/i;
const tech =
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
const inEurope = (loc: string) => europe.test(loc) || codes.test(loc);
/** At most this many per board in the report; a big board gets a link to the rest. */
const PER_BOARD = 12;

type Found = { board: string; company: string; title: string; url: string; location: string; tech: boolean };

// ---------- reading each board ----------

async function readBoard(b: Board): Promise<{ title: string; url: string; location: string }[] | null> {
  if (b.ats === "greenhouse") {
    const d = await json<{ jobs: { title: string; absolute_url: string; location?: { name?: string } }[] }>(
      `https://boards-api.greenhouse.io/v1/boards/${b.board}/jobs`,
    );
    return d ? d.jobs.map((j) => ({ title: j.title, url: j.absolute_url, location: j.location?.name ?? "" })) : null;
  }
  if (b.ats === "lever") {
    const d = await json<{ text: string; hostedUrl: string; categories?: { location?: string; allLocations?: string[] } }[]>(
      `https://api${b.eu ? ".eu" : ""}.lever.co/v0/postings/${b.board}?mode=json`,
    );
    return d ? d.map((j) => ({ title: j.text, url: j.hostedUrl, location: [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean).join("; ") })) : null;
  }
  if (b.ats === "ashby") {
    const d = await json<{ jobs: { title: string; jobUrl: string; location?: string; secondaryLocations?: { location: string }[] }[] }>(
      `https://api.ashbyhq.com/posting-api/job-board/${b.board}`,
    );
    return d
      ? d.jobs.map((j) => ({ title: j.title, url: j.jobUrl, location: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join("; ") }))
      : null;
  }
  if (b.ats === "smartrecruiters") {
    const out: { title: string; url: string; location: string }[] = [];
    for (const q of ["intern", "internship", "graduate", "student", "trainee", "praktikum", "werkstudent", "thesis", "stage"]) {
      for (let offset = 0; offset < 400; offset += 100) {
        const d = await json<{ totalFound: number; content: { id: string; name: string; location?: { city?: string; country?: string; fullLocation?: string } }[] }>(
          `https://api.smartrecruiters.com/v1/companies/${b.board}/postings?q=${q}&limit=100&offset=${offset}`,
        );
        if (!d) return out.length ? out : null;
        for (const j of d.content) {
          out.push({
            title: j.name,
            url: `https://jobs.smartrecruiters.com/${b.board}/${j.id}`,
            location: j.location?.fullLocation ?? [j.location?.city, j.location?.country].filter(Boolean).join(", "),
          });
        }
        if (offset + 100 >= d.totalFound) break;
      }
    }
    return out;
  }
  // Workday: search a few words, page by page
  const out: { title: string; url: string; location: string }[] = [];
  const api = `${b.origin}/wday/cxs/${b.tenant}/${b.site}/jobs`;
  for (const q of ["intern", "graduate", "student", "trainee"]) {
    // Workday gives the total on the first page only
    let total = 0;
    for (let offset = 0; offset < 200; offset += 20) {
      const d = await json<{ total: number; jobPostings: { title: string; externalPath: string; locationsText?: string }[] }>(api, {
        appliedFacets: {},
        limit: 20,
        offset,
        searchText: q,
      });
      if (!d) return out.length ? out : null;
      if (offset === 0) total = d.total;
      for (const j of d.jobPostings) out.push({ title: j.title, url: `${b.origin}/${b.site}${j.externalPath}`, location: j.locationsText ?? "" });
      if (offset + 20 >= total || d.jobPostings.length === 0) break;
    }
  }
  return out;
}

// ---------- run ----------

const boards = new Map<string, { board: Board; names: Set<string>; known: Set<string>; titles: Set<string> }>();
for (const c of companies) {
  for (const url of [c.careersUrl, ...c.roles.map((r) => r.source), ...c.sources.map((s) => s.url)]) {
    const b = boardOf(url);
    if (!b) continue;
    const k = boardKey(b);
    if (!boards.has(k)) boards.set(k, { board: b, names: new Set(), known: new Set(), titles: new Set() });
    const e = boards.get(k)!;
    e.names.add(c.name);
    for (const r of c.roles) {
      if (boardKey(boardOf(r.source) ?? b) !== k) continue;
      const id = jobId(r.source);
      if (id) e.known.add(id);
      e.titles.add(r.title.toLowerCase().replace(/\s+/g, " ").trim());
    }
  }
}

const skipIds = new Set(skip.map((s) => jobId(s.url) ?? s.url));
const found: Found[] = [];
const failed: string[] = [];
// Workday answers 429 when several of its boards are read at once, so those go one by one in a lane of their own
const all = [...boards.entries()];
const rest = all.filter(([, e]) => e.board.ats !== "workday");
const lanes = [all.filter(([, e]) => e.board.ats === "workday"), ...[0, 1, 2, 3].map((i) => rest.filter((_, j) => j % 4 === i))];
await Promise.all(
  lanes.map(async (list) => {
    for (const [key, e] of list) {
      const jobs = await readBoard(e.board).catch(() => null);
      if (!jobs) {
        failed.push(key);
        continue;
      }
      const seen = new Set<string>();
      for (const j of jobs) {
        if (!j.title || !j.url) continue;
        const id = jobId(j.url) ?? j.url;
        if (seen.has(id)) continue;
        seen.add(id);
        if (e.known.has(id) || skipIds.has(id) || skipIds.has(j.url)) continue;
        if (e.titles.has(j.title.toLowerCase().replace(/\s+/g, " ").trim())) continue;
        if (!early.test(j.title)) continue;
        // a location we can't read ("3 Locations") is kept, the check by hand decides
        if (j.location && !/^\d+ locations?$/i.test(j.location) && !inEurope(j.location)) continue;
        found.push({ board: key, company: [...e.names].join(" / "), title: j.title, url: j.url, location: j.location || "not given", tech: tech.test(j.title) });
      }
    }
  }),
);

found.sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
const checkedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
writeFileSync(join(site, ".discover.json"), JSON.stringify({ checkedAt, boards: boards.size, failed, found }, null, 1));

const md = join(site, ".discover.md");
rmSync(md, { force: true });
const techFound = found.filter((f) => f.tech);
const other = found.filter((f) => !f.tech);
if (found.length) {
  const lines = [
    `The nightly check on ${checkedAt} read ${boards.size} job boards of companies on the list and found ${found.length} early-career roles in Europe that are not on it.`,
    "",
    "For each one: open the posting. If it fits the list, add it in site/data with what the posting says and run npm run gen. If it doesn't fit, add the link to site/data/skip.ts with a short reason, so it stops showing up here.",
    "",
    `## Tech roles (${techFound.length})`,
    "",
  ];
  const byBoard = new Map<string, Found[]>();
  for (const f of techFound) byBoard.set(f.board, [...(byBoard.get(f.board) ?? []), f]);
  for (const [, list] of [...byBoard].sort((a, b) => a[1][0].company.localeCompare(b[1][0].company))) {
    lines.push("", `**${list[0].company}** (${list.length})`, "");
    for (const f of list.slice(0, PER_BOARD)) lines.push(`- [ ] [${f.title}](${f.url}), ${f.location}`);
    if (list.length > PER_BOARD) lines.push(`- and ${list.length - PER_BOARD} more, all in .discover.json`);
  }
  if (other.length) {
    lines.push("", `${other.length} more early-career roles have titles that don't look like tech. They're in .discover.json when you run it yourself.`);
  }
  if (failed.length) lines.push("", `Could not read: ${failed.join(", ")}.`);
  writeFileSync(md, lines.join("\n") + "\n");
}

console.log(`${boards.size} boards, ${found.length} new (${techFound.length} tech), ${failed.length} failed${failed.length ? ": " + failed.join(", ") : ""}`);
