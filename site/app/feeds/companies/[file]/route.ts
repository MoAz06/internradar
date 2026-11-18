import { companies } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { feedEntries, rss, rssHeaders } from "@/lib/feeds";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return companies.map((c) => ({ file: `${c.slug}.xml` }));
}

/** New roles at one company. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const c = companies.find((x) => `${x.slug}.xml` === file)!;
  const mine = buildItems().filter((i) => i.slug === c.slug);
  const n = mine.filter((i) => i.status !== "closed").length;
  return new Response(
    rss({
      title: `internradar, ${c.name}`,
      path: `/feeds/companies/${file}`,
      page: `/companies/${c.slug}/`,
      description: `New tech internships and graduate roles at ${c.name} in ${c.city}.`,
      entries: feedEntries(mine),
      start: `Following ${c.name}: ${n} ${n === 1 ? "role" : "roles"} open or opening soon`,
    }),
    rssHeaders,
  );
}
