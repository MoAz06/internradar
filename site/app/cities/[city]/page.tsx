import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import { cityPages } from "@/lib/landing";
import { og } from "@/lib/og";

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
  const open = p.items.filter((x) => x.status !== "soon");
  const soon = p.items.filter((x) => x.status === "soon");
  const others = cityPages().filter((x) => x.slug !== p.slug);
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <p className="text-[14px] font-bold text-accent">{p.countryName}</p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">Tech internships and graduate roles in {p.city}</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {describe(p.city, p.items.length, p.companies)} Deadlines first. The company pages have the interview steps and the
        re-apply rule.
      </p>
      <div className="mt-7 grid gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-7">
          <h2 className="text-[20px] font-bold">Open now ({open.length})</h2>
          <RoleList list={open} empty={`Nothing open in ${p.city} right now.`} />
        </div>
        <div className="lg:pl-7">
          <h2 className="text-[20px] font-bold">Opening soon ({soon.length})</h2>
          <RoleList list={soon} empty="No role here is marked as opening soon." />
          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">Other cities</h2>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[15px]">
            {others.map((x) => (
              <Link key={x.slug} href={`/cities/${x.slug}/`} className="link">
                {x.city}
              </Link>
            ))}
          </p>
        </div>
      </div>
    </Section>
  );
}
