import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import { companies, countries } from "@/data/companies";
import type { Pay } from "@/data/pay";
import { buildItems } from "@/lib/buildItems";
import { roleHref, type Item } from "@/lib/items";
import { longDate } from "@/lib/format";
import { today } from "@/lib/live";
import { og } from "@/lib/og";

const blurb = "What tech internships and graduate roles in Europe pay, as the companies state it on their own pages. Per country, with a link to each company.";

export const metadata: Metadata = {
  title: "Pay",
  description: blurb,
  alternates: { canonical: "/pay/" },
  ...og("What tech internships in Europe pay", blurb, "pay", "/pay/"),
};

type Row = { slug: string; company: string; city: string; country: string; countryName: string; pay: Pay; roles: Item[]; open: Item[] };
type Group = "Internship" | "Graduate";

const groupOf = (x: Item): Group => (x.kind === "Graduate" ? "Graduate" : "Internship");
const euro = (n: number) => `€${n.toLocaleString("en-GB")}`;

/** Every stated figure, one row per company, figure and kind, from the roles it covers. */
function rows(items: Item[]): Record<Group, Row[]> {
  const out: Record<Group, Map<string, Row>> = { Internship: new Map(), Graduate: new Map() };
  for (const x of items) {
    if (!x.pay) continue;
    const g = groupOf(x);
    const k = `${x.slug}|${x.pay.short}`;
    const row = out[g].get(k) ?? { slug: x.slug, company: x.company, city: x.city, country: x.country, countryName: x.countryName, pay: x.pay, roles: [], open: [] };
    row.roles.push(x);
    if (x.status === "open" || x.status === "rolling") row.open.push(x);
    out[g].set(k, row);
  }
  // highest first; figures without a period after the others
  const sort = (m: Map<string, Row>) => [...m.values()].sort((a, b) => (b.pay.month ?? -1) - (a.pay.month ?? -1) || a.company.localeCompare(b.company));
  return { Internship: sort(out.Internship), Graduate: sort(out.Graduate) };
}

function range(ns: number[]): string {
  if (ns.length === 0) return "";
  const lo = Math.min(...ns);
  const hi = Math.max(...ns);
  return lo === hi ? euro(lo) : `${euro(lo)} to ${euro(hi)}`;
}

function List({ rows, id, title }: { rows: Row[]; id: string; title: string }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="scroll-mt-20 border-t-2 border-ink pt-3 text-[22px] font-bold">
        {title} <span className="font-sans text-[15px] font-normal text-muted">({rows.length})</span>
      </h2>
      <div className="mt-2 hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_110px_minmax(0,0.9fr)] gap-x-5 border-b border-ink pb-1.5 font-sans text-[13px] font-semibold text-muted md:grid">
        <span>Company</span>
        <span>What they state</span>
        <span className="text-right">About €/month</span>
        <span>Roles</span>
      </div>
      <ul>
        {rows.map((r) => {
          const first = r.open[0] ?? r.roles[0];
          return (
            <li
              key={r.slug + r.pay.short}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-b border-line py-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_110px_minmax(0,0.9fr)] md:gap-x-5"
            >
              <p className="min-w-0 font-sans text-[15px]">
                <Link href={`/companies/${r.slug}/`} className="font-semibold hover:underline">
                  {r.company}
                </Link>
                <span className="text-muted"> · {r.city}</span>
              </p>
              <p className="col-span-2 row-start-2 text-[16px] leading-[1.5] md:col-span-1 md:row-start-auto">{r.pay.label}</p>
              <p className="text-right font-sans text-[15px] font-semibold tabular-nums md:order-none">
                {r.pay.month ? euro(r.pay.month) : <span className="font-normal text-dim">No period</span>}
              </p>
              <p className="col-span-2 font-sans text-[14px] text-muted md:col-span-1">
                <Link href={roleHref(first.key)} className="link">
                  {first.title}
                </Link>
                {r.roles.length > 1 && ` and ${r.roles.length - 1} more`}
                {r.open.length === 0 && " (closed now)"}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function PayPage() {
  const items = buildItems(today());
  const all = rows(items);
  const stating = new Set([...all.Internship, ...all.Graduate].map((r) => r.slug)).size;
  const perCountry = countries
    .map((k) => {
      const intern = all.Internship.filter((r) => r.country === k.code);
      const grad = all.Graduate.filter((r) => r.country === k.code);
      return {
        name: k.name,
        n: new Set([...intern, ...grad].map((r) => r.slug)).size,
        intern: range(intern.flatMap((r) => (r.pay.month ? [r.pay.month] : []))),
        grad: range(grad.flatMap((r) => (r.pay.month ? [r.pay.month] : []))),
      };
    })
    .filter((k) => k.n > 0)
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  const checked = companies.flatMap((c) => c.sources.map((s) => s.checked)).sort().at(-1)!;

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[980px]">
        <h1 className="max-w-[760px] text-[28px] leading-tight font-bold sm:text-[36px]">What tech internships and graduate roles pay in Europe</h1>
        <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
          {`${stating} of the ${companies.length} companies on the list state a figure on their own pages. These are those figures, gross and in the company's own currency, for the roles they cover. The rest don't say, so they aren't here.`}
        </p>
        <p className="mt-3 max-w-[720px] font-sans text-[14px] leading-[1.55] text-muted">
          The euros a month column is for comparing only: a yearly figure divided by 12, a weekly one times 52 and
          divided by 12, and pounds, francs and złoty at fixed rates (£1 = €1.17, CHF 1 = €1.06, PLN 1 = €0.235). Where
          a company gives no period, there is no monthly figure. Last checked {longDate(checked)}.
        </p>

        <section aria-labelledby="countries" className="mt-8">
          <h2 id="countries" className="border-t-2 border-ink pt-3 text-[22px] font-bold">
            Per country
          </h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] font-sans text-[15px]">
              <thead>
                <tr className="border-b border-ink text-left text-[13px] text-muted">
                  <th className="py-1.5 pr-4 font-semibold">Country</th>
                  <th className="py-1.5 pr-4 font-semibold">Companies</th>
                  <th className="py-1.5 pr-4 font-semibold">Internships, €/month</th>
                  <th className="py-1.5 font-semibold">Graduate roles, €/month</th>
                </tr>
              </thead>
              <tbody>
                {perCountry.map((k) => (
                  <tr key={k.name} className="border-b border-line">
                    <td className="py-2 pr-4 font-semibold">{k.name}</td>
                    <td className="py-2 pr-4 tabular-nums">{k.n}</td>
                    <td className="py-2 pr-4 tabular-nums">{k.intern || <span className="text-dim">None stated</span>}</td>
                    <td className="py-2 tabular-nums">{k.grad || <span className="text-dim">None stated</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <List rows={all.Internship} id="internships" title="Internships and thesis roles" />
        <List rows={all.Graduate} id="graduate" title="Graduate roles and programmes" />

        <p className="mt-8 max-w-[720px] text-[16px] leading-[1.6] text-muted">
          Each company page links the page its figure came from. Seen a figure that is wrong or gone? Use the
          Something wrong? link on the role page.
        </p>
      </div>
    </Section>
  );
}
