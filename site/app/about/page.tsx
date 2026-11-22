import { shareUrl } from "@/lib/share";
import type { Metadata } from "next";
import Section from "@/components/Section";
import Link from "next/link";
import { links } from "@/data/companies";
import { og } from "@/lib/og";

export const metadata: Metadata = {
  title: "About",
  description: "How to read internradar, where the data comes from and how to add to it.",
  ...og("About internradar", "How to read internradar, where the data comes from and how to add to it.", "about", "/about/"),
};

const terms: [string, string][] = [
  [
    "Status",
    "is what the careers page said on the date it was checked. A role is marked closed once its deadline or start date has passed, and “Posting gone” when the link stopped working in the nightly check. Dates move, so open the posting before you plan around it.",
  ],
  ["Process", "is only what the company says, or what a candidate reported. Candidate reports are marked as such and have a month."],
  ["Re-apply rule", "is the company’s own rule for applying again after a rejection. Miss it and you can lose a year."],
  [
    "Type and field",
    "are my own labels, so you can filter. Graduate means new grad jobs and graduate programmes. Thesis means a graduation project.",
  ],
  ["Checked", "dates older than three months are marked. If you check one yourself, send a PR with the new date."],
];

export default function About() {
  return (
    <Section className="pt-10 pb-16 sm:pt-14">
      <div className="max-w-[680px]">
        <h1 className="text-[28px] font-bold leading-tight sm:text-[36px]">About</h1>
        <p className="mt-4 text-[16px] leading-[1.6] text-muted">
          internradar lists tech internships, graduate roles and thesis projects in Europe, with the hiring
          process at each company. Everything comes from the company&apos;s own careers page or from someone who
          went through the process, and every line has the date it was checked.
        </p>
        <p className="mt-3 text-[16px] leading-[1.6] text-muted">
          I&apos;m{" "}
          <a href={links.linkedin} className="link">
            Mohamed Azahrioui
          </a>
          , a computer science student in Leiden. I started the list while looking for an internship myself.
        </p>

        <h2 className="mt-9 text-lg font-bold">How to read the list</h2>
        <dl className="mt-3 space-y-3 text-[15px] leading-[1.6]">
          {terms.map(([k, v]) => (
            <div key={k}>
              <dt className="inline font-semibold">{k} </dt>
              <dd className="inline text-muted">{v}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-9 text-lg font-bold">Check before you apply</h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-muted">
          Everything here comes from the companies&apos; own pages, with the date I checked it. Companies change deadlines,
          close roles early and rewrite their rules without notice, so the list can be behind. The company&apos;s own
          posting is what counts: check it before you apply, and don&apos;t plan around a deadline you only saw here. The
          site is free and comes without any guarantee.
        </p>

        <h2 className="mt-9 text-lg font-bold">Adding or fixing something</h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-muted">
          The data is on{" "}
          <a href={links.repo} className="link">
            GitHub
          </a>
          . Found a mistake or a missing company?{" "}
          <Link href="/feedback/" className="link">
            Tell me here
          </Link>
          , or open an issue or send a PR;{" "}
          <a href={links.contributing} className="link">
            CONTRIBUTING
          </a>{" "}
          explains how.
        </p>
        <p className="mt-3 text-[15px] leading-[1.6] text-muted">
          Went through one of these processes?{" "}
          <Link href={shareUrl()} className="link">
            Share how it went
          </Link>
          : the steps, how long each one took, and the outcome. It&apos;s a short form, no git needed. Please
          don&apos;t post the interview questions.
        </p>

        <h2 className="mt-9 text-lg font-bold">Visits</h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-muted">
          I count visits with{" "}
          <a href="https://www.goatcounter.com" className="link">
            GoatCounter
          </a>
          , to see which pages people use. No cookies, and nothing that tells me who you are.
        </p>
      </div>
    </Section>
  );
}
