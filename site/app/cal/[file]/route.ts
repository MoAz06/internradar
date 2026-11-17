import { radar } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { eventsFor, radarEvents, radarKey, toIcs, type CalEvent } from "@/lib/ics";
import { today } from "@/lib/live";

export const dynamic = "force-static";
export const dynamicParams = false;

/** One small calendar file per role or radar entry that has a date, for the "Add to calendar" links. */
function files(): Map<string, CalEvent[]> {
  const out = new Map<string, CalEvent[]>();
  for (const x of buildItems()) {
    const ev = eventsFor([x]);
    if (ev.length) out.set(`${x.key}.ics`, ev);
  }
  for (const r of radar) {
    const ev = radarEvents([r], today());
    if (ev.length) out.set(`r-${radarKey(r)}.ics`, ev);
  }
  return out;
}

export function generateStaticParams() {
  return [...files().keys()].map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const ev = files().get(file) ?? [];
  return new Response(toIcs(ev[0]?.summary ?? "internradar", ev), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
