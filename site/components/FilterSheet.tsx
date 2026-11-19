"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { fields, kinds } from "@/lib/items";

type Status = "open" | "soon" | "new" | "all";
export type SheetFilters = { status: Status; kind: string; field: string; country: string };
type CountryOption = { code: string; name: string; count: number };

const statusNames: Record<Status, string> = { open: "Open", soon: "Opening soon", new: "New", all: "All, also closed" };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-9 rounded-full border px-3 text-[15px] whitespace-nowrap ${on ? "border-ink bg-ink font-semibold text-bg" : "border-line bg-surface text-ink"}`}
    >
      {children}
    </button>
  );
}

/** Phones only: a row with the Filters button and the filters that are on, and a sheet from the bottom to change them. */
export default function FilterSheet({
  f,
  set,
  countries,
  count,
  counts,
}: {
  f: SheetFilters;
  set: (patch: Partial<SheetFilters>) => void;
  countries: CountryOption[];
  count: number;
  counts: { open: number; soon: number; new: number };
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  const on: { label: string; clear: Partial<SheetFilters> }[] = [
    ...(f.status === "all" ? [{ label: statusNames.all, clear: { status: "open" as Status } }] : []),
    ...(f.kind ? [{ label: f.kind, clear: { kind: "" } }] : []),
    ...(f.field ? [{ label: f.field, clear: { field: "" } }] : []),
    ...(f.country ? [{ label: countries.find((k) => k.code === f.country)?.name ?? f.country, clear: { country: "" } }] : []),
  ];

  useEffect(() => {
    if (!open) return;
    const back = button.current;
    document.body.style.overflow = "hidden";
    sheet.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab" || !sheet.current) return;
      const all = [...sheet.current.querySelectorAll<HTMLElement>("button, select")];
      const first = all[0];
      const last = all[all.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      back?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <div className="flex flex-wrap gap-1.5">
        <button
          ref={button}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="filters"
          className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-muted bg-surface px-2.5 text-[14px] font-semibold text-ink"
          data-track="filters-open"
        >
          <Icon name="filter" />
          Filters{on.length ? ` ${on.length}` : ""}
        </button>
        {(["open", "soon", "new"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={f.status === s}
            onClick={() => set({ status: s })}
            className={`h-9 shrink-0 rounded-full border px-2.5 text-[14px] whitespace-nowrap ${
              f.status === s ? "border-ink bg-ink font-semibold text-bg" : "border-line bg-surface text-ink"
            }`}
          >
            {s === "open" ? "Open" : s === "soon" ? "Soon" : "New"} <span className={f.status === s ? "" : "text-dim"}>{counts[s]}</span>
          </button>
        ))}
        {on.map((x) => (
          <button
            key={x.label}
            type="button"
            onClick={() => set(x.clear)}
            className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-raised px-2.5 text-[14px] font-semibold whitespace-nowrap text-ink"
          >
            {x.label}
            <Icon name="x" className="h-4 w-4" />
            <span className="sr-only">, remove this filter</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-40">
          <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full bg-black/35" />
          <div
            ref={sheet}
            id="filters"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-title"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-bg px-4 pt-2 pb-5 focus:outline-none"
          >
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line" />
            <div className="flex items-center justify-between">
              <h2 id="filters-title" className="text-[18px] font-bold">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => set({ status: "open", kind: "", field: "", country: "" })}
                className="h-10 px-1 text-[15px] text-link underline underline-offset-2"
              >
                Clear
              </button>
            </div>

            <p className="mt-2 text-[13px] font-semibold text-muted">Status</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(["open", "soon", "new", "all"] as Status[]).map((s) => (
                <Chip key={s} on={f.status === s} onClick={() => set({ status: s })}>
                  {s === "open" ? `Open ${counts.open}` : s === "soon" ? `Soon ${counts.soon}` : s === "new" ? `New ${counts.new}` : "All"}
                </Chip>
              ))}
            </div>

            <p className="mt-3 text-[13px] font-semibold text-muted">Type</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {kinds.map((k) => (
                <Chip key={k} on={f.kind === k} onClick={() => set({ kind: f.kind === k ? "" : k })}>
                  {k}
                </Chip>
              ))}
            </div>

            <p className="mt-3 text-[13px] font-semibold text-muted">Field</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {fields.map((x) => (
                <Chip key={x} on={f.field === x} onClick={() => set({ field: f.field === x ? "" : x })}>
                  {x}
                </Chip>
              ))}
            </div>

            <label htmlFor="sheet-country" className="mt-3 block text-[13px] font-semibold text-muted">
              Country
            </label>
            <select
              id="sheet-country"
              value={f.country}
              onChange={(e) => set({ country: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink"
            >
              <option value="">All countries</option>
              {countries.map((k) => (
                <option key={k.code} value={k.code}>
                  {k.name} ({k.count})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 h-11 w-full rounded-md bg-ink text-[16px] font-semibold text-bg"
            >
              Show {count} {count === 1 ? "role" : "roles"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
