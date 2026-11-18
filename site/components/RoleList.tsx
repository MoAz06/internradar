import Link from "next/link";
import NewTab from "@/components/NewTab";
import AddToCalendar from "@/components/AddToCalendar";
import { eventsFor } from "@/lib/ics";
import type { Item } from "@/lib/items";

/** A short list of roles: when, company and title, place, posting and a calendar link. Used by the edition,
 * the city pages and the field pages. */
export default function RoleList({ list, empty }: { list: Item[]; empty: string }) {
  if (list.length === 0) return <p className="mt-2 text-[16px] text-muted">{empty}</p>;
  return (
    <ul className="mt-1">
      {list.map((x) => (
        <li key={x.id} className="border-t border-line py-2.5 first:border-t-0">
          <p className="text-[13px] font-semibold text-soon">{x.when}</p>
          <p className="font-display text-[17px] leading-snug font-bold">
            <Link href={`/companies/${x.slug}/`} className="hover:underline">
              {x.company}
            </Link>
            : {x.title}
          </p>
          <p className="mt-0.5 text-[15px] text-muted">
            {x.city}, {x.countryName}.{" "}
            <a href={x.source} target="_blank" rel="noreferrer" className="link">
              Posting
              <NewTab />
            </a>
          </p>
          <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} className="mt-1 text-[14px]" />
        </li>
      ))}
    </ul>
  );
}
