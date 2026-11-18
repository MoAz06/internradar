"use client";

import { useState } from "react";

/** Search and country buttons at the top of the front page. They filter the role list further down and jump to it.
 * A country button is a #country link, which the list already understands. Without JavaScript the search
 * reloads the page with ?q=, which the list also reads. */
export default function HomeSearch({
  countries,
  total,
}: {
  countries: { name: string; slug: string; open: number }[];
  total: number;
}) {
  const [q, setQ] = useState("");
  return (
    <div className="mt-4 border border-line bg-surface p-3 max-md:hidden">
      <form
        action="/"
        method="get"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("internradar:search", { detail: q.trim() }));
        }}
        className="flex gap-2"
      >
        <label htmlFor="home-search" className="sr-only">
          Search roles
        </label>
        <input
          id="home-search"
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a company, role or city"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 border border-muted bg-white px-3 text-[16px] text-ink placeholder:text-dim"
        />
        <button type="submit" className="h-11 bg-ink px-4 text-[15px] font-semibold text-white" data-track="home-search">
          Search
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[14px]">
        <span className="text-dim">Open roles by country:</span>
        {countries.map((k) => (
          <a
            key={k.slug}
            href={`#${k.slug}`}
            className="border border-line bg-bg px-2.5 py-1.5 text-ink hover:border-muted"
            data-track={`home-country-${k.slug}`}
          >
            {k.name} <span className="text-dim">{k.open}</span>
          </a>
        ))}
        <a href="/companies/" className="border border-line bg-bg px-2.5 py-1.5 text-ink hover:border-muted">
          All {total} countries
        </a>
      </div>
    </div>
  );
}
