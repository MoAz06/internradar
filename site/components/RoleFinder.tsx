"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { fields, fold, kinds, type Item } from "@/lib/items";
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

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`min-h-8 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
        on ? "border-signal/60 bg-signal/15 text-signal" : "border-line bg-surface text-muted hover:border-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="w-14 shrink-0 text-xs text-dim">{label}</span>
      {children}
    </div>
  );
}

const statusColor = (x: Item) =>
  x.status === "closed" ? "text-closed" : x.status === "soon" || x.urgent ? "text-soon" : "text-signal";
const dotColor = (x: Item) =>
  x.status === "closed" ? "bg-closed" : x.status === "soon" || x.urgent ? "bg-soon" : "bg-signal glow";

export default function RoleFinder({ items, countries }: { items: Item[]; countries: CountryOption[] }) {
  const [f, setF] = useState<Filters>(start);
  const [saved, setSaved] = useState<string[]>([]);
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
    setSaved(readSaved());
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
  }, [countries]);

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
    const next = saved.includes(id) ? saved.filter((s) => s !== id) : [...saved, id];
    setSaved(next);
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch {
      // private mode or blocked storage: the star still works until the page closes
    }
  };
  const filtered = f.q || f.status !== "open" || f.kind || f.field || f.country || f.saved;

  return (
    <div ref={top} id="roles">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="role-search" className="sr-only">
              Search roles
            </label>
            <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-dim" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={search}
              id="role-search"
              type="search"
              value={f.q}
              onChange={(e) => set({ q: e.target.value })}
              placeholder="Search a company, role or city"
              autoComplete="off"
              className="h-11 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-[15px] text-ink placeholder:text-dim hover:border-muted"
            />
          </div>
          <label className="sr-only" htmlFor="role-country">
            Country
          </label>
          <select
            id="role-country"
            value={f.country}
            onChange={(e) => set({ country: e.target.value })}
            className="h-11 rounded-lg border border-line bg-surface px-3 text-[15px] text-ink hover:border-muted sm:w-56"
          >
            <option value="">All countries</option>
            {countries.map((k) => (
              <option key={k.code} value={k.code}>
                {k.name} ({k.count})
              </option>
            ))}
          </select>
        </div>
        <Row label="Status">
          <Chip on={f.status === "open"} onClick={() => set({ status: "open" })}>Open now</Chip>
          <Chip on={f.status === "soon"} onClick={() => set({ status: "soon" })}>Opening soon</Chip>
          <Chip on={f.status === "all"} onClick={() => set({ status: "all" })}>All, also closed</Chip>
        </Row>
        <Row label="Type">
          <Chip on={!f.kind} onClick={() => set({ kind: "" })}>Any</Chip>
          {kinds.map((k) => (
            <Chip key={k} on={f.kind === k} onClick={() => set({ kind: k })}>{k}</Chip>
          ))}
        </Row>
        <Row label="Field">
          <Chip on={!f.field} onClick={() => set({ field: "" })}>Any</Chip>
          {fields.map((x) => (
            <Chip key={x} on={f.field === x} onClick={() => set({ field: x })}>{x}</Chip>
          ))}
        </Row>
      </div>

      <div className="mt-5 mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-3">
          <p aria-live="polite" className="text-[15px] font-semibold">
            {shown.length} {shown.length === 1 ? "role" : "roles"}
          </p>
          {filtered && (
            <button type="button" onClick={() => setF(start)} className="py-1 text-[13px] text-muted underline underline-offset-2 hover:text-ink">
              Clear filters
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-[13px] text-muted">
          <span>Deadline soonest first</span>
          <Chip on={f.saved} onClick={() => set({ saved: !f.saved })}>
            <span aria-hidden>★ </span>Saved ({saved.length})
          </Chip>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line px-5 py-8 text-center">
          <p className="text-[15px]">No roles match.</p>
          <p className="mt-1 text-sm text-muted">Try fewer filters, or search for a city instead of a company.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((x) => {
            const isSaved = saved.includes(x.id);
            return (
              <li key={x.id} className="flex flex-col gap-2.5 rounded-[10px] border border-line bg-surface px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] text-muted">
                    <Link href={`/companies/${x.slug}/`} className="font-semibold text-ink hover:text-signal">
                      {x.company}
                    </Link>{" "}
                    · {x.city}
                  </p>
                  <span className={`flex shrink-0 items-center gap-1.5 text-[13px] font-medium ${statusColor(x)}`}>
                    <span className={`inline-block h-2 w-2 rounded-full ${dotColor(x)}`} aria-hidden />
                    {x.when}
                  </span>
                </div>
                <h3 className="text-[15px] leading-snug font-semibold">{x.title}</h3>
                <p className="text-xs text-dim">
                  {x.kind} · {x.field} · {x.countryName}
                </p>
                {x.steps ? (
                  <ol aria-label="Process" className="flex flex-wrap items-center gap-1">
                    {x.steps.map((s, i) => (
                      <li key={i} className="flex items-center gap-1">
                        {i > 0 && <span aria-hidden className="text-xs text-dim">→</span>}
                        <span className="rounded-md bg-raised px-2 py-0.5 text-xs text-muted">{s}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-[13px] text-muted">{/^not stated/i.test(x.process) ? "Process not stated" : x.process}</p>
                )}
                {x.reapply && (
                  <p className="text-[13px] text-soon">
                    <span aria-hidden>⚠ </span>Re-apply rule: {x.reapply}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <span className={`text-xs ${x.old ? "text-soon" : "text-dim"}`}>
                    {/^not stated/i.test(x.start) ? "" : `Start ${x.start} · `}checked {shortDate(x.checked)}
                    {x.old ? ", over 3 months ago" : ""}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-pressed={isSaved}
                      aria-label={`Save ${x.title} at ${x.company}`}
                      onClick={() => toggleSave(x.id)}
                      className={`h-8 w-8 rounded-md border border-line text-[15px] hover:border-muted ${isSaved ? "text-soon" : "text-dim"}`}
                    >
                      <span aria-hidden>{isSaved ? "★" : "☆"}</span>
                    </button>
                    <a
                      href={x.source}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-8 items-center rounded-md border border-line bg-raised px-2.5 text-[13px] font-medium hover:border-muted"
                    >
                      Posting <span aria-hidden>&nbsp;↗</span>
                      <NewTab />
                    </a>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
