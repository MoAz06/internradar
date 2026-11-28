import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import Confirmed from "@/components/Confirmed";
import EditionCountry, { type CountryOption } from "@/components/EditionCountry";
import { companies, countries } from "@/data/companies";
import { edition } from "@/lib/edition";
import type { Item } from "@/lib/items";
import { og } from "@/lib/og";

export const metadata: Metadata = {
  title: "Tech internships closing this week in Europe",
  description: "Internship deadlines that close this week and next, and what opens soon, across Europe. A new edition every Monday.",
  alternates: { canonical: "/edition/" },
  ...og("This week on internradar", "Internship deadlines that close this week and next, and what opens soon, across Europe.", "edition", "/edition/"),
};

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-22" -> "Sunday 22 Nov". A date and not "tomorrow", so it is still right the day after the build. */
const dayHeading = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${weekdays[new Date(`${iso}T12:00:00Z`).getUTCDay()]} ${d} ${months[m - 1]}`;
};

/** The roles under a heading for each day they close on. */
function ByDay({ list, empty }: { list: Item[]; empty: string }) {
  if (list.length === 0) return <RoleList list={list} empty={empty} />;
  const days = [...new Set(list.map((x) => x.closes!))].sort();
  return days.map((d) => (
    <div key={d} data-day>
      <h3 className="mt-4 border-b border-line pb-1 font-sans text-[14px] font-bold text-soon">Closes {dayHeading(d)}</h3>
      <RoleList list={list.filter((x) => x.closes === d)} empty="" showWhen={false} fullHow />
    </div>
  ));
}

/** Shown in a section when the country picked has nothing in it. */
const None = () => (
  <p data-none hidden className="mt-2 text-[16px] text-muted">
    Nothing here for this country.
  </p>
);

export default function Edition() {
  const e = edition();
  const countryOf = (slug: string) => companies.find((c) => c.slug === slug)?.country ?? "";
  // the countries with something on the page, the Netherlands first, then the most roles
  const roles = [...e.closingThis, ...e.closingNext, ...e.opening];
  const options: CountryOption[] = countries
    .map((k) => ({ code: k.code, slug: k.slug, name: k.name, n: roles.filter((x) => x.country === k.code).length }))
    .filter((o) => o.n > 0)
    .sort((a, b) => (a.code === "NL" ? -1 : b.code === "NL" ? 1 : b.n - a.n || a.name.localeCompare(b.name)));
  return (
    <Section id="edition" className="pt-8 pb-16 sm:pt-10">
      <Confirmed />
      <p className="text-[14px] font-bold text-accent">
        Week {e.week}, {e.year}
      </p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">{e.title}</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        What closes this week and next, what opens soon, and what&apos;s on the radar. This page changes every night.
        Follow it with the{" "}
        <a href="/feed.xml" className="link">
          RSS feed
        </a>
        , or put the dates in{" "}
        <Link href="/calendar/" className="link">
          your calendar
        </Link>
        .
      </p>
      <EditionCountry options={options} total={roles.length} />

      <div className="mt-7 grid grid-cols-1 gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-7">
          <section data-sec>
            <h2 className="text-[20px] font-bold">Closing this week</h2>
            <ByDay list={e.closingThis} empty="Nothing with a deadline in the next seven days." />
            <None />
          </section>
          <section data-sec>
            <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">Closing next week</h2>
            <ByDay list={e.closingNext} empty="Nothing with a deadline the week after." />
            <None />
          </section>
        </div>
        <div className="lg:pl-7">
          <section data-sec>
            <h2 className="text-[20px] font-bold">Opening soon</h2>
            <RoleList list={e.opening} empty="No role is marked as opening soon." fullHow />
            <None />
          </section>
          <section data-sec>
            <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">On the radar</h2>
            <ul data-radar className="mt-1">
              {e.radarAll.map((r, i) => (
                <li
                  key={r.sortKey + r.role}
                  data-c={countryOf(r.slug)}
                  hidden={i >= 8}
                  className="border-t border-line py-2.5 text-[16px] leading-snug first:border-t-0"
                >
                  <span className="font-semibold">{r.opens}</span>
                  {", "}
                  <Link href={`/companies/${r.slug}/`} className="link">
                    {r.company}
                  </Link>
                  {", "}
                  {r.role}
                </li>
              ))}
            </ul>
            <None />
          </section>
        </div>
      </div>
      <p className="mt-10 border-t border-line pt-4 text-[16px] text-muted">
        Missing a company, or something unclear on this page?{" "}
        <Link href="/feedback/?from=/edition/" className="link">
          Tell me
        </Link>
        .
      </p>
    </Section>
  );
}
