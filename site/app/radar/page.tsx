import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/Section";
import AddToCalendar from "@/components/AddToCalendar";
import { radar } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { radarEvents, radarKey } from "@/lib/ics";
import { today, upcoming } from "@/lib/live";
import { og } from "@/lib/og";

export const metadata: Metadata = {
  title: "On the radar",
  description: "Internships and graduate programmes in Europe that aren't open yet, and when each company says applications open.",
  ...og("What opens next", "Internships and graduate programmes in Europe that aren't open yet, and when each company says applications open.", "radar", "/radar/"),
};

export default function RadarPage() {
  const now = today();
  const next = upcoming(radar, now);
  const soon = buildItems(now).filter((x) => x.status === "soon").length;

  return (
    <Section className="pt-8 pb-16 sm:pt-10">
      <div className="max-w-[760px]">
        <h1 className="text-[28px] leading-tight font-bold sm:text-[36px]">On the radar</h1>
        <p className="mt-3 text-[17px] leading-[1.6] text-muted">
          Programmes and recruitment seasons that aren&apos;t open yet, with the date each company gives for the
          opening. A date with a day can go straight in your calendar. For a month only, check the company page
          around then.
        </p>
        <p className="mt-3 text-[16px]">
          <Link href="/calendar/" className="link">
            Subscribe to every date at once
          </Link>
          {soon > 0 && (
            <>
              {" "}
              or see the{" "}
              <Link href="/?status=soon" className="link">
                {soon} {soon === 1 ? "role" : "roles"} marked opening soon
              </Link>{" "}
              in the list
            </>
          )}
          .
        </p>

        {next.length === 0 ? (
          <p className="mt-8 border-t-2 border-ink pt-3 text-[16px] text-muted">Nothing with a known date right now.</p>
        ) : (
          <ul className="mt-8 border-t-2 border-ink">
            {next.map((r) => (
              <li key={r.sortKey + r.slug + r.role} className="border-b border-line py-3.5">
                <p className="text-[15px] font-semibold text-claret">{r.opens}</p>
                <p className="font-display mt-0.5 text-[18px] leading-snug font-bold">
                  <Link href={`/companies/${r.slug}/`} className="hover:underline">
                    {r.company}
                  </Link>
                  : {r.role}
                </p>
                <p className="mt-1 text-[15px] leading-[1.55] text-muted">{r.expect}</p>
                <AddToCalendar events={radarEvents([r], now)} file={`/cal/r-${radarKey(r)}.ics`} className="mt-1.5 text-[14px]" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
