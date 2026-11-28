import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import JsonLd from "@/components/JsonLd";
import { changeDays, summarise, type DayChanges } from "@/lib/changes";
import { longDate } from "@/lib/format";
import { og } from "@/lib/og";
import { breadcrumbs } from "@/lib/schema";

// One day of changes: what the night's check added, opened and closed.

export const dynamicParams = false;

type Params = { day: string };

export function generateStaticParams(): Params[] {
  return changeDays().map((d) => ({ day: d.day }));
}

const find = (day: string) => changeDays().find((d) => d.day === day);

const describe = (d: DayChanges) =>
  `Tech internships and graduate roles in Europe on ${longDate(d.day)}: ${summarise(d)}. From the nightly check against the companies' own job boards.`;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { day } = await params;
  const d = find(day);
  if (!d) return {};
  const title = `What changed on ${longDate(d.day)}: ${summarise(d)}`;
  return { title, description: describe(d), alternates: { canonical: `/changes/${d.day}/` }, ...og(title, describe(d), "edition", `/changes/${d.day}/`) };
}

function Block({ title, items, empty }: { title: string; items: DayChanges["added"]; empty?: boolean }) {
  if (items.length === 0 && !empty) return null;
  return (
    <div>
      <h2 className="text-[20px] font-bold">
        {title} ({items.length})
      </h2>
      <RoleList list={items} empty="Nothing." />
    </div>
  );
}

export default async function ChangeDayPage({ params }: { params: Promise<Params> }) {
  const { day } = await params;
  const d = find(day);
  if (!d) notFound();
  const days = changeDays();
  const i = days.findIndex((x) => x.day === d.day);
  const newer = days[i - 1];
  const older = days[i + 1];
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd
        data={breadcrumbs([
          { name: "internradar", path: "/" },
          { name: "What changed", path: "/changes/" },
          { name: longDate(d.day), path: `/changes/${d.day}/` },
        ])}
      />
      <p className="text-[14px] font-bold text-accent">
        <Link href="/changes/" className="hover:underline">
          What changed
        </Link>
      </p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">{longDate(d.day)}</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {summarise(d)}. {describe(d).split(": ")[0].replace(/^Tech/, "Counted over the tech")}, from the nightly check against the companies&apos; own job boards.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 text-[15px]">
        {older && (
          <Link href={`/changes/${older.day}/`} className="link inline-flex min-h-11 items-center">
            ← {longDate(older.day)}
          </Link>
        )}
        {newer && (
          <Link href={`/changes/${newer.day}/`} className="link inline-flex min-h-11 items-center">
            {longDate(newer.day)} →
          </Link>
        )}
      </p>
      <div className="mt-7 grid grid-cols-1 gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-x-10">
        <div className="space-y-8">
          <Block title="New on the list" items={d.added} />
          <Block title="Opened" items={d.opened} />
          <Block title="Open again" items={d.reopened} />
        </div>
        <div className="space-y-8">
          <Block title="Closed" items={d.closed} />
        </div>
      </div>
    </Section>
  );
}
