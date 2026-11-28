import Link from "next/link";
import { lastChecked } from "@/data/companies";
import { longDate, shortDate } from "@/lib/format";
import { buildItems } from "@/lib/buildItems";
import MobileNav from "@/components/MobileNav";
import NavLinks from "@/components/NavLinks";
import ThemeToggle from "@/components/ThemeToggle";
import { today } from "@/lib/live";

const items = [
  { href: "/", label: "Roles" },
  { href: "/today/", label: "Today" },
  { href: "/edition/", label: "This week" },
  { href: "/radar/", label: "On the radar" },
  { href: "/companies/", label: "Companies" },
  { href: "/pay/", label: "Pay" },
  { href: "/alerts/", label: "Alerts" },
  { href: "/mine/", label: "My applications" },
  { href: "/about/", label: "About" },
];

/** The site header, set like a newspaper masthead. Phones get one line and a drawer instead. */
export default function Nav() {
  const all = buildItems();
  const roles = all.filter((x) => x.status === "open" || x.status === "rolling").length;
  const radar = all.filter((x) => x.status === "soon").length;
  return (
    <>
    <MobileNav roles={roles} radar={radar} checked={shortDate(lastChecked)} />
    <header className="mx-auto w-full max-w-[1200px] px-4 pt-4 max-md:hidden sm:px-6 sm:pt-5">
      {/* one slim band, so the list starts high on the page */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center text-[13px] text-muted">
        <span>Europe edition</span>
        <Link href="/" className="font-display text-[32px] leading-none font-bold text-ink">
          internradar
        </Link>
        <span className="flex items-center justify-end gap-3">
          Updated {longDate(today())}
          <ThemeToggle />
        </span>
      </div>
      <nav aria-label="Main" className="mt-2 border-y-[3px] border-double border-ink">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-1.5 text-[15px]">
          <NavLinks items={items} />
          <li>
            <Link href="/share/" className="py-1 hover:underline" data-track="share-process">
              Share your process
            </Link>
          </li>
        </ul>
      </nav>
    </header>
    </>
  );
}
