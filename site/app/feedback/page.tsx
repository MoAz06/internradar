import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import FeedbackForm from "@/components/FeedbackForm";
import { links } from "@/data/companies";
import { og } from "@/lib/og";

const description = "Missing a company, found something unclear, or want a feature? Tell me here. No account needed.";

export const metadata: Metadata = {
  title: "Suggest something",
  description,
  alternates: { canonical: "/feedback/" },
  ...og("Suggest something", description, "home", "/feedback/"),
};

export default function FeedbackPage() {
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[720px]">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[40px]">Suggest something</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-muted">
          A company that should be on the list, a deadline that&apos;s wrong, a page that&apos;s hard to use, or something
          you&apos;d like the site to do. It comes straight to my inbox. Been through a hiring process yourself?{" "}
          <Link href="/share/" className="link">
            Share it here
          </Link>{" "}
          instead.
        </p>
        <div className="mt-7 border-t-2 border-ink pt-5">
          <FeedbackForm endpoint={links.shareEndpoint} siteKey={links.turnstileSiteKey} contact={links.contact} />
        </div>
      </div>
    </Section>
  );
}
