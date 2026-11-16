import { links } from "@/data/companies";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-[13px] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>internradar · open data, MIT · maintained from Leiden</span>
        <a href={links.repo} className="mono text-xs text-muted hover:text-ink">
          github.com/MoAz06/internradar
        </a>
      </div>
    </footer>
  );
}
