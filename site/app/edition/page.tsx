import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import NewTab from "@/components/NewTab";
import { edition } from "@/lib/edition";
import type { Item } from "@/lib/items";
import { og } from "@/lib/og";

export const metadata: Metadata = {
  title: "This week's edition",
  description: "Internship deadlines that close this week and next, and what opens soon, across Europe.",
  ...og("This week on internradar", "Internship deadlines that close this week and next, and what opens soon, across Europe.", "edition", "/edition/"),
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

function Roles({ list, empty }: { list: Item[]; empty: string }) {
  if (list.length === 0) return <p className="mt-2 text-[16px] text-muted">{empty}</p>;
  return (
    <ul className="mt-1">
      {list.map((x) => (
        <li key={x.id} className="border-t border-line py-2.5 first:border-t-0">
          <p className="text-[13px] font-semibold text-soon">{x.when}</p>
          <p className="font-display text-[17px] leading-snug font-bold">
            <Link href={`/companies/${x.slug}/`} className="hover:underline">
              {x.company}
            </Link>
            : {x.title}
          </p>
          <p className="mt-0.5 text-[15px] text-muted">
            {x.city}, {x.countryName}.{" "}
            <a href={x.source} target="_blank" rel="noreferrer" className="link">
              Posting
              <NewTab />
            </a>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function Edition() {
  const e = edition();
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <p className="text-[14px] font-bold text-claret">
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

      <div className="mt-7 grid gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-7">
          <h2 className="text-[20px] font-bold">Closing this week</h2>
          <Roles list={e.closingThis} empty="Nothing with a deadline in the next seven days." />
          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">Closing next week</h2>
          <Roles list={e.closingNext} empty="Nothing with a deadline the week after." />
        </div>
        <div className="lg:pl-7">
          <h2 className="text-[20px] font-bold">Opening soon</h2>
          <Roles list={e.opening} empty="No role is marked as opening soon." />
          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">On the radar</h2>
          <ul className="mt-1">
            {e.radarNext.map((r) => (
              <li key={r.sortKey + r.role} className="border-t border-line py-2.5 text-[16px] leading-snug first:border-t-0">
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
        </div>
      </div>
    </Section>
  );
}
