import { companies } from "@/data/companies";
import { historyStart, roleHistory } from "@/data/history";
import { buildItems } from "@/lib/buildItems";
import { changesFrom, type Changes } from "@/lib/follow";
import { today } from "@/lib/live";

export const dynamic = "force-static";

/** The roles that are new or just opened, for the Worker that emails the people following those companies.
 * It also names every company, so the Worker can check a company exists and say its name in the email. */
export function GET() {
  const now = today();
  const body: Changes = {
    built: now,
    companies: Object.fromEntries(companies.map((c) => [c.slug, c.name])),
    events: changesFrom(buildItems(now), roleHistory, historyStart, now),
  };
  return Response.json(body);
}
