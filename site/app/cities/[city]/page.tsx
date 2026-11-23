import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import RoleFinder from "@/components/RoleFinder";
import { countries } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { cityPages, citiesOf } from "@/lib/landing";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { startView } from "@/lib/rows";

export const dynamicParams = false;

export function generateStaticParams() {
  return cityPages().map((p) => ({ city: p.slug }));
}

const describe = (city: string, n: number, m: number) =>
  `${n} tech internships and graduate roles in ${city} that are open or open soon, at ${m} ${m === 1 ? "company" : "companies"}, each with the hiring process.`;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const p = cityPages().find((x) => x.slug === city);
  if (!p) return {};
  const title = `Tech internships in ${p.city}`;
  return { title, description: describe(p.city, p.items.length, p.companies), ...og(title, describe(p.city, p.items.length, p.companies), "companies", `/cities/${p.slug}/`) };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const p = cityPages().find((x) => x.slug === city);
  if (!p) notFound();
  const now = today();
  const every = buildItems(now);
  // the closed ones too, so "All, also closed" in the filters works here as on the front page
  const items = every.filter((x) => citiesOf(x.city).some((c) => c.slug === p.slug));
  // there is no country menu here; the names are for the profile in the filters
  const options = countries
    .map((k) => ({ code: k.code, name: k.name, slug: k.slug, count: every.filter((x) => x.country === k.code).length }))
    .filter((k) => k.count > 0);
  const others = cityPages().filter((x) => x.slug !== p.slug);
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <p className="text-[14px] font-bold text-accent">{p.countryName}</p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">Tech internships and graduate roles in {p.city}</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {describe(p.city, p.items.length, p.companies)} Deadlines first. The company pages have the interview steps and the
        re-apply rule.
      </p>
      <div className="mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
        <div className="min-w-0">
          <RoleFinder view={startView(items, now)} countries={options} now={now} scope={{ place: p.city, keys: items.map((x) => x.key) }} />
        </div>
        <section aria-labelledby="other-cities" className="max-lg:mt-10">
          <h2 id="other-cities" className="border-t-2 border-ink pt-2.5 font-sans text-[13px] font-bold text-accent">
            Other cities
          </h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
            {others.map((x) => (
              <Link key={x.slug} href={`/cities/${x.slug}/`} className="link inline-flex min-h-11 items-center">
                {x.city}
              </Link>
            ))}
          </p>
        </section>
      </div>
    </Section>
  );
}
