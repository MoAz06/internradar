import type { Metadata } from "next";
import Section from "@/components/Section";
import ProfileForm from "@/components/ProfileForm";
import { countries } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { today } from "@/lib/live";
import { og } from "@/lib/og";

const blurb = "Pick your study level, countries and what you look for once. The list, Today and the reminders then show the roles that fit.";

export const metadata: Metadata = {
  title: "My profile",
  description: blurb,
  robots: { index: false },
  ...og("My profile", blurb, "home", "/profile/"),
};

export default function ProfilePage() {
  const open = buildItems(today()).filter((x) => x.status === "open" || x.status === "rolling");
  const roles = open.map(({ country, kind, levels, workRights, languages }) => ({ country, kind, levels, workRights, languages }));
  const here = countries
    .map((k) => ({ code: k.code, name: k.name, n: open.filter((x) => x.country === k.code).length }))
    .filter((k) => k.n > 0)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, name }) => ({ code, name }));
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[720px]">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[36px]">My profile</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-muted">
          Pick these once. The list, Today and the reminders then show the roles that fit you. It stays in this
          browser; there is no account and nothing is sent anywhere.
        </p>
        <ProfileForm countries={here} roles={roles} />
      </div>
    </Section>
  );
}
