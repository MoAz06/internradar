"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Item } from "@/lib/items";
import { eventsFor, toIcs } from "@/lib/ics";
import { longDate, shortDate } from "@/lib/format";
import NewTab from "@/components/NewTab";
import {
  after,
  daysBetween,
  decodeOne,
  encodeOne,
  localDay,
  readProgress,
  readSaved,
  stages,
  writeProgress,
  writeSaved,
  type Progress,
  type Stage,
} from "@/lib/mine";

/** Waiting time after a rejection, by company name, where the company names one plainly. */
export type Waits = Record<string, { months?: number; days?: number }>;

const ago = (d: number) => (d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`);

export default function MyRoles({ items, waits }: { items: Item[]; waits: Waits }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress>({});
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [today, setToday] = useState("");

  useEffect(() => {
    let ids = readSaved();
    let prog = readProgress();
    // ?r=key-a-20261118.key2 from "open on another device"
    const parts = (new URLSearchParams(location.search).get("r") ?? "").split(".").filter(Boolean);
    if (parts.length) {
      let added = 0;
      for (const part of parts) {
        const { key, progress: p } = decodeOne(part);
        const x = items.find((i) => i.key === key);
        if (!x) continue;
        if (!ids.includes(x.id)) {
          ids = [...ids, x.id];
          added++;
        }
        if (p && !prog[x.id]) prog = { ...prog, [x.id]: p };
      }
      writeSaved(ids);
      writeProgress(prog);
      history.replaceState(null, "", location.pathname);
      setNotice(added ? `Added ${added} ${added === 1 ? "role" : "roles"} from the link.` : "Those roles were already on your list here.");
    }
    setSaved(ids);
    setProgress(prog);
    setToday(localDay());
    setReady(true);
  }, [items]);

  const mine = useMemo(() => items.filter((x) => saved.includes(x.id)), [items, saved]);
  const gone = saved.length - mine.length;

  const setStage = (id: string, stage: Stage | "") => {
    setProgress((cur) => {
      const next = { ...cur };
      if (stage) next[id] = { stage, on: localDay() };
      else delete next[id];
      writeProgress(next);
      return next;
    });
  };

  const remove = (id: string) => {
    setSaved((cur) => {
      const next = cur.filter((s) => s !== id);
      writeSaved(next);
      return next;
    });
    setStage(id, "");
  };

  const byDeadline = (a: Item, b: Item) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999) || a.company.localeCompare(b.company);
  const toApply = mine.filter((x) => !progress[x.id]).sort(byDeadline);
  const waiting = mine
    .filter((x) => ["applied", "test", "interview"].includes(progress[x.id]?.stage ?? ""))
    .sort((a, b) => progress[a.id].on.localeCompare(progress[b.id].on));
  const done = mine
    .filter((x) => ["offer", "rejected"].includes(progress[x.id]?.stage ?? ""))
    .sort((a, b) => progress[b.id].on.localeCompare(progress[a.id].on));

  /** When this visitor may apply to the company again, as a sentence. */
  const again = (x: Item): string => {
    const w = waits[x.company];
    const p = progress[x.id];
    if (w && p) {
      const day = after(p.on, w.months ?? 0, w.days ?? 0);
      const when = day <= today ? "You can apply again now." : `You can apply again from ${longDate(day)}.`;
      return x.reapply ? `${when} ${x.company}: ${x.reapply}` : when;
    }
    if (x.reapply) return `${x.company} on applying again: ${x.reapply}`;
    return `${x.company} doesn't say when you can apply again.`;
  };

  const downloadCalendar = () => {
    const events = eventsFor(toApply);
    if (!events.length) {
      setNotice("None of the roles you still have to apply to has a date in the posting, so there's nothing to put in a calendar.");
      return;
    }
    const blob = new Blob([toIcs("internradar, my applications", events)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "internradar-applications.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const copyLink = async () => {
    const link = `${location.origin}/mine/?r=${mine.map((x) => encodeOne(x.key, progress[x.id])).join(".")}`;
    setShareLink(link);
    try {
      await navigator.clipboard.writeText(link);
      setNotice("Link copied. Open it on your other device to get the same list there.");
    } catch {
      setNotice("Copy the link below and open it on your other device.");
    }
  };

  if (!ready) return <p className="mt-6 text-[16px] text-muted">Loading your list…</p>;

  if (mine.length === 0)
    return (
      <div className="mt-6 max-w-[680px] text-[16px] leading-[1.6] text-muted">
        <div aria-live="polite">{notice && <p className="mb-2 text-ink">{notice}</p>}</div>
        <p>
          Nothing saved yet. On the{" "}
          <Link href="/" className="link">
            front page
          </Link>
          , click <span className="font-semibold text-ink">Save</span> next to a role. It shows up here, and you can mark
          where your application stands.
        </p>
        {gone > 0 && <p className="mt-2">{gone} saved {gone === 1 ? "role is" : "roles are"} no longer on the list.</p>}
      </div>
    );

  const row = (x: Item) => {
    const p = progress[x.id];
    const select = `stage-${x.key}`;
    return (
      <li key={x.id} className="border-t border-line py-3 first:border-t-0">
        {p ? (
          <p className="text-[13px] font-semibold text-muted">
            {stages.find((s) => s.id === p.stage)?.label} {shortDate(p.on)}, {ago(daysBetween(p.on, today))}
          </p>
        ) : (
          <p className={`text-[13px] font-semibold ${x.urgent ? "text-accent" : "text-soon"}`}>{x.when}</p>
        )}
        <p className="font-display text-[17px] leading-snug font-bold">
          <Link href={`/companies/${x.slug}/`} className="hover:underline">
            {x.company}
          </Link>
          : {x.title}
        </p>
        <p className="mt-0.5 text-[15px] text-muted">
          {x.city}, {x.countryName}.{" "}
          <a href={x.source} target="_blank" rel="noreferrer" className="link" data-track="mine-posting">
            Posting
            <NewTab />
          </a>
        </p>
        {p?.stage === "rejected" && <p className="mt-1 text-[14px] text-soon">{again(x)}</p>}
        {!p && x.reapply && (
          <p className="mt-1 text-[14px] text-muted">
            <span className="font-semibold text-ink">Before you apply:</span> {x.reapply}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
          <label htmlFor={select} className="text-muted">
            Where it stands
          </label>
          <select
            id={select}
            value={p?.stage ?? ""}
            onChange={(e) => setStage(x.id, e.target.value as Stage | "")}
            className="h-8 rounded-md border border-line bg-surface px-2 text-[14px]"
            data-track="mine-stage"
          >
            <option value="">Not applied yet</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => remove(x.id)} className="text-muted underline underline-offset-2 hover:text-ink">
            Remove
            <span className="sr-only">
              {" "}
              {x.title} at {x.company}
            </span>
          </button>
        </div>
      </li>
    );
  };

  const group = (title: string, list: Item[], empty: string) => (
    <section className="mt-8">
      <h2 className="border-t-2 border-ink pt-3 text-[20px] font-bold">
        {title} <span className="text-[16px] font-normal text-muted">({list.length})</span>
      </h2>
      {list.length ? (
        <ul className="mt-1">
          {list.map(row)}
        </ul>
      ) : (
        <p className="mt-2 text-[15px] text-muted">{empty}</p>
      )}
    </section>
  );

  return (
    <div className="max-w-[760px]">
      <p className="mt-4 text-[16px] text-muted">
        {mine.length} saved: {toApply.length} to apply to, {waiting.length} waiting to hear back, {done.length} done.
        {gone > 0 && ` ${gone} saved ${gone === 1 ? "role is" : "roles are"} no longer on the list.`}
      </p>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
        <button type="button" onClick={downloadCalendar} className="text-link underline underline-offset-2" data-track="mine-calendar">
          Deadlines to my calendar
        </button>
        <button type="button" onClick={copyLink} className="text-link underline underline-offset-2" data-track="mine-link">
          Open this list on another device
        </button>
      </p>
      <div aria-live="polite" className="text-[14px]">
        {notice && <p className="mt-2 text-ink">{notice}</p>}
      </div>
      {shareLink && (
        <p className="mt-2 text-[14px]">
          <label htmlFor="mine-link" className="text-muted">
            Link to your list:{" "}
          </label>
          <input
            id="mine-link"
            readOnly
            value={shareLink}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1 h-9 w-full rounded-md border border-line bg-surface px-2 text-[14px]"
          />
        </p>
      )}

      {group("To apply to", toApply, "Nothing left to apply to. Save more roles on the front page.")}
      {group("Waiting to hear back", waiting, "Set a role to Applied and it moves here, oldest first.")}
      {group("Done", done, "Offers and rejections end up here, with when you can apply again.")}

      <p className="mt-10 border-t border-line pt-3 text-[14px] text-muted">
        Your list stays in this browser. Nothing is sent anywhere, and there&apos;s no account. Went through one of these
        processes?{" "}
        <Link href="/share/" className="link" data-track="mine-share">
          Tell the next person how it went
        </Link>
        .
      </p>
    </div>
  );
}
