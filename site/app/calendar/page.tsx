import type { Metadata } from "next";
import Section from "@/components/Section";
import { countries, radar } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { calendarLinks } from "@/lib/calendarLinks";
import { eventsFor, radarEvents } from "@/lib/ics";
import { today } from "@/lib/live";
import { og } from "@/lib/og";

export const metadata: Metadata = {
  title: "Deadlines in your calendar",
  description: "Subscribe to every internship deadline on internradar in Google Calendar, Apple Calendar or Outlook.",
  ...og("Internship deadlines in your calendar", "Subscribe to every internship deadline on internradar in Google Calendar, Apple Calendar or Outlook.", "calendar", "/calendar/"),
};

function Links({ path, name }: { path: string; name: string }) {
  const l = calendarLinks(path, name);
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1">
      <a href={l.google} className="link">
        Google Calendar
      </a>
      <a href={l.apple} className="link">
        Apple Calendar
      </a>
      <a href={l.outlook} className="link">
        Outlook
      </a>
      <a href={l.file} download className="link">
        Download .ics
      </a>
    </span>
  );
}

export default function CalendarPage() {
  const items = buildItems();
  const all = eventsFor(items).length + radarEvents(radar, today()).length;
  const perCountry = countries
    .map((k) => ({ ...k, n: eventsFor(items.filter((x) => x.country === k.code)).length }))
    .filter((k) => k.n > 0);

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[720px]">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[36px]">Deadlines in your calendar</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-muted">
          Subscribe once and every deadline and opening day shows up in your own calendar. When a company adds or
          moves a date, your calendar picks it up by itself, usually within a day. Roles without a date in the posting can&apos;t be in
          it, so keep an eye on the list as well.
        </p>

        <h2 className="mt-8 border-t-2 border-ink pt-3 text-[20px] font-bold">Everything</h2>
        <p className="mt-1 text-[15px] text-muted">{all} dates right now.</p>
        <div className="mt-2 text-[16px]">
          <Links path="/deadlines.ics" name="internradar deadlines" />
        </div>

        <h2 className="mt-8 border-t-2 border-ink pt-3 text-[20px] font-bold">By country</h2>
        <ul className="mt-2">
          {perCountry.map((k) => (
            <li key={k.code} className="border-t border-line py-2.5 text-[16px]">
              <span className="font-semibold">{k.name}</span>
              <span className="text-[14px] text-muted">, {k.n} {k.n === 1 ? "date" : "dates"}</span>
              <div className="mt-1 text-[15px]">
                <Links path={`/calendar/${k.slug}.ics`} name={`internradar ${k.name}`} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[14px] text-muted">
          Countries without a dated role right now are left out. Saved a few roles? The list on the front page can
          put just those in your calendar.
        </p>
      </div>
    </Section>
  );
}
