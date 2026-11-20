// Checks every role's posting link and writes .linkcheck.json, which the site build reads.
// A posting only counts as gone on a clear answer: a 404 or 410, or the job board's own API
// saying the job is not there. Blocked pages (403), timeouts and server errors count as unknown.
//
// Many careers sites answer 200 for a posting that is gone: they send you to the job search, or show
// their own page without the job. Those count as "suspect": the site doesn't mark them, but the issue
// lists them to open by hand. Two signs:
// - the posting link ends on a job search or a "not available" page;
// - on a host whose live postings name the role in the page title, a posting whose title doesn't.
//
// Also writes .linkcheck.md with the gone and suspect postings, for the GitHub issue. Run: npm run linkcheck

import { writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import { workdayStatus } from "../lib/fetchGently.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "internradar-linkcheck (+https://internradar.eu)";
const TIMEOUT = 20_000;

type Result = { state: "ok" | "gone" | "unknown" | "suspect"; why: string; title?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// one request at a time per host, with a short gap, so job boards do not rate-limit us
const hostQueue = new Map<string, Promise<unknown>>();
function perHost<T>(url: string, job: () => Promise<T>): Promise<T> {
  const host = new URL(url).hostname;
  const prev = hostQueue.get(host) ?? Promise.resolve();
  const run = prev.then(job, job);
  hostQueue.set(host, run.then(() => sleep(400), () => sleep(400)));
  return run;
}

async function get(url: string, accept = "text/html,application/json;q=0.9,*/*;q=0.8"): Promise<Response | null> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      last = await perHost(url, () =>
        fetch(url, {
          headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en" },
          redirect: "follow",
          signal: AbortSignal.timeout(TIMEOUT),
        }),
      );
      if (last.status !== 429 && last.status < 500) return last;
    } catch {
      last = null;
    }
    await sleep(5000 * (attempt + 1));
  }
  return last;
}

function byStatus(res: Response | null, what: string): Result {
  if (!res) return { state: "unknown", why: "no answer" };
  if (res.status === 404 || res.status === 410) return { state: "gone", why: `${what} ${res.status}` };
  if (res.ok) return { state: "ok", why: String(res.status) };
  return { state: "unknown", why: String(res.status) };
}

async function check(url: string): Promise<Result> {
  const u = new URL(url);

  // Workday: the page is a JavaScript app that always loads, so ask its JSON endpoint
  const wd = u.hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com$/);
  if (wd) {
    // Workday turns Node's fetch away with 429, so this one goes through curl
    const path = u.pathname.replace(/^\/[a-z]{2}-[A-Z]{2}\//, "/");
    const status = await workdayStatus(`${u.origin}/wday/cxs/${wd[1]}${path}`);
    if (status === null) return { state: "unknown", why: "no answer" };
    if (status === 404 || status === 410) return { state: "gone", why: `Workday ${status}` };
    return status >= 200 && status < 300 ? { state: "ok", why: String(status) } : { state: "unknown", why: String(status) };
  }

  // Greenhouse: job board API by board and job id
  let gh: [string, string] | null = null;
  const m1 = (u.hostname.endsWith("greenhouse.io") && u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/)) || null;
  if (m1) gh = [m1[1], m1[2]];
  if (u.hostname.endsWith("greenhouse.io") && u.searchParams.get("for") && u.searchParams.get("token")) {
    gh = [u.searchParams.get("for")!, u.searchParams.get("token")!];
  }
  if (gh) {
    const res = await get(`https://boards-api.greenhouse.io/v1/boards/${gh[0]}/jobs/${gh[1]}`, "application/json");
    return byStatus(res, "Greenhouse");
  }

  // SmartRecruiters: the posting API says 404, or active false, once a job is taken down
  const sr = u.hostname === "jobs.smartrecruiters.com" && u.pathname.match(/^\/([^/]+)\/(\d+)/);
  if (sr) {
    const res = await get(`https://api.smartrecruiters.com/v1/companies/${sr[1]}/postings/${sr[2]}`, "application/json");
    if (res?.ok) {
      const job = (await res.json().catch(() => null)) as { active?: boolean } | null;
      return job?.active === false ? { state: "gone", why: "SmartRecruiters inactive" } : { state: "ok", why: "200" };
    }
    return byStatus(res, "SmartRecruiters");
  }

  // a Greenhouse job on the company's own site (?gh_jid=): ask the board named after the site, if there is one
  const ghj = u.searchParams.get("gh_jid");
  if (ghj && /^\d+$/.test(ghj)) {
    const board = u.hostname.replace(/^www\./, "").split(".")[0];
    const exists = await get(`https://boards-api.greenhouse.io/v1/boards/${board}`, "application/json");
    if (exists?.ok) return byStatus(await get(`https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${ghj}`, "application/json"), "Greenhouse");
  }

  // Lever
  const lv = u.hostname === "jobs.lever.co" && u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/);
  if (lv) return byStatus(await get(`https://api.lever.co/v0/postings/${lv[1]}/${lv[2]}`, "application/json"), "Lever");

  // Ashby: the board API lists every live job
  const ab = u.hostname === "jobs.ashbyhq.com" && u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/);
  if (ab) {
    const res = await get(`https://api.ashbyhq.com/posting-api/job-board/${ab[1]}`, "application/json");
    if (!res?.ok) return { state: "unknown", why: res ? String(res.status) : "no answer" };
    const board = (await res.json()) as { jobs?: { id: string }[] };
    return board.jobs?.some((j) => j.id === ab[2]) ? { state: "ok", why: "on board" } : { state: "gone", why: "not on the Ashby board" };
  }

  return page(url, await get(url));
}

/** A path that is a job search or a list, not one posting. */
const listing = /\/(jobs?|careers?|open-positions|positions|vacancies|vacatures|search|search-results|results|job-search|jobsearch|stellenangebote|offres?|en|nl|de)\/?$/i;
/** A path that says the posting is gone. */
const goneUrl = /(not[-_]?available|not[-_]?found|no[-_]?longer|expired|job[-_]?closed|position[-_]?closed)/i;

/** An ordinary page: its status, where it ended up, and its title for the check across the host. */
async function page(url: string, res: Response | null): Promise<Result> {
  const r = byStatus(res, "page");
  if (r.state !== "ok" || !res) return r;
  const final = new URL(res.url || url);
  const from = new URL(url);
  if (goneUrl.test(final.pathname) && !goneUrl.test(from.pathname)) return { state: "suspect", why: `sent to ${final.pathname}` };
  if (final.href !== from.href && (final.pathname === "/" || listing.test(final.pathname)) && final.pathname !== from.pathname)
    return { state: "suspect", why: `sent to ${final.pathname}` };
  const html = await res.text().catch(() => "");
  const title = [/<title[^>]*>([^<]*)/i, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)/i, /<h1[^>]*>([\s\S]{0,300}?)<\/h1>/i]
    .map((re) => html.match(re)?.[1] ?? "")
    .join(" ")
    .replace(/<[^>]+>/g, " ");
  return { ...r, title };
}

/** Words that tell one role from another; "intern" or "2027" tell nothing. */
const plain = new Set(["intern", "interns", "internship", "internships", "graduate", "graduates", "program", "programme", "student", "students", "with", "and", "the", "for", "from", "summer", "start", "2026", "2027", "2028", "full", "time"]);
const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !plain.has(w));

/** Whether a page title names the role: half its telling words or more. */
function names(pageTitle: string, roleTitles: string[]): boolean {
  const have = new Set(words(pageTitle));
  return roleTitles.some((t) => {
    const want = words(t);
    return want.length === 0 || want.filter((w) => have.has(w)).length * 2 >= want.length;
  });
}

// one check per URL, a few at a time
const roles = companies.flatMap((c) => c.roles.filter((r) => r.status !== "closed").map((r) => ({ c, r })));
const urls = [...new Set(roles.map((x) => x.r.source))];
const results = new Map<string, Result>();
let next = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      results.set(url, await check(url).catch(() => ({ state: "unknown", why: "error" }) as Result));
    }
  }),
);

// The title check, per host: only where nearly every live posting names its role in the title can a
// posting that doesn't be a sign. Pages for a whole programme (no job number in the link) are left out.
const titlesFor = (url: string) => roles.filter((x) => x.r.source === url).map((x) => x.r.title);
const byHost = new Map<string, string[]>();
for (const url of urls) {
  const r = results.get(url)!;
  if (r.state !== "ok" || r.title === undefined || !/\d{4,}/.test(new URL(url).pathname + new URL(url).search)) continue;
  const h = new URL(url).hostname;
  byHost.set(h, [...(byHost.get(h) ?? []), url]);
}
for (const [, list] of byHost) {
  const named = list.filter((u) => names(results.get(u)!.title!, titlesFor(u)));
  if (list.length < 3 || named.length < list.length * 0.8) continue;
  for (const u of list) if (!named.includes(u)) results.set(u, { state: "suspect", why: "page title doesn't name the role" });
}

const checkedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
const gone = urls.filter((u) => results.get(u)!.state === "gone").map((u) => ({ url: u, why: results.get(u)!.why }));
const suspect = urls.filter((u) => results.get(u)!.state === "suspect").map((u) => ({ url: u, why: results.get(u)!.why }));
const unknown = urls.filter((u) => results.get(u)!.state === "unknown");
writeFileSync(join(site, ".linkcheck.json"), JSON.stringify({ checkedAt, gone, suspect, unknown }, null, 1));

const md = join(site, ".linkcheck.md");
rmSync(md, { force: true });
if (gone.length || suspect.length) {
  const list = (found: { url: string; why: string }[]) =>
    found.flatMap((g) => roles.filter((x) => x.r.source === g.url).map(({ c, r }) => `- [ ] **${c.name}**, ${r.title} (${g.why}): ${g.url}`));
  const lines = [
    `The nightly check ran on ${checkedAt}.`,
    "",
    "For each one: open the link. If the role is really gone, set its status to closed in site/data and run npm run gen. If it moved, fix the link.",
    "",
  ];
  if (gone.length) lines.push("### Gone", "", 'The site shows these as "Posting gone" until the data says otherwise.', "", ...list(gone), "");
  if (suspect.length)
    lines.push("### Check by hand", "", "These load, but look gone: the link ends on a job search, or the page doesn't name the role. The site doesn't mark them.", "", ...list(suspect), "");
  lines.push("This issue is updated every night and closes itself once nothing is gone or suspect.");
  writeFileSync(md, lines.join("\n") + "\n");
}

console.log(`${urls.length} links: ${urls.length - gone.length - suspect.length - unknown.length} ok, ${gone.length} gone, ${suspect.length} suspect, ${unknown.length} unknown`);
for (const g of gone) console.log(`gone     ${g.why}  ${g.url}`);
for (const g of suspect) console.log(`suspect  ${g.why}  ${g.url}`);
