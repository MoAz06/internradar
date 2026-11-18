"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { readSaved, SAVED_EVENT, SAVED_KEY } from "@/lib/mine";
import { canInstall, install, onInstallChange } from "@/lib/install";

type Entry = { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; count?: number; track?: string };

/** The header on phones: one line with the menu, the name and the saved roles, and a drawer from the left. */
export default function MobileNav({ roles, radar, checked }: { roles: number; radar: number; checked: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

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

  // Install app shows only while Chrome says the site can be installed
  const [installable, setInstallable] = useState(false);
  useEffect(() => {
    const read = () => setInstallable(canInstall());
    read();
    return onInstallChange(read);
  }, []);

  // a new page closes the drawer
  useEffect(() => setOpen(false), [path]);

  // while open: no page scroll behind it, Escape closes, Tab stays inside, focus goes in and comes back out
  useEffect(() => {
    if (!open) return;
    const back = button.current;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab" || !panel.current) return;
      const all = [...panel.current.querySelectorAll<HTMLElement>("a, button")];
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      back?.focus({ preventScroll: true });
    };
  }, [open]);

  const groups: Entry[][] = [
    [
      { href: "/", label: "Roles", icon: "list", count: roles },
      { href: "/edition/", label: "This week", icon: "news" },
      { href: "/radar/", label: "Radar", icon: "radar", count: radar },
    ],
    [
      { href: "/mine/", label: "Saved", icon: "bookmark", count: saved },
      { href: "/alerts/", label: "Alerts", icon: "bell" },
    ],
    [
      { href: "/companies/", label: "Companies", icon: "building" },
      { href: "/companies/#cities", label: "Cities", icon: "pin" },
      { href: "/companies/#fields", label: "Fields", icon: "code" },
      { href: "/reapply/", label: "Re-apply", icon: "again" },
    ],
    [
      { href: "/share/", label: "Share", icon: "message", track: "share-process" },
      { href: "/about/", label: "About", icon: "info" },
    ],
  ];

  const current = (href: string) => {
    if (href.includes("#")) return href === "/companies/#cities" ? path.startsWith("/cities/") : path.startsWith("/fields/");
    return href === "/" ? path === "/" : path.startsWith(href);
  };

  return (
    <div className="sticky top-0 z-30 md:hidden">
      <div className="border-b-[3px] border-double border-ink bg-bg">
        <div className="flex h-12 items-center justify-between px-2">
          <button
            ref={button}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="menu"
            className="flex h-11 w-11 items-center justify-center text-ink"
          >
            <Icon name="menu" className="h-6 w-6" />
            <span className="sr-only">Menu</span>
          </button>
          <Link href="/" className="font-display text-[26px] leading-none font-bold text-ink">
            internradar
          </Link>
          <Link href="/mine/" className="relative flex h-11 w-11 items-center justify-center text-ink" data-track="to-mine">
            <Icon name="bookmark" className="h-6 w-6" />
            {saved > 0 && (
              <span className="absolute top-1.5 right-0.5 min-w-[18px] rounded-full bg-claret px-1 text-center text-[11px] leading-[18px] font-bold text-white">
                {saved}
              </span>
            )}
            <span className="sr-only">Saved roles{saved ? `, ${saved}` : ""}</span>
          </Link>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40">
          <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full bg-black/35" />
          <div
            ref={panel}
            id="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[260px] max-w-[82vw] flex-col overflow-y-auto border-r border-line bg-bg px-3 pt-2 pb-4"
          >
            <div className="mb-1 flex h-12 items-center justify-between pl-1">
              <span className="font-display text-[22px] font-bold">internradar</span>
              <button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center text-ink">
                <Icon name="x" className="h-6 w-6" />
                <span className="sr-only">Close the menu</span>
              </button>
            </div>
            <nav aria-label="Main">
              {groups.map((g, i) => (
                <ul key={i} className={i ? "mt-1.5 border-t border-line pt-1.5" : ""}>
                  {g.map((e) => {
                    const on = current(e.href);
                    return (
                      <li key={e.href}>
                        <Link
                          href={e.href}
                          onClick={() => setOpen(false)}
                          aria-current={on ? "page" : undefined}
                          data-track={e.track}
                          className={`flex h-10 items-center gap-3 rounded-md px-2 text-[16px] whitespace-nowrap ${on ? "bg-raised font-semibold" : "hover:bg-raised"}`}
                        >
                          <span className="text-muted">
                            <Icon name={e.icon} />
                          </span>
                          {e.label}
                          {e.count ? <span className="ml-auto text-[14px] text-muted">{e.count}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </nav>
            {installable && (
              <button
                type="button"
                onClick={() => install()}
                className="mt-1.5 flex h-10 items-center gap-3 rounded-md border-t border-line px-2 pt-1.5 text-[16px] whitespace-nowrap hover:bg-raised"
                data-track="install-app"
              >
                <span className="text-muted">
                  <Icon name="install" />
                </span>
                Install app
              </button>
            )}
            <p className="mt-auto pt-4 pl-2 text-[13px] text-muted">Checked {checked}</p>
          </div>
        </div>
      )}
    </div>
  );
}
