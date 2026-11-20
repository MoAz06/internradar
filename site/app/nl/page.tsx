import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import RoleList from "@/components/RoleList";
import EmailSignup from "@/components/EmailSignup";
import { companies, countries } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { buildItems } from "@/lib/buildItems";
import { cityPages } from "@/lib/landing";
import { og } from "@/lib/og";

// The Netherlands on one short link: every Dutch role, the cities, and what Dutch companies say about a second try.

const CODE = "NL";
const NAME = "Netherlands";

const here = () => buildItems().filter((x) => x.country === CODE && x.status !== "closed");
const describe = (n: number, m: number) =>
  `${n} tech internships and graduate roles in the ${NAME} that are open or open soon, at ${m} companies, each with the hiring process.`;

export function generateMetadata(): Metadata {
  const items = here();
  const d = describe(items.length, new Set(items.map((x) => x.slug)).size);
  const title = `Tech internships in the ${NAME}`;
  return { title, description: d, alternates: { canonical: "/nl/" }, ...og(title, d, "nl", "/nl/") };
}

function Cities({ className = "" }: { className?: string }) {
  const list = cityPages().filter((p) => p.countryName === NAME);
  if (list.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {list.map((p) => (
        <li key={p.slug}>
          <Link
            href={`/cities/${p.slug}/`}
            className="inline-flex min-h-11 items-center gap-1.5 border border-line bg-surface px-3 text-[15px] hover:border-ink"
          >
            {p.city}
            <span className="text-[13px] text-dim tabular-nums">{p.items.length}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function NetherlandsPage() {
  const items = here();
  const open = items.filter((x) => x.status !== "soon");
  const soon = items.filter((x) => x.status === "soon");
  const nCompanies = new Set(items.map((x) => x.slug)).size;
  const dutch = new Set(companies.filter((c) => c.country === CODE).map((c) => c.slug));
  const rules = reapplyRules.filter((r) => dutch.has(r.slug));
  const strict = rules.filter((r) => r.group !== "welcome");
  const welcome = rules.filter((r) => r.group === "welcome" && !/^no rule/i.test(r.rule)).map((r) => r.company).sort((a, b) => a.localeCompare(b));
  const others = countries
    .filter((k) => k.code !== CODE)
    .map((k) => ({ ...k, n: buildItems().filter((x) => x.country === k.code && x.status !== "closed").length }))
    .filter((k) => k.n > 0)
    .sort((a, b) => b.n - a.n);

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <p className="text-[14px] font-bold text-accent">{NAME}</p>
      <h1 className="mt-1 text-[28px] leading-tight font-bold sm:text-[40px]">Tech internships and graduate roles in the {NAME}</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        {describe(items.length, nCompanies)} Deadlines first. The company pages have the interview steps and the re-apply rule.
      </p>
      {/* on phones the list comes first, so the cities wait in the second column */}
      <Cities className="mt-4 max-lg:hidden" />

      <div className="mt-7 grid grid-cols-1 gap-8 border-t-2 border-ink pt-4 lg:grid-cols-2 lg:gap-0">
        <div className="lg:border-r lg:border-line lg:pr-7">
          <h2 className="text-[20px] font-bold">Open now ({open.length})</h2>
          <RoleList list={open} empty={`Nothing open in the ${NAME} right now.`} />
        </div>
        <div className="lg:pl-7">
          <div className="mb-7 lg:hidden">
            <h2 className="text-[20px] font-bold">By city</h2>
            <Cities className="mt-2" />
          </div>
          <h2 className="text-[20px] font-bold">Opening soon ({soon.length})</h2>
          <RoleList list={soon} empty="No role here is marked as opening soon." />

          {rules.length > 0 && (
            <div className="mt-7 border border-line bg-surface px-4 py-3.5">
              <h2 className="text-[18px] font-bold">After a rejection</h2>
              <p className="mt-1 text-[15px] leading-normal text-muted">What Dutch companies say on their own pages about a second try.</p>
              <ul className="mt-2">
                {strict.map((r) => (
                  <li key={r.slug} className="border-t border-line first:border-t-0">
                    <Link href={`/companies/${r.slug}/`} className="group block py-2 text-[15px] leading-[1.45]">
                      <span className="font-display font-bold group-hover:underline">{r.company}</span>
                      <span className="block">{r.rule}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {welcome.length > 0 && (
                <p className="mt-2 text-[15px] leading-normal text-muted">
                  {welcome.length === 1 ? welcome[0] : `${welcome.slice(0, -1).join(", ")} and ${welcome.at(-1)}`} say you can apply again.
                </p>
              )}
              <Link href="/reapply/" className="link inline-flex min-h-11 items-center text-[15px]">
                All re-apply rules
              </Link>
            </div>
          )}

          <div className="mt-7 border border-line bg-surface px-4 py-3.5">
            <h2 className="text-[18px] font-bold">Every Monday in your inbox</h2>
            <p className="mt-1 text-[15px] leading-normal text-muted">What closes that week and what is new, in one email. Or put every Dutch deadline in your calendar.</p>
            <EmailSignup id="nl-email" track="nl-email" edition={NAME} className="mt-3" />
            <a href="/calendar/netherlands.ics" className="link inline-flex min-h-11 items-center text-[15px]" data-track="nl-calendar">
              Calendar feed for the {NAME}
            </a>
          </div>

          <h2 className="mt-7 border-t border-ink pt-3 text-[20px] font-bold">Other countries</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
            {others.map((k) => (
              <Link key={k.code} href={`/?country=${k.slug}`} className="link inline-flex min-h-11 items-center">
                {k.name}
              </Link>
            ))}
          </p>
        </div>
      </div>
    </Section>
  );
}
