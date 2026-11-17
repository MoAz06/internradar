import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import Card from "@/components/Card";
import NewTab from "@/components/NewTab";
import { StatusLabel } from "@/components/Status";
import { companies, countries, links } from "@/data/companies";
import { longDate, stripProtocol } from "@/lib/format";
import { fuzzyDate, live, stale, today } from "@/lib/live";

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
  const now = today();
  const states = c.roles.map((r) => ({ r, l: live(r, now) }));
  const open = states.filter((s) => s.l.status === "open" || s.l.status === "rolling");
  const soonRoles = states.filter((s) => s.l.status === "soon");
  const nextDeadline = open.map((s) => s.r.closes).filter((d): d is string => !!d && d >= now).sort()[0];
  const daysTo = (d: string) => Math.round((Date.parse(d) - Date.parse(now)) / 86_400_000);
  const hasRule = !/^not stated/i.test(c.reapply);

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
          <span className={`mono text-xs tracking-[0.08em] ${stale(checked) ? "text-soon" : "text-dim"}`}>
            CHECKED {longDate(checked).toUpperCase()}
            {stale(checked) ? " · OVER 3 MONTHS AGO, CHECK THE LINKS" : ""}
          </span>
        </div>

        {/* the answer first: what is open, until when, and the rule that costs people a year */}
        <dl className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {[
            ["Open now", `${open.length} of ${c.roles.length} ${c.roles.length === 1 ? "role" : "roles"}`],
            ["Next deadline", nextDeadline ? `${fuzzyDate(nextDeadline)}${daysTo(nextDeadline) <= 14 ? `, in ${daysTo(nextDeadline)} days` : ""}` : "None listed"],
            ["Opening soon", soonRoles.length ? `${soonRoles.length} ${soonRoles.length === 1 ? "role" : "roles"}` : "None"],
            ["Pay figure", c.pay.some((p) => /\d/.test(p) && /€|£|CHF|EUR|GBP|DKK|SEK|NOK|PLN|salary|pay|allowance|remuneration/i.test(p)) ? "Yes, see below" : "Not given"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[10px] border border-line bg-surface px-4 py-3">
              <dt className="text-xs text-dim">{k}</dt>
              <dd className="mt-0.5 text-[15px] font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
          <p
            className={`flex-1 rounded-[10px] border px-4 py-3 text-sm leading-[1.55] ${
              hasRule ? "border-soon/40 bg-soon/10 text-soon" : "border-line bg-surface text-muted"
            }`}
          >
            <span className="font-semibold">{hasRule ? "⚠ Re-apply rule: " : "Re-apply rule: "}</span>
            {hasRule ? c.reapply : "not stated by the company."}
          </p>
          <a
            href={c.careersUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center rounded-[10px] bg-signal px-5 py-3 text-sm font-semibold text-[#06120a] hover:brightness-110"
          >
            Careers page <span aria-hidden>&nbsp;↗</span>
            <NewTab />
          </a>
        </div>
      </Section>

      <Section className="pb-16">
        <Card className="scrollbar-thin overflow-x-auto" role="region" tabIndex={0} aria-labelledby="roles-caption">
          <table className="w-full min-w-[820px] border-collapse text-left">
            <caption id="roles-caption" className="sr-only">
              Roles at {c.name}
            </caption>
            <thead>
              <tr className="mono bg-raised text-xs font-medium tracking-[0.06em] text-dim">
                {["Role", "Status", "Start", "Who can apply"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 first:pl-4 last:pr-4 font-medium uppercase">
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
                      <NewTab />
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
                <NewTab />
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
                      <NewTab />
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
