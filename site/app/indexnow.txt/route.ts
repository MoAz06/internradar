export const dynamic = "force-static";

/** The IndexNow key, so the search engines on IndexNow can check that the nightly pings (scripts/indexnow.mts)
 * come from this site. The key is a build-time secret (INDEXNOW_KEY); without it the file is empty and the pings
 * are ignored, nothing else changes. */
export function GET() {
  return new Response(process.env.INDEXNOW_KEY ?? "", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
