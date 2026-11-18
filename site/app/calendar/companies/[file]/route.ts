import { companies } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { eventsFor, toIcs } from "@/lib/ics";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return companies.map((c) => ({ file: `${c.slug}.ics` }));
}

/** Deadlines and opening days at one company. Empty until a posting names a date; the subscription keeps working. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const c = companies.find((x) => `${x.slug}.ics` === file)!;
  const events = eventsFor(buildItems().filter((x) => x.slug === c.slug));
  return new Response(toIcs(`internradar, ${c.name}`, events), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
