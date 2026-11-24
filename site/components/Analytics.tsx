"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { returnEvent, VISIT_KEY } from "@/lib/mine";

type Goat = { count?: (o: { path: string; title?: string; event?: boolean }) => void };
declare global {
  interface Window {
    goatcounter?: Goat;
  }
}

const count = (path: string, event = false) => window.goatcounter?.count?.({ path, event });

const SEEN_KEY = "internradar:seen";

function countReturn() {
  try {
    const day = new Date().toLocaleDateString("en-CA");
    // visitors from before this counter: the home page has kept their last visit day since November
    const old = JSON.parse(localStorage.getItem(VISIT_KEY) ?? "null") as { visit: string; since: string | null } | null;
    const before = old && (old.since ?? old.visit) !== day ? { first: old.since ?? old.visit, last: "" } : null;
    const { event, seen } = returnEvent(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "null") ?? before, day);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    if (event) count(event, true);
  } catch {
    // blocked storage: nothing counted, the site works the same
  }
}

/** Visit counter (GoatCounter: no cookies, nothing personal). It counts the path only, without ?page= and
 * the filters, and counts each page change inside the site too, which count.js on its own would miss.
 * Clicks on anything with data-track="name" count as an event. localhost is not counted. */
export default function Analytics() {
  const path = usePathname();

  useEffect(() => {
    count(path);
  }, [path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      if (el?.dataset.track) count(el.dataset.track, true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <Script
      src="https://gc.zgo.at/count.js"
      data-goatcounter="https://moaz06.goatcounter.com/count"
      data-goatcounter-settings='{"no_onload": true}'
      strategy="afterInteractive"
      onLoad={() => {
        count(location.pathname);
        countReturn();
      }}
    />
  );
}
