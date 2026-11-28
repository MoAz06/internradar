"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { fields } from "@/lib/items";
import { levels, type Level } from "@/lib/eligibility";

type Status = "open" | "soon" | "new" | "all";
export type SheetFilters = {
  status: Status;
  kind: string;
  field: string;
  level: Level | "";
  visa: boolean;
  english: boolean;
  noClearance: boolean;
  relocation: boolean;
  /** a test tool by name, "none" for roles whose company names none, "" for all */
  test: string;
  /** only the roles that fit the profile set on /profile/ */
  fit: boolean;
  saved: boolean;
};

const statusNames: Record<Status, string> = { open: "Open", soon: "Opening soon", new: "New", all: "All, also closed" };

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-11 rounded-full border px-3.5 text-[15px] whitespace-nowrap ${on ? "border-ink bg-ink font-semibold text-bg" : "border-line bg-surface text-ink hover:border-muted"}`}
    >
      {children}
    </button>
  );
}

/** "More filters": the filters that are not on the row itself, in a sheet from the bottom on phones and a panel on wider screens. */
export default function FilterSheet({
  f,
  set,
  count,
  counts,
  profile,
  on,
  saved,
  tools,
  onCalendar,
  onCopyLink,
}: {
  f: SheetFilters;
  set: (patch: Partial<SheetFilters>) => void;
  count: number;
  counts: { open: number; soon: number; new: number };
  /** the profile in words, or null when there is none */
  profile: string | null;
  /** how many of the filters in the sheet are on */
  on: number;
  /** how many roles are saved in this browser */
  saved: number;
  /** the test tools named on the list, with their open roles */
  tools: { name: string; count: number }[];
  onCalendar: () => void;
  onCopyLink: () => void;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

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
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="filters"
        className="flex h-11 items-center justify-center gap-1.5 rounded-md border border-ink bg-transparent px-3.5 text-[15px] text-ink hover:bg-raised max-md:flex-[1_1_40%]"
        data-track="filters-open"
      >
        <Icon name="filter" />
        More filters{on ? ` (${on})` : ""}
      </button>

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
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-bg px-4 pt-2 pb-5 focus:outline-none md:inset-x-auto md:top-[8vh] md:bottom-auto md:left-1/2 md:w-[520px] md:-translate-x-1/2 md:rounded-2xl md:border md:border-line md:px-6 md:pt-5 md:shadow-xl"
          >
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line md:hidden" />
            <div className="flex items-center justify-between">
              <h2 id="filters-title" className="text-[18px] font-bold">
                Filters
              </h2>
              <button
                type="button"
                onClick={() => set({ status: "open", field: "", level: "", visa: false, english: false, noClearance: false, relocation: false, test: "", fit: false, saved: false })}
                className="h-10 px-1 text-[15px] text-link underline underline-offset-2"
              >
                Clear
              </button>
            </div>

            <p className="mt-2 text-[13px] font-semibold text-muted">My profile</p>
            {profile ? (
              <>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Chip on={f.fit} onClick={() => set({ fit: !f.fit })}>
                    Only roles that fit me
                  </Chip>
                  <Link href="/profile/" className="flex h-11 items-center px-1 text-[15px] text-link underline underline-offset-2">
                    Edit
                  </Link>
                </div>
                <p className="mt-1 text-[12px] text-muted">{profile}</p>
              </>
            ) : (
              <p className="mt-1 text-[14px] leading-[1.5] text-muted">
                <Link href="/profile/" className="link" data-track="profile-from-sheet">
                  Set your level, countries and visa once
                </Link>{" "}
                and the list starts with the roles that fit you.
              </p>
            )}

            <p className="mt-3 text-[13px] font-semibold text-muted">Status</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(["open", "soon", "new", "all"] as Status[]).map((s) => (
                <Chip key={s} on={f.status === s} onClick={() => set({ status: s })}>
                  {s === "open" ? `Open ${counts.open}` : s === "soon" ? `Soon ${counts.soon}` : s === "new" ? `New ${counts.new}` : "All"}
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

            <p className="mt-3 text-[13px] font-semibold text-muted">Your study level</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {levels.map((l) => (
                <Chip key={l.value} on={f.level === l.value} onClick={() => set({ level: f.level === l.value ? "" : l.value })}>
                  {l.label}
                </Chip>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-muted">Roles that name no level stay in.</p>

            <p className="mt-3 text-[13px] font-semibold text-muted">Visa, clearance and language</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Chip on={f.visa} onClick={() => set({ visa: !f.visa })}>
                I need a visa
              </Chip>
              <Chip on={f.noClearance} onClick={() => set({ noClearance: !f.noClearance })}>
                No security clearance
              </Chip>
              <Chip on={f.english} onClick={() => set({ english: !f.english })}>
                English only
              </Chip>
            </div>
            <p className="mt-1 text-[12px] text-muted">Hides roles that say they don't sponsor, that need a security clearance, or that ask for another language.</p>

            <p className="mt-3 text-[13px] font-semibold text-muted">Moving</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Chip on={f.relocation} onClick={() => set({ relocation: !f.relocation })}>
                Relocation or housing help named
              </Chip>
            </div>
            <p className="mt-1 text-[12px] text-muted">From the company&apos;s own pages. Some help is for some postings only: the role page quotes the line.</p>

            {tools.length > 0 && (
              <>
                <p className="mt-3 text-[13px] font-semibold text-muted">Online test</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {tools.map((t) => (
                    <Chip key={t.name} on={f.test === t.name} onClick={() => set({ test: f.test === t.name ? "" : t.name })}>
                      {t.name} {t.count}
                    </Chip>
                  ))}
                  <Chip on={f.test === "none"} onClick={() => set({ test: f.test === "none" ? "" : "none" })}>
                    No tool named
                  </Chip>
                </div>
                <p className="mt-1 text-[12px] text-muted">From the hiring steps each company describes. No tool named doesn't mean there is no test.</p>
              </>
            )}

            <p className="mt-3 text-[13px] font-semibold text-muted">Saved roles</p>
            {saved ? (
              <>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Chip on={f.saved} onClick={() => set({ saved: !f.saved })}>
                    Only saved ({saved})
                  </Chip>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-4 text-[15px]">
                  <Link href="/mine/" className="flex h-11 items-center text-link underline underline-offset-2" data-track="to-mine">
                    My applications
                  </Link>
                  <button type="button" onClick={() => { onCalendar(); setOpen(false); }} className="h-11 text-link underline underline-offset-2" data-track="saved-calendar">
                    To my calendar
                  </button>
                  <button type="button" onClick={() => { onCopyLink(); setOpen(false); }} className="h-11 text-link underline underline-offset-2" data-track="saved-link">
                    Open on another device
                  </button>
                </p>
              </>
            ) : (
              <p className="mt-1 text-[14px] leading-[1.5] text-muted">Tap the bookmark next to a role to keep it here.</p>
            )}

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
    </>
  );
}
