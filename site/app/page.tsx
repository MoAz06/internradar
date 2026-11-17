import Link from "next/link";
import Section from "@/components/Section";
import Card from "@/components/Card";
import { Dot, Legend, StatusLabel } from "@/components/Status";
import { companies, countries, lastChecked, links, radar } from "@/data/companies";
import { longDate, shortDate } from "@/lib/format";
import { live, upcoming } from "@/lib/live";

export default function Home() {
  const roleCount = companies.reduce((n, c) => n + c.roles.length, 0);
  const soon = companies.flatMap((c) => c.roles).filter((r) => live(r).status === "soon").length;
  const next = upcoming(radar);
  const filled = countries.filter((k) => companies.some((c) => c.country === k.code));
  const empty = countries.filter((k) => !companies.some((c) => c.country === k.code));

  return (
    <>
      {/* intro */}
      <Section className="pt-14 pb-8 sm:pt-20 sm:pb-10">
        <p className="mono text-[12px] font-medium tracking-[0.08em] text-signal">
          EUROPE · 2027 SEASON · UPDATED {longDate(lastChecked).toUpperCase()}
        </p>
        <h1 className="mt-5 max-w-[860px] text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-balance sm:text-[52px]">
          Tech internships in Europe, and how the hiring actually works.
        </h1>
        <p className="mt-5 max-w-[720px] text-[15px] leading-[1.55] text-muted text-pretty sm:text-[17px]">
          When applications open, what the test looks like, how long you get, and when you can try
          again. Every line comes from the company’s own careers page or from a candidate who went
          through it, with a date next to it.
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-9 gap-y-3">
          {[
            [companies.length, "companies"],
            [roleCount, "roles"],
            [soon, "opening soon"],
            [filled.length, filled.length === 1 ? "country" : "countries"],
          ].map(([n, label]) => (
            <div key={String(label)} className="flex items-end gap-2">
              <dd className="mono text-[22px] font-medium leading-none">{n}</dd>
              <dt className="text-[13px] text-muted">{label}</dt>
            </div>
          ))}
        </dl>
        <nav aria-label="Countries" className="mt-7 flex flex-wrap gap-2">
          {countries.map((k) => {
            const n = companies.filter((c) => c.country === k.code).length;
            return (
              <a
                key={k.code}
                href={`#${k.slug}`}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium ${
                  n ? "border-line bg-surface hover:border-muted" : "border-dashed border-line text-dim"
                }`}
              >
                <span className="mono text-[11px] tracking-[0.1em] text-dim">{k.code}</span>
                {k.name}
                <span className="mono text-[11px] text-dim">{n}</span>
              </a>
            );
          })}
        </nav>
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

      {/* one table per country */}
      {filled.map((k) => {
        const here = companies.filter((c) => c.country === k.code);
        return (
          <Section key={k.code} id={k.slug} className="pt-8 pb-6">
            <div className="mb-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="flex items-center gap-2.5 text-[22px] font-semibold leading-tight">
                <span className="mono text-xs font-semibold tracking-[0.1em] text-dim">{k.code}</span>
                {k.name}
                <span className="mono text-xs font-normal text-dim">{here.length} {here.length === 1 ? "company" : "companies"}</span>
              </h2>
              <Legend />
            </div>
            <Card className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead>
                  <tr className="mono bg-raised text-[11px] font-medium tracking-[0.06em] text-dim">
                    {["Company", "Role", "City", "Status", "Start", "Process", "Re-apply", "Checked"].map((h) => (
                      <th key={h} className="px-3 py-2.5 first:pl-4 last:pr-4 font-medium uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {here.flatMap((c) =>
                    c.roles.map((r, i) => (
                      <tr
                        key={c.slug + i}
                        className={`text-[13px] transition-colors hover:bg-raised ${
                          i === 0 ? "border-t border-line" : "border-t border-line/40"
                        }`}
                      >
                        <td className="px-3 py-3 pl-4 align-middle">
                          {i === 0 ? (
                            <Link href={`/companies/${c.slug}/`} className="text-sm font-semibold hover:text-signal">
                              {c.name}
                            </Link>
                          ) : (
                            <span className="sr-only">{c.name}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-middle text-sm">{r.title}</td>
                        <td className="mono px-3 py-3 align-middle text-muted">
                          {c.city === "Amsterdam" ? "AMS" : c.city}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <StatusLabel status={live(r).status} text={live(r).short} />
                        </td>
                        <td className="mono px-3 py-3 align-middle">{r.start}</td>
                        <td className="px-3 py-3 align-middle text-muted">{r.process}</td>
                        <td className="px-3 py-3 align-middle text-muted">{r.reapply}</td>
                        <td className="mono px-3 py-3 pr-4 align-middle text-xs text-dim">{shortDate(r.checked)}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </Card>
            <p className="mt-3 text-[13px] text-dim">
              <span className="sm:hidden">Scroll sideways for the full table. </span>
              Eligibility, pay, visa and the full process per company are on the company pages.
            </p>
          </Section>
        );
      })}

      {/* other countries */}
      {empty.length > 0 && (
      <Section id="countries" className="py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {empty.map((k) => (
            <Card key={k.code} id={k.slug} dashed className="scroll-mt-20 px-4.5 py-4">
              <div className="flex items-center gap-2">
                <span className="mono text-[11px] font-semibold tracking-[0.1em] text-dim">{k.code}</span>
                <span className="text-sm font-semibold">{k.name}</span>
              </div>
              <a href={links.contributing} className="mt-1.5 block text-[13px] text-dim hover:text-muted">
                Nothing yet. Add the first one →
              </a>
            </Card>
          ))}
        </div>
      </Section>
      )}

      {/* how to read + share */}
      <Section id="how" className="pt-10 pb-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">How to read this</h2>
            <dl className="mt-3.5 space-y-3">
              {[
                ["Status", "is what the careers page said on the Checked date. When a posting names a deadline, the role shows as closed once that day has passed. Windows move, open the link before you plan around it."],
                ["Process", "is only what the company states, or what a candidate reported on the company page. Candidate reports say so and carry a month."],
                ["Re-apply", "is the company’s own rule for applying again after a rejection. It is the column that costs people a year when they do not know it."],
                ["Checked", "older than three months: verify it yourself, then send a PR with the new date."],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="mono w-20 shrink-0 text-xs font-medium leading-6 text-signal">{k}</dt>
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
            </a>
          </Card>
        </div>
      </Section>
    </>
  );
}
