import { buildItems } from "@/lib/buildItems";
import { radar } from "@/data/companies";
import { eventsFor, radarEvents, toIcs } from "@/lib/ics";
import { today } from "@/lib/live";

export const dynamic = "force-static";

/** Every deadline and opening day on the site, as a calendar people can subscribe to. */
export function GET() {
  return new Response(toIcs("internradar deadlines", [...eventsFor(buildItems()), ...radarEvents(radar, today())].sort((a, b) => a.date.localeCompare(b.date))), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
