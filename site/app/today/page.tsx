import type { Metadata } from "next";
import Section from "@/components/Section";
import Today from "@/components/Today";
import { companies, countries, radar } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { today, upcoming } from "@/lib/live";
import { og } from "@/lib/og";

const blurb = "Your saved deadlines, what closes this week, what's new since your last visit and what opens next.";

export const metadata: Metadata = {
  title: "Today",
  description: blurb,
  robots: { index: false },
  ...og("Today", blurb, "home", "/today/"),
};

/** The installed app opens here (start_url in app/manifest.ts). */
export default function TodayPage() {
  const now = today();
  const items = buildItems(now)
    .filter((x) => x.status !== "closed")
    .map(({ id, key, slug, company, title, city, status, when, daysLeft, closes, added, fresh, country, kind, levels, workRights, languages }) => ({
      id,
      key,
      slug,
      company,
      title,
      city,
      status,
      when,
      daysLeft,
      closes,
      added,
      fresh,
      country,
      kind,
      levels,
      workRights,
      languages,
    }));
  const next = upcoming(radar, now).map(({ company, slug, role, opens }) => ({ company, slug, role, opens }));
  return (
    <Section className="pt-4 pb-16 sm:pt-8">
      <div className="max-w-[640px]">
        <Today items={items} next={next} built={now} names={Object.fromEntries(companies.map((c) => [c.slug, c.name]))}
          countryNames={Object.fromEntries(countries.map((k) => [k.code, k.name]))}
        />
      </div>
    </Section>
  );
}
