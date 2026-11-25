// Every posting on one job board, from the board's own public API. null when the board doesn't answer.
// Used by the nightly discover run, and to see how many roles a company not on the list yet would bring.

import type { Board } from "./boards.ts";
import { countries } from "../data/companies.ts";
import { json } from "./fetchGently.ts";
import { placeOf } from "./places.ts";

const day = (d: Date) => (isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10));

/** Workday only says "Posted 3 Days Ago". Good enough to sort by, never shown as a fact. */
function workdayPosted(text: string | undefined): string {
  if (!text) return "";
  if (/today/i.test(text)) return day(new Date());
  if (/yesterday/i.test(text)) return day(new Date(Date.now() - 86_400_000));
  const n = text.match(/(\d+)\s+days?\s+ago/i);
  return n && !/\+/.test(text) ? day(new Date(Date.now() - Number(n[1]) * 86_400_000)) : "";
}

export type Listed = { title: string; url: string; location: string; ref: string; posted: string };

// ---------- reading each board ----------

export async function readBoard(b: Board): Promise<Listed[] | null> {
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
        out.push({ title: j.title, url: `${b.origin}/${b.site}${j.externalPath}`, location: j.locationsText || workdayPathPlace(j.externalPath), ref: j.externalPath, posted: workdayPosted(j.postedOn) });
      if (offset + 20 >= total || d.jobPostings.length === 0) break;
    }
  }
  return out;
}

/** Some Workday boards list a posting with no place at all, but put it in the link: "/job/Warsaw/…",
 * "/job/Assago-Via-del-Mulino-11a/…". The longest start of that part that is a known place, with its country
 * ("Lodz, Poland"), or "" when none is. */
export function workdayPathPlace(path: string): string {
  const words = (path.match(/\/job\/([^/]+)\//)?.[1] ?? "").split("-").filter(Boolean);
  for (let n = Math.min(words.length, 4); n > 0; n--) {
    const name = words.slice(0, n).join(" ");
    const p = placeOf(name);
    if (p) return `${name}, ${countries.find((k) => k.code === p.country)?.name ?? p.country}`;
  }
  return "";
}

/** Where a Workday posting is, when the list only says "3 Locations": its main place and the others, from the
 * posting itself, like "Switzerland, Zurich; Germany, Munich". null when the posting doesn't answer. */
export async function workdayPlaces(b: Extract<Board, { ats: "workday" }>, ref: string): Promise<string | null> {
  const d = await json<{ jobPostingInfo?: { location?: string; additionalLocations?: string[] } }>(`${b.origin}/wday/cxs/${b.tenant}/${b.site}${ref}`);
  const info = d?.jobPostingInfo;
  const places = [info?.location, ...(info?.additionalLocations ?? [])].filter((x): x is string => !!x);
  return places.length ? places.join("; ") : null;
}
