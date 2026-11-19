import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Section from "@/components/Section";
import NewTab from "@/components/NewTab";
import AddToCalendar from "@/components/AddToCalendar";
import SaveButton from "@/components/SaveButton";
import { opened } from "@/data/opened";
import type { Salary } from "@/data/pay";
import { eventsFor } from "@/lib/ics";
import { longDate, stripProtocol } from "@/lib/format";
import { reportUrl, roleHref, shortWhen } from "@/lib/items";
import { rolePages } from "@/lib/rolePages";
import { og } from "@/lib/og";

type Params = { key: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return rolePages().map((p) => ({ key: p.item.key }));
}

const page = (key: string) => rolePages().find((p) => p.item.key === key);
const stated = (s?: string) => (s && !/^not stated/i.test(s) ? s : undefined);
const end = (s: string) => s.replace(/[.\s]+$/, "");

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { key } = await params;
  const p = page(key);
  if (!p) return {};
  const { item: x, company: c } = p;
  const text = `${x.when}. ${x.city}, ${x.countryName}. ${stated(x.process) ? `Process: ${end(x.process)}.` : "The posting doesn't describe the process."}`;
  return {
    title: `${x.title} at ${c.name}`,
    description: text,
    // a closed role stays reachable from old links, but search engines shouldn't send people to it
    robots: x.status === "closed" ? { index: false } : undefined,
    ...og(`${x.title} at ${c.name}`, text, c.slug, roleHref(key)),
  };
}

/** Google's job search reads this. Only for roles you can apply to now, and only facts from the posting. */
/** Only a figure the company states with its period; one amount, a range, or "at least". */
function baseSalary(s: Salary) {
  const value = s.max === undefined ? { value: s.min } : s.max === "open" ? { minValue: s.min } : { minValue: s.min, maxValue: s.max };
  return { "@type": "MonetaryAmount", currency: s.currency, value: { "@type": "QuantitativeValue", ...value, unitText: s.unit } };
}

function jobPosting(p: NonNullable<ReturnType<typeof page>>) {
  const { item: x, role: r, company: c } = p;
  const parts = [
    stated(r.eligibility) && `<p>Who can apply: ${r.eligibility}</p>`,
    stated(r.start) && `<p>Start: ${r.start}</p>`,
    stated(r.duration) && `<p>Duration: ${r.duration}</p>`,
    stated(r.process) && `<p>Hiring process: ${r.process}</p>`,
  ].filter(Boolean);
  const data = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: r.title,
    description: parts.join("") || `<p>${r.title} at ${c.name}.</p>`,
    datePosted: opened[r.source] ?? x.added,
    ...(r.closes ? { validThrough: `${r.closes}T23:59:59` } : {}),
    ...(x.pay?.salary ? { baseSalary: baseSalary(x.pay.salary) } : {}),
    employmentType: r.kind === "Graduate" ? "FULL_TIME" : "INTERN",
    hiringOrganization: { "@type": "Organization", name: c.name, sameAs: c.careersUrl },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: x.city, addressCountry: c.country } },
    directApply: false,
    url: `https://internradar.eu${roleHref(x.key)}`,
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function RolePage({ params }: { params: Promise<Params> }) {
  const { key } = await params;
  const p = page(key);
  if (!p) notFound();
  const { item: x, role: r, company: c } = p;
  const open = x.status === "open" || x.status === "rolling";
  const tone = x.status === "closed" ? "text-closed" : x.status === "soon" || x.urgent ? "text-soon" : "text-signal";
  const exact = r.closes && open ? `Last day to apply: ${longDate(r.closes)}.` : r.opens && x.status === "soon" ? `Applications open ${/^\d{4}-\d{2}-\d{2}$/.test(r.opens) ? longDate(r.opens) : r.opens}.` : "";
  const others = rolePages()
    .filter((o) => o.company.slug === c.slug && o.item.key !== key)
    .sort((a, b) => Number(a.item.status === "closed") - Number(b.item.status === "closed"));
  const facts: [string, string | undefined][] = [
    ["Type", `${r.kind}, ${r.field}`],
    ["Start", stated(r.start)],
    ["Duration", stated(r.duration)],
    ["Pay", x.pay?.label],
    ["Who can apply", stated(r.eligibility)],
    ["Applications", stated(r.applications)],
    ["Hiring process", stated(r.process) ?? "The posting doesn't describe it."],
    ["Re-apply rule", stated(r.reapply)],
  ];

  return (
    <Section className="pt-6 pb-16 sm:pt-8">
      {open && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jobPosting(p) }} />}
      <div className="max-w-[720px]">
        <p className="font-sans text-[14px] text-muted">
          <Link href={`/companies/${c.slug}/`} className="link font-semibold">
            {c.name}
          </Link>{" "}
          · {x.city}, {x.countryName}
        </p>
        <h1 className="mt-1.5 text-[26px] leading-tight font-bold text-balance sm:text-[34px]">{r.title}</h1>
        <p className={`mt-2 font-sans text-[16px] font-semibold ${tone}`}>
          {x.when}
          {exact && <span className="font-normal text-muted"> · {exact}</span>}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <a
            href={r.source}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center rounded-md bg-ink px-4 font-sans text-[15px] font-semibold text-bg hover:bg-muted"
            data-track="posting-role-page"
          >
            {open ? "Apply on the company's site" : "Open the posting"}
            <NewTab />
          </a>
          <SaveButton id={x.id} label={`${r.title} at ${c.name}`} />
          <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} className="font-sans text-[15px]" />
        </div>

        <dl className="mt-7 border-t-2 border-ink">
          {facts
            .filter((f): f is [string, string] => !!f[1])
            .map(([k, v]) => (
              <div key={k} className="grid gap-x-6 gap-y-0.5 border-b border-line py-3 sm:grid-cols-[150px_1fr]">
                <dt className="font-sans text-[13px] font-semibold text-muted">{k}</dt>
                <dd className="text-[17px] leading-[1.55]">{v}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-3 font-sans text-[13px] text-muted">
          From{" "}
          <a href={r.source} target="_blank" rel="noreferrer" className="link">
            {stripProtocol(r.source).split("/")[0]}
            <NewTab />
          </a>
          , checked {longDate(r.checked)}.{" "}
          <a href={reportUrl(x)} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Something wrong?
            <NewTab />
          </a>
        </p>

        <p className="mt-6 text-[17px] leading-[1.6]">
          How {c.name} hires in general, the pay it names and what candidates reported:{" "}
          <Link href={`/companies/${c.slug}/`} className="link font-semibold">
            {c.name} page
          </Link>
          .
        </p>

        {others.length > 0 && (
          <>
            <h2 className="mt-8 border-t-2 border-ink pt-3 text-[13px] font-bold text-accent">More roles at {c.name}</h2>
            <ul className="mt-1">
              {others.slice(0, 8).map((o) => (
                <li key={o.item.key} className="border-b border-line">
                  <Link href={roleHref(o.item.key)} className="flex items-baseline gap-3 py-2.5 hover:bg-raised/50">
                    <span className="min-w-0 flex-1 text-[16px]">{o.item.title}</span>
                    <span className="shrink-0 font-sans text-[13px] whitespace-nowrap text-muted tabular-nums">{shortWhen(o.item)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {others.length > 8 && (
              <p className="mt-2 font-sans text-[14px]">
                <Link href={`/companies/${c.slug}/`} className="link">
                  All {others.length + 1} roles at {c.name}
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </Section>
  );
}
