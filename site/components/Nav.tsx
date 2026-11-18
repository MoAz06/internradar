import Link from "next/link";
import { lastChecked, links } from "@/data/companies";
import { longDate } from "@/lib/format";
import NewTab from "@/components/NewTab";

const items = [
  { href: "/", label: "Front page" },
  { href: "/edition/", label: "This week" },
  { href: "/radar/", label: "On the radar" },
  { href: "/companies/", label: "Companies" },
  { href: "/calendar/", label: "Calendar" },
  { href: "/about/", label: "About" },
];

/** The site header, set like a newspaper masthead. */
export default function Nav() {
  return (
    <header className="mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 sm:pt-5">
      <div className="flex items-center justify-center text-[13px] text-muted sm:justify-between">
        <span className="max-sm:hidden">Europe edition</span>
        <Link href="/" className="font-display text-[30px] leading-none font-bold text-ink sm:text-[46px]">
          internradar
        </Link>
        <span className="max-sm:hidden">Last checked {longDate(lastChecked)}</span>
      </div>
      <nav aria-label="Main" className="mt-2.5 border-y-[3px] border-double border-ink">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-1.5 text-[15px]">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="py-1 hover:underline">
                {i.label}
              </Link>
            </li>
          ))}
          <li>
            <a href={links.shareProcess} target="_blank" rel="noreferrer" className="py-1 hover:underline" data-track="share-process">
              Share your process
              <NewTab />
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
