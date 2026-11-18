// Checks every role's posting link and writes .linkcheck.json, which the site build reads.
// A posting only counts as gone on a clear answer: a 404 or 410, or the job board's own API
// saying the job is not there. Blocked pages (403), timeouts and server errors count as unknown.
// Also writes .linkcheck.md with the gone postings, for the GitHub issue. Run: npm run linkcheck

import { writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { companies } from "../data/companies.ts";
import { workdayStatus } from "../lib/fetchGently.ts";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "internradar-linkcheck (+https://internradar.eu)";
const TIMEOUT = 20_000;

type Result = { state: "ok" | "gone" | "unknown"; why: string };

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

  return byStatus(await get(url), "page");
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

const checkedAt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date());
const gone = urls.filter((u) => results.get(u)!.state === "gone").map((u) => ({ url: u, why: results.get(u)!.why }));
const unknown = urls.filter((u) => results.get(u)!.state === "unknown");
writeFileSync(join(site, ".linkcheck.json"), JSON.stringify({ checkedAt, gone, unknown }, null, 1));

const md = join(site, ".linkcheck.md");
rmSync(md, { force: true });
if (gone.length) {
  const lines = [
    `These postings were gone when the nightly check ran on ${checkedAt}. The site shows them as "Posting gone" until the data says otherwise.`,
    "",
    "For each one: open the link. If the role is really gone, set its status to closed in site/data and run npm run gen. If it moved, fix the link.",
    "",
  ];
  for (const g of gone) {
    for (const { c, r } of roles.filter((x) => x.r.source === g.url)) {
      lines.push(`- [ ] **${c.name}**, ${r.title} (${g.why}): ${g.url}`);
    }
  }
  lines.push("", "This issue is updated every night and closes itself once no posting is gone.");
  writeFileSync(md, lines.join("\n") + "\n");
}

console.log(`${urls.length} links: ${urls.length - gone.length - unknown.length} ok, ${gone.length} gone, ${unknown.length} unknown`);
for (const g of gone) console.log(`gone  ${g.why}  ${g.url}`);
