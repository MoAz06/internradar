import Link from "next/link";
import { links } from "@/data/companies";
import NewTab from "@/components/NewTab";

const items = [
  { href: "/companies/", label: "Companies" },
  { href: "/#radar", label: "On the radar" },
  { href: "/#how", label: "How to read" },
];

function Links({ className }: { className: string }) {
  return (
    <div className={className}>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="py-1 hover:text-ink">
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export default function Nav() {
  return (
    <nav aria-label="Main" className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 py-1 text-[15px] font-semibold">
          <span className="glow inline-block h-2.5 w-2.5 rounded-full bg-signal" aria-hidden />
          internradar
        </Link>
        <Links className="hidden items-center gap-7 text-sm font-medium text-muted md:flex" />
        <a
          href={links.shareProcess}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-line bg-raised px-3.5 py-2 text-[13px] font-medium hover:border-muted"
        >
          Share your process
          <NewTab />
        </a>
      </div>
      {/* on phones the links get their own row */}
      <Links className="mx-auto flex gap-5 px-4 pb-2.5 text-sm font-medium text-muted md:hidden" />
    </nav>
  );
}
