import type { MetadataRoute } from "next";
import { companies, lastChecked } from "@/data/companies";

export const dynamic = "force-static";

const site = "https://internradar.eu";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/edition/", "/radar/", "/reapply/", "/share/", "/alerts/", "/calendar/", "/companies/", "/about/"].map((p) => ({
    url: `${site}${p}`,
    lastModified: lastChecked,
    changeFrequency: p === "/" || p === "/edition/" ? ("daily" as const) : ("weekly" as const),
  }));
  const perCompany = companies.map((c) => ({
    url: `${site}/companies/${c.slug}/`,
    lastModified: c.sources.map((s) => s.checked).sort().at(-1) ?? lastChecked,
    changeFrequency: "weekly" as const,
  }));
  return [...pages, ...perCompany];
}
