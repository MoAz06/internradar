import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import { companies, countries } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { buildItems } from "@/lib/buildItems";
import { longDate } from "@/lib/format";
import { today } from "@/lib/live";
import { og } from "@/lib/og";
import { countryHref, type Item } from "@/lib/items";
import { toolSlug } from "@/lib/tests";

const blurb = "The tech internship season in Europe in numbers: when postings go up, which online tests companies name, who sponsors visas and what they pay. Counted from the list every night.";

export const metadata: Metadata = {
  title: "The season in numbers",
  description: blurb,
  alternates: { canonical: "/stats/" },
  ...og("The internship season in numbers", blurb, "stats", "/stats/"),
};

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthOf = (ym: string) => `${months[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "0%");
const euro = (n: number) => `€${n.toLocaleString("en-GB")}`;
const isOpen = (x: Item) => x.status === "open" || x.status === "rolling";

function median(ns: number[]): number {
  const s = [...ns].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function count<T>(xs: T[], key: (x: T) => string | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of xs) {
    const k = key(x);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

type Bar = { label: React.ReactNode; key: string; n: number; value: string; title: string };

/** A small table with a bar in each row: the label, the bar, the number in words. One colour, one measure. */
function Bars({ rows, caption, head }: { rows: Bar[]; caption: string; head: [string, string] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <table className="mt-3 w-full max-w-[720px] border-collapse font-sans text-[14px]">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">{head[0]}</th>
          <th scope="col">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} title={r.title} className="group">
            <th scope="row" className="w-[38%] py-1 pr-3 text-left align-middle font-normal text-ink sm:w-[30%]">
              {r.label}
            </th>
            <td className="py-1 align-middle">
              <span className="flex items-center gap-2">
                <span aria-hidden className="min-w-0 flex-1">
                  <span className="block h-2.5 rounded-r-[4px] bg-accent group-hover:opacity-80" style={{ width: `${Math.max(2, (r.n / max) * 100)}%` }} />
                </span>
                <span className="w-[45%] shrink-0 text-muted tabular-nums sm:w-[40%]">{r.value}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Head({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-20 border-t-2 border-ink pt-3 text-[22px] font-bold">
      {children}
    </h2>
  );
}

const Note = ({ children }: { children: React.ReactNode }) => <p className="mt-2 max-w-[720px] font-sans text-[13px] leading-[1.55] text-muted">{children}</p>;

export default function StatsPage() {
  const now = today();
  const all = buildItems(now);
  const open = all.filter(isOpen);
  const soon = all.filter((x) => x.status === "soon");
  const nameOf = (code: string) => countries.find((k) => k.code === code)?.name ?? code;

  // when postings went up, by the job board's own date, the last eight months
  const posted = all.filter((x) => x.posted);
  const byMonth = count(posted, (x) => x.posted!.slice(0, 7));
  const monthKeys = [...byMonth.keys()].sort().slice(-8);
  const busiest = [...byMonth].sort((a, b) => b[1] - a[1])[0];

  // deadlines ahead
  const closing = open.filter((x) => x.closes);
  const byDeadline = count(closing, (x) => x.closes!.slice(0, 7));
  const deadlineKeys = [...byDeadline.keys()].sort().slice(0, 8);

  // online test tools: open roles and companies that name each
  const toolRoles = new Map<string, number>();
  const toolCompanies = new Map<string, Set<string>>();
  for (const x of all) {
    for (const t of x.tests) {
      if (isOpen(x)) toolRoles.set(t, (toolRoles.get(t) ?? 0) + 1);
      toolCompanies.set(t, (toolCompanies.get(t) ?? new Set()).add(x.company));
    }
  }
  const tools = [...toolCompanies].map(([t, cs]) => ({ t, companies: cs.size, roles: toolRoles.get(t) ?? 0 })).sort((a, b) => b.companies - a.companies || b.roles - a.roles);
  const withTool = open.filter((x) => x.tests.length).length;

  // visa, clearance, moving: per country, of the open roles
  const byCountry = [...count(open, (x) => x.country)].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 10);
  const noVisa = open.filter((x) => x.workRights).length;
  const clearance = open.filter((x) => x.clearance).length;
  const moving = open.filter((x) => x.relocation).length;

  // pay: one figure per company and kind, so a company with 30 roles counts once
  const internPay = new Map<string, number[]>();
  const seenPay = new Set<string>();
  for (const x of all) {
    if (x.kind !== "Internship" || !x.pay?.month) continue;
    const k = `${x.company}|${x.country}|${x.pay.short}`;
    if (seenPay.has(k)) continue;
    seenPay.add(k);
    internPay.set(x.country, [...(internPay.get(x.country) ?? []), x.pay.month]);
  }
  const payRows = [...internPay].filter(([, ns]) => ns.length >= 3).map(([c, ns]) => ({ c, med: median(ns), n: ns.length })).sort((a, b) => b.med - a.med);

  // re-apply rules
  const ruleGroups = count(reapplyRules, (r) => r.group);
  const strict = reapplyRules.filter((r) => r.group !== "welcome").length;

  const nCountries = new Set(companies.map((c) => c.country)).size;
  const tiles: [string, string][] = [
    [String(open.length), "roles open now"],
    [String(soon.length), "opening soon"],
    [String(companies.length), `companies in ${nCountries} countries`],
    [pct(withTool, open.length), "of open roles are at a company that names its test tool"],
  ];

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[980px]">
        <h1 className="max-w-[760px] text-[28px] leading-tight font-bold sm:text-[36px]">The season in numbers</h1>
        <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
          Counted from the list on {longDate(now)}: every tech internship, graduate and thesis role at the {companies.length} companies on internradar. The
          numbers change every night.
        </p>

        <dl className="mt-6 grid max-w-[860px] grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
          {tiles.map(([n, what]) => (
            <div key={what} className="bg-bg py-3 pr-3 sm:px-3 sm:first:pl-0">
              <dd className="font-display text-[30px] leading-none font-bold tabular-nums">{n}</dd>
              <dt className="mt-1 font-sans text-[13px] leading-snug text-muted">{what}</dt>
            </div>
          ))}
        </dl>

        <Head id="posted">When postings went up</Head>
        <Bars
          caption="Postings on the list by the month the job board says they went up"
          head={["Month", "Postings"]}
          rows={monthKeys.map((m) => ({ key: m, label: monthOf(m), n: byMonth.get(m)!, value: `${byMonth.get(m)}`, title: `${byMonth.get(m)} postings went up in ${monthOf(m)}` }))}
        />
        <Note>
          By the date the job board gives, for the {posted.length} of {all.length} roles whose board says when it went up. Company pages without a board give no
          date, so they are not in this count.
          {busiest ? ` The busiest month so far is ${monthOf(busiest[0])}.` : ""}
        </Note>

        <Head id="deadlines">Deadlines ahead</Head>
        <Bars
          caption="Open roles by the month of their last day to apply"
          head={["Month", "Open roles closing"]}
          rows={deadlineKeys.map((m) => ({ key: m, label: monthOf(m), n: byDeadline.get(m)!, value: `${byDeadline.get(m)}`, title: `${byDeadline.get(m)} roles close in ${monthOf(m)}` }))}
        />
        <Note>
          {open.length - closing.length} of the {open.length} open roles name no deadline. {open.filter((x) => !x.closes && x.status === "rolling").length} of those say they review applications as they come in.
        </Note>

        <Head id="tests">Online tests companies name</Head>
        <Bars
          caption="Online test and interview tools by the number of companies that name them"
          head={["Tool", "Companies"]}
          rows={tools.map(({ t, companies: n, roles }) => ({
            key: t,
            label: (
              <Link href={`/?test=${toolSlug(t)}`} className="link">
                {t}
              </Link>
            ),
            n,
            value: `${n} ${n === 1 ? "company" : "companies"}, ${roles} open`,
            title: `${n} companies name ${t} in their hiring steps; ${roles} open roles`,
          }))}
        />
        <Note>
          From the hiring steps each company describes on its own pages. {pct(withTool, open.length)} of open roles are at a company that names a tool. A company
          that names none may still send a test.
        </Note>

        <Head id="visa">Visa, clearance and moving</Head>
        <p className="mt-3 max-w-[720px] text-[16px] leading-[1.6]">
          Of the {open.length} open roles, <b>{noVisa}</b> ({pct(noVisa, open.length)}) ask for the right to work there already or say the company doesn&apos;t
          sponsor, <b>{clearance}</b> need a security clearance, and <b>{moving}</b> are at a company that names help with moving or housing.
        </p>
        <Bars
          caption="Share of open roles per country that ask for work rights already"
          head={["Country", "Ask for work rights already"]}
          rows={byCountry
            .map(([c, n]) => [c, n, open.filter((x) => x.country === c && x.workRights).length] as const)
            .sort((a, b) => b[2] / b[1] - a[2] / a[1])
            .map(([c, n, no]) => {
            return {
              key: c,
              label: (
                <Link href={countryHref(c)} className="link">
                  {nameOf(c)}
                </Link>
              ),
              n: no / n,
              value: `${pct(no, n)}, ${no} of ${n}`,
              title: `${no} of ${n} open roles in ${nameOf(c)} ask for work rights already`,
            };
          })}
        />
        <Note>Countries with at least 10 open roles. A role that says nothing about visas is not counted as needing work rights.</Note>

        <Head id="pay">What internships pay</Head>
        <Bars
          caption="Median stated internship pay per country, about euros a month"
          head={["Country", "Median, about €/month"]}
          rows={payRows.map(({ c, med, n }) => ({
            key: c,
            label: nameOf(c),
            n: med,
            value: `${euro(med)}, ${n} figures`,
            title: `Half of the ${n} stated internship figures in ${nameOf(c)} are above ${euro(med)} a month`,
          }))}
        />
        <Note>
          The middle figure of what companies state for internships, one figure per company, in about euros a month. Countries with at least three figures. Every
          figure in the company&apos;s own words is on the <Link href="/pay/" className="link">pay page</Link>.
        </Note>

        <Head id="reapply">Re-apply rules</Head>
        <p className="mt-3 max-w-[720px] text-[16px] leading-[1.6]">
          <b>{strict}</b> companies state a rule that limits when you can apply again: {ruleGroups.get("wait") ?? 0} make you wait a set time,{" "}
          {ruleGroups.get("season") ?? 0} make you wait for the next season, and {ruleGroups.get("test") ?? 0} {ruleGroups.get("test") === 1 ? "lets" : "let"} you take their test once. The rules are on the{" "}
          <Link href="/reapply/" className="link">
            re-apply page
          </Link>
          .
        </p>

        <Head id="data">The data</Head>
        <p className="mt-3 max-w-[720px] text-[16px] leading-[1.6]">
          Every open role as a spreadsheet: <a href="/open-roles.csv" className="link">open-roles.csv</a>, or as <a href="/open-roles.json" className="link">JSON</a>.
          Both are rebuilt every night with the site.
        </p>
      </div>
    </Section>
  );
}
