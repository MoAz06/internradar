import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import JsonLd from "@/components/JsonLd";
import { companies } from "@/data/companies";
import { longDate } from "@/lib/format";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { breadcrumbs } from "@/lib/schema";
import { firstSeen, seasonOf, summerYear } from "@/lib/seasons";

// When each company's first role of the season went up. This season it is a record; next season it is the best
// guess anyone has for when a company opens, because the dates come from the job boards and the nightly check,
// not from memory.

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (day: string) => `${months[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;

export function generateMetadata(): Metadata {
  const year = summerYear(today());
  const title = `When do tech internship applications open? Dates per company, ${year}`;
  const d = `The day each company's first internship or graduate role for ${year} went up, from its own job board or the nightly check. Sorted by date, so you see who opens early and who opens late.`;
  return { title, description: d, alternates: { canonical: "/opening-dates/" }, ...og(title, d, "stats", "/opening-dates/") };
}

export default function OpeningDatesPage() {
  const now = today();
  const season = seasonOf(now);
  const year = summerYear(now);
  const rows = companies
    .flatMap((c) => {
      const f = firstSeen(c).get(season);
      return f ? [{ slug: c.slug, company: c.name, country: c.country, ...f }] : [];
    })
    .sort((a, b) => a.day.localeCompare(b.day) || a.company.localeCompare(b.company));
  const byMonth = new Map<string, typeof rows>();
  for (const r of rows) byMonth.set(monthOf(r.day), [...(byMonth.get(monthOf(r.day)) ?? []), r]);
  const fromBoards = rows.filter((r) => r.from === "board").length;
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd data={breadcrumbs([{ name: "internradar", path: "/" }, { name: "Opening dates", path: "/opening-dates/" }])} />
      <h1 className="text-[28px] leading-tight font-bold sm:text-[40px]">When do applications open? Dates per company</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        The day each company&apos;s first role for {year} went up: {rows.length} companies so far, {fromBoards} of them dated by their own job board and the
        rest by the night the role was first seen open. Companies hire at the same time every year, so this is the calendar for next season too.
        Programmes that have not opened yet are on the{" "}
        <Link href="/radar/" className="link">
          radar
        </Link>
        .
      </p>
      {[...byMonth].map(([month, list]) => (
        <section key={month} className="mt-8">
          <h2 className="border-t-2 border-ink pt-3 text-[20px] font-bold">
            {month} <span className="text-[16px] font-normal text-muted">({list.length})</span>
          </h2>
          <ul className="mt-1">
            {list.map((r) => (
              <li key={r.slug} className="grid gap-x-6 gap-y-0.5 border-b border-line py-2.5 text-[16px] leading-[1.5] sm:grid-cols-[150px_1fr]">
                <span className="font-sans text-[14px] text-muted tabular-nums">{longDate(r.day)}</span>
                <span>
                  <Link href={`/companies/${r.slug}/`} className="link font-semibold">
                    {r.company}
                  </Link>
                  : {r.title}
                  <span className="text-muted">{r.from === "board" ? ", posted that day" : ", first seen open that day"}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Section>
  );
}
