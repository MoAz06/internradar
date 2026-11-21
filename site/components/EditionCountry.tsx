"use client";

import { useEffect, useState } from "react";

export type CountryOption = { code: string; slug: string; name: string; n: number };

const KEY = "edition-country";
const RADAR_SHOWN = 8;

/**
 * Shows only the roles in one country. The page is static, so this hides rows that are already there: every row
 * carries data-c with its countries, every day a data-day, every section a data-sec with a data-none note for when
 * nothing is left. The choice goes in the URL (?country=netherlands, as on the home page) so a link keeps it.
 */
export default function EditionCountry({ options, total }: { options: CountryOption[]; total: number }) {
  const [code, setCode] = useState("");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("country");
    let saved = "";
    try {
      saved = localStorage.getItem(KEY) ?? "";
    } catch {}
    const pick = options.find((o) => o.slug === fromUrl) ?? options.find((o) => o.code === saved);
    if (pick) setCode(pick.code);
  }, [options]);

  useEffect(() => {
    const main = document.getElementById("edition");
    if (!main) return;
    const shows = (el: Element) => !code || (el.getAttribute("data-c") ?? "").split(" ").includes(code);
    main.querySelectorAll<HTMLElement>("[data-c]").forEach((el) => (el.hidden = !shows(el)));
    // the radar list shows the first eight that are left
    let n = 0;
    main.querySelectorAll<HTMLElement>("[data-radar] > li").forEach((el) => {
      if (!el.hidden) el.hidden = n++ >= RADAR_SHOWN;
    });
    main.querySelectorAll<HTMLElement>("[data-day]").forEach((el) => (el.hidden = !el.querySelector("[data-c]:not([hidden])")));
    main.querySelectorAll<HTMLElement>("[data-sec]").forEach((sec) => {
      const none = sec.querySelector<HTMLElement>("[data-none]");
      if (none) none.hidden = !!sec.querySelector("[data-c]:not([hidden])") || !code;
    });
    // no line above the first row that is left in a list
    main.querySelectorAll("ul").forEach((ul) => {
      let first = true;
      ul.querySelectorAll<HTMLElement>(":scope > li").forEach((li) => {
        li.style.borderTopWidth = !li.hidden && first ? "0" : "";
        if (!li.hidden) first = false;
      });
    });

    const url = new URL(window.location.href);
    const slug = options.find((o) => o.code === code)?.slug;
    if (slug) url.searchParams.set("country", slug);
    else url.searchParams.delete("country");
    window.history.replaceState(null, "", url);
    try {
      if (code) localStorage.setItem(KEY, code);
      else localStorage.removeItem(KEY);
    } catch {}
  }, [code, options]);

  return (
    <label className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[15px]">
      <span className="font-semibold">Show</span>
      <select
        value={code}
        onChange={(ev) => setCode(ev.target.value)}
        className="min-h-11 border border-line bg-surface px-3 text-[16px] text-ink focus:border-ink focus:outline-none"
      >
        <option value="">All of Europe ({total})</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name} ({o.n})
          </option>
        ))}
      </select>
    </label>
  );
}
