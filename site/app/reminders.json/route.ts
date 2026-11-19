import { buildItems } from "@/lib/buildItems";
import { today } from "@/lib/live";

export const dynamic = "force-static";

/** What the service worker (public/sw.js) needs for reminders: every role you can still apply to or that
 * opens soon, with its deadline and the day it was added. Keys are the same short keys as the role pages. */
export function GET() {
  const now = today();
  const roles = buildItems(now)
    .filter((x) => x.status !== "closed")
    .map((x) => ({ k: x.key, s: x.slug, c: x.company, t: x.title, d: x.closes ?? null, a: x.added }));
  return Response.json({ built: now, roles });
}
