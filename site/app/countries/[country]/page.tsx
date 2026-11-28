import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import EmailSignup from "@/components/EmailSignup";
import JsonLd from "@/components/JsonLd";
import { companies } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { countryPageHref, roleHref } from "@/lib/items";
import { countryPages, inCountry, titleName, type CountryPage } from "@/lib/landing";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { breadcrumbs, itemList } from "@/lib/schema";
import { summerYear } from "@/lib/seasons";

// One page per country, built like /nl/: every role there, its cities, and what its companies say about a second
// try. The Netherlands keeps its short link, so it is not generated here.

export const dynamicParams = false;

export function generateStaticParams() {
  return countryPages()
    .filter((p) => p.code !== "NL")
    .map((p) => ({ country: p.slug }));
}

const find = (slug: string) => countryPages().find((p) => p.slug === slug && p.code !== "NL");

const describe = (p: CountryPage, year: number) =>
  `${p.items.length} tech internships and graduate roles in ${inCountry(p.name)} for summer ${year}, open or open soon, at ${p.companies} ${p.companies === 1 ? "company" : "companies"}, each with the deadline, the hiring process and the rule on applying again.`;

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }): Promise<Metadata> {
  const { country } = await params;
  const p = find(country);
  if (!p) return {};
  const year = summerYear(today());
  const title = `Tech internships in ${titleName(p)} ${year}`;
  const d = describe(p, year);
  return { title, description: d, alternates: { canonical: `/countries/${p.slug}/` }, ...og(title, d, "companies", `/countries/${p.slug}/`) };
}

function Cities({ p, className = "" }: { p: CountryPage; className?: string }) {
  if (p.cities.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {p.cities.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/cities/${c.slug}/`}
            className="inline-flex min-h-11 items-center gap-1.5 border border-line bg-surface px-3 text-[15px] hover:border-ink"
          >
            {c.city}
            <span className="text-[13px] text-dim tabular-nums">{c.items.length}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function CountryPage({ params }: { params: Promise<{ country: string }> }) {
  const { country } = await params;
  const p = find(country);
  if (!p) notFound();
  const year = summerYear(today());
  const open = p.items.filter((x) => x.status !== "soon");
  const soon = p.items.filter((x) => x.status === "soon");
  const local = new Set(companies.filter((c) => c.country === p.code).map((c) => c.slug));
  const rules = reapplyRules.filter((r) => local.has(r.slug));
  const strict = rules.filter((r) => r.group !== "welcome");
  const welcome = rules
    .filter((r) => r.group === "welcome" && !/^no rule/i.test(r.rule))
    .map((r) => r.company)
    .sort((a, b) => a.localeCompare(b));
  const others = countryPages().filter((k) => k.code !== p.code);

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd
        data={breadcrumbs([
          { name: "internradar", path: "/" },
          { name: "By country", path: "/countries/" },
          { name: p.name, path: `/countries/${p.slug}/` },
        ])}
      />
      <JsonLd data={itemList(`Tech internships and graduate roles in ${inCountry(p.name)}`, open.map((x) => roleHref(x.key)))} />
      <p className="text-[14px] font-bold text-accent">{p.name}</p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">Tech internships and graduate roles in {inCountry(p.name)}</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {describe(p, year)} Deadlines first. The company pages have the interview steps and the re-apply rule.
      </p>
      {/* on phones the list comes first, so the cities wait in the second column */}
      <Cities p={p} className="mt-4 max-lg:hidden" />

      <div className="mt-7 grid grid-cols-1 gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-7">
          <h2 className="text-[20px] font-bold">Open now ({open.length})</h2>
          <RoleList list={open} empty={`Nothing open in ${inCountry(p.name)} right now.`} />
        </div>
        <div className="lg:pl-7">
          {p.cities.length > 0 && (
            <div className="mb-7 lg:hidden">
              <h2 className="text-[20px] font-bold">By city</h2>
              <Cities p={p} className="mt-2" />
            </div>
          )}
          <h2 className="text-[20px] font-bold">Opening soon ({soon.length})</h2>
          <RoleList list={soon} empty="No role here is marked as opening soon." />

          {rules.length > 0 && (
            <div className="mt-7 border border-line bg-surface px-4 py-3.5">
              <h2 className="text-[18px] font-bold">After a rejection</h2>
              <p className="mt-1 text-[15px] leading-normal text-muted">What companies in {inCountry(p.name)} say on their own pages about a second try.</p>
              <ul className="mt-2">
                {strict.map((r) => (
                  <li key={r.slug} className="border-t border-line first:border-t-0">
                    <Link href={`/companies/${r.slug}/`} className="group block py-2 text-[15px] leading-[1.45]">
                      <span className="font-display font-bold group-hover:underline">{r.company}</span>
                      <span className="block">{r.rule}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {welcome.length > 0 && (
                <p className="mt-2 text-[15px] leading-normal text-muted">
                  {welcome.length === 1 ? welcome[0] : `${welcome.slice(0, -1).join(", ")} and ${welcome.at(-1)}`} say you can apply again.
                </p>
              )}
              <Link href="/reapply/" className="link inline-flex min-h-11 items-center text-[15px]">
                All re-apply rules
              </Link>
            </div>
          )}

          <div className="mt-7 border border-line bg-surface px-4 py-3.5">
            <h2 className="text-[18px] font-bold">Every Monday in your inbox</h2>
            <p className="mt-1 text-[15px] leading-normal text-muted">
              What closes that week and what is new in {inCountry(p.name)}, in one email. Or put every deadline here in your calendar.
            </p>
            <EmailSignup id={`${p.slug}-email`} track="country-email" edition={p.name} className="mt-3" />
            <a href={`/calendar/${p.slug}.ics`} className="link inline-flex min-h-11 items-center text-[15px]" data-track="country-calendar">
              Calendar feed for {inCountry(p.name)}
            </a>
          </div>

          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">Other countries</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
            {others.map((k) => (
              <Link key={k.code} href={countryPageHref(k.code, k.name)} className="link inline-flex min-h-11 items-center">
                {k.name}
              </Link>
            ))}
          </p>
        </div>
      </div>
    </Section>
  );
}
