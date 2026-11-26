import { buildItems } from "@/lib/buildItems";
import { shortWhen } from "@/lib/items";
import { today } from "@/lib/live";
import { rolesFor, universities } from "@/lib/universities";

export const dynamic = "force-static";

/** What /embed.js shows on a study association's site: per university, the first roles near it, deadlines first.
 * Short field names keep it small: c company, t title, p place, w when, k role page key. */
export function GET() {
  const now = today();
  const items = buildItems(now);
  const unis = Object.fromEntries(
    universities.map((u) => {
      const { roles: near, where } = rolesFor(u, items);
      const open = near.filter((x) => x.status === "open" || x.status === "rolling");
      // one row per company first, so one company with many postings doesn't fill the box
      const seen = new Set<string>();
      const firsts = open.filter((x) => !seen.has(x.company) && seen.add(x.company));
      const rows = [...firsts, ...open.filter((x) => !firsts.includes(x))].slice(0, 12);
      return [u.slug, { name: u.name, where, open: open.length, soon: near.length - open.length, roles: rows.map((x) => ({ c: x.company, t: x.title, p: x.city, w: shortWhen(x), k: x.key, d: x.closes ? 1 : 0 })) }];
    }),
  );
  return Response.json({ built: now, unis });
}
