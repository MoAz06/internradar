import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import JsonLd from "@/components/JsonLd";
import { radar } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { buildItems } from "@/lib/buildItems";
import { longDate } from "@/lib/format";
import { roleHref, type Item } from "@/lib/items";
import { today, upcoming } from "@/lib/live";
import { og } from "@/lib/og";
import { breadcrumbs } from "@/lib/schema";
import { toolWords } from "@/lib/tests";

// The questions people ask a search box or a chatbot, each answered in one plain sentence from the night's data,
// then the list behind it. Rebuilt with the rest of the site, so the sentences stay true.

const blurb =
  "Which tech internships in Europe pay the most, which companies let you apply again after a rejection, which online tests they name, what opens next and what closes this week. Answered from the list, updated every night.";

export const metadata: Metadata = {
  title: "Internship questions, answered from the data",
  description: blurb,
  alternates: { canonical: "/answers/" },
  ...og("Internship questions, answered", blurb, "stats", "/answers/"),
};

const isOpen = (x: Item) => x.status === "open" || x.status === "rolling";
const list = (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

function Question({ id, q, children }: { id: string; q: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 border-t-2 border-ink pt-3">
      <h2 className="text-[22px] leading-tight font-bold">{q}</h2>
      <div className="mt-2 max-w-[720px] text-[17px] leading-[1.6]">{children}</div>
    </section>
  );
}

function Roles({ items, note }: { items: Item[]; note?: (x: Item) => string }) {
  return (
    <ul className="mt-3">
      {items.map((x) => (
        <li key={x.key} className="border-t border-line py-2 text-[16px] leading-[1.5] first:border-t-0">
          <Link href={roleHref(x.key)} className="link font-semibold">
            {x.title}
          </Link>{" "}
          at {x.company}, {x.city}
          {note ? <span className="text-muted">. {note(x)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export default function AnswersPage() {
  const now = today();
  const items = buildItems(now);
  const open = items.filter(isOpen);

  // pay: one line per company and title, the highest stated monthly figure first
  const seen = new Set<string>();
  const paid = open
    .filter((x) => x.pay?.month)
    .sort((a, b) => (b.pay!.month ?? 0) - (a.pay!.month ?? 0))
    .filter((x) => !seen.has(`${x.slug}|${x.title}`) && seen.add(`${x.slug}|${x.title}`))
    .slice(0, 12);
  const withPay = new Set(open.filter((x) => x.pay).map((x) => x.slug)).size;

  // re-apply rules, by what they mean for you
  const wait = reapplyRules.filter((r) => r.group === "wait").sort((a, b) => (b.waitMonths ?? 0) - (a.waitMonths ?? 0));
  const season = reapplyRules.filter((r) => r.group === "season");
  const test = reapplyRules.filter((r) => r.group === "test");
  const welcome = reapplyRules.filter((r) => r.group === "welcome");

  // online tests: which companies name which tool
  const byTool = new Map<string, Set<string>>();
  for (const x of items) for (const t of x.tests) byTool.set(t, (byTool.get(t) ?? new Set()).add(x.company));
  const tools = [...byTool].sort((a, b) => b[1].size - a[1].size);
  const naming = new Set(items.filter((x) => x.tests.length).map((x) => x.slug)).size;

  const next = upcoming(radar, now).slice(0, 10);
  const week = open.filter((x) => x.daysLeft !== null && x.daysLeft >= 0 && x.daysLeft <= 7).sort((a, b) => (a.closes ?? "").localeCompare(b.closes ?? ""));
  const rights = open.filter((x) => x.workRights);
  const rightsBy = [...rights.reduce((m, x) => m.set(x.countryName, (m.get(x.countryName) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <JsonLd data={breadcrumbs([{ name: "internradar", path: "/" }, { name: "Questions, answered", path: "/answers/" }])} />
      <h1 className="text-[28px] leading-tight font-bold sm:text-[40px]">Internship questions, answered from the data</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">
        Each answer comes from the list as it stood on {longDate(now)}: {open.length} roles open at {new Set(open.map((x) => x.slug)).size} companies.
        Every figure links to the role or company it came from.
      </p>

      <div className="mt-8 space-y-8">
        <Question id="pay" q="Which tech internships in Europe pay the most?">
          {paid[0] ? (
            <p>
              Of the {withPay} companies that state pay, {paid[0].company} states the most: {paid[0].pay!.label.replace(/\.?$/, "")} for its{" "}
              {paid[0].title} in {paid[0].city}, about {paid[0].pay!.short.replace(/^≈ /, "")}. The full comparison, per country, is on the{" "}
              <Link href="/pay/" className="link">
                pay page
              </Link>
              .
            </p>
          ) : (
            <p>No open role states its pay right now.</p>
          )}
          <Roles items={paid} note={(x) => x.pay!.label} />
        </Question>

        <Question id="reapply" q="Can you apply again after a rejection?">
          <p>
            Usually, but {wait.length + season.length + test.length} companies limit it on their own pages: {wait.length} make you wait a set time
            {wait[0]?.waitMonths ? ` (the longest is ${wait[0].company}, ${wait[0].waitMonths} months)` : ""}, {season.length} say next season, {test.length}{" "}
            {test.length === 1 ? "allows" : "allow"} one test per cycle. {welcome.length} say outright that you can apply again. Every rule, word for word with its source,
            is on the{" "}
            <Link href="/reapply/" className="link">
              re-apply page
            </Link>
            .
          </p>
          <ul className="mt-3">
            {wait.map((r) => (
              <li key={r.slug} className="border-t border-line py-2 text-[16px] leading-[1.5] first:border-t-0">
                <Link href={`/companies/${r.slug}/`} className="link font-semibold">
                  {r.company}
                </Link>
                : {r.rule}
              </li>
            ))}
          </ul>
        </Question>

        <Question id="tests" q="Which online tests do the companies use?">
          <p>
            {naming} companies name the test in their own hiring steps.{" "}
            {tools.length > 0 ? `${tools[0][0]} is named most, by ${tools[0][1].size} companies.` : ""} The rest, by tool:
          </p>
          <ul className="mt-3">
            {tools.map(([tool, cos]) => (
              <li key={tool} className="border-t border-line py-2 text-[16px] leading-[1.5] first:border-t-0">
                <span className="font-semibold">{toolWords(tool)}</span>, {cos.size} {cos.size === 1 ? "company" : "companies"}: {list([...cos].sort())}
              </li>
            ))}
          </ul>
        </Question>

        <Question id="opening" q="Which programmes open next?">
          <p>
            {next.length > 0 ? `${next[0].company} is next, ${next[0].opens}.` : "Nothing is marked as opening soon."} Everything on the radar, with what to expect
            from last season, is on the{" "}
            <Link href="/radar/" className="link">
              radar page
            </Link>
            .
          </p>
          <ul className="mt-3">
            {next.map((r) => (
              <li key={`${r.slug}|${r.role}`} className="border-t border-line py-2 text-[16px] leading-[1.5] first:border-t-0">
                <Link href={`/companies/${r.slug}/`} className="link font-semibold">
                  {r.company}
                </Link>
                , {r.role}: {r.opens}
              </li>
            ))}
          </ul>
        </Question>

        <Question id="closing" q="Which internships close this week?">
          <p>
            {week.length} open {week.length === 1 ? "role closes" : "roles close"} in the next seven days. The{" "}
            <Link href="/edition/" className="link">
              weekly edition
            </Link>{" "}
            has them with what opens next, and the same list goes out by email every Monday.
          </p>
          <Roles items={week.slice(0, 12)} note={(x) => (x.closes ? `Last day ${longDate(x.closes)}` : x.when)} />
        </Question>

        <Question id="visa" q="Which companies ask for the right to work already?">
          <p>
            {rights.length} open roles say on the posting or the company page that you need the right to work there already, or that the company
            doesn&apos;t sponsor visas{rightsBy[0] ? `, most of them in ${list(rightsBy.slice(0, 3).map(([k, n]) => `${k} (${n})`))}` : ""}. The visa filter on the
            front page leaves them out.
          </p>
        </Question>
      </div>
    </Section>
  );
}
