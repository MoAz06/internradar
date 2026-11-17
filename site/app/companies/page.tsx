import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import Card from "@/components/Card";
import { Dot } from "@/components/Status";
import { companies, countries } from "@/data/companies";
import { live } from "@/lib/live";

export const metadata: Metadata = {
  title: "All companies",
  description: "Every company on internradar, by country, with its open roles and hiring process.",
};

export default function Companies() {
  return (
    <>
      <Section className="pt-10 pb-6 sm:pt-14">
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">All companies</h1>
        <p className="mt-2 text-[15px] text-muted">
          {companies.length} companies in {countries.filter((k) => companies.some((c) => c.country === k.code)).length}{" "}
          countries. Each page has the roles, the process as the company describes it, the re-apply rule and the sources.
        </p>
      </Section>
      <Section className="pb-16">
        <div className="space-y-8">
          {countries.map((k) => {
            const here = [...companies.filter((c) => c.country === k.code)].sort((a, b) => a.name.localeCompare(b.name));
            if (!here.length) return null;
            return (
              <div key={k.code} id={k.slug} className="scroll-mt-20">
                <h2 className="mb-3 flex items-center gap-2.5 text-lg font-semibold">
                  <span className="mono text-xs font-semibold tracking-[0.1em] text-dim">{k.code}</span>
                  {k.name}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {here.map((c) => {
                    const now = c.roles.map((r) => live(r).status);
                    const open = now.filter((s) => s === "open" || s === "rolling").length;
                    const soon = now.filter((s) => s === "soon").length;
                    return (
                      <Link key={c.slug} href={`/companies/${c.slug}/`} className="group">
                        <Card className="h-full px-4.5 py-4 transition-colors group-hover:border-muted">
                          <p className="text-[15px] font-semibold group-hover:text-signal">{c.name}</p>
                          <p className="mt-0.5 text-[13px] text-muted">{c.city}</p>
                          <p className="mono mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                            <span>{c.roles.length} {c.roles.length === 1 ? "role" : "roles"}</span>
                            {open > 0 && (
                              <span className="flex items-center gap-1.5"><Dot status="open" />{open} open</span>
                            )}
                            {soon > 0 && (
                              <span className="flex items-center gap-1.5"><Dot status="soon" />{soon} soon</span>
                            )}
                          </p>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}
