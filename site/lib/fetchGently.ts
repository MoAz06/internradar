// Fetching from job boards without hammering them: one request at a time per host, a gap between them,
// and a few tries on 429, 5xx and timeouts. Used by the nightly scripts only.

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

/** GET (or POST with a body) and parse JSON. null when the board says no, or keeps failing. */
export async function json<T>(url: string, body?: unknown): Promise<T | null> {
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
