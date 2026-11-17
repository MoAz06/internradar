import { countries } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { eventsFor, toIcs } from "@/lib/ics";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return countries.map((k) => ({ file: `${k.slug}.ics` }));
}

/** The same calendar, one file per country. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const k = countries.find((x) => `${x.slug}.ics` === file)!;
  const events = eventsFor(buildItems().filter((x) => x.country === k.code));
  return new Response(toIcs(`internradar deadlines, ${k.name}`, events), {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
}
