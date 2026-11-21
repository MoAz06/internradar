import type { Metadata } from "next";
import Poster, { type PosterData } from "@/components/Poster";
import { companies, countries } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { buildItems } from "@/lib/buildItems";
import type { Item } from "@/lib/items";
import { today } from "@/lib/live";
import { og } from "@/lib/og";

// One A4 sheet per country for a notice board or a group chat: what closes first, what opens next, and a QR code
// to the list. Study associations print it or send it as a PDF; ?ref= in the QR code tells where visitors came from.

const description = "A one-page poster with the tech internship deadlines in your country and a QR code to the list. Print it or send it as a PDF.";

export const metadata: Metadata = {
  title: "Poster",
  description,
  alternates: { canonical: "/poster/" },
  ...og("A poster with the deadlines", description, "home", "/poster/"),
};

const plural: Record<Item["kind"], [string, string]> = {
  Internship: ["internship", "internships"],
  Graduate: ["graduate role", "graduate roles"],
  Thesis: ["thesis project", "thesis projects"],
};

/** The title without the company name in front, as on the preview images. */
const titleOf = (x: Item) => {
  const t = x.title.startsWith(`${x.company} `) ? x.title.slice(x.company.length + 1).replace(/^[-:,]\s*/, "") : x.title;
  return t.replace(/\s+-\s+/g, ", ");
};

/** "2027-01" or "2027-01-04" -> "Jan 2027" or "4 Jan" */
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const opensText = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return d ? `${d} ${months[m - 1]}` : `${months[m - 1]} ${y}`;
};

/**
 * Names students look for, per country, shown first in the big line when they have open roles. A choice made by hand
 * for the countries the poster goes round in most; other countries get the companies hiring in the most countries.
 */
const known: Record<string, string[]> = {
  NL: ["ASML", "Google", "Microsoft", "Tesla", "Philips", "Picnic", "Shell", "KLM", "Booking.com", "ING", "Rabobank", "Adyen", "bol"],
};

function dataFor(code: string, name: string, slug: string, items: Item[]): PosterData {
  const here = items.filter((x) => x.country === code && x.status !== "closed");
  const open = here.filter((x) => x.status === "open" || x.status === "rolling");
  const withDeadline = here.filter((x) => x.status === "open" && x.closes && (x.daysLeft ?? 0) >= 0);

  // one row per company, deadline and kind: ESA's 21 internships that close the same day are one line, and so is
  // Lloyds' one graduate scheme in three cities
  const groups = new Map<string, Item[]>();
  for (const x of withDeadline) {
    const k = `${x.closes}|${x.company}|${x.kind}`;
    groups.set(k, [...(groups.get(k) ?? []), x]);
  }
  const rows = [...groups]
    .map(([key, g]) => {
      const titles = new Set(g.map(titleOf));
      const cities = [...new Set(g.map((x) => x.city))];
      return {
        key,
        n: g.length,
        closes: g[0].closes!,
        company: g[0].company,
        what: titles.size === 1 ? titleOf(g[0]) : `${g.length} ${plural[g[0].kind][1]}`,
        city: cities.length === 1 ? cities[0] : cities.length === 2 ? cities.join(" and ") : "several cities",
      };
    })
    .sort((a, b) => a.closes.localeCompare(b.closes) || a.company.localeCompare(b.company));

  const seen = new Set<string>();
  const soon = here
    .filter((x) => x.status === "soon" && x.opens)
    .sort((a, b) => a.opens!.localeCompare(b.opens!))
    .filter((x) => !seen.has(x.company) && !!seen.add(x.company))
    .map((x) => ({ company: x.company, what: titleOf(x), opens: opensText(x.opens!) }));

  // the rest that is open: rolling, or no deadline given
  const rest = here.filter((x) => (x.status === "open" || x.status === "rolling") && !withDeadline.includes(x));
  // the big line: known names first, then the companies that hire in the most countries
  const everywhere = new Map<string, Set<string>>();
  for (const x of items) if (x.status === "open" || x.status === "rolling") everywhere.set(x.company, (everywhere.get(x.company) ?? new Set()).add(x.country));
  const hiring = [...new Set(open.map((x) => x.company))];
  const pick = known[code] ?? [];
  const names = [
    ...pick.filter((n) => hiring.includes(n)),
    ...hiring.filter((n) => !pick.includes(n)).sort((a, b) => everywhere.get(b)!.size - everywhere.get(a)!.size || a.localeCompare(b)),
  ];

  // for a country with few deadlines: roles at the names above, in the same order, one per company, newest first
  const rank = (x: Item) => names.indexOf(x.company);
  const used = new Set<string>();
  const fill = [...rest]
    .sort((a, b) => rank(a) - rank(b) || b.added.localeCompare(a.added))
    .filter((x) => !used.has(x.company) && !!used.add(x.company))
    .slice(0, 7)
    .map((x) => ({ key: x.id, n: 1, closes: "", company: x.company, what: titleOf(x), city: x.city }));

  const shellHere = companies.some((c) => c.slug === "shell" && c.country === code) && reapplyRules.some((r) => r.slug === "shell" && r.group === "wait");
  return {
    code,
    name,
    path: code === "NL" ? "/nl/" : `/?country=${slug}`,
    shown: code === "NL" ? "internradar.eu/nl" : "internradar.eu",
    open: open.length,
    companies: new Set(open.map((x) => x.slug)).size,
    rows,
    fill,
    soon,
    names,
    hook: shellHere ? "Rejected by Shell? Apply again within 10 months and it's turned down automatically." : "",
  };
}

export default function PosterPage() {
  const items = buildItems();
  const list = countries
    .map((k) => dataFor(k.code, k.name, k.slug, items))
    .filter((d) => d.open > 0)
    .sort((a, b) => (a.code === "NL" ? -1 : b.code === "NL" ? 1 : b.open - a.open));
  return (
    // no Section: on paper the sheet needs the whole page, without its padding
    <div className="mx-auto max-w-[1200px] px-4 pt-8 pb-16 sm:px-6 sm:pt-10 print:max-w-none print:p-0">
      <Poster list={list} updated={today()} />
    </div>
  );
}
