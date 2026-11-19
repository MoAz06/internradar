"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { fields, fold, kinds, reportUrl, roleHref, shortWhen, type Item } from "@/lib/items";
import { eventsFor, toIcs } from "@/lib/ics";
import { shortDate } from "@/lib/format";
import NewTab from "@/components/NewTab";
import AddToCalendar from "@/components/AddToCalendar";
import { readSaved, visitSince, writeSaved } from "@/lib/mine";
import FilterSheet from "@/components/FilterSheet";
import Icon from "@/components/Icon";
import { toast } from "@/lib/toast";
import { levels, type Level } from "@/lib/eligibility";
import { query, searchable } from "@/lib/search";

type CountryOption = { code: string; name: string; slug: string; count: number };
type StatusFilter = "open" | "soon" | "new" | "all";
type Sort = "deadline" | "pay";
type Filters = {
  q: string;
  status: StatusFilter;
  kind: string;
  field: string;
  country: string;
  saved: boolean;
  level: Level | "";
  /** hide roles that need work rights already or don't sponsor */
  visa: boolean;
  /** hide roles that ask for a language besides English */
  english: boolean;
  sort: Sort;
};

const start: Filters = { q: "", status: "open", kind: "", field: "", country: "", saved: false, level: "", visa: false, english: false, sort: "deadline" };
const PER_KEY = "internradar:per-page";
const PER_PAGE = [25, 50, 75, 100];

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
        className="h-10 max-w-[170px] rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink hover:border-muted"
      >
        {children}
      </select>
    </>
  );
}

/** Page numbers to show: the first, the last, and the ones next to the current page. */
function pageList(cur: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= pages));
  const out: (number | "gap")[] = [];
  let last = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (n - last === 2) out.push(n - 1);
    else if (n - last > 2) out.push("gap");
    out.push(n);
    last = n;
  }
  return out;
}

const statusColor = (x: Item) =>
  x.status === "closed" ? "text-closed" : x.status === "soon" || x.urgent ? "text-soon" : "text-signal";

export default function RoleFinder({ items, countries }: { items: Item[]; countries: CountryOption[] }) {
  const [f, setF] = useState<Filters>(start);
  const [saved, setSaved] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(25);
  // roles added since the visitor's previous visit (a day, not a moment), on top of the ones from this week
  const [since, setSince] = useState<string | null>(null);
  // desktop rows whose details are open
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const flipRow = (id: string) =>
    setOpenRows((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const search = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);
  // set when a page button is clicked, so that step gets its own history entry for the back button
  const pushNext = useRef(false);

  // filters from the URL (?q=&status=&type=&field=&country=) and old #country links
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const bySlug = (slug: string) => countries.find((k) => k.slug === slug || k.code.toLowerCase() === slug)?.code ?? "";
    const fromHash = bySlug(location.hash.slice(1));
    setF({
      q: p.get("q") ?? "",
      status: (["open", "soon", "new", "all"] as const).find((s) => s === p.get("status")) ?? "open",
      kind: kinds.find((k) => k.toLowerCase() === p.get("type")) ?? "",
      field: fields.find((x) => fold(x).replace(/ /g, "-") === p.get("field")) ?? "",
      country: bySlug(p.get("country") ?? "") || fromHash,
      saved: false,
      level: levels.find((l) => l.value === p.get("level"))?.value ?? "",
      visa: p.get("visa") === "1",
      english: p.get("english") === "1",
      sort: p.get("sort") === "pay" ? "pay" : "deadline",
    });
    // blocked storage gives null: then only "new this week" shows
    setSince(visitSince());
    const perFromUrl = Number(p.get("per"));
    let perStored = 0;
    try {
      perStored = Number(localStorage.getItem(PER_KEY));
    } catch {
      // blocked storage: the default is fine
    }
    setPer(PER_PAGE.find((n) => n === perFromUrl) ?? PER_PAGE.find((n) => n === perStored) ?? 25);
    setPage(Math.max(1, Math.floor(Number(p.get("page")) || 1)));
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
    if (fromHash || p.get("q")) toList();
    const onHash = () => {
      const code = bySlug(location.hash.slice(1));
      if (code) {
        setF((x) => ({ ...x, country: code }));
        setPage(1);
        toList();
      }
    };
    window.addEventListener("hashchange", onHash);
    // back and forward between pages of the list
    const onPop = () => setPage(Math.max(1, Math.floor(Number(new URLSearchParams(location.search).get("page")) || 1)));
    window.addEventListener("popstate", onPop);
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
      window.removeEventListener("popstate", onPop);
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
    if (f.level) p.set("level", f.level);
    if (f.visa) p.set("visa", "1");
    if (f.english) p.set("english", "1");
    if (f.sort === "pay") p.set("sort", "pay");
    if (page > 1) p.set("page", String(page));
    if (per !== 25) p.set("per", String(per));
    const qs = p.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ""}${countries.some((k) => `#${k.slug}` === location.hash) ? "" : location.hash}`;
    if (url !== location.pathname + location.search + location.hash) {
      if (pushNext.current) history.pushState(null, "", url);
      else history.replaceState(null, "", url);
    }
    pushNext.current = false;
  }, [f, countries, page, per]);

  const isNew = (x: Item) => x.fresh || (since !== null && x.added > since && x.status !== "closed");

  // every filter except the status, so the status chips can say how many each one would show
  const index = useMemo(() => new Map(items.map((x) => [x.id, searchable([x.company, x.title, x.city, x.countryName, x.field, x.kind])])), [items]);
  const matched = useMemo(() => {
    const test = query(f.q);
    return items.filter((x) => {
      if (f.kind && x.kind !== f.kind) return false;
      if (f.field && x.field !== f.field) return false;
      if (f.country && x.country !== f.country) return false;
      if (f.saved && !saved.includes(x.id)) return false;
      // a role that names no level fits every level
      if (f.level && x.levels && !x.levels.includes(f.level)) return false;
      if (f.visa && x.workRights) return false;
      if (f.english && x.languages.length) return false;
      if (test && !test(index.get(x.id)!)) return false;
      return true;
    });
  }, [items, index, f.q, f.kind, f.field, f.country, f.saved, f.level, f.visa, f.english, saved]);

  const shown = useMemo(
    () =>
      matched.filter((x) => {
        if (f.status === "open") return x.status === "open" || x.status === "rolling";
        if (f.status === "soon") return x.status === "soon";
        if (f.status === "new") return x.fresh || (since !== null && x.added > since && x.status !== "closed");
        return true;
      }),
    [matched, f.status, since],
  );
  // highest stated pay first, then figures without a period, then the rest in deadline order
  const sorted = useMemo(() => {
    if (f.sort !== "pay") return shown;
    const rank = (x: Item) => (x.pay?.month !== undefined ? 0 : x.pay ? 1 : 2);
    return [...shown].sort((a, b) => rank(a) - rank(b) || (b.pay?.month ?? 0) - (a.pay?.month ?? 0));
  }, [shown, f.sort]);
  const withPay = shown.filter((x) => x.pay).length;
  const counts = {
    open: matched.filter((x) => x.status === "open" || x.status === "rolling").length,
    soon: matched.filter((x) => x.status === "soon").length,
    new: matched.filter(isNew).length,
  };

  const pages = Math.max(1, Math.ceil(shown.length / per));
  const cur = Math.min(page, pages);
  const first = (cur - 1) * per;
  const onPage = sorted.slice(first, first + per);

  // a new filter starts again at page 1
  const set = (patch: Partial<Filters>) => {
    setF((x) => ({ ...x, ...patch }));
    setPage(1);
  };
  const goTo = (n: number) => {
    if (n === cur) return;
    pushNext.current = true;
    setPage(n);
    top.current?.scrollIntoView();
  };
  const changePer = (n: number) => {
    // stay near the same roles: keep the first role of this page on screen
    setPage(Math.floor(first / n) + 1);
    setPer(n);
    try {
      localStorage.setItem(PER_KEY, String(n));
    } catch {
      // blocked storage: the choice holds until the page closes
    }
  };
  const toggleSave = (id: string, quiet = false) => {
    if (!quiet) toast(saved.includes(id) ? "Removed from your list" : "Saved to your list", () => toggleSave(id, true));
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
  const filtered = f.q || f.status !== "open" || f.kind || f.field || f.country || f.saved || f.level || f.visa || f.english || f.sort !== "deadline";

  return (
    <div ref={top} id="roles" className="max-md:scroll-mt-16">
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
          className="h-10 min-w-0 rounded-md border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-dim hover:border-muted sm:min-w-[200px] sm:flex-1"
        />
        <FilterSheet f={f} set={set} countries={countries} count={shown.length} counts={counts} />
        <div className="contents max-md:hidden">
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
        <Select id="role-level" label="Your study level" value={f.level} onChange={(v) => set({ level: v as Level | "" })}>
          <option value="">Any level</option>
          {levels.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
        </div>
      </div>

      <div className="mt-4 mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-sans text-[13px] max-md:mt-3 max-md:mb-1.5">
        <p aria-live="polite" className="font-semibold">
          {shown.length > per
            ? `${first + 1}-${first + onPage.length} of ${shown.length} roles`
            : `${shown.length} ${shown.length === 1 ? "role" : "roles"}`}
        </p>
        <span className="text-muted md:hidden">{f.sort === "pay" ? `highest stated pay first, ${withPay} with a figure` : "soonest deadline first"}</span>
        <label className="flex items-center gap-1.5 text-muted max-md:hidden">
          <span className="sr-only">Sort</span>
          <select
            value={f.sort}
            onChange={(e) => set({ sort: e.target.value as Sort })}
            className="h-8 rounded-md border border-line bg-surface px-1.5 text-[13px] text-ink hover:border-muted"
          >
            <option value="deadline">Soonest deadline first</option>
            <option value="pay">Highest stated pay first ({withPay})</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-muted max-md:hidden" title="Hides roles that say they don't sponsor visas or that you need the right to work there already">
          <input type="checkbox" checked={f.visa} onChange={(e) => set({ visa: e.target.checked })} className="h-4 w-4" />
          I need a visa
        </label>
        <label className="flex items-center gap-1.5 text-muted max-md:hidden" title="Hides roles that ask for German, French, Dutch or another language">
          <input type="checkbox" checked={f.english} onChange={(e) => set({ english: e.target.checked })} className="h-4 w-4" />
          English only
        </label>
        <label className="flex items-center gap-1.5 text-muted max-md:hidden">
          <input type="checkbox" checked={f.saved} onChange={(e) => set({ saved: e.target.checked })} className="h-4 w-4" />
          Only saved ({saved.length})
        </label>
        {filtered && (
          <button type="button" onClick={() => { setF(start); setPage(1); }} className="text-link underline underline-offset-2 max-md:hidden">
            Clear filters
          </button>
        )}
        {saved.length > 0 && (
          <>
            <Link href="/mine/" className="font-semibold text-link underline underline-offset-2 max-md:hidden" data-track="to-mine">
              My applications ({saved.length})
            </Link>
            <button type="button" onClick={downloadCalendar} className="text-link underline underline-offset-2 max-md:hidden" data-track="saved-calendar">
              Saved roles to my calendar
            </button>
            <button type="button" onClick={copyLink} className="text-link underline underline-offset-2 max-md:hidden" data-track="saved-link">
              Open my saved list on another device
            </button>
          </>
        )}
        <span className="ml-auto flex gap-1.5 max-md:hidden">
          {(["open", "soon", "new", "all"] as const).map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={f.status === st}
              onClick={() => set({ status: st })}
              className={`h-8 rounded-full border px-3 text-[13px] whitespace-nowrap ${
                f.status === st ? "border-ink bg-ink font-semibold text-bg" : "border-line bg-surface text-ink hover:border-muted"
              }`}
            >
              {st === "open" ? "Open" : st === "soon" ? "Soon" : st === "new" ? "New" : "All"}
              {st === "all" ? <span className="sr-only">, also closed</span> : <span className={`ml-1 ${f.status === st ? "opacity-75" : "text-dim"}`}>{counts[st]}</span>}
            </button>
          ))}
        </span>
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
        <>
        {/* phones: one compact row per role, the details open on a tap */}
        <ul className="border-t border-line md:hidden">
          {onPage.map((x) => {
            const isSaved = saved.includes(x.id);
            const hot = x.status === "soon" ? "text-soon" : x.urgent ? "font-semibold text-soon" : "text-muted";
            return (
              <li key={x.id} className="relative border-b border-line">
                <details>
                  <summary className="block cursor-pointer list-none py-2.5 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-baseline gap-2 pr-11">
                      <span className="min-w-0 flex-1 truncate">
                        {isNew(x) && <span className="mr-1.5 rounded-sm bg-ink px-1 py-px align-[1px] font-sans text-[10px] font-semibold tracking-wide text-bg uppercase">New</span>}
                        <b className="text-[15px] font-bold">{x.company}</b>
                        <span className="font-sans text-[12px] text-muted"> · {x.city}</span>
                      </span>
                      <span className={`shrink-0 font-sans text-[12px] whitespace-nowrap tabular-nums ${hot}`}>{shortWhen(x)}</span>
                    </span>
                    {x.pay ? (
                      <span className="mt-0.5 flex items-baseline gap-2 pr-11">
                        <span className="min-w-0 flex-1 truncate text-[15px]">{x.title}</span>
                        <span className="shrink-0 font-sans text-[12px] whitespace-nowrap text-muted tabular-nums">{x.pay.short}</span>
                      </span>
                    ) : (
                      <span className="mt-0.5 block truncate text-[15px]">{x.title}</span>
                    )}
                  </summary>
                  <div className="pb-3 text-[14px] leading-[1.5]">
                    <p className="text-muted">
                      {x.when}. {x.kind}, {x.field}. {/^not stated/i.test(x.start) ? "" : `Starts ${x.start}. `}Checked {shortDate(x.checked)}
                      {x.old ? ", over 3 months ago" : ""}.
                    </p>
                    <p className="mt-1.5">{/^not stated/i.test(x.process) ? "The posting doesn't describe the process." : x.process}</p>
                    {x.pay && (
                      <p className="mt-1.5">
                        <span className="font-semibold">Pay:</span> {x.pay.label}
                      </p>
                    )}
                    {x.languages.length > 0 && <p className="mt-1.5 text-muted">Asks for {x.languages.join(" and ")}.</p>}
                    {x.reapply && (
                      <p className="mt-1.5 text-soon">
                        <span className="font-semibold">Re-apply rule:</span> {x.reapply}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <a href={x.source} target="_blank" rel="noreferrer" className="link font-semibold" data-track="posting">
                        Posting
                        <NewTab />
                      </a>
                      <Link href={roleHref(x.key)} className="link">
                        Role page
                      </Link>
                      <Link href={`/companies/${x.slug}/`} className="link">
                        {x.company}
                      </Link>
                      <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} />
                      <a href={reportUrl(x)} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-2">
                        Something wrong?
                        <span className="sr-only"> Report a mistake in {x.title} at {x.company}</span>
                        <NewTab />
                      </a>
                    </div>
                  </div>
                </details>
                <button
                  type="button"
                  onClick={() => toggleSave(x.id)}
                  aria-pressed={isSaved}
                  data-track={isSaved ? "unsave" : "save"}
                  className={`absolute top-0 right-0 flex h-11 w-11 items-center justify-end ${isSaved ? "text-accent" : "text-dim"}`}
                >
                  <Icon name="bookmark" filled={isSaved} className="h-5 w-5" />
                  <span className="sr-only">
                    Save {x.title} at {x.company}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <table className="w-full table-fixed border-collapse text-left text-[15px] max-md:hidden">
          <caption className="sr-only">Roles that match the filters. Open a role for its process and links.</caption>
          <colgroup>
            <col className="w-11" />
            <col className="w-[18%]" />
            <col />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead>
            <tr className="border-b-2 border-ink text-[13px]">
              <th scope="col">
                <span className="sr-only">Saved</span>
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">Company</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Role</th>
              <th scope="col" className="py-2 pr-4 font-semibold">City</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Pay</th>
              <th scope="col" className="py-2 pr-4 font-semibold">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {onPage.map((x) => {
              const isSaved = saved.includes(x.id);
              const open = openRows.has(x.id);
              return (
                <Fragment key={x.id}>
                  <tr className={`border-line ${open ? "bg-raised/60" : "border-b hover:bg-raised/40"}`}>
                    <td className="align-top">
                      <button
                        type="button"
                        onClick={() => toggleSave(x.id)}
                        aria-pressed={isSaved}
                        data-track={isSaved ? "unsave" : "save"}
                        className={`flex h-11 w-11 items-center justify-center ${isSaved ? "text-accent" : "text-dim hover:text-ink"}`}
                      >
                        <Icon name="bookmark" filled={isSaved} className="h-[18px] w-[18px]" />
                        <span className="sr-only">
                          Save {x.title} at {x.company}
                        </span>
                      </button>
                    </td>
                    <td className="truncate py-2.5 pr-4 align-top">
                      <Link href={`/companies/${x.slug}/`} className="font-semibold hover:underline">
                        {x.company}
                      </Link>
                    </td>
                    <td className="py-1 pr-4 align-top">
                      <button
                        type="button"
                        onClick={() => flipRow(x.id)}
                        aria-expanded={open}
                        className="flex min-h-9 w-full items-start gap-1.5 py-1.5 text-left font-serif hover:underline"
                      >
                        <span className="line-clamp-1">
                          {isNew(x) && (
                            <span className="mr-1.5 rounded-sm bg-ink px-1 py-px align-[2px] font-sans text-[10px] font-semibold tracking-wide text-bg uppercase">New</span>
                          )}
                          {x.title}
                        </span>
                        <Icon name="chevron" className={`mt-1 h-4 w-4 shrink-0 text-dim transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                    <td className="truncate py-2.5 pr-4 align-top font-sans text-[13px] leading-6 text-muted">{x.city}</td>
                    <td className="truncate py-2.5 pr-4 align-top font-sans text-[13px] leading-6 text-muted tabular-nums">{x.pay?.short}</td>
                    <td className={`py-2.5 pr-4 align-top font-sans text-[13px] leading-6 font-semibold whitespace-nowrap tabular-nums ${statusColor(x)}`}>
                      {shortWhen(x)}
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-line bg-raised/60">
                      <td />
                      <td colSpan={5} className="pr-4 pb-3.5 text-[15px] leading-[1.55]">
                        <p className={`font-sans text-[13px] ${x.old ? "text-soon" : "text-muted"}`}>
                          {x.when}. {x.kind}, {x.field}. {/^not stated/i.test(x.start) ? "" : `Starts ${x.start}. `}Checked {shortDate(x.checked)}
                          {x.old ? ", over 3 months ago" : ""}.
                        </p>
                        <p className="mt-1">{/^not stated/i.test(x.process) ? "The posting doesn't describe the process." : x.process}</p>
                        {x.pay && (
                          <p className="mt-1">
                            <span className="font-semibold">Pay:</span> {x.pay.label}
                          </p>
                        )}
                        {x.languages.length > 0 && <p className="mt-1 text-muted">Asks for {x.languages.join(" and ")}.</p>}
                        {x.reapply && (
                          <p className="mt-1 text-soon">
                            <span className="font-semibold">Re-apply rule:</span> {x.reapply}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 font-sans text-[14px]">
                          <a href={x.source} target="_blank" rel="noreferrer" className="link font-semibold" data-track="posting">
                            Posting
                            <NewTab />
                          </a>
                          <Link href={roleHref(x.key)} className="link">
                            Role page
                          </Link>
                          <Link href={`/companies/${x.slug}/`} className="link">
                            How {x.company} hires
                          </Link>
                          <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} />
                          <a href={reportUrl(x)} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-2 hover:text-ink">
                            Something wrong?
                            <span className="sr-only"> Report a mistake in {x.title} at {x.company}</span>
                            <NewTab />
                          </a>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        </>
      )}

      {shown.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 text-[15px] sm:flex-row sm:items-center sm:justify-between">
          {pages > 1 ? (
            <nav aria-label="Pages">
              <ul className="flex flex-wrap items-center gap-1">
                <li>
                  <button
                    type="button"
                    onClick={() => goTo(cur - 1)}
                    disabled={cur === 1}
                    className="h-11 px-2 text-link underline underline-offset-2 disabled:text-dim disabled:no-underline"
                  >
                    Previous
                  </button>
                </li>
                {pageList(cur, pages).map((n, i) =>
                  n === "gap" ? (
                    <li key={`gap${i}`} aria-hidden="true" className="px-1 text-dim">
                      ...
                    </li>
                  ) : (
                    <li key={n}>
                      <button
                        type="button"
                        onClick={() => goTo(n)}
                        aria-current={n === cur ? "page" : undefined}
                        className={`h-11 min-w-11 px-2 ${
                          n === cur ? "bg-ink font-semibold text-bg" : "text-link underline underline-offset-2"
                        }`}
                      >
                        <span className="sr-only">Page </span>
                        {n}
                      </button>
                    </li>
                  ),
                )}
                <li>
                  <button
                    type="button"
                    onClick={() => goTo(cur + 1)}
                    disabled={cur === pages}
                    className="h-11 px-2 text-link underline underline-offset-2 disabled:text-dim disabled:no-underline"
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-2 text-muted">
            <Select id="role-per-page" label="Roles per page" value={String(per)} onChange={(v) => changePer(Number(v))}>
              {PER_PAGE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <span aria-hidden="true">per page</span>
          </span>
        </div>
      )}
    </div>
  );
}
