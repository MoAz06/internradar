import { shareUrl } from "@/lib/share";
import Link from "next/link";
import Section from "@/components/Section";
import NewTab from "@/components/NewTab";
import RoleFinder from "@/components/RoleFinder";
import HomeSearch from "@/components/HomeSearch";
import AddToCalendar from "@/components/AddToCalendar";
import { companies, countries, links, radar } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { longDate } from "@/lib/format";
import { today, upcoming } from "@/lib/live";
import { eventsFor } from "@/lib/ics";
import { buildItems } from "@/lib/buildItems";
import type { Item } from "@/lib/items";

/** Drops a closing full stop, so a text can sit inside a sentence. */
const end = (s: string) => s.replace(/[.\s]+$/, "");

/** The re-apply story leads the front page until this day, then "Closing first" is back on top. */
const STORY_UNTIL = "2026-12-15";
/** About as long as the left column; the rest is on /radar/. */
const RADAR_HOME = 4;

/** The same role at one company in several cities becomes one entry: "Amsterdam and London". */
function merge(list: Item[]): (Item & { cities: string })[] {
  const out: (Item & { cities: string })[] = [];
  for (const x of list) {
    const same = out.find((o) => o.company === x.company && o.title === x.title && o.when === x.when);
    if (same) {
      if (!same.cities.includes(x.city)) same.cities = `${same.cities.replace(" and ", ", ")} and ${x.city}`;
    } else out.push({ ...x, cities: x.city });
  }
  return out;
}

/** Short versions of the strictest rules, for the front page. The full ones are on /reapply/. */
const strictest: [slug: string, short: string][] = [
  ["optiver", "8 months, any office, even after just the online test"],
  ["helsing-munich", "6 months"],
  ["bending-spoons-milan", "1 year for a similar job"],
  ["da-vinci-trading", "the test only once"],
];

function ReapplyStory() {
  const shell = reapplyRules.find((r) => r.slug === "shell")!;
  const welcome = reapplyRules.filter((r) => r.group === "welcome");
  return (
    <article>
      <h2 className="text-[13px] font-bold text-claret">Re-apply rules</h2>
      <p className="font-display mt-1.5 text-[24px] leading-snug font-bold text-balance sm:text-[30px]">
        Rejected by Shell? Apply again within 10 months and it&apos;s turned down automatically
      </p>
      <blockquote className="mt-3 border-l-[3px] border-claret pl-3.5 text-[16px] leading-[1.55] italic">
        &ldquo;your application will be automatically regretted.&rdquo;
      </blockquote>
      <p className="mt-1 text-[13px] text-dim">
        <a href={shell.url} target="_blank" rel="noreferrer" className="link">
          Shell graduate programme page
          <NewTab />
        </a>
        , on a second application within 10 months of a rejection. Checked {longDate(shell.checked)}.
      </p>
      <p className="mt-3 text-[17px] leading-[1.6] text-muted">
        Only {reapplyRules.length} companies on the list say when you can try again. These are the strictest:
      </p>
      <ul className="mt-2 border-t border-line text-[15px]">
        {strictest.map(([slug, short]) => {
          const r = reapplyRules.find((x) => x.slug === slug)!;
          return (
            <li key={slug} className="flex justify-between gap-3 border-b border-line py-1.5">
              <Link href={`/companies/${r.slug}/`} className="font-semibold hover:underline">
                {r.company}
              </Link>
              <span className="text-right text-muted">{short}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[17px] leading-[1.6] text-muted">
        And the other side: {welcome.length} companies say you&apos;re welcome to try again and give no waiting time,
        among them Tesla, ASML, Rabobank and Swisscom.
      </p>
      <p className="mt-2 text-[16px] font-semibold">
        <Link href="/reapply/" className="link">
          All {reapplyRules.length} re-apply rules, with sources
        </Link>
      </p>
    </article>
  );
}

function LeadRole({ lead }: { lead: Item }) {
  return (
    <article>
      <h2 className="text-[13px] font-bold text-claret">Closing first</h2>
      <p className="mt-2 text-[15px] font-semibold text-soon">{lead.when}</p>
      <h3 className="mt-1 text-[24px] leading-snug font-bold sm:text-[28px]">
        <Link href={`/companies/${lead.slug}/`} className="hover:underline">
          {lead.company}
        </Link>
        : {lead.title}
      </h3>
      <p className="mt-2 text-[17px] leading-[1.6] text-muted">
        {lead.city}, {lead.countryName}.{" "}
        {/^not stated/i.test(lead.process) ? "The process isn't described." : `Process: ${end(lead.process)}.`}
        {lead.reapply ? ` Re-apply rule: ${end(lead.reapply)}.` : ""}{" "}
        <a href={lead.source} target="_blank" rel="noreferrer" className="link" data-track="posting-lead">
          Read the posting
          <NewTab />
        </a>
      </p>
      <AddToCalendar events={eventsFor([lead])} file={`/cal/${lead.key}.ics`} className="mt-2 text-[15px]" />
    </article>
  );
}

export default function Home() {
  const now = today();
  const items = buildItems(now);
  const open = items.filter((x) => x.status === "open" || x.status === "rolling");
  const soon = items.filter((x) => x.status === "soon").length;
  const closing = open.filter((x) => x.daysLeft !== null);
  const story = now <= STORY_UNTIL;
  const lead = story ? undefined : closing[0];
  const also = merge(story ? closing : closing.slice(1)).slice(0, 4);
  const next = upcoming(radar, now);
  const options = countries
    .map((k) => ({ code: k.code, name: k.name, slug: k.slug, count: items.filter((x) => x.country === k.code).length }))
    .filter((k) => k.count > 0);
  // country buttons: open roles only, the Netherlands first, then the biggest
  const openBy = countries
    .map((k) => ({ name: k.name, slug: k.slug, open: open.filter((x) => x.country === k.code).length }))
    .filter((k) => k.open > 0)
    .sort((a, b) => Number(b.slug === "netherlands") - Number(a.slug === "netherlands") || b.open - a.open)
    .slice(0, 5);

  return (
    <>
      {/* phones get the list first: one line on top, the stories and the radar move below the list */}
      <Section className="pt-6 pb-8 max-md:pt-3 max-md:pb-3 sm:pt-8">
        <h1 className="max-w-[900px] text-[26px] leading-tight font-bold text-balance max-md:text-[15px] max-md:leading-snug max-md:font-normal max-md:text-muted sm:text-[38px]">
          Tech internships in Europe, and how each company hires
        </h1>
        <p className="mt-2.5 max-w-[720px] text-[17px] leading-[1.55] text-muted text-pretty max-md:hidden">
          Deadlines, tests, and when you can apply again after a rejection, straight from each company&apos;s own
          page. I&apos;m a CS student in Leiden and I&apos;m applying too.
        </p>
        <p className="mt-2 text-[14px] text-dim max-md:hidden">
          <b className="font-semibold text-ink">{open.length}</b> open now · <b className="font-semibold text-ink">{soon}</b>{" "}
          opening soon · <b className="font-semibold text-ink">{companies.length}</b> companies ·{" "}
          <b className="font-semibold text-ink">{options.length}</b> countries
        </p>

        <HomeSearch countries={openBy} total={options.length} />

        <div className="mt-6 grid gap-7 border-t-2 border-ink pt-4 max-md:hidden lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-0">
          <div className="lg:border-r lg:border-line lg:pr-7">
            {story ? <ReapplyStory /> : lead ? <LeadRole lead={lead} /> : null}
            {!story && !lead && <p className="text-[17px] text-muted">No open role has a deadline right now.</p>}
            {also.length > 0 && (
              <div className="mt-6 border-t-2 border-ink pt-3">
                <h2 className="text-[13px] font-bold text-claret">{story ? "Closing first" : "Closing soon"}</h2>
                <ul className="mt-2 grid gap-4 sm:grid-cols-2">
                  {also.map((x) => (
                    <li key={x.id}>
                      <p className="text-[13px] font-semibold text-soon">{x.when}</p>
                      <p className="font-display text-[16px] leading-snug font-bold">
                        <Link href={`/companies/${x.slug}/`} className="hover:underline">
                          {x.company}
                        </Link>
                        : {x.title}
                      </p>
                      <p className="mt-0.5 text-[14px] text-muted">{x.cities}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* what opens next */}
          <div id="radar" className="lg:pl-7">
            <h2 className="text-[13px] font-bold text-claret">On the radar</h2>
            {next.length === 0 ? (
              <p className="mt-3 text-[15px] text-muted">Nothing with a known date right now.</p>
            ) : (
              <ul className="mt-2">
                {next.slice(0, RADAR_HOME).map((r) => (
                  <li key={r.sortKey + r.role} className="border-t border-line py-2.5 text-[15px] leading-snug">
                    <span className="font-semibold">{r.opens}</span>
                    {", "}
                    <Link href={`/companies/${r.slug}/`} className="link">
                      {r.company}
                    </Link>
                    {", "}
                    {r.role}
                    <span className="block text-[13px] text-muted">{r.expect}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="border-t border-line pt-2.5 text-[15px]">
              {next.length > RADAR_HOME && (
                <>
                  <Link href="/radar/" className="link font-semibold">
                    See all {next.length} on the radar
                  </Link>
                  {" · "}
                </>
              )}
              <Link href="/calendar/" className="link">
                every date in your calendar
              </Link>
            </p>
          </div>
        </div>
      </Section>

      <Section className="pb-10">
        <h2 className="mb-3 border-t-2 border-ink pt-3 text-[24px] font-bold max-md:sr-only">All roles</h2>
        <RoleFinder items={items} countries={options} />
      </Section>

      <Section className="pb-14">
        <div className="mb-5 border-t-2 border-ink pt-3 text-[16px] leading-[1.5] md:hidden">
          <p>
            {story
              ? "Rejected by Shell? Apply again within 10 months and it's turned down automatically. "
              : "When can you apply again after a rejection? "}
            <Link href="/reapply/" className="link font-semibold">
              Re-apply rules
            </Link>
          </p>
          {next[0] && (
            <p className="mt-2">
              Opening next: {next[0].company}, {next[0].opens}.{" "}
              <Link href="/radar/" className="link font-semibold">
                All {next.length} on the radar
              </Link>
            </p>
          )}
        </div>
        <p className="border-t border-line pt-4 text-[16px] text-muted">
          Went through one of these processes?{" "}
          <Link href={shareUrl()} className="link">
            Share how it went
          </Link>
          , it helps the next person. How the list works is on the{" "}
          <Link href="/about/" className="link">
            about page
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
