import Link from "next/link";
import Section from "@/components/Section";
import NewTab from "@/components/NewTab";
import RoleFinder from "@/components/RoleFinder";
import AddToCalendar from "@/components/AddToCalendar";
import { companies, countries, links, radar } from "@/data/companies";
import { today, upcoming } from "@/lib/live";
import { eventsFor, radarEvents, radarKey } from "@/lib/ics";
import { buildItems } from "@/lib/buildItems";

/** Drops a closing full stop, so a text can sit inside a sentence. */
const end = (s: string) => s.replace(/[.\s]+$/, "");

export default function Home() {
  const items = buildItems();
  const open = items.filter((x) => x.status === "open" || x.status === "rolling");
  const soon = items.filter((x) => x.status === "soon").length;
  const closing = open.filter((x) => x.daysLeft !== null);
  const lead = closing[0];
  const also = closing.slice(1, 5);
  const next = upcoming(radar);
  const now = today();
  // about as long as the "Closing first" column; the rest is on /radar/
  const RADAR_HOME = 4;
  const options = countries
    .map((k) => ({ code: k.code, name: k.name, slug: k.slug, count: items.filter((x) => x.country === k.code).length }))
    .filter((k) => k.count > 0);

  return (
    <>
      <Section className="pt-7 pb-8 sm:pt-9">
        <h1 className="max-w-[900px] text-[28px] leading-tight font-bold text-balance sm:text-[40px]">
          Tech internships in Europe, and how each company hires
        </h1>
        <p className="mt-3 max-w-[760px] text-[18px] leading-[1.55] text-muted text-pretty">
          I&apos;m a CS student in Leiden and I&apos;m applying too. This list shows when applications open, what
          the test looks like, how long you get, and when you can apply again after a rejection. Every line
          links to the company&apos;s own page, with the date it was checked. Right now {open.length} roles are
          open and {soon} open soon, at {companies.length} companies in {options.length} countries.
        </p>
        <p className="mt-3 text-[16px]">
          <Link href="/calendar/" className="link">
            Put every deadline in your calendar
          </Link>{" "}
          or read{" "}
          <Link href="/edition/" className="link">
            this week&apos;s edition
          </Link>
          .
        </p>

        <div className="mt-7 grid gap-7 border-t-2 border-ink pt-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-0">
          {/* the role that closes first, as the lead story */}
          <div className="lg:border-r lg:border-line lg:pr-7">
            <h2 className="text-[13px] font-bold text-claret">Closing first</h2>
            {lead ? (
              <article className="mt-2">
                <p className="text-[15px] font-semibold text-soon">{lead.when}</p>
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
                  <a href={lead.source} target="_blank" rel="noreferrer" className="link">
                    Read the posting
                    <NewTab />
                  </a>
                </p>
                <AddToCalendar events={eventsFor([lead])} file={`/cal/${lead.key}.ics`} className="mt-2 text-[15px]" />
              </article>
            ) : (
              <p className="mt-2 text-[17px] text-muted">No open role has a deadline right now.</p>
            )}
            {also.length > 0 && (
              <ul className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                {also.map((x) => (
                  <li key={x.id}>
                    <p className="text-[13px] font-semibold text-soon">{x.when}</p>
                    <p className="font-display text-[16px] leading-snug font-bold">
                      <Link href={`/companies/${x.slug}/`} className="hover:underline">
                        {x.company}
                      </Link>
                      : {x.title}
                    </p>
                    <p className="mt-0.5 text-[14px] text-muted">{x.city}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* what opens next */}
          <div id="radar" className="lg:pl-7">
            <h2 className="text-[13px] font-bold text-claret">On the radar</h2>
            <p className="mt-1 text-[15px] text-muted">What opens next. Put it in your calendar.</p>
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
                    <AddToCalendar events={radarEvents([r], now)} file={`/cal/r-${radarKey(r)}.ics`} className="mt-1 text-[13px]" />
                  </li>
                ))}
              </ul>
            )}
            {next.length > RADAR_HOME && (
              <p className="border-t border-line pt-2.5 text-[15px]">
                <Link href="/radar/" className="link font-semibold">
                  See all {next.length} on the radar
                </Link>
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section className="pb-10">
        <h2 className="mb-3 border-t-2 border-ink pt-3 text-[24px] font-bold">All roles</h2>
        <RoleFinder items={items} countries={options} />
      </Section>

      <Section className="pb-14">
        <p className="border-t border-line pt-4 text-[16px] text-muted">
          Went through one of these processes?{" "}
          <a href={links.shareProcess} target="_blank" rel="noreferrer" className="link">
            Share how it went
            <NewTab />
          </a>
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
