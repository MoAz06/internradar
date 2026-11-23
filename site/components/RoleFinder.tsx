"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { countryHref, fields, fold, kinds, reportUrl, roleHref, shortWhen, type Item } from "@/lib/items";
import { citiesOf, closesGroup, closesShort, FIRST_PAGE, payOf, payParts, toRows, type Row, type StartView } from "@/lib/rows";
import { eventsFor, toIcs } from "@/lib/ics";
import { shortDate } from "@/lib/format";
import NewTab from "@/components/NewTab";
import AddToCalendar from "@/components/AddToCalendar";
import CountryLink from "@/components/CountryLink";
import { readSaved, visitSince, writeSaved } from "@/lib/mine";
import FilterSheet from "@/components/FilterSheet";
import Icon from "@/components/Icon";
import { CountChip, HowLine } from "@/components/RoleBits";
import { toast } from "@/lib/toast";
import { levels, type Level } from "@/lib/eligibility";
import { query, searchable } from "@/lib/search";
import { fits, PROFILE_EVENT, profileWords, readProfile, type Profile } from "@/lib/profile";

type CountryOption = { code: string; name: string; slug: string; count: number };
type StatusFilter = "open" | "soon" | "new" | "all";
type Sort = "deadline" | "pay" | "new";
type Filters = {
  q: string;
  status: StatusFilter;
  kind: string;
  field: string;
  /** country codes; none means every country */
  countries: string[];
  saved: boolean;
  level: Level | "";
  /** hide roles that need work rights already or don't sponsor */
  visa: boolean;
  /** hide roles that ask for a language besides English */
  english: boolean;
  sort: Sort;
  /** only roles that fit the profile from /profile/ */
  fit: boolean;
};

const start: Filters = { q: "", status: "open", kind: "", field: "", countries: [], saved: false, level: "", visa: false, english: false, sort: "deadline", fit: false };
const PER_KEY = "internradar:per-page";
const PER_PAGE = [25, 50, 75, 100];
/** The query parameters the list writes itself. Any other one stays in the URL, like ?ref= from a mail. */
const OWN = ["q", "status", "type", "field", "country", "level", "visa", "english", "sort", "saved", "all", "page", "per"];

/** Country codes in the order of the menu, each once, so the same choice always gives the same link. */
const inOrder = (codes: string[], options: CountryOption[]) => options.map((k) => k.code).filter((c) => codes.includes(c));

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
        className="h-11 rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink hover:border-muted max-md:flex-[1_1_40%] md:max-w-[190px]"
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

/** The process line in a role's details. A role straight from the job board points to the company page. */
function Process({ x }: { x: Item }) {
  if (x.auto || !x.process)
    return (
      <>
        Added from {x.company}&apos;s job board, not checked by hand yet.{" "}
        <Link href={`/companies/${x.slug}/`} className="link">
          How {x.company} hires
        </Link>
      </>
    );
  return <>{/^not stated/i.test(x.process) ? "The posting doesn't describe the process." : x.process}</>;
}

/** The pay cell when the company names no figure: said plainly, so the empty cell does not look like missing data. */
const notStated = <span className="text-[12px] text-dim">not stated</span>;

/** Pay in the narrow desktop column: the figure, with the period in small type below it, so a long range never runs into the deadline. */
const payCell = (short: string) => {
  const { figure, period } = payParts(short);
  return (
    <>
      <span className="whitespace-nowrap">{figure}</span>
      {period && <span className="block text-[12px] text-dim">{period}</span>}
    </>
  );
};

const statusColor = (x: Item) =>
  x.status === "closed" ? "text-closed" : x.status === "soon" || x.urgent ? "text-soon" : "text-signal";

/** The list on the home page and the city pages. The page carries the first page of the plain view (`view`); every
 * role comes from /roles.json right after, and a link with its own filters waits for that. */
export default function RoleFinder({
  view,
  countries,
  now,
  scope,
}: {
  view: StartView;
  countries: CountryOption[];
  now: string;
  /** A city page: only these roles, by key. No country menu there, and the profile filter starts off, since a
   * profile with other countries in it would empty the list. */
  scope?: { place: string; keys: string[] };
}) {
  const [all, setAll] = useState<Item[] | null>(null);
  const [failed, setFailed] = useState(false);
  const inScope = useMemo(() => (scope ? new Set(scope.keys) : null), [scope]);
  const items = useMemo(() => (all && inScope ? all.filter((x) => inScope.has(x.key)) : (all ?? view.first)), [all, inScope, view.first]);
  const ready = all !== null || failed;
  const [f, setF] = useState<Filters>(start);
  // false until the filters have been read from the URL; the list doesn't write the URL before that
  const [urlRead, setUrlRead] = useState(false);
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [page, setPage] = useState(1);
  const [per, setPer] = useState(FIRST_PAGE);
  // keys from a ?saved= link, added once every role has loaded
  const savedKeys = useRef<string[]>([]);
  // phone rows opened at least once: their details are only built then, which keeps the page small
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const saw = (id: string) => setSeen((cur) => (cur.has(id) ? cur : new Set(cur).add(id)));
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
  // the countries: a button in the row opens them under it, so the count and the list stay in view while you pick
  const [countryOpen, setCountryOpen] = useState(false);
  const countryButton = useRef<HTMLButtonElement>(null);
  const countryPanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (countryOpen) countryPanel.current?.focus({ preventScroll: true });
  }, [countryOpen]);
  // set when a page button is clicked, so that step gets its own history entry for the back button
  const pushNext = useRef(false);

  // filters from the URL (?q=&status=&type=&field=&country=) and old #country links
  useEffect(() => {
    const bySlug = (slug: string) => countries.find((k) => k.slug === slug || k.code.toLowerCase() === slug)?.code ?? "";
    // scroll after the filtered list has rendered, else the browser lands somewhere above it
    const toList = () => setTimeout(() => top.current?.scrollIntoView(), 60);
    const read = () => {
      const p = new URLSearchParams(location.search);
      const fromHash = scope ? "" : bySlug(location.hash.slice(1));
      // ?country=netherlands, as in the mails and on the posters, or several joined by a dot: ?country=netherlands.germany
      const fromUrl = (p.get("country") ?? "").split(/[.,\s]+/).map(bySlug).filter(Boolean);
      // a link with its own filters shows those; a plain visit starts with the roles that fit the profile
      const me = readProfile();
      setProfile(me);
      const ownFilters = ["q", "status", "type", "field", "country", "level", "visa", "english", "sort", "saved", "all"].some((k) => p.has(k)) || !!fromHash;
      setF({
        q: p.get("q") ?? "",
        status: (["open", "soon", "new", "all"] as const).find((s) => s === p.get("status")) ?? "open",
        kind: kinds.find((k) => k.toLowerCase() === p.get("type")) ?? "",
        field: fields.find((x) => fold(x).replace(/ /g, "-") === p.get("field")) ?? "",
        countries: scope ? [] : inOrder(fromUrl.length ? fromUrl : [fromHash], countries),
        saved: false,
        level: levels.find((l) => l.value === p.get("level"))?.value ?? "",
        visa: p.get("visa") === "1",
        english: p.get("english") === "1",
        sort: p.get("sort") === "pay" ? "pay" : p.get("sort") === "new" ? "new" : "deadline",
        fit: !!me && !ownFilters && !scope,
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
      setPer(PER_PAGE.find((n) => n === perFromUrl) ?? PER_PAGE.find((n) => n === perStored) ?? FIRST_PAGE);
      setPage(Math.max(1, Math.floor(Number(p.get("page")) || 1)));
      // ?saved=key.key.key from "open on another device": those roles are added once the list has loaded
      savedKeys.current = (p.get("saved") ?? "").split(".").filter(Boolean);
      if (savedKeys.current.length) setF((x) => ({ ...x, saved: true }));
      setSaved(readSaved());
      if (fromHash || p.get("q")) toList();
      setUrlRead(true);
    };
    // A link inside the site (a country in a row, "search on the front page") puts its address in the bar only after
    // this has run, so read the URL once the bar shows this page. A link from a mail or a poster is there at once.
    const here = () => location.pathname.replace(/\/+$/, "") === pathname.replace(/\/+$/, "");
    let tries = 0;
    let timer = 0;
    const whenHere = () => {
      if (here() || ++tries > 50) read();
      else timer = window.setTimeout(whenHere, 10);
    };
    whenHere();
    const onHash = () => {
      const code = bySlug(location.hash.slice(1));
      if (code && !scope) {
        setF((x) => ({ ...x, countries: [code] }));
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
    const onProfile = () => setProfile(readProfile());
    window.addEventListener(PROFILE_EVENT, onProfile);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(PROFILE_EVENT, onProfile);
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, [countries, scope, pathname]);

  // every role, right after the first paint
  useEffect(() => {
    let gone = false;
    // no-cache asks the server whether the copy is still current, so a new build shows at once
    fetch("/roles.json", { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ items: Item[] }>;
      })
      .then((d) => !gone && setAll(d.items))
      .catch(() => {
        if (gone) return;
        setFailed(true);
        setNotice("The full list didn't load. Reload the page to try again.");
      });
    return () => {
      gone = true;
    };
  }, []);

  // the roles from a ?saved= link
  useEffect(() => {
    const keys = savedKeys.current;
    if (!all || !keys.length) return;
    savedKeys.current = [];
    const ids = all.filter((x) => keys.includes(x.key)).map((x) => x.id);
    const mine = readSaved();
    const merged = [...new Set([...mine, ...ids])];
    const added = merged.length - mine.length;
    writeSaved(merged);
    setSaved(merged);
    setNotice(added ? `Added ${added} saved ${added === 1 ? "role" : "roles"} from the link.` : "Those roles were already saved here.");
    if (!ids.length) setF((x) => ({ ...x, saved: false }));
  }, [all]);

  // keep the URL in step, so a filtered list can be shared as a link
  useEffect(() => {
    // not before the filters have been read from it, or the first run would wipe them
    if (!urlRead) return;
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.status !== "open") p.set("status", f.status);
    if (f.kind) p.set("type", f.kind.toLowerCase());
    if (f.field) p.set("field", fold(f.field).replace(/ /g, "-"));
    if (f.countries.length) p.set("country", f.countries.map((c) => countries.find((k) => k.code === c)?.slug).filter(Boolean).join("."));
    if (f.level) p.set("level", f.level);
    if (f.visa) p.set("visa", "1");
    if (f.english) p.set("english", "1");
    if (f.sort !== "deadline") p.set("sort", f.sort);
    // turned off by hand: keep it off on reload. A city page starts with it off anyway.
    if (profile && !f.fit && !p.size && !scope) p.set("all", "1");
    if (page > 1) p.set("page", String(page));
    if (per !== 25) p.set("per", String(per));
    // keep what the list doesn't write itself, like ?ref= from a mail or a poster: GoatCounter counts after the page
    // has loaded and reads it from the URL then
    for (const [k, v] of new URLSearchParams(location.search)) if (!OWN.includes(k)) p.append(k, v);
    const qs = p.toString();
    const url = `${location.pathname}${qs ? `?${qs}` : ""}${countries.some((k) => `#${k.slug}` === location.hash) ? "" : location.hash}`;
    if (url !== location.pathname + location.search + location.hash) {
      if (pushNext.current) history.pushState(null, "", url);
      else history.replaceState(null, "", url);
    }
    pushNext.current = false;
  }, [f, countries, page, per, profile, scope, urlRead]);

  const isNew = (x: Item) => x.fresh || (since !== null && x.added > since && x.status !== "closed");

  const index = useMemo(() => new Map(items.map((x) => [x.id, searchable([x.company, x.title, x.city, x.countryName, x.field, x.kind])])), [items]);
  // every filter except the country and the status: the numbers in the country picker come from this
  const anyCountry = useMemo(() => {
    const test = query(f.q);
    return items.filter((x) => {
      if (f.kind && x.kind !== f.kind) return false;
      if (f.field && x.field !== f.field) return false;
      if (f.saved && !saved.includes(x.id)) return false;
      // a role that names no level fits every level
      if (f.level && x.levels && !x.levels.includes(f.level)) return false;
      if (f.visa && x.workRights) return false;
      if (f.english && x.languages.length) return false;
      if (f.fit && profile && !fits(x, profile)) return false;
      if (test && !test(index.get(x.id)!)) return false;
      return true;
    });
  }, [items, index, f.q, f.kind, f.field, f.saved, f.level, f.visa, f.english, f.fit, profile, saved]);
  // every filter except the status, so the status chips can say how many each one would show
  const matched = useMemo(() => (f.countries.length ? anyCountry.filter((x) => f.countries.includes(x.country)) : anyCountry), [anyCountry, f.countries]);

  const statusOk = (x: Item) =>
    f.status === "open" ? x.status === "open" || x.status === "rolling" : f.status === "soon" ? x.status === "soon" : f.status === "new" ? isNew(x) : true;
  const shown = useMemo(() => matched.filter(statusOk), [matched, f.status, since]);
  // next to each country in the picker: how many roles it has with the other filters as they are
  const perCountry = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of anyCountry) if (statusOk(x)) m.set(x.country, (m.get(x.country) ?? 0) + 1);
    return m;
  }, [anyCountry, f.status, since]);
  // highest stated pay first, then figures without a period, then the rest in deadline order; or the newest first
  const sorted = useMemo(() => {
    if (f.sort === "new") return [...shown].sort((a, b) => b.added.localeCompare(a.added));
    if (f.sort !== "pay") return shown;
    const rank = (x: Item) => (x.pay?.month !== undefined ? 0 : x.pay ? 1 : 2);
    return [...shown].sort((a, b) => rank(a) - rank(b) || (b.pay?.month ?? 0) - (a.pay?.month ?? 0));
  }, [shown, f.sort]);
  // by pay each role keeps its own figure, so only the same role in several cities shares a row
  const rows = useMemo(() => toRows(sorted, f.sort !== "pay"), [sorted, f.sort]);
  // headings by deadline only in the deadline order, with the number of roles under each
  const headings = f.sort === "deadline";
  const perHeading = useMemo(() => {
    const m = new Map<string, number>();
    if (headings)
      for (const r of rows) {
        const h = closesGroup(r.items[0], now);
        m.set(h, (m.get(h) ?? 0) + r.items.length);
      }
    return m;
  }, [rows, headings, now]);
  const filtered = f.q || f.status !== "open" || f.kind || f.field || f.countries.length > 0 || f.saved || f.level || f.visa || f.english || f.sort !== "deadline";
  // before every role has loaded: the plain view shows the first page and the build's numbers, any other view waits
  const waiting = !ready && !!(filtered || f.fit || page > 1 || per !== FIRST_PAGE);
  const pre = !ready && !waiting;
  const shownCount = pre ? view.shown : shown.length;
  const withPay = pre ? view.withPay : shown.filter((x) => x.pay).length;
  const counts = pre
    ? { open: view.shown, soon: view.soon, new: view.fresh }
    : {
        open: matched.filter((x) => x.status === "open" || x.status === "rolling").length,
        soon: matched.filter((x) => x.status === "soon").length,
        new: matched.filter(isNew).length,
      };
  const heads = pre ? new Map(view.perHeading) : perHeading;

  const pages = Math.max(1, Math.ceil((pre ? view.rows : rows.length) / per));
  const cur = Math.min(page, pages);
  const first = (cur - 1) * per;
  const onPage = rows.slice(first, first + per);

  // a new filter starts again at page 1
  const set = (patch: Partial<Filters>) => {
    setF((x) => ({ ...x, ...patch }));
    setPage(1);
  };
  const nameOf = (code: string) => countries.find((k) => k.code === code)?.name ?? code;
  const toggleCountry = (code: string) =>
    set({ countries: f.countries.includes(code) ? f.countries.filter((c) => c !== code) : inOrder([...f.countries, code], countries) });
  const closeCountries = () => {
    setCountryOpen(false);
    countryButton.current?.focus({ preventScroll: true });
  };
  /** A country clicked in the list joins the filter, and the list starts again at the top. */
  const pickCountry = (e: React.MouseEvent, code: string) => {
    // a new tab or window opens the link itself
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    set({ countries: inOrder([...f.countries, code], countries) });
    // after the shorter list has rendered, else the browser lands somewhere below the top
    setTimeout(() => top.current?.scrollIntoView(), 60);
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
  /** Saves every role in a merged row, or takes them all off when they are all saved already. Undo puts back the list as it was. */
  const toggleSaveAll = (ids: string[]) => {
    const all = ids.every((id) => saved.includes(id));
    const before = saved;
    toast(all ? `Removed ${ids.length} roles from your list` : `Saved ${ids.length} roles to your list`, () => {
      writeSaved(before);
      setSaved(before);
    });
    setSaved((cur) => {
      const next = all ? cur.filter((s) => !ids.includes(s)) : [...new Set([...cur, ...ids])];
      writeSaved(next);
      return next;
    });
  };
  const savedItems = items.filter((x) => saved.includes(x.id));
  const stillLoading = () => {
    if (ready) return false;
    setNotice("The list is still loading. Try again in a second.");
    return true;
  };
  const downloadCalendar = () => {
    if (stillLoading()) return;
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
    if (stillLoading()) return;
    const link = `${location.origin}/?saved=${savedItems.map((x) => x.key).join(".")}`;
    setShareLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Link copied. Open it on your other device to get the same saved list.");
    } catch {
      setNotice("Copy the link below and open it on your other device.");
    }
  };
  const profileText = profile ? profileWords(profile, nameOf) : null;
  // the filters from "More filters" that are on, each with a way to turn it off from the list
  const on: { label: string; clear: Partial<Filters> }[] = [
    ...(f.fit && profileText ? [{ label: "Fits my profile", clear: { fit: false } }] : []),
    ...(f.status === "new" ? [{ label: "New", clear: { status: "open" as StatusFilter } }] : []),
    ...(f.status === "all" ? [{ label: "Also closed", clear: { status: "open" as StatusFilter } }] : []),
    ...(f.field ? [{ label: f.field, clear: { field: "" } }] : []),
    ...(f.level ? [{ label: levels.find((l) => l.value === f.level)?.label ?? f.level, clear: { level: "" as const } }] : []),
    ...(f.visa ? [{ label: "I need a visa", clear: { visa: false } }] : []),
    ...(f.english ? [{ label: "English only", clear: { english: false } }] : []),
    ...(f.saved ? [{ label: "Only saved", clear: { saved: false } }] : []),
  ];
  const day = (x: Item) => closesShort(x, headings) ?? shortWhen(x);
  const newBadge = <span className="mr-1.5 rounded-sm bg-ink px-1 py-px align-[2px] font-sans text-[10px] font-semibold tracking-wide text-bg uppercase">New</span>;

  /** What opens under a role: its dates, process, pay, rules and links. */
  const details = (x: Item) => (
    <>
      <p className={`font-sans text-[13px] ${x.old ? "text-soon" : "text-muted"}`}>
        {x.when}. {x.kind}, {x.field}. {!x.start || /^not stated/i.test(x.start) ? "" : `Starts ${x.start}. `}Checked {shortDate(x.checked)}
        {x.old ? ", over 3 months ago" : ""}.
      </p>
      <p className="mt-1">
        <Process x={x} />
      </p>
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
        {!scope && x.countryName && !f.countries.includes(x.country) && (
          // phones only: there the place sits in the part you tap to open the role, which can't hold a link;
          // wider screens have it in the City column
          <a href={countryHref(x.country)} onClick={(e) => pickCountry(e, x.country)} className="link md:hidden">
            {x.countryName} only
          </a>
        )}
        <AddToCalendar events={eventsFor([x])} file={`/cal/${x.key}.ics`} />
        <a href={reportUrl(x)} target="_blank" rel="noreferrer" className="text-muted underline underline-offset-2 hover:text-ink">
          Something wrong?
          <span className="sr-only"> Report a mistake in {x.title} at {x.company}</span>
          <NewTab />
        </a>
      </div>
    </>
  );

  const saveButton = (x: Item, align: string, size: string) => {
    const isSaved = saved.includes(x.id);
    return (
      <button
        type="button"
        onClick={() => toggleSave(x.id)}
        aria-pressed={isSaved}
        data-track={isSaved ? "unsave" : "save"}
        className={`flex h-11 w-11 items-center ${align} ${isSaved ? "text-accent" : "text-dim hover:text-ink"}`}
      >
        <Icon name="bookmark" filled={isSaved} className={size} />
        <span className="sr-only">
          Save {x.title} at {x.company}
        </span>
      </button>
    );
  };

  const howLine = (x: Item, className: string) => <HowLine x={x} className={className} />;

  /** The bookmark of a merged row: it saves all its roles. Partly saved shows in colour, not filled. */
  const groupSave = (r: Row, align: string, size: string) => {
    const ids = r.items.map((x) => x.id);
    const n = ids.filter((id) => saved.includes(id)).length;
    const all = n === ids.length;
    return (
      <button
        type="button"
        onClick={() => toggleSaveAll(ids)}
        aria-pressed={all}
        data-track={all ? "unsave-group" : "save-group"}
        className={`flex h-11 w-11 items-center ${align} ${n ? "text-accent" : "text-dim hover:text-ink"}`}
      >
        <Icon name="bookmark" filled={all} className={size} />
        <span className="sr-only">
          Save all {ids.length} roles: {r.title} at {r.items[0].company}
        </span>
      </button>
    );
  };

  /** A heading above a row when the deadline group changes, and above the first row of a page. */
  const headingOf = (r: Row, i: number) => {
    if (!headings) return null;
    const h = closesGroup(r.items[0], now);
    return i === 0 || closesGroup(onPage[i - 1].items[0], now) !== h ? h : null;
  };
  const headingCount = (h: string) => {
    const n = heads.get(h) ?? 0;
    return `${n} ${n === 1 ? "role" : "roles"}`;
  };
  const chip = (r: Row, open: boolean) => <CountChip text={r.chip ?? ""} open={open} />;

  // the country after the city, unless one country is picked already or the page is about one city
  const withCountry = (x: Item) => !(f.countries.length === 1 || scope || !x.countryName || x.city.includes(x.countryName));
  const place = (x: Item) => (withCountry(x) ? [x.city, x.countryName].filter(Boolean).join(", ") : x.city);
  // a row's country only when every role in it is in that country
  const rowCountry = (r: Row) => {
    const names = new Set(r.items.map((y) => y.countryName));
    return !(f.countries.length === 1 || scope || names.size !== 1 || !r.items[0].countryName);
  };
  const placeOf = (r: Row) => (rowCountry(r) ? `${citiesOf(r)}, ${r.items[0].countryName}` : citiesOf(r));
  // desktop: the same, with the country as a link that picks it, unless it is in the filter already
  const countryOf = (x: Item) =>
    f.countries.includes(x.country) ? x.countryName : <CountryLink code={x.country} name={x.countryName} onClick={(e) => pickCountry(e, x.country)} />;
  const placeCell = (x: Item) =>
    withCountry(x) ? (
      <>
        {x.city && `${x.city}, `}
        {countryOf(x)}
      </>
    ) : (
      x.city
    );
  const placeOfCell = (r: Row) =>
    rowCountry(r) ? (
      <>
        {citiesOf(r)}, {countryOf(r.items[0])}
      </>
    ) : (
      citiesOf(r)
    );

  /** Desktop: one role as a table row, with its details below when open. `inner` for a role inside a merged row. */
  const itemRow = (x: Item, inner = false) => {
    const open = openRows.has(x.id);
    return (
      <Fragment key={x.id}>
        <tr className={`border-line ${open ? "bg-raised/60" : `border-b hover:bg-raised/40 ${inner ? "bg-raised/30" : ""}`}`}>
          <td className="align-top">{saveButton(x, "justify-center", "h-[18px] w-[18px]")}</td>
          <td className="py-2.5 pr-3 align-top leading-snug">
            {!inner && (
              <Link href={`/companies/${x.slug}/`} className="font-display text-[15px] font-bold hover:underline">
                {x.company}
              </Link>
            )}
          </td>
          <td className="py-1 pr-3 align-top">
            <button
              type="button"
              onClick={() => flipRow(x.id)}
              aria-expanded={open}
              className={`flex min-h-9 w-full items-start py-1.5 text-left font-serif leading-snug ${inner ? "pl-3 text-[15px]" : "text-[16px]"}`}
            >
              <span>
                {isNew(x) && newBadge}
                <span className="hover:underline">{x.title}</span>
                <CountChip text="details" open={open} />
              </span>
            </button>
            {!inner && howLine(x, "-mt-1 mb-1.5 text-[13.5px]")}
          </td>
          <td className="py-2.5 pr-3 align-top font-sans text-[13px] leading-snug text-muted">{placeCell(x)}</td>
          <td className="py-2.5 pr-3 align-top font-sans text-[13px] leading-snug text-muted tabular-nums">{x.pay ? payCell(x.pay.short) : notStated}</td>
          <td className={`py-2.5 pr-2 align-top font-sans text-[13px] leading-snug font-semibold whitespace-nowrap tabular-nums ${statusColor(x)}`}>{day(x)}</td>
        </tr>
        {open && (
          <tr className="border-b border-line bg-raised/60">
            <td />
            <td colSpan={5} className="pr-4 pb-3.5 text-[15px] leading-[1.55]">
              {details(x)}
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  /** Desktop: a row with several roles. The chip opens the roles, each with its own bookmark and details. */
  const groupRow = (r: Row) => {
    const x = r.items[0];
    const pay = payOf(r);
    const open = openRows.has(`group:${r.id}`);
    return (
      <Fragment key={r.id}>
        <tr className={`border-line hover:bg-raised/40 ${open ? "" : "border-b"}`}>
          <td className="align-top">{groupSave(r, "justify-center", "h-[18px] w-[18px]")}</td>
          <td className="py-2.5 pr-3 align-top leading-snug">
            <Link href={`/companies/${x.slug}/`} className="font-display text-[15px] font-bold hover:underline">
              {x.company}
            </Link>
          </td>
          <td className="py-1 pr-3 align-top">
            <button
              type="button"
              onClick={() => flipRow(`group:${r.id}`)}
              aria-expanded={open}
              className="flex min-h-9 w-full items-start py-1.5 text-left font-serif text-[16px] leading-snug"
            >
              <span>
                {r.items.some(isNew) && newBadge}
                <span className="hover:underline">{r.title}</span>
                {chip(r, open)}
              </span>
            </button>
            {howLine(x, "-mt-1 mb-1.5 text-[13.5px]")}
          </td>
          <td className="py-2.5 pr-3 align-top font-sans text-[13px] leading-snug text-muted">{placeOfCell(r)}</td>
          <td className="py-2.5 pr-3 align-top font-sans text-[13px] leading-snug text-muted tabular-nums">{pay ? payCell(pay) : r.items.every((y) => !y.pay) ? notStated : ""}</td>
          <td className={`py-2.5 pr-2 align-top font-sans text-[13px] leading-snug font-semibold whitespace-nowrap tabular-nums ${statusColor(x)}`}>{day(x)}</td>
        </tr>
        {open && r.items.map((y) => itemRow(y, true))}
      </Fragment>
    );
  };

  /** Phones: one role, the details open on a tap. `inner` for a role inside a merged row. */
  const itemCard = (x: Item, inner = false) => {
    const hot = x.status === "soon" ? "text-soon" : x.urgent ? "font-semibold text-soon" : "text-muted";
    return (
      <li key={x.id} className={`relative border-line ${inner ? "border-t pl-3" : "border-b"}`}>
        <details onToggle={(e) => e.currentTarget.open && saw(x.id)}>
          <summary className="block cursor-pointer list-none py-2.5 pr-11 [&::-webkit-details-marker]:hidden">
            {!inner && (
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate">
                  {isNew(x) && newBadge}
                  <b className="font-display text-[15px] font-bold">{x.company}</b>
                </span>
                <span className={`shrink-0 font-sans text-[13px] whitespace-nowrap tabular-nums ${hot}`}>{day(x)}</span>
              </span>
            )}
            <span className={`block font-serif leading-snug ${inner ? "text-[15px]" : "mt-0.5 text-[16px]"}`}>
              {inner && isNew(x) && newBadge}
              {x.title}
            </span>
            {!inner && howLine(x, "mt-0.5 text-[13px]")}
            {inner ? (
              <span className="mt-0.5 flex gap-2 font-sans text-[13px] text-muted">
                <span className="min-w-0 flex-1">{[place(x), x.pay?.short].filter(Boolean).join(" · ")}</span>
                <span className={`shrink-0 tabular-nums ${hot}`}>{day(x)}</span>
              </span>
            ) : (
              <span className="mt-0.5 block font-sans text-[13px] text-muted">{[place(x), x.pay?.short].filter(Boolean).join(" · ")}</span>
            )}
          </summary>
          {seen.has(x.id) && <div className="pr-1 pb-3 text-[14px] leading-[1.5]">{details(x)}</div>}
        </details>
        <div className="absolute top-0 right-0">{saveButton(x, "justify-end", "h-5 w-5")}</div>
      </li>
    );
  };

  /** Phones: a row with several roles; a tap shows them. */
  const groupCard = (r: Row) => {
    const x = r.items[0];
    const hot = x.urgent ? "font-semibold text-soon" : "text-muted";
    return (
      <li key={r.id} className="relative border-b border-line">
        <details onToggle={(e) => e.currentTarget.open && saw(`group:${r.id}`)}>
          <summary className="block cursor-pointer list-none py-2.5 pr-11 [&::-webkit-details-marker]:hidden">
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate">
                {r.items.some(isNew) && newBadge}
                <b className="font-display text-[15px] font-bold">{x.company}</b>
              </span>
              <span className={`shrink-0 font-sans text-[13px] whitespace-nowrap tabular-nums ${hot}`}>{day(x)}</span>
            </span>
            <span className="mt-0.5 block font-serif text-[16px] leading-snug">
              {r.title}
              {chip(r, false)}
            </span>
            {howLine(x, "mt-0.5 text-[13px]")}
            <span className="mt-0.5 block font-sans text-[13px] text-muted">{[placeOf(r), payOf(r)].filter(Boolean).join(" · ")}</span>
          </summary>
          {seen.has(`group:${r.id}`) && <ul className="mb-2">{r.items.map((y) => itemCard(y, true))}</ul>}
        </details>
        <div className="absolute top-0 right-0">{groupSave(r, "justify-end", "h-5 w-5")}</div>
      </li>
    );
  };

  return (
    <div ref={top} id="roles" className="max-md:scroll-mt-16">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="role-search" className="sr-only">
          Search companies or roles
        </label>
        <input
          ref={search}
          id="role-search"
          type="search"
          value={f.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search companies or roles"
          autoComplete="off"
          className="h-11 min-w-0 flex-[1_1_260px] rounded-md border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-dim hover:border-muted"
        />
        {!scope && (
          <button
            ref={countryButton}
            type="button"
            onClick={() => setCountryOpen((o) => !o)}
            aria-expanded={countryOpen}
            aria-controls="role-countries"
            data-track="countries-open"
            className={`flex h-11 items-center justify-between gap-1.5 rounded-md border bg-surface px-2.5 text-left text-[15px] text-ink hover:border-muted max-md:flex-[1_1_40%] md:w-[190px] ${countryOpen ? "border-ink" : "border-line"}`}
          >
            <span className="truncate">
              <span className="sr-only">Countries: </span>
              {f.countries.length === 0 ? "All countries" : f.countries.length === 1 ? nameOf(f.countries[0]) : `${f.countries.length} countries`}
            </span>
            <Icon name="chevron" className={`h-4 w-4 shrink-0 transition-transform ${countryOpen ? "rotate-180" : ""}`} />
          </button>
        )}
        <Select id="role-type" label="Type" value={f.kind} onChange={(v) => set({ kind: v })}>
          <option value="">Any type</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </Select>
        <FilterSheet
          f={f}
          set={set}
          count={shownCount}
          counts={counts}
          profile={profileText}
          on={on.length}
          saved={saved.length}
          onCalendar={downloadCalendar}
          onCopyLink={copyLink}
        />
        {/* phones: the order next to More filters, so the line below stays one line */}
        <label htmlFor="role-sort-phone" className="sr-only">
          Sort
        </label>
        <select
          id="role-sort-phone"
          value={f.sort}
          onChange={(e) => set({ sort: e.target.value as Sort })}
          className="h-11 flex-[1_1_40%] rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink md:hidden"
        >
          <option value="deadline">Closing soonest</option>
          <option value="pay">Highest pay ({withPay})</option>
          <option value="new">Newest</option>
        </select>
      </div>

      {countryOpen && !scope && (
        <div
          ref={countryPanel}
          id="role-countries"
          role="group"
          aria-labelledby="role-countries-title"
          tabIndex={-1}
          onKeyDown={(e) => e.key === "Escape" && closeCountries()}
          className="mt-2 rounded-md border border-line p-3 focus:outline-none"
        >
          <div className="flex items-center justify-between gap-3">
            <p id="role-countries-title" className="text-[13px] font-semibold text-muted">
              Pick one or more countries
            </p>
            {f.countries.length > 0 && (
              <button type="button" onClick={() => set({ countries: [] })} className="h-9 text-[14px] text-link underline underline-offset-2">
                All countries
              </button>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {countries.map((k) => {
              const on = f.countries.includes(k.code);
              return (
                <button
                  key={k.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleCountry(k.code)}
                  className={`h-11 rounded-full border px-3.5 text-[15px] whitespace-nowrap ${on ? "border-ink bg-ink font-semibold text-bg" : "border-line bg-surface text-ink hover:border-muted"}`}
                >
                  {k.name}
                  {/* the full list first: before that the numbers would only count the first page */}
                  {ready && <span className={on ? "font-normal" : "text-muted"}> {perCountry.get(k.code) ?? 0}</span>}
                </button>
              );
            })}
          </div>
          <button type="button" onClick={closeCountries} className="mt-3 h-11 w-full rounded-md bg-ink px-5 text-[16px] font-semibold text-bg md:w-auto">
            {waiting ? "Show the roles" : `Show ${shownCount} ${shownCount === 1 ? "role" : "roles"}`}
          </button>
        </div>
      )}

      <div className="mt-3 mb-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-sans text-[14px] text-muted">
        <p aria-live="polite" className="font-semibold text-ink">
          {waiting ? (
            "Loading roles"
          ) : (
            <>
              {shownCount} {shownCount === 1 ? "role" : "roles"}
              {f.status === "soon" ? " opening soon" : f.status === "new" ? " new" : ""}
            </>
          )}
        </p>
        <label className="flex items-center gap-1.5 max-md:hidden">
          Sort
          <select
            value={f.sort}
            onChange={(e) => set({ sort: e.target.value as Sort })}
            className="h-9 rounded-md border border-line bg-surface px-1.5 text-[14px] text-ink hover:border-muted max-md:h-11"
          >
            <option value="deadline">Closing soonest</option>
            <option value="pay">Highest pay ({withPay})</option>
            <option value="new">Newest</option>
          </select>
        </label>
        {f.status === "soon" ? (
          <button type="button" onClick={() => set({ status: "open" })} className="text-link underline underline-offset-2 max-md:min-h-11">
            Back to open roles
          </button>
        ) : (
          counts.soon > 0 && (
            <button type="button" onClick={() => set({ status: "soon" })} className="text-link underline underline-offset-2 max-md:min-h-11">
              Opening soon ({counts.soon})
            </button>
          )
        )}
        {f.countries.length > 1 &&
          f.countries.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => set({ countries: f.countries.filter((c) => c !== code) })}
              className="flex h-8 items-center gap-1 rounded-full bg-raised px-2.5 text-[13px] font-semibold whitespace-nowrap text-ink max-md:h-11"
            >
              {nameOf(code)}
              <Icon name="x" className="h-3.5 w-3.5" />
              <span className="sr-only">, remove this country</span>
            </button>
          ))}
        {on.map((x) => (
          <button
            key={x.label}
            type="button"
            onClick={() => set(x.clear)}
            className="flex h-8 items-center gap-1 rounded-full bg-raised px-2.5 text-[13px] font-semibold whitespace-nowrap text-ink max-md:h-11"
          >
            {x.label}
            <Icon name="x" className="h-3.5 w-3.5" />
            <span className="sr-only">, remove this filter</span>
          </button>
        ))}
        {filtered && (
          <button
            type="button"
            onClick={() => {
              setF({ ...start, fit: f.fit });
              setPage(1);
            }}
            className="text-link underline underline-offset-2 max-md:min-h-11"
          >
            Clear filters
          </button>
        )}
        {saved.length > 0 && (
          <Link href="/mine/" className="font-semibold text-link underline underline-offset-2 max-md:hidden" data-track="to-mine">
            My applications ({saved.length})
          </Link>
        )}
        {!profileText && (
          <Link href="/profile/" className="text-link underline underline-offset-2 max-md:hidden" data-track="profile-from-list">
            Set your profile
          </Link>
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

      {waiting ? (
        <p className="border-t border-line py-6 text-[15px] text-muted">Loading the roles.</p>
      ) : shown.length === 0 ? (
        <p className="border-t border-line py-6 text-[15px] text-muted">
          {scope && !filtered && !f.fit
            ? `Nothing open in ${scope.place} right now.`
            : `No roles match. Try fewer filters${scope ? "" : ", or search for a city instead of a company"}.`}
        </p>
      ) : (
        <>
          {/* phones: one block per row, the details open on a tap */}
          <ul className={`md:hidden ${headings ? "" : "border-t border-line"}`}>
            {onPage.map((r, i) => {
              const h = headingOf(r, i);
              return (
                <Fragment key={r.id}>
                  {h && (
                    <li className={`flex items-baseline gap-2.5 border-b border-ink pb-1.5 font-display text-[18px] font-bold ${i === 0 ? "pt-2" : "pt-5"}`}>
                      {h}
                      <span className="font-sans text-[13px] font-normal text-muted">{headingCount(h)}</span>
                    </li>
                  )}
                  {r.items.length === 1 ? itemCard(r.items[0]) : groupCard(r)}
                </Fragment>
              );
            })}
          </ul>
          <table className="w-full table-fixed border-collapse text-left text-[15px] max-md:hidden">
            <caption className="sr-only">Roles that match the filters. Open a role for its process and links.</caption>
            <colgroup>
              <col className="w-11" />
              <col className="w-[132px]" />
              <col />
              <col className="w-[124px]" />
              <col className="w-[100px]" />
              <col className="w-[68px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-ink font-sans text-[13px] text-muted">
                <th scope="col">
                  <span className="sr-only">Saved</span>
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Company
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Role
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  City
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Pay
                </th>
                <th scope="col" className="py-2 pr-2 font-medium">
                  Closes
                </th>
              </tr>
            </thead>
            <tbody>
              {onPage.map((r, i) => {
                const h = headingOf(r, i);
                return (
                  <Fragment key={r.id}>
                    {h && (
                      <tr className="border-b border-ink">
                        <th scope="colgroup" colSpan={6} className={`pb-2 text-left font-display text-[19px] font-bold ${i === 0 ? "pt-3" : "pt-6"}`}>
                          {h}
                          <span className="ml-2.5 font-sans text-[14px] font-normal text-muted">{headingCount(h)}</span>
                        </th>
                      </tr>
                    )}
                    {r.items.length === 1 ? itemRow(r.items[0]) : groupRow(r)}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {!waiting && shown.length > 0 && (
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
