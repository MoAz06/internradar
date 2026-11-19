import type { Metadata } from "next";
import Section from "@/components/Section";
import Today from "@/components/Today";
import { radar } from "@/data/companies";
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
    .map(({ id, key, slug, company, title, city, status, when, daysLeft, closes, added, fresh }) => ({
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
    }));
  const next = upcoming(radar, now).map(({ company, slug, role, opens }) => ({ company, slug, role, opens }));
  return (
    <Section className="pt-4 pb-16 sm:pt-8">
      <div className="max-w-[640px]">
        <Today items={items} next={next} built={now} />
      </div>
    </Section>
  );
}
