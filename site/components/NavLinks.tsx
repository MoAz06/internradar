"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readSaved, SAVED_EVENT, SAVED_KEY } from "@/lib/mine";

/** The links on the masthead's menu bar: the page you are on is marked, and My applications carries the saved count.
 * The rest of the header stays server-rendered. */
export default function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  const [saved, setSaved] = useState(0);

  // the saved count, kept in step with Save clicks on this page and in other tabs
  useEffect(() => {
    const read = () => setSaved(readSaved().length);
    read();
    const onStorage = (e: StorageEvent) => e.key === SAVED_KEY && read();
    window.addEventListener(SAVED_EVENT, read);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SAVED_EVENT, read);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const current = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <>
      {items.map((i) => {
        const on = current(i.href);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              aria-current={on ? "page" : undefined}
              className={`py-1 hover:underline ${on ? "font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4" : ""}`}
            >
              {i.label}
              {i.href === "/mine/" && saved > 0 && (
                <>
                  <span className="ml-1 rounded-sm bg-raised px-1.5 text-[12.5px] font-semibold text-muted">{saved}</span>
                  <span className="sr-only"> saved</span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </>
  );
}
