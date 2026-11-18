import { countries } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { feedEntries, rss, rssHeaders } from "@/lib/feeds";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ file: "new.xml" }, ...countries.map((k) => ({ file: `${k.slug}.xml` }))];
}

/** New roles on the whole list (new.xml), or in one country. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const items = buildItems();
  if (file === "new.xml") {
    const n = items.filter((i) => i.status !== "closed").length;
    return new Response(
      rss({
        title: "internradar, new roles",
        path: "/feeds/new.xml",
        page: "/",
        description: "Tech internships and graduate roles in Europe, as they're added to the list or open.",
        entries: feedEntries(items),
        start: `Following the whole list: ${n} roles open or opening soon`,
      }),
      rssHeaders,
    );
  }
  const k = countries.find((c) => `${c.slug}.xml` === file)!;
  const mine = items.filter((i) => i.country === k.code);
  const n = mine.filter((i) => i.status !== "closed").length;
  return new Response(
    rss({
      title: `internradar, new roles in ${k.name}`,
      path: `/feeds/${file}`,
      page: `/#${k.slug}`,
      description: `Tech internships and graduate roles in ${k.name}, as they're added to the list or open.`,
      entries: feedEntries(mine),
      start: `Following ${k.name}: ${n} ${n === 1 ? "role" : "roles"} open or opening soon`,
    }),
    rssHeaders,
  );
}
