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
import { og } from "@/lib/og";
import { reportUrl } from "@/lib/items";
import { buildItems } from "@/lib/buildItems";
import { eventsFor } from "@/lib/ics";
import AddToCalendar from "@/components/AddToCalendar";

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
    ...og(`How ${c.name} hires`, `Roles, process, re-apply rule and pay at ${c.name}, from the company's own careers page.`, c.slug, `/companies/${c.slug}/`),
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
  const mine = buildItems(now).filter((x) => x.slug === c.slug);
  const itemOf = (title: string, source: string) => mine.find((x) => x.title === title && x.source === source);
  const nextDeadline = open.map((s) => s.r.closes).filter((d): d is string => !!d && d >= now).sort()[0];
  const daysTo = (d: string) => Math.round((Date.parse(d) - Date.parse(now)) / 86_400_000);
  const hasRule = !/^not stated/i.test(c.reapply);

  return (
    <>
      <Section className="pt-10 pb-6 sm:pt-14">
        <Link href="/companies/" className="link text-sm">
          All companies
        </Link>
        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]">{c.name}</h1>
            <p className="mt-1.5 text-[15px] text-muted">
              {c.city}, {countryName(c.country)}
            </p>
          </div>
          <span className={`text-sm ${stale(checked) ? "text-soon" : "text-muted"}`}>
            Last checked {longDate(checked)}
            {stale(checked) ? ", over three months ago. Check the links before you rely on it." : ""}
          </span>
        </div>

        {/* the answer first: what is open, until when, and the rule that costs people a year */}
        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[15px] sm:max-w-[560px]">
          {[
            ["Open now", `${open.length} of ${c.roles.length} ${c.roles.length === 1 ? "role" : "roles"}`],
            ["Next deadline", nextDeadline ? `${fuzzyDate(nextDeadline)}${daysTo(nextDeadline) <= 14 ? `, in ${daysTo(nextDeadline)} days` : ""}` : "None listed"],
            ["Opening soon", soonRoles.length ? `${soonRoles.length} ${soonRoles.length === 1 ? "role" : "roles"}` : "None"],
            ["Pay mentioned", c.pay.some((p) => /\d/.test(p) && /€|£|CHF|EUR|GBP|DKK|SEK|NOK|PLN|salary|pay|allowance|remuneration/i.test(p)) ? "Yes, see below" : "No"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <p
            className={`flex-1 rounded-md border px-4 py-3 text-sm leading-[1.55] ${
              hasRule ? "border-soon/40 bg-soon/10 text-soon" : "border-line text-muted"
            }`}
          >
            <span className="font-semibold">Re-apply rule: </span>
            {hasRule ? c.reapply : "not stated by the company."}
          </p>
          <a
            href={c.careersUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center rounded-md bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-muted"
          >
            Go to the careers page
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
              <tr className="bg-raised text-[13px] text-muted">
                {["Role", "Status", "Start", "Who can apply"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 first:pl-4 last:pr-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.roles.map((r) => (
                <tr key={r.title + r.source} className="border-t border-line text-[13px]">
                  <td className="px-3 py-3 pl-4 align-middle">
                    <a href={r.source} target="_blank" rel="noreferrer" className="link text-sm font-semibold">
                      {r.title}
                      <NewTab />
                    </a>
                    <a
                      href={reportUrl({ company: c.name, title: r.title, source: r.source })}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-[13px] text-muted underline underline-offset-2 hover:text-ink"
                    >
                      Something wrong?
                      <span className="sr-only"> Report a mistake in {r.title}</span>
                      <NewTab />
                    </a>
                    {(() => {
                      const x = itemOf(r.title, r.source);
                      return x ? <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} className="mt-1 text-[13px]" /> : null;
                    })()}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <StatusLabel status={live(r).status} text={live(r).long} />
                  </td>
                  <td className="mono px-3 py-3 align-middle">
                    {r.start}
                    {r.duration ? `, ${r.duration}` : ""}
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
              <h2 className="text-base font-bold">Process, as the company describes it</h2>
              <ol className="mt-2.5 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted marker:text-ink">
                {c.process.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            </div>
            {c.notes && c.notes.length > 0 && (
              <div>
                <h2 className="text-base font-bold">Notes</h2>
                <ul className="mt-2.5 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
                  {c.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="w-full space-y-6 lg:w-[400px]">
            <div>
              <h2 className="text-base font-bold">Pay, relocation, visa</h2>
              <ul className="mt-2.5 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
                {c.pay.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <Card className="bg-raised p-4.5">
              <h2 className="text-base font-bold">Candidate reports</h2>
              {c.reports.length === 0 ? (
                <p className="mt-2 text-sm leading-[1.55] text-muted">
                  None yet. Went through this process? Tell the next person how it went: the steps, the
                  timing and the outcome. Please don&apos;t post the interview questions.
                </p>
              ) : (
                <ul className="mt-3 space-y-4">
                  {c.reports.map((rep, i) => (
                    <li key={i} className="text-sm leading-6">
                      <p className="font-semibold">
                        {rep.role}, applied {rep.applied}
                      </p>
                      <p className="mt-1 text-[13px] text-muted">{rep.timeline.join(" → ")}</p>
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
                className="mt-3.5 inline-block rounded-md bg-ink px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-muted"
              >
                Share your process
                <NewTab />
              </a>
            </Card>
            <div>
              <h2 className="text-base font-bold">Sources</h2>
              <ul className="mt-2.5 list-disc space-y-2 pl-5 text-sm leading-6">
                {c.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="link break-all">
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
