import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import NewTab from "@/components/NewTab";
import { companies, links } from "@/data/companies";
import { reapplyGroups, reapplyRules } from "@/data/reapply";
import { longDate } from "@/lib/format";
import { og } from "@/lib/og";

const blurb = `${reapplyRules.length} companies say when you can apply again after a rejection. Every rule word for word from their own page, with the source.`;

export const metadata: Metadata = {
  title: `Can you reapply after a rejection? The rules at ${reapplyRules.length} companies`,
  description: blurb,
  alternates: { canonical: "/reapply/" },
  ...og("When can you apply again after a rejection?", blurb, "reapply", "/reapply/"),
};

/** A quote that starts mid-sentence gets an ellipsis, so it doesn't look cut off by mistake. */
const quoted = (q: string) => (/^[a-z]/.test(q) ? `…${q}` : q);

export default function ReapplyPage() {
  const fix = `${links.repo}/issues/new?title=${encodeURIComponent("[re-apply] ")}`;
  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[760px]">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[36px]">When can you apply again?</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-muted">
          Of the {companies.length} company pages on internradar, most say nothing about what happens after a
          rejection. These {reapplyRules.length} companies do. Every rule below is word for word from the
          company&apos;s own page, with a link and the date it was checked. Read it before you start an online test,
          not after.
        </p>
        <p className="mt-2 text-[15px] text-muted">
          A rule missing or changed?{" "}
          <a href={fix} target="_blank" rel="noreferrer" className="link">
            Tell me on GitHub
            <NewTab />
          </a>
          .
        </p>

        {reapplyGroups.map((g) => {
          const list = reapplyRules.filter((r) => r.group === g.id);
          if (list.length === 0) return null;
          return (
            <section key={g.id} className="mt-9">
              <h2 className="border-t-2 border-ink pt-3 text-[22px] font-bold">
                {g.title} <span className="text-[16px] font-normal text-muted">({list.length})</span>
              </h2>
              <p className="mt-1 text-[15px] text-muted">{g.blurb}</p>
              <ul className="mt-2">
                {list.map((r) => (
                  <li key={r.slug} className="border-b border-line py-3.5">
                    <p className="text-[17px] leading-snug">
                      <Link href={`/companies/${r.slug}/`} className="font-display font-bold hover:underline">
                        {r.company}
                      </Link>
                      : {r.rule}
                    </p>
                    <blockquote lang={r.lang} className="mt-1.5 border-l-[3px] border-line pl-3 text-[15px] leading-[1.55] italic text-muted">
                      &ldquo;{quoted(r.quote)}&rdquo;
                    </blockquote>
                    <p className="mt-1 text-[13px] text-dim">
                      <a href={r.url} target="_blank" rel="noreferrer" className="link">
                        Source
                        <NewTab />
                      </a>
                      , checked {longDate(r.checked)}
                      {r.lang === "de" ? ", in German" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Section>
  );
}
