import type { Metadata } from "next";
import Section from "@/components/Section";
import FollowDone from "@/components/FollowDone";
import { companies } from "@/data/companies";

export const metadata: Metadata = {
  title: "Company emails",
  description: "Confirm or stop the email you get when a company opens a role.",
  robots: { index: false },
};

/** Where the confirm and stop links in the emails end up. The Worker has done the work; this page says what happened. */
export default function FollowPage() {
  const names = Object.fromEntries(companies.map((c) => [c.slug, c.name]));
  return (
    <Section className="pt-10 pb-16 sm:pt-14">
      <div className="max-w-[620px]">
        <FollowDone names={names} />
      </div>
    </Section>
  );
}
