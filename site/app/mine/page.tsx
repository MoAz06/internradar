import type { Metadata } from "next";
import Section from "@/components/Section";
import MyRoles, { type Waits } from "@/components/MyRoles";
import Reminders from "@/components/Reminders";
import { reapplyRules } from "@/data/reapply";
import { buildItems } from "@/lib/buildItems";
import { og } from "@/lib/og";

const blurb = "The roles you saved, where each application stands, and when you can apply again after a rejection.";

export const metadata: Metadata = {
  title: "My applications",
  description: blurb,
  robots: { index: false },
  ...og("My applications", blurb, "home", "/mine/"),
};

export default function MinePage() {
  const waits: Waits = {};
  for (const r of reapplyRules)
    if (r.waitMonths || r.waitDays) waits[r.company] = { months: r.waitMonths, days: r.waitDays };
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <h1 className="text-[28px] leading-tight font-bold sm:text-[36px]">My applications</h1>
      <p className="mt-3 max-w-[720px] text-[17px] leading-[1.6] text-muted">{blurb}</p>
      <Reminders className="mt-2 max-w-[720px]" />
      <MyRoles items={buildItems()} waits={waits} />
    </Section>
  );
}
