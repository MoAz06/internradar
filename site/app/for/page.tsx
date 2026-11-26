import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import { countries } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { og } from "@/lib/og";
import { rolesFor, universities } from "@/lib/universities";

const blurb = "Tech internships near your university, deadlines first, and a free list your study association can put on its own site.";

export const metadata: Metadata = {
  title: "Near your university",
  description: blurb,
  alternates: { canonical: "/for/" },
  ...og("Tech internships near your university", blurb, "companies", "/for/"),
};

export default function UniversitiesPage() {
  const items = buildItems();
  const byCountry = countries.map((k) => ({ k, unis: universities.filter((u) => u.country === k.code) })).filter((g) => g.unis.length);
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[860px]">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[36px]">Near your university</h1>
        <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
          The tech roles you can reach from your university, deadlines first. Each page also has two lines of code that put the list on a study
          association&apos;s own site, a square image of the week and a poster.
        </p>
        {byCountry.map(({ k, unis }) => (
          <section key={k.code} aria-labelledby={`c-${k.slug}`} className="mt-8">
            <h2 id={`c-${k.slug}`} className="border-t-2 border-ink pt-2.5 text-[20px] font-bold">
              {k.name}
            </h2>
            <ul className="mt-1">
              {unis.map((u) => {
                const f = rolesFor(u, items);
                const n = f.roles.filter((x) => x.status === "open" || x.status === "rolling").length;
                return (
                  <li key={u.slug} className="flex items-baseline justify-between gap-4 border-b border-line">
                    <Link href={`/for/${u.slug}/`} className="link inline-flex min-h-11 items-center text-[16px]">
                      {u.name}
                    </Link>
                    <span className="font-sans text-[14px] text-muted tabular-nums">{f.wide ? `${n} open ${f.where}` : `${n} open`}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Section>
  );
}
