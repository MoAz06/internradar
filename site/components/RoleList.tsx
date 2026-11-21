import Link from "next/link";
import NewTab from "@/components/NewTab";
import AddToCalendar from "@/components/AddToCalendar";
import { CountChip, HowLine } from "@/components/RoleBits";
import { eventsFor } from "@/lib/ics";
import { roleHref, type Item } from "@/lib/items";
import { citiesOf, payOf, soonLabel, toRows } from "@/lib/rows";

/** A short list of roles in the same rows as the home page: the same role in several cities, or one company's
 * roles that close on the same day, share a row that opens on a tap. Used by the edition, the city pages and
 * the field pages. */
export default function RoleList({
  list,
  empty,
  showWhen = true,
  fullHow = false,
}: {
  list: Item[];
  empty: string;
  /** false under a heading that already says the day */
  showWhen?: boolean;
  /** the whole "how they hire" line instead of one line ending in "…" */
  fullHow?: boolean;
}) {
  if (list.length === 0) return <p className="mt-2 text-[16px] text-muted">{empty}</p>;
  return (
    <ul className="mt-1">
      {toRows(list).map((r) => {
        const x = r.items[0];
        // the country only when every role in the row is in it
        const oneCountry = new Set(r.items.map((y) => y.countryName)).size === 1;
        const where = r.items.length === 1 ? `${x.city}, ${x.countryName}` : oneCountry ? `${citiesOf(r)}, ${x.countryName}` : citiesOf(r);
        const pay = r.items.length === 1 ? (x.pay?.short ?? "") : payOf(r);
        const { label, note } = soonLabel(x);
        return (
          // data-c: the countries in the row, for the country choice on the edition page
          <li key={r.id} data-c={[...new Set(r.items.map((y) => y.country))].join(" ")} className="border-t border-line py-2.5 first:border-t-0">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <Link href={`/companies/${x.slug}/`} className="font-display text-[17px] leading-snug font-bold hover:underline">
                {x.company}
              </Link>
              {showWhen && <span className="font-sans text-[13px] font-semibold text-soon">{label}</span>}
            </p>
            {r.items.length === 1 ? (
              <p className="mt-0.5 font-serif text-[16px] leading-snug">
                <Link href={roleHref(x.key)} className="hover:underline">
                  {x.title}
                </Link>
              </p>
            ) : (
              <details className="mt-0.5">
                <summary className="cursor-pointer list-none font-serif text-[16px] leading-snug [&::-webkit-details-marker]:hidden">
                  {r.title}
                  <CountChip text={r.chip ?? ""} />
                </summary>
                <ul className="mt-1 mb-1.5 border-l-2 border-line pl-3">
                  {r.items.map((y) => (
                    <li key={y.id} className="py-1 text-[15px] leading-snug">
                      <Link href={roleHref(y.key)} className="font-serif hover:underline">
                        {y.title}
                      </Link>
                      <span className="font-sans text-[13px] text-muted"> · {[y.city, y.pay?.short].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {note && <p className="mt-0.5 font-sans text-[13.5px] leading-snug text-muted">{note}</p>}
            <HowLine x={x} full={fullHow} className="mt-0.5 text-[13.5px]" />
            <p className="mt-0.5 font-sans text-[14px] text-muted">
              {where}
              {pay && ` · ${pay}`}
            </p>
            {r.items.length === 1 && (
              // their own row, 44 px high on phones; screen readers hear which role each link is for
              <div className="mt-0.5 flex flex-wrap items-center gap-x-6 font-sans text-[14px] sm:mt-1">
                <a href={x.source} target="_blank" rel="noreferrer" className="link flex min-h-11 items-center sm:min-h-0">
                  Posting
                  <span className="sr-only">
                    : {x.company}, {x.title}
                  </span>
                  <NewTab />
                </a>
                <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} tall />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
