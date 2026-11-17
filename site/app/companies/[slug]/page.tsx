import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import Card from "@/components/Card";
import { StatusLabel } from "@/components/Status";
import { companies, countries, links } from "@/data/companies";
import { longDate, stripProtocol } from "@/lib/format";
import { live } from "@/lib/live";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return companies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const c = companies.find((x) => x.slug === slug);
  if (!c) return {};
  return {
    title: `${c.name} hiring process 2027`,
    description: `Roles, process, re-apply rule and pay at ${c.name}, from the company's own careers page, with the date checked.`,
  };
}

export default async function CompanyPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const c = companies.find((x) => x.slug === slug);
  if (!c) notFound();
  const checked = c.sources.map((s) => s.checked).sort().at(-1) ?? "";
  const share = `${links.shareProcess}&title=${encodeURIComponent(`[process] ${c.name}`)}`;

  return (
    <>
      <Section className="pt-10 pb-6 sm:pt-14">
        <Link href="/companies/" className="text-[13px] text-muted hover:text-ink">
          ← All companies
        </Link>
        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]">{c.name}</h1>
            <p className="mt-1.5 text-[15px] text-muted">
              {c.city}, {countryName(c.country)}
            </p>
          </div>
          <span className="mono text-xs tracking-[0.08em] text-dim">
            CHECKED {longDate(checked).toUpperCase()}
          </span>
        </div>
      </Section>

      <Section className="pb-16">
        <Card className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="mono bg-raised text-[11px] font-medium tracking-[0.06em] text-dim">
                {["Role", "Status", "Start", "Who can apply"].map((h) => (
                  <th key={h} className="px-3 py-2.5 first:pl-4 last:pr-4 font-medium uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.roles.map((r) => (
                <tr key={r.title + r.source} className="border-t border-line text-[13px]">
                  <td className="px-3 py-3 pl-4 align-middle">
                    <a href={r.source} target="_blank" rel="noreferrer" className="text-sm font-semibold hover:text-signal">
                      {r.title}
                    </a>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <StatusLabel status={live(r).status} text={live(r).long} />
                  </td>
                  <td className="mono px-3 py-3 align-middle">
                    {r.start}
                    {r.duration ? ` · ${r.duration}` : ""}
                  </td>
                  <td className="px-3 py-3 pr-4 align-middle text-muted">{r.eligibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="mt-7 flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-base font-semibold">Process, as the company describes it</h2>
              <ol className="mt-2.5 space-y-2.5">
                {c.process.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mono w-6 shrink-0 text-xs leading-6 text-signal">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm leading-6 text-muted">{p}</span>
                  </li>
                ))}
              </ol>
            </div>
            <Card className="px-4.5 py-4">
              <p className="mono text-[11px] font-medium tracking-[0.08em] text-signal">RE-APPLY RULE</p>
              <p className="mt-2 text-sm leading-[1.55]">{c.reapply}</p>
            </Card>
            {c.notes && c.notes.length > 0 && (
              <div>
                <h2 className="text-base font-semibold">Notes</h2>
                <ul className="mt-2.5 space-y-2.5">
                  {c.notes.map((n, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mono w-6 shrink-0 text-xs leading-6 text-signal">·</span>
                      <span className="text-sm leading-6 text-muted">{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="w-full space-y-6 lg:w-[400px]">
            <div>
              <h2 className="text-base font-semibold">Pay, relocation, visa</h2>
              <ul className="mt-2.5 space-y-2.5">
                {c.pay.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mono w-6 shrink-0 text-xs leading-6 text-signal">·</span>
                    <span className="text-sm leading-6 text-muted">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card dashed className="p-4.5">
              <h2 className="text-base font-semibold">Candidate reports</h2>
              {c.reports.length === 0 ? (
                <p className="mt-2 text-sm leading-[1.55] text-muted">
                  None yet. Went through this process? Tell the next person what it looked like: steps,
                  timing, outcome. No interview questions.
                </p>
              ) : (
                <ul className="mt-3 space-y-4">
                  {c.reports.map((rep, i) => (
                    <li key={i} className="text-sm leading-6">
                      <p className="font-semibold">
                        {rep.role}, applied {rep.applied}
                      </p>
                      <p className="mono mt-1 text-[13px] text-muted">{rep.timeline.join(" → ")}</p>
                      <p className="mt-1 text-muted">Outcome: {rep.outcome}</p>
                      {rep.notes && <p className="mt-1 text-muted">{rep.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <a
                href={share}
                target="_blank"
                rel="noreferrer"
                className="mt-3.5 inline-block rounded-md bg-signal px-3.5 py-2 text-[13px] font-semibold text-[#06120a] hover:brightness-110"
              >
                Share your process
              </a>
            </Card>
            <div>
              <h2 className="text-base font-semibold">Sources</h2>
              <ul className="mt-2.5 space-y-2.5">
                {c.sources.map((s) => (
                  <li key={s.url} className="flex gap-3">
                    <span className="mono w-6 shrink-0 text-xs leading-6 text-signal">·</span>
                    <a href={s.url} target="_blank" rel="noreferrer" className="break-all text-sm leading-6 text-muted hover:text-ink">
                      {stripProtocol(s.url)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

function countryName(code: string): string {
  return countries.find((k) => k.code === code)?.name ?? code;
}
