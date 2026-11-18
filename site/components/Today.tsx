"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shortWhen, type Item } from "@/lib/items";
import { shortDate } from "@/lib/format";
import { daysBetween, localDay, readProgress, readSaved, SAVED_EVENT, stages, visitSince, type Progress } from "@/lib/mine";

export type TodayItem = Pick<
  Item,
  "id" | "slug" | "company" | "title" | "city" | "status" | "when" | "daysLeft" | "closes" | "added" | "fresh"
>;
export type NextUp = { company: string; slug: string; role: string; opens: string };

const SHOW = 3;

const weekday = (iso: string, long = false) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    timeZone: "UTC",
    ...(long ? { day: "numeric", month: "long" } : {}),
  });

/** The same role in several cities becomes one row: "Bristol, Edinburgh, Halifax". */
function merged(list: TodayItem[]): (TodayItem & { cities: string })[] {
  const out: (TodayItem & { cities: string })[] = [];
  for (const x of list) {
    const same = out.find((o) => o.company === x.company && o.title === x.title && o.closes === x.closes);
    if (same) {
      if (!same.cities.split(", ").includes(x.city)) same.cities = `${same.cities}, ${x.city}`;
    } else out.push({ ...x, cities: x.city });
  }
  return out;
}

/** The start screen of the installed app: your own deadlines first, then what closes this week, what's new
 * since your last visit and what opens next. Saved roles live in this browser, so that part fills in after load. */
export default function Today({ items, next, built }: { items: TodayItem[]; next: NextUp[]; built: string }) {
  // the build day until the visitor's own day is known, so the static page already makes sense
  const [day, setDay] = useState(built);
  const [saved, setSaved] = useState<string[] | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [since, setSince] = useState<string | null>(null);

  useEffect(() => {
    setDay(localDay());
    setSince(visitSince());
    const read = () => {
      setSaved(readSaved());
      setProgress(readProgress());
    };
    read();
    window.addEventListener(SAVED_EVENT, read);
    return () => window.removeEventListener(SAVED_EVENT, read);
  }, []);

  const left = (x: TodayItem) => (x.closes ? daysBetween(day, x.closes) : null);
  const live = (x: TodayItem) => x.status !== "closed" && (left(x) ?? 0) >= 0;
  const due = (x: TodayItem) => shortWhen(x, left(x));
  const hot = (x: TodayItem) => {
    const d = left(x);
    return d !== null && d <= 7 ? "font-bold text-claret" : "text-muted";
  };

  const mine =
    saved === null
      ? null
      : items
          .filter((x) => saved.includes(x.id) && live(x) && !["offer", "rejected"].includes(progress[x.id]?.stage ?? ""))
          .sort((a, b) => Number(!!progress[a.id]) - Number(!!progress[b.id]) || (left(a) ?? 999) - (left(b) ?? 999));

  const closing = merged(
    items.filter((x) => live(x) && x.status !== "soon" && left(x) !== null && left(x)! <= 7).sort((a, b) => left(a)! - left(b)!),
  );
  const fresh = merged(
    items.filter((x) => live(x) && (since ? x.added > since : x.fresh)).sort((a, b) => b.added.localeCompare(a.added)),
  );
  const newTitle = since
    ? `New since ${daysBetween(since, day) <= 6 ? weekday(since) : shortDate(since)}`
    : "New this week";

  const head = (title: string, more?: { href: string; label: string }) => (
    <h2 className="mt-6 flex items-baseline justify-between border-t-2 border-ink pt-2.5 text-[14px] font-bold text-claret">
      {title}
      {more && (
        <Link href={more.href} className="text-[15px] font-normal text-link underline underline-offset-2">
          {more.label}
        </Link>
      )}
    </h2>
  );

  const row = (key: string, href: string, top: React.ReactNode, title: string, right: string, rightClass: string) => (
    <li key={key} className="border-b border-line">
      <Link href={href} className="block py-2.5 hover:bg-raised/50">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate">{top}</span>
          <span className={`shrink-0 text-[13px] whitespace-nowrap ${rightClass}`}>{right}</span>
        </span>
        <span className="mt-0.5 block truncate text-[15px]">{title}</span>
      </Link>
    </li>
  );

  const top = (company: string, rest: string) => (
    <>
      <b className="text-[15px] font-bold">{company}</b>
      <span className="text-[13px] text-muted"> · {rest}</span>
    </>
  );

  return (
    <>
      <h1 className="text-[26px] leading-tight font-bold">Today</h1>
      <p className="mt-0.5 text-[15px] text-muted">{weekday(day, true)}</p>

      {head("Your deadlines", mine && mine.length > SHOW + 2 ? { href: "/mine/", label: `All ${mine.length}` } : undefined)}
      {mine === null ? (
        <div className="h-16" />
      ) : mine.length === 0 ? (
        <p className="py-3 text-[15px] leading-[1.5] text-muted">
          Tap the bookmark next to a role and its deadline shows up here.{" "}
          <Link href="/" className="link">
            Find roles
          </Link>
        </p>
      ) : (
        <ul>
          {mine.slice(0, SHOW + 2).map((x) => {
            const p = progress[x.id];
            const stage = p && `${stages.find((s) => s.id === p.stage)?.label} ${shortDate(p.on)}`;
            return row(x.id, "/mine/", top(x.company, stage || (x.status === "soon" ? "not open yet" : "to apply")), x.title, p ? "" : due(x), hot(x));
          })}
        </ul>
      )}

      {head(`Closing this week · ${closing.length}`, closing.length > SHOW ? { href: "/", label: "All open roles" } : undefined)}
      {closing.length === 0 ? (
        <p className="py-3 text-[15px] text-muted">Nothing on the list closes in the next 7 days.</p>
      ) : (
        <ul>{closing.slice(0, SHOW).map((x) => row(x.id, `/companies/${x.slug}/`, top(x.company, x.cities), x.title, due(x), hot(x)))}</ul>
      )}

      {head(`${newTitle} · ${fresh.length}`, fresh.length > SHOW ? { href: "/?status=new", label: "All new" } : undefined)}
      {fresh.length === 0 ? (
        <p className="py-3 text-[15px] text-muted">No new roles since then. The list is checked every day.</p>
      ) : (
        <ul>{fresh.slice(0, SHOW).map((x) => row(x.id, `/companies/${x.slug}/`, top(x.company, x.cities), x.title, due(x), hot(x)))}</ul>
      )}

      {next.length > 0 && (
        <>
          {head("Opens next", { href: "/radar/", label: `All ${next.length}` })}
          <ul>
            {next.slice(0, SHOW).map((r) => row(r.slug + r.role, `/companies/${r.slug}/`, top(r.company, r.opens), r.role, "", ""))}
          </ul>
        </>
      )}
    </>
  );
}
