import Link from "next/link";
import type { MouseEvent } from "react";
import { countryHref } from "@/lib/items";

/** A country after a city ("London, United Kingdom"): it opens the list with that country picked. Grey and
 * underlined like the site's other quiet links ("Something wrong?"), so a list full of them stays calm but still
 * reads as clickable, in the dark theme too. The list itself passes `onClick` to pick the country in place. */
export default function CountryLink({ code, name, onClick }: { code: string; name: string; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <Link
      href={countryHref(code)}
      prefetch={false}
      onClick={onClick}
      className="underline underline-offset-2 hover:text-ink"
    >
      {name}
    </Link>
  );
}
