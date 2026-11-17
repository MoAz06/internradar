import Link from "next/link";
import Section from "@/components/Section";
import Card from "@/components/Card";
import NewTab from "@/components/NewTab";
import RoleFinder from "@/components/RoleFinder";
import { Dot } from "@/components/Status";
import { companies, countries, lastChecked, links, radar } from "@/data/companies";
import { longDate } from "@/lib/format";
import { upcoming } from "@/lib/live";
import { buildItems } from "@/lib/buildItems";

export default function Home() {
  const items = buildItems();
  const openNow = items.filter((x) => x.status === "open" || x.status === "rolling").length;
  const soon = items.filter((x) => x.status === "soon").length;
  const next = upcoming(radar);
  const options = countries
    .map((k) => ({ code: k.code, name: k.name, slug: k.slug, count: items.filter((x) => x.country === k.code).length }))
    .filter((k) => k.count > 0);

  return (
    <>
      {/* intro */}
      <Section className="pt-12 pb-6 sm:pt-16 sm:pb-8">
        <p className="mono text-[12px] font-medium tracking-[0.08em] text-signal">
          EUROPE · 2027 SEASON · UPDATED {longDate(lastChecked).toUpperCase()}
        </p>
        <h1 className="mt-4 max-w-[860px] text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] text-balance sm:text-[48px]">
          Tech internships in Europe, and how the hiring actually works.
        </h1>
        <p className="mt-4 max-w-[720px] text-[15px] leading-[1.55] text-muted text-pretty sm:text-[17px]">
          When applications open, what the test looks like, how long you get, and when you can try
          again. Every line comes from the company’s own careers page or from a candidate who went
          through it, with a date next to it.
        </p>
        <dl className="mt-5 flex flex-wrap gap-x-9 gap-y-3">
          {[
            [openNow, "open now"],
            [soon, "opening soon"],
            [companies.length, "companies"],
            [options.length, "countries"],
          ].map(([n, label]) => (
            <div key={String(label)} className="flex items-end gap-2">
              <dt className="sr-only">{label}</dt>
              <dd className="mono text-[22px] font-medium leading-none">{n}</dd>
              <dd aria-hidden className="text-[13px] text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* search and filters */}
      <Section className="pb-10">
        <h2 className="sr-only">Find a role</h2>
        <RoleFinder items={items} countries={options} />
      </Section>

      {/* on the radar */}
      <Section id="radar" className="py-6">
        <div className="mb-3.5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[22px] font-semibold leading-tight">On the radar</h2>
            <p className="text-sm text-muted">
              What opens next. Put it in your calendar now, most windows close within weeks.
            </p>
          </div>
          <span className="mono text-xs text-dim">{next.length} upcoming</span>
        </div>
        <Card>
          {next.length === 0 && <p className="px-5 py-4 text-sm text-muted">Nothing with a known date right now.</p>}
          {next.map((r, i) => (
            <div
              key={r.sortKey + r.role}
              className={`flex flex-col gap-1.5 px-4 py-4 sm:grid sm:grid-cols-[150px_130px_1fr_380px] sm:items-center sm:gap-5 sm:px-5 ${
                i < next.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span className="mono flex items-center gap-2.5 text-sm font-medium">
                <Dot status={r.kind === "soon" ? "soon" : "window"} />
                {r.opens}
              </span>
              <Link href={`/companies/${r.slug}/`} className="text-sm font-semibold hover:text-signal">
                {r.company}
              </Link>
              <span className="text-sm">{r.role}</span>
              <span className="text-[13px] text-muted">{r.expect}</span>
            </div>
          ))}
        </Card>
      </Section>

      {/* how to read + share */}
      <Section id="how" className="pt-10 pb-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">How to read this</h2>
            <dl className="mt-3.5 space-y-3">
              {[
                ["Status", "is what the careers page said on the checked date. A role turns closed once its deadline or its start date has passed, and shows “Posting gone” when the link stopped working in the nightly check. Windows move, open the posting before you plan around it."],
                ["Process", "is only what the company states, or what a candidate reported on the company page. Candidate reports say so and carry a month."],
                ["Re-apply", "is the company’s own rule for applying again after a rejection. It is the line that costs people a year when they do not know it."],
                ["Type, field", "are our own labels, to make the list easy to filter. Graduate covers new grad jobs and graduate programmes. Thesis is a graduation project."],
                ["Checked", "older than three months is marked: verify it yourself, then send a PR with the new date."],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="mono w-24 shrink-0 text-xs font-medium leading-6 text-signal">{k}</dt>
                  <dd className="text-sm leading-6 text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Card className="w-full p-6 lg:w-[420px]">
            <h3 className="text-lg font-semibold leading-snug">Went through one of these processes?</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Tell the next person what it looked like. A form, five minutes, no git needed. This is the
              part of the list nobody else has, and it only exists if people fill it in.
            </p>
            <a
              href={links.shareProcess}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block rounded-md bg-signal px-4 py-2.5 text-sm font-semibold text-[#06120a] hover:brightness-110"
            >
              Share your hiring process
              <NewTab />
            </a>
          </Card>
        </div>
      </Section>
    </>
  );
}
