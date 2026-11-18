// Looks for internships and graduate roles that are not on the list yet, on the job boards the companies
// on internradar already use (Greenhouse, Lever, Ashby, SmartRecruiters, Workday). It only reads their
// public job APIs and writes a report. It never changes the data: every new role still gets checked by hand
// on its own posting before it goes in.
//
// Writes .discover.json (read by scripts/role-drafts.mts) and .discover.md. Run: npm run discover
// A role that was looked at and is not for the list goes in data/skip.ts, so it doesn't come back.

import { writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies, countries } from "../data/companies.ts";
import { skip } from "../data/skip.ts";
import { boardKey, boardOf, early, inEurope, jobId, normTitle, tech, type Board, type BoardCompany, type Found } from "../lib/boards.ts";
import { json } from "../lib/fetchGently.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
/** At most this many per board in the report; a big board gets a link to the rest. */
const PER_BOARD = 12;
const day = (d: Date) => (isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10));

/** Workday only says "Posted 3 Days Ago". Good enough to sort by, never shown as a fact. */
function workdayPosted(text: string | undefined): string {
  if (!text) return "";
  if (/today/i.test(text)) return day(new Date());
  if (/yesterday/i.test(text)) return day(new Date(Date.now() - 86_400_000));
  const n = text.match(/(\d+)\s+days?\s+ago/i);
  return n && !/\+/.test(text) ? day(new Date(Date.now() - Number(n[1]) * 86_400_000)) : "";
}

type Listed = { title: string; url: string; location: string; ref: string; posted: string };

// ---------- reading each board ----------

async function readBoard(b: Board): Promise<Listed[] | null> {
  if (b.ats === "greenhouse") {
    const d = await json<{ jobs: { id: number; title: string; absolute_url: string; first_published?: string; location?: { name?: string } }[] }>(
      `https://boards-api.greenhouse.io/v1/boards/${b.board}/jobs`,
    );
    return d
      ? d.jobs.map((j) => ({ title: j.title, url: j.absolute_url, location: j.location?.name ?? "", ref: String(j.id), posted: day(new Date(j.first_published ?? "")) }))
      : null;
  }
  if (b.ats === "lever") {
    const d = await json<{ id: string; text: string; hostedUrl: string; createdAt?: number; categories?: { location?: string; allLocations?: string[] } }[]>(
      `https://api${b.eu ? ".eu" : ""}.lever.co/v0/postings/${b.board}?mode=json`,
    );
    return d
      ? d.map((j) => ({
          title: j.text,
          url: j.hostedUrl,
          location: [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean).join("; "),
          ref: j.id,
          posted: j.createdAt ? day(new Date(j.createdAt)) : "",
        }))
      : null;
  }
  if (b.ats === "ashby") {
    const d = await json<{ jobs: { id: string; title: string; jobUrl: string; publishedAt?: string; location?: string; secondaryLocations?: { location: string }[] }[] }>(
      `https://api.ashbyhq.com/posting-api/job-board/${b.board}`,
    );
    return d
      ? d.jobs.map((j) => ({
          title: j.title,
          url: j.jobUrl,
          location: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join("; "),
          ref: j.id,
          posted: day(new Date(j.publishedAt ?? "")),
        }))
      : null;
  }
  if (b.ats === "smartrecruiters") {
    const out: Listed[] = [];
    for (const q of ["intern", "internship", "graduate", "student", "trainee", "praktikum", "werkstudent", "thesis", "stage"]) {
      for (let offset = 0; offset < 400; offset += 100) {
        const d = await json<{
          totalFound: number;
          content: { id: string; name: string; releasedDate?: string; location?: { city?: string; country?: string; fullLocation?: string } }[];
        }>(`https://api.smartrecruiters.com/v1/companies/${b.board}/postings?q=${q}&limit=100&offset=${offset}`);
        if (!d) return out.length ? out : null;
        for (const j of d.content) {
          out.push({
            title: j.name,
            url: `https://jobs.smartrecruiters.com/${b.board}/${j.id}`,
            location: j.location?.fullLocation ?? [j.location?.city, j.location?.country].filter(Boolean).join(", "),
            ref: j.id,
            posted: day(new Date(j.releasedDate ?? "")),
          });
        }
        if (offset + 100 >= d.totalFound) break;
      }
    }
    return out;
  }
  if (b.ats === "amazon") {
    // one board for every Amazon entry: search per country, the list's 16 countries only
    const out: Listed[] = [];
    for (const country of ["GBR", "DEU", "NLD", "CHE", "IRL", "FRA", "SWE", "DNK", "FIN", "NOR", "ESP", "PRT", "POL", "AUT", "BEL", "ITA"]) {
      for (const q of ["intern", "graduate", "student"]) {
        for (let offset = 0; offset < 300; offset += 100) {
          const d = await json<{ hits: number; jobs: { id_icims: string; title: string; job_path: string; normalized_location?: string; posted_date?: string }[] }>(
            `https://www.amazon.jobs/en/search.json?base_query=${q}&country=${country}&result_limit=100&offset=${offset}`,
          );
          if (!d) return out.length ? out : null;
          for (const j of d.jobs)
            out.push({ title: j.title, url: `https://www.amazon.jobs${j.job_path}`, location: j.normalized_location ?? "", ref: j.id_icims, posted: day(new Date(j.posted_date ?? "")) });
          if (offset + 100 >= d.hits) break;
        }
      }
    }
    return out;
  }
  if (b.ats === "oracle") {
    // Oracle Recruiting Cloud (JPMorgan): keyword search per country, 25 a page. Without the country the
    // first pages are all Asia and the US.
    const out: Listed[] = [];
    const seen = new Set<string>();
    for (const k of countries)
      for (const q of ["intern", "graduate"]) {
        for (let offset = 0; offset < 100; offset += 25) {
          const finder = `findReqs;siteNumber=${b.site},keyword=${encodeURIComponent(q)},location=${encodeURIComponent(k.name)},limit=25,offset=${offset}`;
          const d = await json<{ items: { TotalJobsCount: number; requisitionList: { Id: string; Title: string; PrimaryLocation?: string; PostedDate?: string }[] }[] }>(
            `${b.origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=${finder}`,
          );
          const page = d?.items?.[0];
          if (!page) return out.length ? out : null;
          for (const j of page.requisitionList.filter((j) => !seen.has(j.Id) && seen.add(j.Id)))
            out.push({
              title: j.Title,
              url: `${b.origin}/hcmUI/CandidateExperience/en/sites/${b.site}/job/${j.Id}`,
              location: j.PrimaryLocation ?? "",
              ref: j.Id,
              posted: day(new Date(j.PostedDate ?? "")),
            });
          if (offset + 25 >= page.TotalJobsCount || page.requisitionList.length === 0) break;
        }
      }
    return out;
  }
  if (b.ats === "eightfold") {
    // Eightfold (Qualcomm): search per country by name, 10 a page
    const out: Listed[] = [];
    for (const k of countries) {
      for (const q of ["intern", "graduate"]) {
        for (let start = 0; start < 200; start += 10) {
          const d = await json<{ data: { count: number; positions: { id: number; name: string; locations?: string[]; postedTs?: number }[] } }>(
            `${b.origin}/api/pcsx/search?domain=${b.domain}&query=${q}&location=${encodeURIComponent(k.name)}&start=${start}`,
          );
          if (!d?.data) return out.length ? out : null;
          for (const j of d.data.positions)
            out.push({
              title: j.name,
              url: `${b.origin}/careers/job/${j.id}`,
              location: (j.locations ?? []).join("; "),
              ref: String(j.id),
              posted: j.postedTs ? day(new Date(j.postedTs * 1000)) : "",
            });
          if (start + 10 >= d.data.count || d.data.positions.length === 0) break;
        }
      }
    }
    return out;
  }
  // Workday: search a few words, page by page
  const out: Listed[] = [];
  const api = `${b.origin}/wday/cxs/${b.tenant}/${b.site}/jobs`;
  for (const q of ["intern", "graduate", "student", "trainee"]) {
    // Workday gives the total on the first page only
    let total = 0;
    for (let offset = 0; offset < 200; offset += 20) {
      const d = await json<{ total: number; jobPostings: { title: string; externalPath: string; locationsText?: string; postedOn?: string }[] }>(api, {
        appliedFacets: {},
        limit: 20,
        offset,
        searchText: q,
      });
      if (!d) return out.length ? out : null;
      if (offset === 0) total = d.total;
      for (const j of d.jobPostings)
        out.push({ title: j.title, url: `${b.origin}/${b.site}${j.externalPath}`, location: j.locationsText ?? "", ref: j.externalPath, posted: workdayPosted(j.postedOn) });
      if (offset + 20 >= total || d.jobPostings.length === 0) break;
    }
  }
  return out;
}

// ---------- run ----------

const boards = new Map<string, { board: Board; names: Set<string>; entries: Map<string, BoardCompany>; known: Map<string, Set<string>>; titles: Set<string> }>();
for (const c of companies) {
  for (const url of [c.careersUrl, ...c.roles.map((r) => r.source), ...c.sources.map((s) => s.url)]) {
    const b = boardOf(url);
    if (!b) continue;
    const k = boardKey(b);
    if (!boards.has(k)) boards.set(k, { board: b, names: new Set(), entries: new Map(), known: new Map(), titles: new Set() });
    const e = boards.get(k)!;
    e.names.add(c.name);
    e.entries.set(c.slug, { slug: c.slug, name: c.name, city: c.city });
    for (const r of c.roles) {
      if (boardKey(boardOf(r.source) ?? b) !== k) continue;
      const id = jobId(r.source);
      // which posting links on the list belong to this job id, for the posting dates below
      if (id) e.known.set(id, (e.known.get(id) ?? new Set()).add(r.source));
      e.titles.add(normTitle(r.title));
    }
  }
}

const skipIds = new Set(skip.map((s) => jobId(s.url) ?? s.url));
const found: Found[] = [];
const failed: string[] = [];
/** Posting link on the list to the day its job board says it was first published. Kept by scripts/opened.mts. */
const postedOn: Record<string, string> = {};
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
        if (e.known.has(id)) {
          if (j.posted) for (const src of e.known.get(id)!) postedOn[src] = j.posted;
          continue;
        }
        if (skipIds.has(id) || skipIds.has(j.url)) continue;
        if (e.titles.has(normTitle(j.title))) continue;
        if (!early.test(j.title)) continue;
        // a location we can't read ("3 Locations") is kept, the check by hand decides
        if (j.location && !/^\d+ locations?$/i.test(j.location) && !inEurope(j.location)) continue;
        found.push({
          board: key,
          spec: e.board,
          companies: [...e.entries.values()],
          company: [...e.names].join(" / "),
          title: j.title.trim(),
          url: j.url,
          location: j.location || "not given",
          ref: j.ref,
          posted: j.posted,
          tech: tech.test(j.title),
        });
      }
    }
  }),
);

found.sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title));
const checkedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
writeFileSync(join(site, ".discover.json"), JSON.stringify({ checkedAt, boards: boards.size, failed, found }, null, 1));
writeFileSync(join(site, ".opened.json"), JSON.stringify(postedOn, null, 1));

const md = join(site, ".discover.md");
rmSync(md, { force: true });
const techFound = found.filter((f) => f.tech);
const other = found.filter((f) => !f.tech);
if (found.length) {
  const lines = [
    `The nightly check on ${checkedAt} read ${boards.size} job boards of companies on the list and found ${found.length} early-career roles in Europe that are not on it.`,
    "",
    `## Tech roles (${techFound.length})`,
    "",
  ];
  const byBoard = new Map<string, Found[]>();
  for (const f of techFound) byBoard.set(f.board, [...(byBoard.get(f.board) ?? []), f]);
  for (const [, list] of [...byBoard].sort((a, b) => a[1][0].company.localeCompare(b[1][0].company))) {
    lines.push("", `**${list[0].company}** (${list.length})`, "");
    for (const f of list.slice(0, PER_BOARD)) lines.push(`- [${f.title}](${f.url}), ${f.location}`);
    if (list.length > PER_BOARD) lines.push(`- and ${list.length - PER_BOARD} more`);
  }
  if (other.length) lines.push("", `${other.length} more early-career roles have titles that don't look like tech. They don't get a draft.`);
  if (failed.length) lines.push("", `Could not read: ${failed.join(", ")}.`);
  writeFileSync(md, lines.join("\n") + "\n");
}

console.log(`${boards.size} boards, ${found.length} new (${techFound.length} tech), ${failed.length} failed${failed.length ? ": " + failed.join(", ") : ""}`);
