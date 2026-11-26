import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import RoleFinder from "@/components/RoleFinder";
import { countries } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { citiesOf } from "@/lib/landing";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { startView } from "@/lib/rows";
import { rolesFor, universities } from "@/lib/universities";

export const dynamicParams = false;

export function generateStaticParams() {
  return universities.map((u) => ({ uni: u.slug }));
}

const find = (slug: string) => universities.find((u) => u.slug === slug);

export async function generateMetadata({ params }: { params: Promise<{ uni: string }> }): Promise<Metadata> {
  const u = find((await params).uni);
  if (!u) return {};
  const title = `Tech internships near ${u.name}`;
  const description = `Tech internships and graduate roles you can reach from ${u.city}, deadlines first, each with the company's hiring steps and pay.`;
  return { title, description, alternates: { canonical: `/for/${u.slug}/` }, ...og(title, description, "companies", `/for/${u.slug}/`) };
}

export default async function UniversityPage({ params }: { params: Promise<{ uni: string }> }) {
  const u = find((await params).uni);
  if (!u) notFound();
  const now = today();
  const every = buildItems(now);
  const near = new Set(u.near);
  // the closed ones too, so "All, also closed" in the filters works here as on the front page
  const { all: items, roles: current, wide } = rolesFor(u, every);
  const cities = [...new Set(current.flatMap((x) => citiesOf(x.city).filter((c) => near.has(c.slug)).map((c) => c.city)))];
  const country = countries.find((k) => k.code === u.country)!;
  const options = countries
    .map((k) => ({ code: k.code, name: k.name, slug: k.slug, count: every.filter((x) => x.country === k.code).length }))
    .filter((k) => k.count > 0);
  const ref = u.associations[0]?.ref ?? "embed";
  const snippet = `<div data-internradar="${u.slug}" data-ref="${ref}"><a href="https://internradar.eu/for/${u.slug}/?ref=${ref}">Tech internships near ${u.name}</a></div>\n<script src="https://internradar.eu/embed.js" async></script>`;
  const others = universities.filter((x) => x.country === u.country && x.slug !== u.slug);
  const open = current.filter((x) => x.status === "open" || x.status === "rolling").length;
  const soon = current.filter((x) => x.status === "soon").length;
  const count = `${open} open${soon ? ` and ${soon} opening soon` : ""}`;

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <p className="text-[14px] font-bold text-accent">
        {u.city}, {country.name}
      </p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">Tech internships near {u.name}</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {wide ? (
          <>
            The list has few roles within reach of {u.city} so far, so this is all of {country.name}: tech internships, graduate and thesis
            roles, {count}. Deadlines first. The company pages have the interview steps and the re-apply rule.
          </>
        ) : (
          <>
            Tech internships, graduate and thesis roles you can reach from {u.city}
            {cities.length ? `, in ${cities.slice(0, 6).join(", ")}${cities.length > 6 ? " and more" : ""}` : ""}. {count}, deadlines first. The
            company pages have the interview steps and the re-apply rule.{" "}
            <Link href={`/?country=${country.slug}`} className="link">
              Everything in {country.name}
            </Link>
            .
          </>
        )}
      </p>
      <div className="mt-7 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <div className="min-w-0">
          <RoleFinder view={startView(items, now)} countries={options} now={now} scope={{ place: `near ${u.name}`, keys: items.map((x) => x.key) }} />
        </div>
        <aside className="max-lg:mt-10">
          <section aria-labelledby="for-associations">
            <h2 id="for-associations" className="border-t-2 border-ink pt-2.5 font-sans text-[13px] font-bold text-accent">
              For study associations
            </h2>
            <p className="mt-2 text-[15px] leading-[1.55]">
              Put this list on your own site. Paste these two lines where it should go. It updates every night, sets no cookies and costs nothing.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-md border border-line bg-surface p-3 font-mono text-[12px] leading-[1.5] whitespace-pre-wrap break-all">
              <code>{snippet}</code>
            </pre>
            <p className="mt-3 text-[15px] leading-[1.55]">
              <a href={`/week/near-${u.slug}.png`} className="link" download>
                This week as a square image
              </a>{" "}
              for Instagram, LinkedIn or your group chat. It is made again every night.
            </p>
            <p className="mt-2 text-[15px] leading-[1.55]">
              <Link href={`/poster/?country=${country.slug}&ref=${ref}`} className="link">
                A poster for your notice board
              </Link>
              , with a QR code.
            </p>
          </section>
          {others.length > 0 && (
            <section aria-labelledby="other-unis" className="mt-8">
              <h2 id="other-unis" className="border-t-2 border-ink pt-2.5 font-sans text-[13px] font-bold text-accent">
                Other universities in {country.name}
              </h2>
              <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
                {others.map((x) => (
                  <Link key={x.slug} href={`/for/${x.slug}/`} className="link inline-flex min-h-11 items-center">
                    {x.name}
                  </Link>
                ))}
              </p>
            </section>
          )}
        </aside>
      </div>
    </Section>
  );
}
