// Structured data for search engines, beyond the JobPosting on each role page: where a page sits in the site
// (BreadcrumbList), what a list page lists (ItemList), what the site is (WebSite, Organization) and the open data
// (Dataset). Each function returns a schema.org object; JsonLd (components/JsonLd.tsx) puts it on the page.

import { lastChecked, links } from "../data/companies.ts";
import { seasonOf } from "./seasons.ts";

export const site = "https://internradar.eu";

/** The JSON for a script tag: a "<" inside a value must not end the tag early. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: `${site}${t.path}` })),
  };
}

/** The pages a list page links to, in its order. Capped, so a country with 250 roles doesn't carry 250 entries. */
export function itemList(name: string, paths: string[], cap = 100) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: paths.length,
    itemListElement: paths.slice(0, cap).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${site}${p}` })),
  };
}

/** The site and who runs it, for the front page. */
export function siteGraph(description: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${site}/#website`, name: "internradar", url: `${site}/`, description, inLanguage: "en", publisher: { "@id": `${site}/#organization` } },
      {
        "@type": "Organization",
        "@id": `${site}/#organization`,
        name: "internradar",
        url: `${site}/`,
        logo: `${site}/icons/icon-192.png`,
        sameAs: [links.repo, links.linkedin],
      },
    ],
  };
}

/** The open roles as a dataset: the same rows as /open-roles.json and /open-roles.csv, rebuilt every night. */
export function dataset(counts: { roles: number; companies: number; countries: number }, now: string) {
  const season = seasonOf(now);
  const start = season.slice(0, 4);
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${site}/open-roles.json#dataset`,
    name: `Tech internships and graduate roles in Europe, ${season} season`,
    description: `${counts.roles} internships, graduate roles and thesis projects in software, data and AI, quant, and hardware at ${counts.companies} companies in ${counts.countries} European countries, open or opening soon, with the deadline, the posting link, the stated pay, the named online tests and whether the role asks for work rights or a security clearance. Every fact comes from the company's own careers pages. Rebuilt every night.`,
    url: `${site}/stats/`,
    keywords: ["internships", "graduate jobs", "software engineering", "Europe", "hiring process", "deadlines"],
    license: "https://opensource.org/license/mit",
    isAccessibleForFree: true,
    creator: { "@id": `${site}/#organization` },
    dateModified: lastChecked,
    temporalCoverage: `${start}-06-01/${Number(start) + 1}-05-31`,
    spatialCoverage: "Europe",
    distribution: [
      { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${site}/open-roles.json` },
      { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${site}/open-roles.csv` },
    ],
  };
}
