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
import { reportUrl, roleHref } from "@/lib/items";
import { shareUrl } from "@/lib/share";
import { calendarLinks } from "@/lib/calendarLinks";
import type { CandidateReport } from "@/data/types";
import { buildItems } from "@/lib/buildItems";
import { eventsFor } from "@/lib/ics";
import { historyStart } from "@/data/history";
import { opened } from "@/data/opened";
import AddToCalendar from "@/components/AddToCalendar";
import CountryLink from "@/components/CountryLink";
import FollowButton from "@/components/FollowButton";
import EmailSignup from "@/components/EmailSignup";
import { cityPages, citiesOf } from "@/lib/landing";

type Params = { slug: string };

const weeksText = (w: string) => (w === "under 1" ? "under a week" : w === "more than 8" ? "more than 8 weeks" : `${w} weeks`);

/** One line over all reports, once there are at least two: how long people waited and how it ended. */
function reportSummary(reports: CandidateReport[]): string | null {
  if (reports.length < 2) return null;
  const parts: string[] = [];
  const weeks = reports.map((r) => r.weeks).filter((w): w is NonNullable<typeof w> => !!w && w !== "still waiting");
  if (weeks.length >= 2) {
    const count = new Map<string, number>();
    for (const w of weeks) count.set(w, (count.get(w) ?? 0) + 1);
    const [top, n] = [...count].sort((a, b) => b[1] - a[1])[0];
    parts.push(`${n} of ${weeks.length} heard back in ${weeksText(top)}`);
  }
  const outcomes = new Map<string, number>();
  for (const r of reports) outcomes.set(r.outcome, (outcomes.get(r.outcome) ?? 0) + 1);
  parts.push([...outcomes].map(([o, n]) => `${o.toLowerCase()} ${n}`).join(", "));
  return `From ${reports.length} reports: ${parts.join(". Outcomes: ")}.`;
}

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
  const share = shareUrl(c.slug);
  const cities = cityPages().filter((p) => citiesOf(c.city).some((x) => x.slug === p.slug));
  const follow = calendarLinks(`/calendar/companies/${c.slug}.ics`, `internradar, ${c.name}`);
  const summary = reportSummary(c.reports);
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
              {c.city}, <CountryLink code={c.country} name={countryName(c.country)} />
            </p>
            <div className="mt-3">
              <FollowButton slug={c.slug} name={c.name} />
            </div>
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
            ["Next deadline", nextDeadline ? `${fuzzyDate(nextDeadline)}${daysTo(nextDeadline) <= 0 ? ", today" : daysTo(nextDeadline) === 1 ? ", tomorrow" : daysTo(nextDeadline) <= 14 ? `, in ${daysTo(nextDeadline)} days` : ""}` : "None listed"],
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
            className="flex items-center justify-center rounded-md bg-ink px-5 py-3 text-sm font-semibold text-bg hover:bg-muted"
          >
            Go to the careers page
            <NewTab />
          </a>
        </div>
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[14px] text-muted">
          <span className="font-semibold text-ink">Or keep up outside this site:</span>
          <a href={`/feeds/companies/${c.slug}.xml`} className="link" data-track="follow-rss">
            new roles by RSS
          </a>
          <span>
            dates in{" "}
            <a href={follow.google} className="link" data-track="follow-google">
              Google
            </a>
            ,{" "}
            <a href={follow.apple} className="link" data-track="follow-apple">
              Apple
            </a>{" "}
            or{" "}
            <a href={follow.outlook} className="link" data-track="follow-outlook">
              Outlook
            </a>{" "}
            calendar
          </span>
          <Link href="/alerts/" className="link">
            More alerts
          </Link>
        </p>
      </Section>

      <Section className="pb-16">
        {/* a table from sm up; on phones every role is a card, so nothing scrolls sideways */}
        <Card className="scrollbar-thin sm:overflow-x-auto" role="region" tabIndex={0} aria-labelledby="roles-caption">
          <table className="w-full border-collapse text-left max-sm:block sm:min-w-[820px]">
            <caption id="roles-caption" className="sr-only">
              Roles at {c.name}
            </caption>
            <thead className="max-sm:hidden">
              <tr className="bg-raised text-[13px] text-muted">
                {["Role", "Status", "Start", "Who can apply"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 first:pl-4 last:pr-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="max-sm:block">
              {c.roles.map((r) => (
                <tr key={r.title + r.source} className="border-t border-line text-[13px] max-sm:block max-sm:px-4 max-sm:py-3.5 max-sm:first:border-t-0">
                  <td className="px-3 py-3 pl-4 align-middle max-sm:block max-sm:p-0">
                    {itemOf(r.title, r.source) ? (
                      <Link href={roleHref(itemOf(r.title, r.source)!.key)} className="link text-sm font-semibold">
                        {r.title}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold">{r.title}</span>
                    )}{" "}
                    {r.city && <span className="text-[13px] text-muted">{r.city} </span>}
                    <a href={r.source} target="_blank" rel="noreferrer" className="link text-[13px]">
                      Posting
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
                      if (!x) return null;
                      return (
                        <>
                          {opened[r.source] && <span className="mt-1 block text-[13px] text-muted">Posted on {longDate(opened[r.source])}</span>}
                          {x.added > historyStart && <span className="mt-1 block text-[13px] text-muted">On the list since {longDate(x.added)}</span>}
                          <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} className="mt-1 text-[13px]" />
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3 align-middle max-sm:mt-2.5 max-sm:block max-sm:p-0">
                    <StatusLabel status={live(r).status} text={live(r).long} />
                  </td>
                  <td className="mono px-3 py-3 align-middle max-sm:mt-1.5 max-sm:block max-sm:p-0">
                    <span className="font-sans text-muted sm:hidden">Start: </span>
                    {r.start || "On the posting"}
                    {r.duration ? `, ${r.duration}` : ""}
                  </td>
                  <td className="px-3 py-3 pr-4 align-middle text-muted max-sm:mt-1.5 max-sm:block max-sm:p-0">
                    <span className="text-ink sm:hidden">Who can apply: </span>
                    {r.eligibility || "On the posting"}
                  </td>
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
              {summary && <p className="mt-2 text-sm font-semibold leading-[1.55]">{summary}</p>}
              {c.reports.length === 0 ? (
                <p className="mt-2 text-sm leading-[1.55] text-muted">
                  None yet. Went through this process? Tell the next person how far you got, which online
                  test it was and how many weeks it took. It takes a minute, and no questions or names.
                </p>
              ) : (
                <ul className="mt-3 space-y-4">
                  {c.reports.map((rep, i) => (
                    <li key={i} className="text-sm leading-6">
                      <p className="font-semibold">
                        {rep.role}, applied {rep.applied}
                      </p>
                      <p className="mt-1 text-[13px] text-muted">{rep.timeline.join(" → ")}</p>
                      {rep.test && <p className="mt-1 text-muted">Online test: {rep.test}</p>}
                      <p className="mt-1 text-muted">
                        Outcome: {rep.outcome}
                        {rep.weeks && rep.weeks !== "still waiting" ? `, after ${weeksText(rep.weeks)}` : ""}
                      </p>
                      {rep.notes && <p className="mt-1 text-muted">{rep.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={share}
                className="mt-3.5 inline-flex h-11 items-center rounded-md bg-ink px-4 text-[14px] font-semibold text-bg hover:bg-muted"
                data-track="share-from-company"
              >
                Share how it went, 1 minute
              </Link>
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
            {links.newsletter && (
              <div>
                <h2 className="text-base font-bold">New roles by email</h2>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  One email on Monday with what closes, what is new and what opens soon{links.mailEditions ? ", for the country you pick" : ""}.{" "}
                  <Link href="/privacy/" className="link">
                    Privacy
                  </Link>
                </p>
                <EmailSignup id="company-email" track="company-email" edition={countries.find((k) => k.code === c.country)?.name} className="mt-2.5" />
              </div>
            )}
            {cities.length > 0 && (
              <div>
                <h2 className="text-base font-bold">More roles nearby</h2>
                <ul className="mt-2.5 list-disc space-y-2 pl-5 text-sm leading-6">
                  {cities.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/cities/${p.slug}/`} className="link">
                        All {p.items.length} roles in {p.city}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}

function countryName(code: string): string {
  return countries.find((k) => k.code === code)?.name ?? code;
}
