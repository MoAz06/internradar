import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import JsonLd from "@/components/JsonLd";
import { countryPageHref } from "@/lib/items";
import { countryPages } from "@/lib/landing";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { breadcrumbs, itemList } from "@/lib/schema";
import { summerYear } from "@/lib/seasons";

// Every country on the list with a page of its own, most roles first.

const describe = (n: number, year: number) =>
  `Tech internships and graduate roles for summer ${year} in ${n} European countries, with the deadline, the hiring process and the rule on applying again, one page per country.`;

export function generateMetadata(): Metadata {
  const year = summerYear(today());
  const title = `Tech internships in Europe by country, ${year}`;
  const d = describe(countryPages().length, year);
  return { title, description: d, alternates: { canonical: "/countries/" }, ...og(title, d, "companies", "/countries/") };
}

export default function CountriesPage() {
  const year = summerYear(today());
  const pages = countryPages();
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd
        data={breadcrumbs([
          { name: "internradar", path: "/" },
          { name: "By country", path: "/countries/" },
        ])}
      />
      <JsonLd data={itemList("Tech internships in Europe by country", pages.map((p) => countryPageHref(p.code, p.name)))} />
      <h1 className="text-[28px] leading-tight font-bold sm:text-[40px]">Tech internships in Europe, by country</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">{describe(pages.length, year)}</p>
      <ul className="mt-7 border-t-2 border-ink">
        {pages.map((p) => {
          const open = p.items.filter((x) => x.status !== "soon").length;
          const soon = p.items.length - open;
          return (
            <li key={p.code} className="border-b border-line">
              <Link href={countryPageHref(p.code, p.name)} className="group grid gap-x-6 gap-y-1 py-3.5 sm:grid-cols-[220px_1fr]">
                <span className="text-[20px] font-bold group-hover:underline">{p.name}</span>
                <span className="text-[16px] leading-[1.5] text-muted">
                  {open} open{soon > 0 ? `, ${soon} opening soon` : ""}, at {p.companies} {p.companies === 1 ? "company" : "companies"}
                  {p.cities.length > 0 ? `. ${p.cities.map((c) => c.city).join(", ")}.` : "."}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-[16px] leading-[1.5] text-muted">A country is here once one of its roles is open or opens soon.</p>
    </Section>
  );
}
