import type { Metadata } from "next";
import { shareUrl } from "@/lib/share";
import Link from "next/link";
import Section from "@/components/Section";
import NewTab from "@/components/NewTab";
import EmailSignup from "@/components/EmailSignup";
import RoleFinder from "@/components/RoleFinder";
import { companies, countries, links, radar } from "@/data/companies";
import { reapplyRules } from "@/data/reapply";
import { longDate } from "@/lib/format";
import { today, upcoming } from "@/lib/live";
import { buildItems } from "@/lib/buildItems";
import { startView } from "@/lib/rows";

/** What people type into Google is "tech internships" and "tech internships london", so the home page says that
 * in its title. The count comes from the night's build, like the headline. */
export function generateMetadata(): Metadata {
  const items = buildItems(today());
  const open = items.filter((x) => x.status === "open" || x.status === "rolling").length;
  const countries = new Set(items.map((x) => x.country)).size;
  return {
    title: { absolute: "Tech internships in Europe 2027 - internradar" },
    description: `${open} tech internships and graduate roles open in ${countries} European countries, with the deadline, the hiring process and when you can apply again after a rejection.`,
    alternates: { canonical: "/" },
  };
}

/** The re-apply story leads the side column until this day. */
const STORY_UNTIL = "2026-12-15";
const RADAR_HOME = 4;

/** Short versions of the strictest rules, for the front page. The full ones are on /reapply/. */
const strictest: [slug: string, short: string][] = [
  ["optiver", "8 months, any office, even after just the online test"],
  ["helsing-munich", "6 months"],
  ["bending-spoons-milan", "1 year for a similar job"],
  ["da-vinci-trading", "the test only once"],
];

type Week = { fresh: number; closing: number };

/** What the Monday email is, with this week's numbers, so the sign-up says what you'd get. */
function MondayMail({ week, id }: { week: Week; id: string }) {
  return (
    <>
      <p className="mt-2 text-[15px] leading-[1.5] text-muted">
        One email on Monday: what closes that week, what is new and what opens soon. Right now{" "}
        <b className="font-semibold text-ink">{week.closing}</b> {week.closing === 1 ? "role closes" : "roles close"} within a week and{" "}
        <b className="font-semibold text-ink">{week.fresh}</b> {week.fresh === 1 ? "is" : "are"} new.{" "}
        <Link href="/edition/" className="link">
          See this week&apos;s
        </Link>
      </p>
      <EmailSignup id={id} track={id} className="mt-2.5" note={false} />
      <p className="mt-1.5 text-[13px] leading-snug text-dim">
        Sent by Buttondown. Unsubscribe any time.{" "}
        <Link href="/privacy/" className="link">
          Privacy
        </Link>
      </p>
    </>
  );
}

/** Desktop's side column: the re-apply rules, the Monday email, what opens next, and who makes the list. Below the list on tablets. */
function Rail({ story, next, week }: { story: boolean; next: ReturnType<typeof upcoming>; week: Week }) {
  const shell = reapplyRules.find((r) => r.slug === "shell")!;
  const head = (title: string, more?: { href: string; label: string }) => (
    <h2 className="flex items-baseline justify-between border-t-2 border-ink pt-2.5 font-sans text-[13px] font-bold text-accent">
      {title}
      {more && (
        <Link href={more.href} className="font-normal text-link underline underline-offset-2">
          {more.label}
        </Link>
      )}
    </h2>
  );
  return (
    // a labelled section, not an aside: it sits inside main, and an aside there confuses screen reader landmarks
    <section aria-label="More on internradar" className="grid gap-x-8 gap-y-7 max-md:hidden md:mt-10 md:grid-cols-2 lg:mt-0 lg:grid-cols-1 lg:content-start">
      <section>
        {head("Re-apply rules", { href: "/reapply/", label: `All ${reapplyRules.length}` })}
        {story ? (
          <>
            <p className="font-display mt-2 text-[19px] leading-snug font-bold text-balance">
              Rejected by Shell? Apply again within 10 months and it&apos;s turned down automatically.
            </p>
            <p className="mt-1.5 text-[14px] leading-[1.5] text-muted">
              From the{" "}
              <a href={shell.url} target="_blank" rel="noreferrer" className="link">
                Shell graduate programme page
                <NewTab />
              </a>
              . Checked {longDate(shell.checked)}.
            </p>
          </>
        ) : (
          <p className="mt-2 text-[15px] leading-[1.5] text-muted">When you can apply again after a rejection. The strictest:</p>
        )}
        <ul className="mt-2 font-sans text-[14px]">
          {strictest.map(([slug, short]) => {
            const r = reapplyRules.find((x) => x.slug === slug)!;
            return (
              <li key={slug} className="flex justify-between gap-3 border-b border-line py-1.5">
                <Link href={`/companies/${r.slug}/`} className="hover:underline">
                  {r.company}
                </Link>
                <span className="text-right text-muted">{short}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {links.newsletter && (
        <section>
          {head("The Monday email")}
          <MondayMail week={week} id="home-email" />
        </section>
      )}

      <section id="radar">
        {head("Opens next", next.length ? { href: "/radar/", label: `All ${next.length}` } : undefined)}
        {next.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted">Nothing with a known date right now.</p>
        ) : (
          <ul>
            {next.slice(0, RADAR_HOME).map((r) => (
              <li key={r.sortKey + r.role} className="border-b border-line py-2">
                <Link href={`/companies/${r.slug}/`} className="block hover:underline">
                  <span className="block font-sans text-[12px] font-semibold text-accent">{r.opens}</span>
                  <span className="text-[15px] leading-snug">
                    <b>{r.company}</b>: {r.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 font-sans text-[14px]">
          <Link href="/calendar/" className="link">
            Every date in your calendar
          </Link>
        </p>
      </section>

      <section>
        {head("From a student in Leiden")}
        <p className="mt-2 text-[15px] leading-[1.55] text-muted">
          Deadlines, tests, and when you can apply again after a rejection, straight from each company&apos;s own page.
          I&apos;m a CS student in Leiden and I&apos;m applying too.{" "}
          <Link href="/about/" className="link">
            How the list works
          </Link>
        </p>
      </section>
    </section>
  );
}

export default function Home() {
  const now = today();
  const items = buildItems(now);
  const open = items.filter((x) => x.status === "open" || x.status === "rolling");
  const fresh = items.filter((x) => x.fresh).length;
  const week: Week = { fresh, closing: open.filter((x) => x.urgent).length };
  const story = now <= STORY_UNTIL;
  const next = upcoming(radar, now);
  const options = countries
    .map((k) => ({
      code: k.code,
      name: k.name,
      slug: k.slug,
      count: items.filter((x) => x.country === k.code).length,
      open: open.filter((x) => x.country === k.code).length,
    }))
    .filter((k) => k.count > 0);

  return (
    <>
      {/* the list first, on every screen: the headline on top, the stories beside the list (or below it on phones) */}
      <Section className="pt-5 pb-10 max-md:pt-3 max-md:pb-6">
        <div className="mb-5 max-md:mb-4">
          <h1 className="text-[32px] leading-tight font-bold text-balance max-md:text-[24px]">
            <span className="text-accent">{open.length}</span> tech internships and graduate roles open in Europe
          </h1>
          <p className="mt-1.5 max-w-[720px] text-[19px] leading-[1.45] text-muted max-md:text-[17px]">
            With each company&apos;s hiring steps, its rule on applying again and the pay, taken from its own pages.
          </p>
          <p className="mt-1.5 font-sans text-[15px] text-muted max-md:text-[14px]">
            <b className="font-semibold text-ink">{fresh}</b> new this week · <b className="font-semibold text-ink">{companies.length}</b> companies ·{" "}
            <b className="font-semibold text-ink">{options.length}</b> countries
            {links.newsletter && (
              <span className="md:hidden">
                {" "}
                ·{" "}
                <a href="#monday-email" className="link">
                  by email
                </a>
              </span>
            )}
          </p>
        </div>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
          <div className="min-w-0">
            <RoleFinder view={startView(items, now)} countries={options} now={now} />
          </div>
          <Rail story={story} next={next} week={week} />
        </div>
      </Section>

      <Section className="pb-14">
        {/* phones have no side column: the email, the re-apply story and what opens next come after the list,
            so the first roles fit on the first screen */}
        {links.newsletter && (
          <section id="monday-email" className="mb-6 scroll-mt-4 border-t-2 border-ink pt-3 md:hidden">
            <h2 className="font-sans text-[13px] font-bold text-accent">The Monday email</h2>
            <MondayMail week={week} id="home-email-phone" />
          </section>
        )}
        <p className="mb-5 border-t-2 border-ink pt-3 text-[16px] leading-[1.5] md:hidden">
          {story
            ? "Rejected by Shell? Apply again within 10 months and it's turned down automatically. "
            : "When can you apply again after a rejection? "}
          <Link href="/reapply/" className="link font-semibold">
            All {reapplyRules.length} re-apply rules
          </Link>
        </p>
        {next[0] && (
          <p className="mb-5 border-t-2 border-ink pt-3 text-[16px] leading-[1.5] md:hidden">
            Opening next: {next[0].company}, {next[0].opens}.{" "}
            <Link href="/radar/" className="link font-semibold">
              All {next.length} on the radar
            </Link>
          </p>
        )}
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
