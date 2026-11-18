// Fetching from job boards without hammering them: one request at a time per host, a gap between them,
// and a few tries on 429, 5xx and timeouts. Used by the nightly scripts only.
//
// Workday answers 429 to every request from Node's own fetch, whatever the headers, but serves the same request
// from curl. So Workday goes through curl (on GitHub's runners and on Windows it's there already).

import { execFile } from "node:child_process";

const UA = "internradar-discover (+https://internradar.eu)";
const TIMEOUT = 25_000;
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

type Answer = { status: number; text: string };

function withFetch(url: string, body?: unknown): Promise<Answer> {
  return fetch(url, {
    method: body ? "POST" : "GET",
    headers: { "User-Agent": UA, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT),
  }).then(async (res) => ({ status: res.status, text: await res.text() }));
}

/** The same request through curl. The status code comes on the last line. */
function withCurl(url: string, body?: unknown): Promise<Answer> {
  const args = ["-s", "-A", UA, "-H", "Accept: application/json", "--max-time", String(TIMEOUT / 1000), "-w", "\n%{http_code}"];
  if (body) args.push("-H", "Content-Type: application/json", "--data", JSON.stringify(body));
  args.push(url);
  return new Promise((resolve, reject) =>
    execFile("curl", args, { maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      const cut = stdout.lastIndexOf("\n");
      resolve({ status: Number(stdout.slice(cut + 1)), text: stdout.slice(0, cut) });
    }),
  );
}

/** Only the status of a Workday GET, through curl, with the same tries. null when there's no answer at all. */
export async function workdayStatus(url: string): Promise<number | null> {
  let last: number | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      last = (await perHost(url, () => withCurl(url))).status || null;
      if (last && last !== 429 && last < 500) return last;
    } catch {
      last = null;
    }
    await sleep(20_000 * (attempt + 1));
  }
  return last;
}

/** GET (or POST with a body) and parse JSON. null when the board says no, or keeps failing. */
export async function json<T>(url: string, body?: unknown): Promise<T | null> {
  const workday = new URL(url).hostname.endsWith("myworkdayjobs.com");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await perHost(url, () => (workday ? withCurl(url, body) : withFetch(url, body)));
      if (res.status >= 200 && res.status < 300) return JSON.parse(res.text) as T;
      if (res.status !== 429 && res.status < 500 && res.status !== 0) return null;
    } catch {
      // timeout, network or a body that isn't JSON: try again
    }
    await sleep((workday ? 20_000 : 4000) * (attempt + 1));
  }
  return null;
}
