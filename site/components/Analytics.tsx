"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type Goat = { count?: (o: { path: string; title?: string; event?: boolean }) => void };
declare global {
  interface Window {
    goatcounter?: Goat;
  }
}

const count = (path: string, event = false) => window.goatcounter?.count?.({ path, event });

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
      onLoad={() => count(location.pathname)}
    />
  );
}
