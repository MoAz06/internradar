"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";

const tabs = [
  { href: "/today/", label: "Today", icon: "sun" },
  { href: "/", label: "Roles", icon: "list" },
  { href: "/radar/", label: "Radar", icon: "radar" },
  { href: "/mine/", label: "Saved", icon: "bookmark" },
] as const;

/** Tabs along the bottom, only in the installed app on a phone (the `app` variant in globals.css).
 * In a browser the menu in the header does this job. */
export default function AppTabs() {
  const path = usePathname();
  return (
    <nav
      aria-label="App"
      className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] app:flex"
    >
      {tabs.map((t) => {
        const on = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[12px] ${on ? "font-semibold text-accent" : "text-muted"}`}
          >
            <Icon name={t.icon} className="h-[22px] w-[22px]" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
