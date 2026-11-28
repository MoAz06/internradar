import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import JsonLd from "@/components/JsonLd";
import { changeDays, countOf, summarise } from "@/lib/changes";
import { longDate } from "@/lib/format";
import { og } from "@/lib/og";
import { breadcrumbs } from "@/lib/schema";

// Day by day: what the night's check added, opened and closed. One page per day under /changes/<day>/.

const blurb = "Every night the list is checked against the companies' own job boards. This is what changed, day by day: roles that came on, opened, opened again or closed.";

export const metadata: Metadata = {
  title: "What changed, day by day",
  description: blurb,
  alternates: { canonical: "/changes/" },
  ...og("What changed on internradar, day by day", blurb, "edition", "/changes/"),
};

export default function ChangesPage() {
  const days = changeDays();
  const total = days.reduce((n, d) => n + countOf(d), 0);
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd data={breadcrumbs([{ name: "internradar", path: "/" }, { name: "What changed", path: "/changes/" }])} />
      <h1 className="text-[28px] leading-tight font-bold sm:text-[40px]">What changed, day by day</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {blurb} {total} changes on {days.length} days since {days.at(-1) ? longDate(days.at(-1)!.day) : "the list began"}.
      </p>
      <ul className="mt-7 border-t-2 border-ink">
        {days.map((d) => (
          <li key={d.day} className="border-b border-line">
            <Link href={`/changes/${d.day}/`} className="group grid gap-x-6 gap-y-0.5 py-3 sm:grid-cols-[220px_1fr]">
              <span className="text-[18px] font-bold group-hover:underline">{longDate(d.day)}</span>
              <span className="text-[16px] text-muted">{summarise(d)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
