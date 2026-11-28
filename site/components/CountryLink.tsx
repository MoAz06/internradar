import Link from "next/link";
import type { MouseEvent } from "react";
import { countryPageHref } from "@/lib/items";

/** A country after a city ("London, United Kingdom"): it goes to that country's page. Grey and underlined like the
 * site's other quiet links ("Something wrong?"), so a list full of them stays calm but still reads as clickable, in
 * the dark theme too. The home list passes `onClick` to pick the country in place instead; a new tab still gets the page. */
export default function CountryLink({ code, name, onClick }: { code: string; name: string; onClick?: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <Link
      href={countryPageHref(code, name)}
      prefetch={false}
      onClick={onClick}
      className="underline underline-offset-2 hover:text-ink"
    >
      {name}
    </Link>
  );
}
