import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import { companies, countries } from "@/data/companies";
import { live } from "@/lib/live";
import { og } from "@/lib/og";
import { cityPages, fieldPages, fieldTitle } from "@/lib/landing";

export const metadata: Metadata = {
  title: "All companies",
  description: "Every company on internradar, by country, with its open roles and hiring process.",
  ...og("All companies on internradar", "Every company on internradar, by country, with its open roles and hiring process.", "companies", "/companies/"),
};

export default function Companies() {
  return (
    <>
      <Section className="pt-10 pb-6 sm:pt-14">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]">All companies</h1>
        <p className="mt-2 text-[15px] text-muted">
          {companies.length} companies in {countries.filter((k) => companies.some((c) => c.country === k.code)).length}{" "}
          countries. Each page has the roles, the process as the company describes it, the re-apply rule and the sources.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[15px]">
          <span className="font-semibold">Roles by city:</span>
          {cityPages().map((p) => (
            <Link key={p.slug} href={`/cities/${p.slug}/`} className="link">
              {p.city}
            </Link>
          ))}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[15px]">
          <span className="font-semibold">Roles by field:</span>
          {fieldPages().map((p) => (
            <Link key={p.slug} href={`/fields/${p.slug}/`} className="link">
              {fieldTitle[p.field]}
            </Link>
          ))}
        </p>
      </Section>
      <Section className="pb-16">
        <div className="space-y-8">
          {countries.map((k) => {
            const here = [...companies.filter((c) => c.country === k.code)].sort((a, b) => a.name.localeCompare(b.name));
            if (!here.length) return null;
            return (
              <div key={k.code} id={k.slug}>
                <h2 className="mb-2 border-b border-line pb-1.5 text-lg font-bold">{k.name}</h2>
                <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {here.map((c) => {
                    const now = c.roles.map((r) => live(r).status);
                    const open = now.filter((s) => s === "open" || s === "rolling").length;
                    const soon = now.filter((s) => s === "soon").length;
                    return (
                      <li key={c.slug}>
                        <Link href={`/companies/${c.slug}/`} className="link text-[15px] font-semibold">
                          {c.name}
                        </Link>
                        <p className="mono text-[13px] text-muted">
                          {c.city}, {c.roles.length} {c.roles.length === 1 ? "role" : "roles"}
                          {open > 0 && <span className="text-signal">, {open} open</span>}
                          {soon > 0 && <span className="text-soon">, {soon} soon</span>}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}
