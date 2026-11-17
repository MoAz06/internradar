"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fields, fold, kinds, reportUrl, type Item } from "@/lib/items";
import { eventsFor, toIcs } from "@/lib/ics";
import { shortDate } from "@/lib/format";
import NewTab from "@/components/NewTab";

type CountryOption = { code: string; name: string; slug: string; count: number };
type StatusFilter = "open" | "soon" | "all";
type Filters = { q: string; status: StatusFilter; kind: string; field: string; country: string; saved: boolean };

const start: Filters = { q: "", status: "open", kind: "", field: "", country: "", saved: false };
const SAVED_KEY = "internradar:saved";

function readSaved(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeSaved(ids: string[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch {
    // private mode or blocked storage: saving still works until the page closes
  }
}

function Select({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink hover:border-muted"
      >
        {children}
      </select>
    </>
  );
}

const statusColor = (x: Item) =>
  x.status === "closed" ? "text-closed" : x.status === "soon" || x.urgent ? "text-soon" : "text-signal";

export default function RoleFinder({ items, countries }: { items: Item[]; countries: CountryOption[] }) {
  const [f, setF] = useState<Filters>(start);
  const [saved, setSaved] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);

  // filters from the URL (?q=&status=&type=&field=&country=) and old #country links
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const bySlug = (slug: string) => countries.find((k) => k.slug === slug || k.code.toLowerCase() === slug)?.code ?? "";
    const fromHash = bySlug(location.hash.slice(1));
    setF({
      q: p.get("q") ?? "",
      status: (["open", "soon", "all"] as const).find((s) => s === p.get("status")) ?? "open",
      kind: kinds.find((k) => k.toLowerCase() === p.get("type")) ?? "",
      field: fields.find((x) => fold(x).replace(/ /g, "-") === p.get("field")) ?? "",
      country: bySlug(p.get("country") ?? "") || fromHash,
      saved: false,
    });
    // ?saved=key.key.key from "open on another device" adds those roles to this browser's list
    const keys = (p.get("saved") ?? "").split(".").filter(Boolean);
    let mine = readSaved();
    if (keys.length) {
      const ids = items.filter((x) => keys.includes(x.key)).map((x) => x.id);
      const merged = [...new Set([...mine, ...ids])];
      const added = merged.length - mine.length;
      mine = merged;
      writeSaved(mine);
      setNotice(added ? `Added ${added} saved ${added === 1 ? "role" : "roles"} from the link.` : "Those roles were already saved here.");
      setF((x) => ({ ...x, saved: ids.length > 0 }));
    }
    setSaved(mine);
    // scroll after the filtered list has rendered, else the browser lands somewhere above it
    const toList = () => setTimeout(() => top.current?.scrollIntoView(), 60);
    if (fromHash) toList();
    const onHash = () => {
      const code = bySlug(location.hash.slice(1));
      if (code) {
        setF((x) => ({ ...x, country: code }));
        toList();
      }
    };
    window.addEventListener("hashchange", onHash);
    // "/" jumps to the search box
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("keydown", onKey);
    };
  }, [countries, items]);

  // keep the URL in step, so a filtered list can be shared as a link
  useEffect(() => {
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.status !== "open") p.set("status", f.status);
    if (f.kind) p.set("type", f.kind.toLowerCase());
    if (f.field) p.set("field", fold(f.field).replace(/ /g, "-"));
    if (f.country) p.set("country", countries.find((k) => k.code === f.country)?.slug ?? "");
    const qs = p.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ""}${countries.some((k) => `#${k.slug}` === location.hash) ? "" : location.hash}`;
    if (url !== location.pathname + location.search + location.hash) history.replaceState(null, "", url);
  }, [f, countries]);

  const shown = useMemo(() => {
    const words = fold(f.q).split(/\s+/).filter(Boolean);
    return items.filter((x) => {
      if (f.status === "open" && x.status !== "open" && x.status !== "rolling") return false;
      if (f.status === "soon" && x.status !== "soon") return false;
      if (f.kind && x.kind !== f.kind) return false;
      if (f.field && x.field !== f.field) return false;
      if (f.country && x.country !== f.country) return false;
      if (f.saved && !saved.includes(x.id)) return false;
      if (words.length) {
        const hay = fold(`${x.company} ${x.title} ${x.city} ${x.countryName} ${x.field} ${x.kind}`);
        if (!words.every((w) => hay.includes(w))) return false;
      }
      return true;
    });
  }, [items, f, saved]);

  const set = (patch: Partial<Filters>) => setF((x) => ({ ...x, ...patch }));
  const toggleSave = (id: string) => {
    setSaved((cur) => {
      const next = cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id];
      writeSaved(next);
      return next;
    });
  };
  const savedItems = items.filter((x) => saved.includes(x.id));
  const downloadCalendar = () => {
    const events = eventsFor(savedItems);
    if (events.length === 0) {
      setNotice("None of your saved roles has a date in the posting yet, so there's nothing to put in a calendar.");
      return;
    }
    const blob = new Blob([toIcs("internradar, my saved roles", events)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "internradar-saved.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setNotice(
      events.length === 1
        ? "Downloaded 1 date. Open the file to add it to your calendar."
        : `Downloaded ${events.length} dates. Open the file to add them to your calendar.`,
    );
  };
  const copyLink = async () => {
    const link = `${location.origin}/?saved=${savedItems.map((x) => x.key).join(".")}`;
    setShareLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Link copied. Open it on your other device to get the same saved list.");
    } catch {
      setNotice("Copy the link below and open it on your other device.");
    }
  };
  const filtered = f.q || f.status !== "open" || f.kind || f.field || f.country || f.saved;

  return (
    <div ref={top} id="roles">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <label htmlFor="role-search" className="sr-only">
          Search roles
        </label>
        <input
          ref={search}
          id="role-search"
          type="search"
          value={f.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search a company, role or city"
          autoComplete="off"
          className="h-10 min-w-0 rounded-md border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-dim hover:border-muted sm:min-w-[260px] sm:flex-1"
        />
        <Select id="role-status" label="Status" value={f.status} onChange={(v) => set({ status: v as StatusFilter })}>
          <option value="open">Open now</option>
          <option value="soon">Opening soon</option>
          <option value="all">All, also closed</option>
        </Select>
        <Select id="role-type" label="Type" value={f.kind} onChange={(v) => set({ kind: v })}>
          <option value="">Any type</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
        <Select id="role-field" label="Field" value={f.field} onChange={(v) => set({ field: v })}>
          <option value="">Any field</option>
          {fields.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </Select>
        <Select id="role-country" label="Country" value={f.country} onChange={(v) => set({ country: v })}>
          <option value="">All countries</option>
          {countries.map((k) => (
            <option key={k.code} value={k.code}>
              {k.name} ({k.count})
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4 mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <p aria-live="polite" className="font-semibold">
          {shown.length} {shown.length === 1 ? "role" : "roles"}
        </p>
        <span className="text-muted">soonest deadline first</span>
        <label className="flex items-center gap-1.5 text-muted">
          <input type="checkbox" checked={f.saved} onChange={(e) => set({ saved: e.target.checked })} className="h-4 w-4" />
          Only saved ({saved.length})
        </label>
        {filtered && (
          <button type="button" onClick={() => setF(start)} className="text-link underline underline-offset-2">
            Clear filters
          </button>
        )}
        {saved.length > 0 && (
          <>
            <button type="button" onClick={downloadCalendar} className="text-link underline underline-offset-2">
              Saved roles to my calendar
            </button>
            <button type="button" onClick={copyLink} className="text-link underline underline-offset-2">
              Open my saved list on another device
            </button>
          </>
        )}
      </div>
      <div aria-live="polite" className="text-[14px]">
        {notice && <p className="mb-2 text-ink">{notice}</p>}
      </div>
      {shareLink && (
        <p className="mb-3 text-[14px]">
          <label htmlFor="share-link" className="text-muted">
            Link to your saved list:{" "}
          </label>
          <input
            id="share-link"
            readOnly
            value={shareLink}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 h-9 w-full rounded-md border border-line bg-surface px-2 text-[14px] sm:w-[520px]"
          />
        </p>
      )}

      {shown.length === 0 ? (
        <p className="border-t border-line py-6 text-[15px] text-muted">
          No roles match. Try fewer filters, or search for a city instead of a company.
        </p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Roles that match the filters</caption>
          <thead className="max-md:hidden">
            <tr className="border-b-2 border-ink text-[13px]">
              <th scope="col" className="py-2 pr-4 font-semibold">Company</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Role</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Process</th>
              <th scope="col" className="py-2 font-semibold">
                <span className="sr-only">Links</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => {
              const isSaved = saved.includes(x.id);
              return (
                <tr key={x.id} className="border-b border-line align-top max-md:block max-md:py-3">
                  <td className="py-2.5 pr-4 max-md:block max-md:p-0 md:w-[17%]">
                    <Link href={`/companies/${x.slug}/`} className="link font-semibold">
                      {x.company}
                    </Link>
                    <span className="block text-[13px] text-muted">
                      {x.city}, {x.countryName}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 max-md:block max-md:p-0 max-md:pt-1.5 md:w-[28%]">
                    <span className="font-medium">{x.title}</span>
                    <span className="block text-[13px] text-muted">
                      {x.kind}, {x.field}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 max-md:block max-md:p-0 max-md:pt-1.5 md:w-[15%]">
                    <span className={`font-medium ${statusColor(x)}`}>{x.when}</span>
                    <span className={`block text-[13px] ${x.old ? "text-soon" : "text-muted"}`}>
                      {/^not stated/i.test(x.start) ? "" : `Starts ${x.start}, `}checked {shortDate(x.checked)}
                      {x.old ? ", over 3 months ago" : ""}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-muted max-md:block max-md:p-0 max-md:pt-1.5">
                    {/^not stated/i.test(x.process) ? "Process not stated" : x.process}
                    {x.reapply && (
                      <span className="mt-1 block text-[13px] text-soon">
                        <span className="font-semibold">Re-apply rule:</span> {x.reapply}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 whitespace-nowrap max-md:block max-md:p-0 max-md:pt-2">
                    <a href={x.source} target="_blank" rel="noreferrer" className="link">
                      Posting
                      <NewTab />
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleSave(x.id)}
                      className={`ml-3 underline underline-offset-2 ${isSaved ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}
                    >
                      {isSaved ? "Saved" : "Save"}
                      <span className="sr-only"> {x.title} at {x.company}</span>
                    </button>
                    <a
                      href={reportUrl(x)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-[13px] text-muted underline underline-offset-2 hover:text-ink"
                    >
                      Something wrong?
                      <span className="sr-only"> Report a mistake in {x.title} at {x.company}</span>
                      <NewTab />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
