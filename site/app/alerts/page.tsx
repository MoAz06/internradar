import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import { companies, countries, links } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { calendarLinks } from "@/lib/calendarLinks";
import { og } from "@/lib/og";

const blurb = "Hear about new tech internships in Europe without checking the site: by RSS, in your calendar, or by email.";

export const metadata: Metadata = {
  title: "Alerts",
  description: blurb,
  alternates: { types: { "application/rss+xml": "/feeds/new.xml" } },
  ...og("Alerts for new internships", blurb, "alerts", "/alerts/"),
};

export default function AlertsPage() {
  const items = buildItems();
  const cal = calendarLinks("/deadlines.ics", "internradar deadlines");
  const perCountry = countries
    .map((k) => ({ ...k, n: items.filter((x) => x.country === k.code && x.status !== "closed").length }))
    .filter((k) => k.n > 0);

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[720px]">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[36px]">Alerts</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-muted">
          {links.newsletter ? "Three" : "Two"} ways to hear about new roles without checking the site. Pick the one you already use.
        </p>

        {links.newsletter && (
          <>
            <h2 className="mt-8 border-t-2 border-ink pt-3 text-[20px] font-bold">By email</h2>
            <p className="mt-1 text-[16px] leading-[1.55] text-muted">
              One email a week with the new roles and what closes soon. Nothing else, and you can leave with one click. Your address is kept by Buttondown, see{" "}
              <Link href="/privacy/" className="link">
                privacy
              </Link>
              .
            </p>
            <form
              action={`https://buttondown.com/api/emails/embed-subscribe/${links.newsletter}`}
              method="post"
              target="_blank"
              className="mt-3 flex max-w-[460px] gap-2"
              data-track="alerts-email"
            >
              <label htmlFor="alert-email" className="sr-only">
                Your email
              </label>
              <input
                id="alert-email"
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="min-w-0 flex-1 border border-line bg-surface px-3 py-2 text-[16px]"
              />
              <button type="submit" className="bg-ink px-4 py-2 text-[15px] font-semibold text-bg hover:bg-muted">
                Sign up
              </button>
            </form>
          </>
        )}

        <h2 className="mt-8 border-t-2 border-ink pt-3 text-[20px] font-bold">In your calendar</h2>
        <p className="mt-1 text-[16px] leading-[1.55] text-muted">
          Every deadline and opening day, kept up to date by itself.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[16px]">
          <a href={cal.google} className="link" data-track="subscribe-google">
            Google Calendar
          </a>
          <a href={cal.apple} className="link" data-track="subscribe-apple">
            Apple Calendar
          </a>
          <a href={cal.outlook} className="link" data-track="subscribe-outlook">
            Outlook
          </a>
        </p>
        <p className="mt-2 text-[15px] text-muted">
          One country or one company only?{" "}
          <Link href="/calendar/" className="link">
            Calendars per country
          </Link>
          , and every company page has its own.
        </p>

        <h2 className="mt-8 border-t-2 border-ink pt-3 text-[20px] font-bold">RSS</h2>
        <p className="mt-1 text-[16px] leading-[1.55] text-muted">
          A post for every role that&apos;s added to the list, and for every role that opens. Paste a link into a
          reader like Feedly, Inoreader or NetNewsWire.
        </p>
        <ul className="mt-2">
          <li className="border-t border-line py-2.5 text-[16px]">
            <a href="/feeds/new.xml" className="link font-semibold" data-track="feed-all">
              All new roles
            </a>
            <span className="text-[14px] text-muted">, every country</span>
          </li>
          <li className="border-t border-line py-2.5 text-[16px]">
            <a href="/feed.xml" className="link font-semibold" data-track="feed-edition">
              The weekly edition
            </a>
            <span className="text-[14px] text-muted">, one post each Monday with what closes this week and next</span>
          </li>
        </ul>
        <h3 className="mt-5 text-[15px] font-bold">Per country</h3>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-[15px]">
          {perCountry.map((k) => (
            <a key={k.code} href={`/feeds/${k.slug}.xml`} className="link" data-track={`feed-${k.slug}`}>
              {k.name}
            </a>
          ))}
        </p>
        <p className="mt-4 text-[15px] text-muted">
          Per company: every one of the {companies.length}{" "}
          <Link href="/companies/" className="link">
            company pages
          </Link>{" "}
          has a feed and a calendar under Follow.
        </p>
      </div>
    </Section>
  );
}
