import Link from "next/link";
import { links } from "@/data/companies";

export default function Footer() {
  return (
    <footer className="border-t-2 border-ink">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-[13px] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>
          Made by{" "}
          <a href={links.linkedin} className="link">
            Mohamed Azahrioui
          </a>
          , a CS student in Leiden. Open data, MIT licence.
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/feedback/" className="link">
            Suggest something
          </Link>
          <Link href="/privacy/" className="link">
            Privacy
          </Link>
          <a href={links.repo} className="link">
            Source and data on GitHub
          </a>
        </span>
      </div>
    </footer>
  );
}
