import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import NewTab from "@/components/NewTab";
import { companies, links } from "@/data/companies";
import { shareUrl } from "@/lib/share";
import { og } from "@/lib/og";

const blurb = "Went through a company's hiring process? Tell the next person how it went: the steps, how long each took, and the outcome.";

export const metadata: Metadata = {
  title: "Share your process",
  description: blurb,
  ...og("Share how your application went", blurb, "share", "/share/"),
};

export default function SharePage() {
  const total = companies.reduce((n, c) => n + c.reports.length, 0);
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[680px]">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[36px]">Share your process</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-muted">
          Companies describe their process in a few lines. What they leave out is what you want to know before you
          apply: how long the test really was, how many days until they answered, and what came after. If you went
          through one of the processes on this list, a few minutes of your time saves the next person a lot of guessing.
        </p>

        <h2 className="mt-8 border-t-2 border-ink pt-3 text-[20px] font-bold">What I ask</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[16px] leading-[1.55] text-muted">
          <li>The company and the role, and when you applied.</li>
          <li>The steps, one per line, with dates or the days between them.</li>
          <li>The online test in a few words: the platform, how long, what kind of problems.</li>
          <li>How many weeks from applying to the final answer, and how it ended.</li>
          <li>Anything the next person should know, like a re-apply rule you were told.</li>
        </ul>

        <h2 className="mt-8 border-t-2 border-ink pt-3 text-[20px] font-bold">What I don&apos;t want</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[16px] leading-[1.55] text-muted">
          <li>The questions from the test or the interviews. Describe the format, not the content.</li>
          <li>Names of recruiters or interviewers.</li>
          <li>Your own name, unless you want it there. Reports show up without one.</li>
        </ul>

        <p className="mt-8">
          <a
            href={shareUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-ink px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-muted"
            data-track="share-form"
          >
            {links.shareForm ? "Open the form" : "Open the form on GitHub"}
            <NewTab />
          </a>
        </p>
        <p className="mt-3 text-[15px] leading-[1.55] text-muted">
          {links.shareForm ? (
            <>
              No account needed. Rather use GitHub?{" "}
              <a href={links.shareProcess} target="_blank" rel="noreferrer" className="link">
                The same form is there
                <NewTab />
              </a>
              .
            </>
          ) : (
            "You need a GitHub account for now. A form without an account is on its way."
          )}{" "}
          I read every report before it goes on the company page, and I may shorten it.
          {total > 0 ? ` So far ${total} ${total === 1 ? "person has" : "people have"} shared theirs.` : ""}
        </p>
        <p className="mt-6 text-[15px] text-muted">
          Looking for a company first? <Link href="/companies/" className="link">All companies</Link>.
        </p>
      </div>
    </Section>
  );
}
