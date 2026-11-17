import Link from "next/link";
import { lastChecked, links } from "@/data/companies";
import { buildItems } from "@/lib/buildItems";
import { longDate } from "@/lib/format";
import NewTab from "@/components/NewTab";

const items = [
  { href: "/", label: "Front page" },
  { href: "/edition/", label: "This week" },
  { href: "/companies/", label: "Companies" },
  { href: "/calendar/", label: "Calendar" },
  { href: "/about/", label: "About" },
];

/** The site header, set like a newspaper masthead. */
export default function Nav() {
  const open = buildItems().filter((x) => x.status === "open" || x.status === "rolling").length;
  return (
    <header className="mx-auto w-full max-w-[1200px] px-4 pt-5 sm:px-6 sm:pt-7">
      <div className="flex flex-col items-center gap-1 text-center text-[13px] text-muted sm:flex-row sm:justify-between">
        <span>Europe edition</span>
        <span className="order-first sm:order-none">
          <Link href="/" className="font-display text-[36px] leading-none font-bold text-ink sm:text-[56px]">
            internradar
          </Link>
        </span>
        <span>Updated {longDate(lastChecked)}</span>
      </div>
      <p className="mt-2 text-center text-[14px] italic text-muted">
        Deadlines, tests and re-apply rules, from each company&apos;s own page. {open} roles open today.
      </p>
      <nav aria-label="Main" className="mt-3 border-y-[3px] border-double border-ink">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 py-2 text-[15px]">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="py-1 hover:underline">
                {i.label}
              </Link>
            </li>
          ))}
          <li>
            <a href={links.shareProcess} target="_blank" rel="noreferrer" className="link py-1">
              Share your process
              <NewTab />
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
