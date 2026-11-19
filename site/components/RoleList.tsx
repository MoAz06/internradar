import Link from "next/link";
import NewTab from "@/components/NewTab";
import AddToCalendar from "@/components/AddToCalendar";
import { CountChip, HowLine } from "@/components/RoleBits";
import { eventsFor } from "@/lib/ics";
import { roleHref, type Item } from "@/lib/items";
import { citiesOf, payOf, toRows } from "@/lib/rows";

/** A short list of roles in the same rows as the home page: the same role in several cities, or one company's
 * roles that close on the same day, share a row that opens on a tap. Used by the edition, the city pages and
 * the field pages. */
export default function RoleList({ list, empty }: { list: Item[]; empty: string }) {
  if (list.length === 0) return <p className="mt-2 text-[16px] text-muted">{empty}</p>;
  return (
    <ul className="mt-1">
      {toRows(list).map((r) => {
        const x = r.items[0];
        // the country only when every role in the row is in it
        const oneCountry = new Set(r.items.map((y) => y.countryName)).size === 1;
        const where = r.items.length === 1 ? `${x.city}, ${x.countryName}` : oneCountry ? `${citiesOf(r)}, ${x.countryName}` : citiesOf(r);
        const pay = r.items.length === 1 ? (x.pay?.short ?? "") : payOf(r);
        return (
          <li key={r.id} className="border-t border-line py-2.5 first:border-t-0">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <Link href={`/companies/${x.slug}/`} className="font-display text-[17px] leading-snug font-bold hover:underline">
                {x.company}
              </Link>
              <span className="font-sans text-[13px] font-semibold text-soon">{x.when}</span>
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
            <HowLine x={x} className="mt-0.5 text-[13.5px]" />
            <p className="mt-0.5 font-sans text-[14px] text-muted">
              {where}
              {pay && ` · ${pay}`}
              {r.items.length === 1 && (
                <>
                  {" · "}
                  <a href={x.source} target="_blank" rel="noreferrer" className="link">
                    Posting
                    <NewTab />
                  </a>
                </>
              )}
            </p>
            {r.items.length === 1 && <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} className="mt-1 text-[14px]" />}
          </li>
        );
      })}
    </ul>
  );
}
