import type { MetadataRoute } from "next";
import { companies, lastChecked } from "@/data/companies";
import { cityPages, fieldPages } from "@/lib/landing";
import { rolePages } from "@/lib/rolePages";
import { roleHref } from "@/lib/items";
import { universities } from "@/lib/universities";

export const dynamic = "force-static";

const site = "https://internradar.eu";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/edition/", "/radar/", "/reapply/", "/share/", "/alerts/", "/calendar/", "/companies/", "/pay/", "/stats/", "/for/", "/nl/", "/poster/", "/feedback/", "/about/", "/privacy/"].map((p) => ({
    url: `${site}${p}`,
    lastModified: lastChecked,
    changeFrequency: p === "/" || p === "/edition/" ? ("daily" as const) : ("weekly" as const),
  }));
  const perCompany = companies.map((c) => ({
    url: `${site}/companies/${c.slug}/`,
    lastModified: c.sources.map((s) => s.checked).sort().at(-1) ?? lastChecked,
    changeFrequency: "weekly" as const,
  }));
  const landing = [...cityPages().map((p) => `/cities/${p.slug}/`), ...fieldPages().map((p) => `/fields/${p.slug}/`), ...universities.map((u) => `/for/${u.slug}/`)].map((p) => ({
    url: `${site}${p}`,
    lastModified: lastChecked,
    changeFrequency: "weekly" as const,
  }));
  // closed roles keep their page for old links, but aren't offered to search engines
  const perRole = rolePages()
    .filter((p) => p.item.status !== "closed")
    .map((p) => ({ url: `${site}${roleHref(p.item.key)}`, lastModified: p.role.checked, changeFrequency: "weekly" as const }));
  return [...pages, ...landing, ...perCompany, ...perRole];
}
